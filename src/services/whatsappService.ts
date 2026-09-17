import {
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    makeWASocket,
    useMultiFileAuthState,
    type ConnectionState,
    type WASocket
} from '@whiskeysockets/baileys'
import fs from 'fs'
import path from 'path'
import pino from 'pino'
import whatsappSessionModel, { TWhatsAppSessionStatus } from '../APIs/whatsapp/_shared/models/whatsappSession.model'
import appLogger from '../handlers/logger'
import { reserveSendSlot, applyInterMessageDelay, simulatePresence } from './whatsappRateLimiter'

type TStatusPayload = {
    status: TWhatsAppSessionStatus
    phoneNumber?: string
    qrCode?: string
    errorMessage?: string
}

type TConnectResult = TStatusPayload

type TSendResult = {
    success: boolean
    error?: string
    capped?: boolean
}

type TSessionLean = {
    schoolId: string
    phoneNumber?: string
    status: TWhatsAppSessionStatus
    qrCode?: string
    errorMessage?: string
}

const baileysLogger = pino({ level: 'silent' })
const PRESENCE_TIMEOUT_MS = 10000
const SEND_TIMEOUT_MS = 30000

const maskPhone = (phone: string) => (phone.length <= 4 ? '****' : `${phone.slice(0, 3)}***${phone.slice(-2)}`)

const withLoggedTimeout = async <T>(operation: Promise<T>, timeoutMs: number, operationName: string, meta: Record<string, unknown>): Promise<T> => {
    let timer: NodeJS.Timeout | undefined

    try {
        return await new Promise<T>((resolve, reject) => {
            timer = setTimeout(() => {
                const error = new Error(`${operationName} timeout after ${timeoutMs / 1000} seconds`)
                appLogger.error(error.message, { meta })
                reject(error)
            }, timeoutMs)

            void operation.then(resolve, reject)
        })
    } finally {
        if (timer) {
            clearTimeout(timer)
        }
    }
}

const normalizePhone = (input: string) => {
    const digits = input.replace(/\D/g, '')

    if (!digits) {
        return ''
    }

    if (digits.startsWith('00')) {
        return digits.slice(2)
    }

    if (digits.startsWith('0')) {
        return `92${digits.slice(1)}`
    }

    return digits
}

class WhatsAppService {
    private readonly sockets = new Map<string, WASocket>()
    private readonly connectingSchools = new Set<string>()
    private readonly manualDisconnectSchools = new Set<string>()
    private readonly reconnectTimers = new Map<string, NodeJS.Timeout>()
    // School-level lock: tracks which schools currently have a dispatch running
    private readonly activeDispatches = new Map<string, boolean>()
    // School-level queue: holds pending dispatch functions per schoolId
    private readonly dispatchQueues = new Map<string, Array<() => Promise<void>>>()

    private getPrimaryAuthRoot() {
        const srcAuthRoot = path.join(process.cwd(), 'src', 'auth')
        const rootAuthRoot = path.join(process.cwd(), 'auth')

        if (fs.existsSync(srcAuthRoot)) {
            return srcAuthRoot
        }

        if (process.env.NODE_ENV === 'production') {
            return rootAuthRoot
        }

        return srcAuthRoot
    }

    private getFallbackAuthRoot() {
        const primary = this.getPrimaryAuthRoot()
        const fallback = primary.endsWith(`${path.sep}src${path.sep}auth`)
            ? path.join(process.cwd(), 'auth')
            : path.join(process.cwd(), 'src', 'auth')
        return fallback
    }

    private getAuthDir(schoolId: string) {
        const primary = path.join(this.getPrimaryAuthRoot(), schoolId)

        if (fs.existsSync(primary)) {
            return primary
        }

        return path.join(this.getFallbackAuthRoot(), schoolId)
    }

    private hasAuthDir(schoolId: string) {
        return fs.existsSync(path.join(this.getPrimaryAuthRoot(), schoolId)) || fs.existsSync(path.join(this.getFallbackAuthRoot(), schoolId))
    }

    private removeAuthDir(schoolId: string) {
        const authDirs = [path.join(this.getPrimaryAuthRoot(), schoolId), path.join(this.getFallbackAuthRoot(), schoolId)]

        for (const authDir of authDirs) {
            if (fs.existsSync(authDir)) {
                fs.rmSync(authDir, { recursive: true, force: true })
            }
        }
    }

    private clearReconnectTimer(schoolId: string) {
        const timer = this.reconnectTimers.get(schoolId)

        if (timer) {
            clearTimeout(timer)
            this.reconnectTimers.delete(schoolId)
        }
    }

