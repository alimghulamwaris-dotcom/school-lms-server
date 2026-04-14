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
}

type TSessionLean = {
    schoolId: string
    phoneNumber?: string
    status: TWhatsAppSessionStatus
    qrCode?: string
    errorMessage?: string
}

const logger = pino({ level: 'silent' })

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

            await this.writeSession(schoolId, {
                status: 'connected',
                phoneNumber,
                qrCode: '',
                errorMessage: ''
            })
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
                    keys: makeCacheableSignalKeyStore(state.keys, logger)
                },
                printQRInTerminal: false,
                logger,
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

        if (!normalizedPhone || normalizedPhone.length < 8) {
            return {
                success: false,
                error: 'Invalid phone number'
            }
        }

        if (!this.sockets.has(normalizedSchoolId) && this.hasAuthDir(normalizedSchoolId) && !this.connectingSchools.has(normalizedSchoolId)) {
            await this.connect(normalizedSchoolId)
        }

        const session = await this.readSession(normalizedSchoolId)
        const socket = this.sockets.get(normalizedSchoolId)

        if (!socket || session?.status !== 'connected') {
            return {
                success: false,
                error: 'WhatsApp not connected'
            }
        }

        try {
            await socket.sendMessage(`${normalizedPhone}@s.whatsapp.net`, {
                text: message
            })

            return {
                success: true
            }
        } catch (error) {
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