    private scheduleReconnect(schoolId: string) {
        if (this.manualDisconnectSchools.has(schoolId)) {
            return
        }

        this.clearReconnectTimer(schoolId)

        const timer = setTimeout(() => {
            this.reconnectTimers.delete(schoolId)

            if (!this.manualDisconnectSchools.has(schoolId)) {
                void this.connect(schoolId)
            }
        }, 3000)

        this.reconnectTimers.set(schoolId, timer)
    }

    private getStatusCode(error: unknown) {
        if (!error || typeof error !== 'object') {
            return null
        }

        const maybeOutput = (error as { output?: { statusCode?: unknown } }).output
        const maybeStatusCode = maybeOutput?.statusCode

        return typeof maybeStatusCode === 'number' ? maybeStatusCode : null
    }

    private async readSession(schoolId: string): Promise<TSessionLean | null> {
        const session = await whatsappSessionModel.findOne({ schoolId }).lean<TSessionLean | null>()
        return session
    }

    private async writeSession(schoolId: string, payload: Partial<TSessionLean>) {
        await whatsappSessionModel.findOneAndUpdate(
            { schoolId },
            {
                $set: {
                    ...payload,
                    schoolId
                }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        )
    }

    private async handleConnectionUpdate(schoolId: string, socket: WASocket, update: Partial<ConnectionState>) {
        const { connection, lastDisconnect, qr } = update

        if (connection || qr) {
            appLogger.info('WhatsApp connection update', {
                meta: {
                    schoolId,
                    connection: connection || 'qr',
                    hasQr: Boolean(qr),
                    disconnectStatusCode: this.getStatusCode(lastDisconnect?.error)
                }
            })
        }

        if (qr) {
            await this.writeSession(schoolId, {
                status: 'connecting',
                qrCode: qr,
                errorMessage: '',
                phoneNumber: ''
            })
        }

        if (connection === 'open') {
            this.clearReconnectTimer(schoolId)

            const rawId = socket.user?.id || ''
            const phoneNumber = rawId.split(':')[0]?.split('@')[0] || ''

            // Set connectedAt only if this session was previously disconnected
            // (i.e. a fresh connection, not a reconnect that was already counted)
            const existingSession = await whatsappSessionModel.findOne({ schoolId }).lean<{ connectedAt?: Date | null } | null>()
            const connectedAtUpdate: Record<string, unknown> = {}
            if (!existingSession?.connectedAt) {
                connectedAtUpdate.connectedAt = new Date()
            }

            await this.writeSession(schoolId, {
                status: 'connected',
                phoneNumber,
                qrCode: '',
                errorMessage: '',
                ...connectedAtUpdate
            } as Parameters<typeof this.writeSession>[1])
            return
        }

        if (connection === 'close') {
            this.sockets.delete(schoolId)

            const isManual = this.manualDisconnectSchools.has(schoolId)
            if (isManual) {
                this.manualDisconnectSchools.delete(schoolId)
                await this.writeSession(schoolId, {
                    status: 'disconnected',
                    phoneNumber: '',
                    qrCode: '',
                    errorMessage: ''
                })
                return
            }

            const statusCode = this.getStatusCode(lastDisconnect?.error)
            const isLoggedOut = statusCode === DisconnectReason.loggedOut

            if (isLoggedOut) {
                this.removeAuthDir(schoolId)
                await this.writeSession(schoolId, {
                    status: 'disconnected',
                    phoneNumber: '',
                    qrCode: '',
                    errorMessage: 'WhatsApp session logged out. Reconnect required.'
                })
                return
            }

            await this.writeSession(schoolId, {
                status: 'disconnected',
                qrCode: '',
                errorMessage: 'Connection lost. Reconnecting...'
            })

            this.scheduleReconnect(schoolId)
        }
    }

    async connect(schoolId: string): Promise<TConnectResult> {
        const normalizedSchoolId = schoolId.trim()
        if (!normalizedSchoolId) {
            return {
                status: 'error',
                errorMessage: 'School ID is required.'
            }
        }

        if (this.connectingSchools.has(normalizedSchoolId)) {
            return this.getStatus(normalizedSchoolId)
        }

        const existingSocket = this.sockets.get(normalizedSchoolId)
        if (existingSocket) {
            const existingStatus = await this.getStatus(normalizedSchoolId)
            if (existingStatus.status === 'connected' || existingStatus.status === 'connecting') {
                return existingStatus
            }
        }

        this.connectingSchools.add(normalizedSchoolId)
        this.manualDisconnectSchools.delete(normalizedSchoolId)
        this.clearReconnectTimer(normalizedSchoolId)

        try {
            const authDir = this.getAuthDir(normalizedSchoolId)
            if (!fs.existsSync(authDir)) {
                fs.mkdirSync(authDir, { recursive: true })
            }

            const { state, saveCreds } = await useMultiFileAuthState(authDir)
            const { version } = await fetchLatestBaileysVersion()

            const socket = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, baileysLogger)
                },
                printQRInTerminal: false,
                logger: baileysLogger,
                browser: ['School LMS', 'Chrome', '1.0.0']
            })

            this.sockets.set(normalizedSchoolId, socket)

            socket.ev.on('connection.update', (update) => {
                void this.handleConnectionUpdate(normalizedSchoolId, socket, update)
            })

            socket.ev.on('creds.update', () => {
                void saveCreds()
            })

            await this.writeSession(normalizedSchoolId, {
                status: 'connecting',
                qrCode: '',
                errorMessage: ''
            })

            return {
                status: 'connecting'
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to connect WhatsApp'

            await this.writeSession(normalizedSchoolId, {
                status: 'error',
                errorMessage: message,
                qrCode: ''
            })

            return {
                status: 'error',
                errorMessage: message
            }
        } finally {
            this.connectingSchools.delete(normalizedSchoolId)
        }
    }

    async disconnect(schoolId: string) {
        const normalizedSchoolId = schoolId.trim()
        if (!normalizedSchoolId) {
            return
        }

        this.manualDisconnectSchools.add(normalizedSchoolId)
        this.clearReconnectTimer(normalizedSchoolId)

        const socket = this.sockets.get(normalizedSchoolId)
        if (socket) {
            try {
                socket.end(new Error('manual disconnect'))
            } catch {
                // Ignore close errors.
            }
            this.sockets.delete(normalizedSchoolId)
        }

        this.removeAuthDir(normalizedSchoolId)

        await this.writeSession(normalizedSchoolId, {
            status: 'disconnected',
            phoneNumber: '',
            qrCode: '',
            errorMessage: ''
        })
    }

    async getStatus(schoolId: string): Promise<TStatusPayload> {
        const normalizedSchoolId = schoolId.trim()
        if (!normalizedSchoolId) {
            return {
                status: 'error',
                errorMessage: 'School ID is required.'
            }
        }

        const session = await this.readSession(normalizedSchoolId)

        if (!session) {
            if (this.hasAuthDir(normalizedSchoolId) && !this.connectingSchools.has(normalizedSchoolId)) {
                void this.connect(normalizedSchoolId)
                return {
                    status: 'connecting'
                }
            }

            return {
                status: 'disconnected'
            }
        }

        if (
            session.status === 'connected' &&
            !this.sockets.has(normalizedSchoolId) &&
            this.hasAuthDir(normalizedSchoolId) &&
            !this.connectingSchools.has(normalizedSchoolId)
        ) {
            void this.connect(normalizedSchoolId)
            return {
                status: 'connecting',
                phoneNumber: session.phoneNumber || undefined
            }
        }

        return {
            status: session.status,
            phoneNumber: session.phoneNumber || undefined,
            qrCode: session.qrCode || undefined,
            errorMessage: session.errorMessage || undefined
        }
    }

    async sendMessage(schoolId: string, phoneNumber: string, message: string): Promise<TSendResult> {
        const normalizedSchoolId = schoolId.trim()
        const normalizedPhone = normalizePhone(phoneNumber)

        appLogger.info('WhatsApp send entered', {
            meta: { schoolId: normalizedSchoolId, phone: maskPhone(normalizedPhone), socketPresent: this.sockets.has(normalizedSchoolId) }
        })

        if (!normalizedPhone || normalizedPhone.length < 8) {
            return {
                success: false,
                error: 'Invalid phone number'
            }
        }

        if (!this.sockets.has(normalizedSchoolId) && this.hasAuthDir(normalizedSchoolId) && !this.connectingSchools.has(normalizedSchoolId)) {
            appLogger.info('WhatsApp send reconnecting missing socket', { meta: { schoolId: normalizedSchoolId } })
            await this.connect(normalizedSchoolId)
        }

        const session = await this.readSession(normalizedSchoolId)
        const socket = this.sockets.get(normalizedSchoolId)

        appLogger.info('WhatsApp send connection check', {
            meta: { schoolId: normalizedSchoolId, sessionStatus: session?.status || 'missing', socketPresent: Boolean(socket) }
        })

        if (!socket || session?.status !== 'connected') {
            return {
                success: false,
                error: 'WhatsApp not connected'
            }
        }

        // Anti-ban: reserve a send slot (checks + atomically increments daily counter)
        appLogger.info('WhatsApp send reserving daily slot', { meta: { schoolId: normalizedSchoolId } })
        const slotGranted = await reserveSendSlot(normalizedSchoolId)
        appLogger.info('WhatsApp send daily-slot result', { meta: { schoolId: normalizedSchoolId, slotGranted } })
        if (!slotGranted) {
            return {
                success: false,
                capped: true,
                error: 'Daily send limit reached'
            }
        }

        // Anti-ban: randomized inter-message delay
        appLogger.info('WhatsApp send delay started', { meta: { schoolId: normalizedSchoolId } })
        await applyInterMessageDelay()
        appLogger.info('WhatsApp send delay finished', { meta: { schoolId: normalizedSchoolId } })

        // Anti-ban: simulate human typing presence
        const jid = `${normalizedPhone}@s.whatsapp.net`

        try {
            appLogger.info('WhatsApp send presence started', { meta: { schoolId: normalizedSchoolId, phone: maskPhone(normalizedPhone) } })
            await withLoggedTimeout(simulatePresence(socket, jid), PRESENCE_TIMEOUT_MS, 'WhatsApp presence update', {
                schoolId: normalizedSchoolId,
                phone: maskPhone(normalizedPhone)
            })
            appLogger.info('WhatsApp send presence finished', { meta: { schoolId: normalizedSchoolId, phone: maskPhone(normalizedPhone) } })

            appLogger.info('WhatsApp socket send started', { meta: { schoolId: normalizedSchoolId, phone: maskPhone(normalizedPhone) } })
            await withLoggedTimeout(socket.sendMessage(jid, { text: message }), SEND_TIMEOUT_MS, 'WhatsApp socket send', {
                schoolId: normalizedSchoolId,
                phone: maskPhone(normalizedPhone)
            })
            appLogger.info('WhatsApp socket send finished', { meta: { schoolId: normalizedSchoolId, phone: maskPhone(normalizedPhone) } })

            return {
                success: true
            }
        } catch (error) {
            appLogger.error('WhatsApp send failed', {
                meta: { schoolId: normalizedSchoolId, phone: maskPhone(normalizedPhone), error }
            })
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send WhatsApp message'
            }
        }
    }

    async restoreConnectedSessions() {
        const sessions = await whatsappSessionModel
            .find({ status: { $in: ['connected', 'connecting'] } })
            .select({ schoolId: 1 })
            .lean<Array<{ schoolId?: string }>>()

        for (const session of sessions) {
            if (!session.schoolId) {
                continue
            }

            if (!this.hasAuthDir(session.schoolId)) {
                continue
            }

            await this.connect(session.schoolId)
        }
    }

    /**
     * Acquires a school-level lock for campaign dispatch.
     * @returns true if lock acquired, false if school already has active dispatch
     */
    acquireDispatchLock(schoolId: string): boolean {
        if (this.activeDispatches.get(schoolId)) {
            return false
        }
        this.activeDispatches.set(schoolId, true)
        return true
    }

    /**
     * Releases the school-level lock for campaign dispatch.
     */
    releaseDispatchLock(schoolId: string): void {
        this.activeDispatches.delete(schoolId)
    }

    /**
     * Checks if a school currently has an active dispatch.
     */
    hasActiveDispatch(schoolId: string): boolean {
        return this.activeDispatches.get(schoolId) === true
    }

    /**
     * Enqueues a dispatch function for a school.
     * @returns true if enqueued successfully, false if queue capacity exceeded
     */
    enqueueDispatch(schoolId: string, dispatchFn: () => Promise<void>): boolean {
        const queue = this.dispatchQueues.get(schoolId) || []

        // Cap queue length at 5 per school
        if (queue.length >= 5) {
            return false
        }

        queue.push(dispatchFn)
        this.dispatchQueues.set(schoolId, queue)
        return true
    }

    /**
     * Processes the next queued dispatch for a school, if any.
     */
    processNextInQueue(schoolId: string): void {
        const queue = this.dispatchQueues.get(schoolId)

        if (!queue || queue.length === 0) {
            // Clean up empty queue
            if (queue) {
                this.dispatchQueues.delete(schoolId)
            }
            return
        }

        // Dequeue and execute the next dispatch
        const nextDispatch = queue.shift()

        if (queue.length === 0) {
            this.dispatchQueues.delete(schoolId)
        } else {
            this.dispatchQueues.set(schoolId, queue)
        }

        if (nextDispatch) {
            // Execute immediately (fire and forget - errors handled within the dispatch function)
            void nextDispatch()
        }
    }
}

const whatsappService = new WhatsAppService()

// Reset stale sessions on every deploy
void whatsappSessionModel.updateMany(
    { status: { $in: ['connected', 'connecting'] } },
    {
        $set: {
            status: 'disconnected',
            qrCode: '',
            phoneNumber: '',
            errorMessage: 'Server restarted. Please reconnect.'
        }
    }
)

export default whatsappService
