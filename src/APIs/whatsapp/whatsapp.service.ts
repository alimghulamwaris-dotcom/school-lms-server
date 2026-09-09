import classroomRepo from '../classes/_shared/repo/classroom.repository'
import staffRepo from '../staff/_shared/repo/staff.repository'
import studentRepo from '../students/_shared/repo/student.repository'
import admissionRepo from '../admissions/_shared/repo/admission.repository'
import feeInvoiceModel from '../fees/_shared/models/feeInvoice.model'
import { CustomError } from '../../utils/errors'
import responseMessage from '../../constant/responseMessage'
import logger from '../../handlers/logger'
import whatsappRepo from './_shared/repo/whatsapp.repository'
import { sendWhatsAppText } from '../../services/whatsappProvider'
import whatsappService from '../../services/whatsappService'
import { IWhatsAppAudience, IWhatsAppCampaign, IWhatsAppRecipient } from './_shared/types/whatsapp.interface'
import {
    ICampaignListQuery,
    ICreateCampaignRequest,
    ICreateTemplateRequest,
    ICreateTestRequest,
    IUpdateTemplateRequest
} from './types/whatsapp.interface'

const normalize = (value: string) => value.trim().toLowerCase()
const normalizePhone = (value?: string) => (value || '').replace(/\D/g, '')

const getRecordId = (value: unknown) => {
    if (!value || typeof value !== 'object') {
        return ''
    }

    const data = value as { _id?: unknown }
    return data._id ? String(data._id as unknown as string) : ''
}

const getStringValue = (value: unknown, fallback: string = '') => {
    return typeof value === 'string' ? value : fallback
}

const getNextRunAt = (dailyTime: string) => {
    const [hourText, minuteText] = dailyTime.split(':')
    const hour = Number(hourText)
    const minute = Number(minuteText)

    const now = new Date()
    const next = new Date(now)
    next.setHours(hour, minute, 0, 0)

    if (next.getTime() <= now.getTime()) {
        next.setDate(next.getDate() + 1)
    }

    return next
}

export const getNextMonthlyRunAt = (dayOfMonth: number, dailyTime: string = '08:00', fromDate: Date = new Date()): Date => {
    const [hourText, minuteText] = dailyTime.split(':')
    const hour = Number(hourText) || 0
    const minute = Number(minuteText) || 0

    let year = fromDate.getFullYear()
    let month = fromDate.getMonth() // 0-indexed

    const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
    const clampedDay = Math.min(dayOfMonth, getDaysInMonth(year, month))
    const candidate = new Date(year, month, clampedDay, hour, minute, 0, 0)

    if (candidate.getTime() <= fromDate.getTime()) {
        month += 1
        if (month > 11) {
            month = 0
            year += 1
        }
        const nextClampedDay = Math.min(dayOfMonth, getDaysInMonth(year, month))
        return new Date(year, month, nextClampedDay, hour, minute, 0, 0)
    }
    return candidate
}

const mergeStudentLikeRecords = (students: unknown[], admissions: unknown[]) => {
    const byGr = new Map<string, Record<string, unknown>>()

    for (const item of students as Record<string, unknown>[]) {
        const grNumber = getStringValue(item.grNumber)
        if (!grNumber) {
            continue
        }
        byGr.set(grNumber, item)
    }

    for (const item of admissions as Record<string, unknown>[]) {
        const grNumber = getStringValue(item.grNumber)
        if (!grNumber || byGr.has(grNumber)) {
            continue
        }
        byGr.set(grNumber, item)
    }

    return Array.from(byGr.values())
}

const resolveStudentsByAudience = (students: unknown[], audience: IWhatsAppAudience) => {
    const normalizedClass = normalize(audience.className || '')
    const normalizedSection = normalize(audience.section || '')
    const selectedIds = new Set((audience.studentIds || []).map((id) => String(id)))

    return students.filter((item) => {
        const status = normalize(getStringValue((item as { status?: unknown }).status))
        if (status === 'transferred' || status === 'inactive') {
            return false
        }

        const className = normalize(getStringValue((item as { className?: unknown }).className))
        const section = normalize(getStringValue((item as { section?: unknown }).section))
        const itemId = getRecordId(item)

        switch (audience.type) {
            case 'all_students':
                return true
            case 'class_all_sections':
                return className === normalizedClass
            case 'class_section':
                return className === normalizedClass && section === normalizedSection
            case 'selected_students':
                return itemId ? selectedIds.has(itemId) : false
            default:
                return false
        }
    })
}

const resolveStaffByAudience = (staff: unknown[], audience: IWhatsAppAudience) => {
    const selectedIds = new Set((audience.staffIds || []).map((id) => String(id)))
    const selectedRoles = new Set((audience.staffRoles || []).map((role) => normalize(role)))

    return staff.filter((item) => {
        const status = normalize(getStringValue((item as { status?: unknown }).status, 'active'))
        if (status === 'inactive') {
            return false
        }

        const itemId = getRecordId(item)
        const role = normalize(getStringValue((item as { role?: unknown }).role))

        switch (audience.type) {
            case 'all_staff':
                return true
            case 'staff_role':
                return selectedRoles.has(role)
            case 'selected_staff':
                return itemId ? selectedIds.has(itemId) : false
            default:
                return false
        }
    })
}

const toStudentRecipient = (item: unknown): IWhatsAppRecipient => {
    const data = item as {
        name?: unknown
        guardianName?: unknown
        guardianPhone?: unknown
        className?: unknown
        section?: unknown
    }

    const studentName = getStringValue(data.name)
    const guardianName = getStringValue(data.guardianName)

    return {
        targetType: 'parent',
        targetId: getRecordId(item),
        name: guardianName ? `${guardianName} (Parent of ${studentName})` : studentName,
        studentName,
        guardianName,
        phone: normalizePhone(getStringValue(data.guardianPhone)),
        className: getStringValue(data.className),
        section: getStringValue(data.section),
        status: 'queued',
        sentAt: null,
        error: ''
    }
}

export const applyTemplateVariables = (body: string, recipient: IWhatsAppRecipient): string => {
    let studentName = recipient.studentName || ''
    let guardianName = recipient.guardianName || ''

    if (!studentName && recipient.name) {
        const match = recipient.name.match(/\(Parent of (.*)\)/)
        if (match) {
            studentName = match[1].trim()
            if (!guardianName) {
                guardianName = recipient.name.replace(/\(Parent of .*\)/, '').trim()
            }
        } else if (recipient.targetType !== 'parent') {
            studentName = recipient.name
        }
    }

    return body.replace(
        /\{(student_name|guardian_name|class_name|section|status|date|amount|due_date|fee_month)\}/g,
        (_match: string, key: string) => {
            switch (key) {
                case 'student_name':
                    return studentName
                case 'guardian_name':
                    return guardianName
                case 'class_name':
                    return recipient.className || ''
                case 'section':
                    return recipient.section || ''
                case 'status':
                    return recipient.statusText || ''
                case 'date':
                    return recipient.dateText || ''
                case 'amount':
                    return recipient.amountText || ''
                case 'due_date':
                    return recipient.dueDateText || ''
                case 'fee_month':
                    return recipient.feeMonthText || ''
                default:
                    return ''
            }
        }
    )
}

const toStaffRecipient = (item: unknown): IWhatsAppRecipient => {
    const data = item as {
        name?: unknown
        role?: unknown
        phone?: unknown
    }

    return {
        targetType: 'staff',
        targetId: getRecordId(item),
        name: getStringValue(data.name),
        phone: normalizePhone(getStringValue(data.phone)),
        role: getStringValue(data.role),
        status: 'queued',
        sentAt: null,
        error: ''
    }
}

const mergeRecipients = (recipients: IWhatsAppRecipient[]) => {
    const phoneMap = new Map<string, IWhatsAppRecipient>()

    for (const item of recipients) {
        if (!item.phone) {
            continue
        }

        if (!phoneMap.has(item.phone)) {
            phoneMap.set(item.phone, item)
        }
    }

    return Array.from(phoneMap.values())
}

const sendWhatsAppMessage = async (schoolId: string, phoneNumber: string, message: string) => {
    const liveResult = await whatsappService.sendMessage(schoolId, phoneNumber, message)

    if (liveResult.success) {
        return liveResult
    }

    if (liveResult.error !== 'WhatsApp not connected') {
        return liveResult
    }

    return sendWhatsAppText({
        to: phoneNumber,
        body: message
    })
}

const dispatchNow = async (body: string, recipients: IWhatsAppRecipient[], schoolId: string) => {
    const now = new Date()
    const dispatched: IWhatsAppRecipient[] = []

    for (const item of recipients) {
        if (item.phone.length < 8) {
            dispatched.push({
                ...item,
                status: 'failed',
                sentAt: null,
                error: 'Invalid phone number'
            })
            continue
        }

        const personalizedBody = applyTemplateVariables(body, item)
        const result = await sendWhatsAppMessage(schoolId, item.phone, personalizedBody)

        if (result.success) {
            dispatched.push({
                ...item,
                status: 'sent',
                sentAt: now,
                error: ''
            })
        } else {
            dispatched.push({
                ...item,
                status: 'failed',
                sentAt: null,
                error: result.error || 'Failed to send message'
            })
        }
    }

    const sentCount = dispatched.filter((item) => item.status === 'sent').length
    const failedCount = dispatched.length - sentCount

    return {
        recipients: dispatched,
        sentCount,
        failedCount,
        status: sentCount > 0 ? ('sent' as const) : ('failed' as const)
    }
}

const fetchStudentLikeRecords = async (schoolId: string) => {
    const [students, admissions] = await Promise.all([studentRepo.findStudentsBySchool(schoolId), admissionRepo.findAdmissionsBySchool(schoolId)])

    return mergeStudentLikeRecords(students as unknown[], admissions as unknown[])
}

export const resolveRecipientsForAudience = async (
    schoolId: string,
    audience: IWhatsAppAudience,
    options?: {
        purpose?: string
        messageType?: string
        includeLateFee?: boolean
        recipientFilter?: 'unpaid' | 'overdue' | 'all'
    }
) => {
    const [studentLikeRecords, staff] = await Promise.all([fetchStudentLikeRecords(schoolId), staffRepo.findStaffBySchool(schoolId)])

    const isFeeReminder = options?.purpose === 'fee_reminder' || options?.messageType === 'fee_reminder'
    const recipientFilter = options?.recipientFilter || (options?.includeLateFee ? 'overdue' : 'unpaid')
    const invoiceByStudentId = new Map<string, { balanceAmount?: number; totalAmount?: number; dueDate?: Date; month?: string; status?: string }>()
    const invoiceByGr = new Map<string, { balanceAmount?: number; totalAmount?: number; dueDate?: Date; month?: string; status?: string }>()

    if (isFeeReminder) {
        const invoices = await feeInvoiceModel
            .find({
                schoolId,
                status: { $ne: 'paid' },
                balanceAmount: { $gt: 0 }
            })
            .sort({ createdAt: -1 })
        for (const inv of invoices) {
            if (inv.studentId && !invoiceByStudentId.has(inv.studentId)) {
                invoiceByStudentId.set(inv.studentId, inv)
            }
            if (inv.grNumber && !invoiceByGr.has(inv.grNumber)) {
                invoiceByGr.set(inv.grNumber, inv)
            }
        }
    }

    let filteredStudents = resolveStudentsByAudience(studentLikeRecords, audience)

    if (isFeeReminder && recipientFilter !== 'all') {
        const now = new Date()
        filteredStudents = filteredStudents.filter((item) => {
            const itemId = getRecordId(item)
            const gr = getStringValue((item as Record<string, unknown>).grNumber)
            const invoice = (itemId && invoiceByStudentId.get(itemId)) || (gr && invoiceByGr.get(gr))
            if (!invoice) return false
            if (recipientFilter === 'overdue') {
                const isOverdue = invoice.dueDate && new Date(invoice.dueDate).getTime() < now.getTime()
                return isOverdue
            }
            return true
        })
    }

    const studentRecipients: IWhatsAppRecipient[] = filteredStudents.map((item) => {
        const base = toStudentRecipient(item)
        if (isFeeReminder) {
            const itemId = getRecordId(item)
            const gr = getStringValue((item as Record<string, unknown>).grNumber)
            const invoice = (itemId && invoiceByStudentId.get(itemId)) || (gr && invoiceByGr.get(gr))
            if (invoice) {
                base.amountText = `Rs ${invoice.balanceAmount ?? invoice.totalAmount ?? 0}`
                base.dueDateText = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : ''
                base.feeMonthText = invoice.month || ''
            } else {
                base.amountText = ''
                base.dueDateText = ''
                base.feeMonthText = ''
            }
        }
        return base
    })

    const staffRecipients = isFeeReminder ? [] : resolveStaffByAudience(staff as unknown[], audience).map(toStaffRecipient)

    const customRecipients = (audience.customPhones || []).map((phone) => ({
        targetType: 'custom' as const,
        targetId: '',
        name: 'Custom recipient',
        phone: normalizePhone(phone),
        status: 'queued' as const,
        sentAt: null,
        error: ''
    }))

    return mergeRecipients([...studentRecipients, ...staffRecipients, ...customRecipients])
}

const buildCampaignRecipients = async (payload: ICreateCampaignRequest) => {
    const merged = await resolveRecipientsForAudience(payload.schoolId, payload.audience, {
        purpose: payload.purpose || (payload.messageType === 'fee_reminder' ? 'fee_reminder' : 'general'),
        messageType: payload.messageType,
        includeLateFee: !!payload.includeLateFee,
        recipientFilter: payload.recipientFilter
    })

    if (merged.length === 0) {
        throw new CustomError('No recipients found for selected audience.', 422)
    }

    return merged
}

export const createTemplateService = async (payload: ICreateTemplateRequest) => {
    const template = await whatsappRepo.createTemplate({
        schoolId: payload.schoolId,
        name: payload.name,
        category: payload.category,
        language: payload.language,
        body: payload.body,
        variables: payload.variables || []
    })

    return {
        success: true,
        template
    }
}

export const updateTemplateService = async (id: string, schoolId: string, payload: Partial<IUpdateTemplateRequest>) => {
    const existingTemplate = await whatsappRepo.findTemplateById(id)
    if (!existingTemplate || existingTemplate.schoolId !== schoolId) {
        throw new CustomError(responseMessage.NOT_FOUND('Template'), 404)
    }

    const updatedTemplate = await whatsappRepo.updateTemplate(id, payload)
    return {
        success: true,
        template: updatedTemplate
    }
}

export const deleteTemplateService = async (id: string, schoolId: string) => {
    const existingTemplate = await whatsappRepo.findTemplateById(id)
    if (!existingTemplate || existingTemplate.schoolId !== schoolId) {
        throw new CustomError(responseMessage.NOT_FOUND('Template'), 404)
    }

    const deletedTemplate = await whatsappRepo.deleteTemplate(id)
    return {
        success: true,
        template: deletedTemplate
    }
}

export const listTemplatesService = async (schoolId: string, category?: string) => {
    const templates = await whatsappRepo.listTemplates(schoolId, category)
    return {
        success: true,
        templates
    }
}

export const createTestService = async (payload: ICreateTestRequest) => {
    const result = await sendWhatsAppMessage(payload.schoolId, payload.phone, payload.sampleData || 'Test message')

    const testMessage = await whatsappRepo.createTest({
        schoolId: payload.schoolId,
        templateName: payload.templateName,
        phone: payload.phone,
        sampleData: payload.sampleData
    })

    return {
        success: result.success,
        error: result.error,
        testMessage
    }
}

export const getAudienceOptionsService = async (schoolId: string) => {
    const [classes, studentLikeRecords, staff] = await Promise.all([
        classroomRepo.findClassroomsBySchool(schoolId),
        fetchStudentLikeRecords(schoolId),
        staffRepo.findStaffBySchool(schoolId)
    ])

    const classOptions = (classes as unknown[]).map((item) => {
        const data = item as { className?: unknown; sections?: unknown }
        return {
            _id: getRecordId(item),
            className: getStringValue(data.className),
            sections: Array.isArray(data.sections) ? data.sections.map((section) => String(section)) : []
        }
    })

    const studentOptions = studentLikeRecords
        .filter((item) => {
            const status = normalize(getStringValue((item as { status?: unknown }).status))
            return status !== 'transferred' && status !== 'inactive'
        })
        .map((item) => {
            const data = item as {
                name?: unknown
                className?: unknown
                section?: unknown
                guardianName?: unknown
                guardianPhone?: unknown
            }

            return {
                _id: getRecordId(item),
                name: getStringValue(data.name),
                className: getStringValue(data.className),
                section: getStringValue(data.section),
                guardianName: getStringValue(data.guardianName),
                guardianPhone: normalizePhone(getStringValue(data.guardianPhone))
            }
        })

    const staffOptions = (staff as unknown[])
        .filter((item) => normalize(getStringValue((item as { status?: unknown }).status, 'active')) !== 'inactive')
        .map((item) => {
            const data = item as {
                name?: unknown
                role?: unknown
                phone?: unknown
            }

            return {
                _id: getRecordId(item),
                name: getStringValue(data.name),
                role: getStringValue(data.role),
                phone: normalizePhone(getStringValue(data.phone))
            }
        })

    const staffRoles = Array.from(new Set(staffOptions.map((item) => item.role).filter((item) => item.trim().length > 0))).sort((first, second) =>
        first.localeCompare(second)
    )

    return {
        success: true,
        options: {
            classes: classOptions,
            students: studentOptions,
            staff: staffOptions,
            staffRoles
        }
    }
}

export const createCampaignService = async (payload: ICreateCampaignRequest) => {
    const purpose = payload.purpose || (payload.messageType === 'fee_reminder' ? 'fee_reminder' : 'general')
    const dayOfMonth = typeof payload.dayOfMonth === 'number' ? payload.dayOfMonth : null
    const recipientFilter = payload.recipientFilter || (payload.includeLateFee ? 'overdue' : 'unpaid')
    const includeLateFee = recipientFilter === 'overdue'
    const whatsappTemplateId = payload.whatsappTemplateId || null

    let finalBody = payload.body
    if (!finalBody && whatsappTemplateId) {
        const customTemplate = await whatsappRepo.findTemplateById(whatsappTemplateId)
        if (customTemplate) {
            finalBody = customTemplate.body
        }
    }

    const recipients = await buildCampaignRecipients({ ...payload, body: finalBody, purpose, includeLateFee, recipientFilter, whatsappTemplateId })

    let nextRunAt: Date | null = null
    if (payload.sendMode === 'monthly' && dayOfMonth && payload.dailyTime) {
        nextRunAt = getNextMonthlyRunAt(dayOfMonth, payload.dailyTime)
    } else if (payload.sendMode === 'daily' && payload.dailyTime) {
        nextRunAt = getNextRunAt(payload.dailyTime)
    }

    const campaignPayload: IWhatsAppCampaign = {
        schoolId: payload.schoolId,
        title: payload.title,
        body: finalBody,
        messageType: payload.messageType,
        templateName: payload.templateName || '',
        audience: payload.audience,
        sendMode: payload.sendMode,
        dayOfMonth,
        dailyTime: payload.sendMode === 'now' ? null : payload.dailyTime || null,
        purpose,
        whatsappTemplateId,
        includeLateFee,
        recipientFilter,
        nextRunAt,
        lastRunAt: null,
        status: 'scheduled',
        recipientCount: recipients.length,
        sentCount: 0,
        failedCount: 0,
        recipients
    }

    if (payload.sendMode === 'now') {
        const dispatched = await dispatchNow(finalBody, recipients, payload.schoolId)
        campaignPayload.recipients = dispatched.recipients
        campaignPayload.sentCount = dispatched.sentCount
        campaignPayload.failedCount = dispatched.failedCount
        campaignPayload.status = dispatched.status
        campaignPayload.nextRunAt = null
        campaignPayload.dailyTime = null
        campaignPayload.lastRunAt = new Date()
    }

    const campaign = await whatsappRepo.createCampaign(campaignPayload)

    return {
        success: true,
        campaign,
        summary: {
            recipientCount: campaign.recipientCount,
            sentCount: campaign.sentCount,
            failedCount: campaign.failedCount,
            status: campaign.status,
            sendMode: campaign.sendMode
        }
    }
}

export const runDueDailyCampaigns = async () => {
    const dueCampaigns = await whatsappRepo.findDueDailyCampaigns(new Date(), 25)

    let processed = 0

    for (const campaign of dueCampaigns as unknown[]) {
        const campaignId = getRecordId(campaign)
        if (!campaignId) {
            continue
        }

        const data = campaign as {
            schoolId?: unknown
            audience?: unknown
            dailyTime?: unknown
            sendMode?: unknown
            dayOfMonth?: unknown
            purpose?: unknown
            messageType?: unknown
            includeLateFee?: unknown
            recipientFilter?: unknown
        }

        const schoolId = getStringValue(data.schoolId)
        const dailyTime = getStringValue(data.dailyTime)
        const sendMode = getStringValue(data.sendMode) as 'daily' | 'monthly'
        const dayOfMonth = typeof data.dayOfMonth === 'number' ? data.dayOfMonth : null

        if (!schoolId || !dailyTime) {
            continue
        }

        const nextRun = sendMode === 'monthly' && dayOfMonth ? getNextMonthlyRunAt(dayOfMonth, dailyTime) : getNextRunAt(dailyTime)

        try {
            const recipients = await resolveRecipientsForAudience(schoolId, data.audience as IWhatsAppAudience, {
                purpose: getStringValue(data.purpose),
                messageType: getStringValue(data.messageType),
                includeLateFee: !!data.includeLateFee,
                recipientFilter: (data.recipientFilter as 'unpaid' | 'overdue' | 'all') || (data.includeLateFee ? 'overdue' : 'unpaid')
            })
            const body = getStringValue((campaign as { body?: unknown }).body)
            const dispatched = await dispatchNow(body, recipients, schoolId)

            await whatsappRepo.updateCampaignById(campaignId, {
                recipients: dispatched.recipients,
                recipientCount: recipients.length,
                sentCount: dispatched.sentCount,
                failedCount: dispatched.failedCount,
                status: 'scheduled',
                dailyTime,
                dayOfMonth,
                lastRunAt: new Date(),
                nextRunAt: nextRun
            })
            processed += 1
        } catch {
            await whatsappRepo.updateCampaignById(campaignId, {
                sentCount: 0,
                failedCount: 0,
                status: 'scheduled',
                dailyTime,
                dayOfMonth,
                lastRunAt: new Date(),
                nextRunAt: nextRun
            })
            processed += 1
        }
    }

    return {
        success: true,
        processed
    }
}

export const listCampaignsService = async (query: ICampaignListQuery) => {
    const limit = query.limit || 20
    const campaigns = await whatsappRepo.listCampaigns(query.schoolId, limit)

    return {
        success: true,
        campaigns
    }
}

export const deleteCampaignService = async (id: string, schoolId: string) => {
    const existingCampaign = await whatsappRepo.findCampaignById(id)
    if (!existingCampaign) {
        throw new CustomError(responseMessage.NOT_FOUND('Campaign'), 404)
    }

    if (existingCampaign.schoolId !== schoolId) {
        throw new CustomError(responseMessage.UNAUTHORIZED, 401)
    }

    if (existingCampaign.status !== 'scheduled') {
        throw new CustomError('Only scheduled campaigns can be cancelled or deleted', 400)
    }

    const deletedCampaign = await whatsappRepo.deleteCampaignById(id)
    return {
        success: true,
        campaign: deletedCampaign
    }
}

export const getStatusService = async (schoolId: string) => {
    const status = await whatsappService.getStatus(schoolId)

    return {
        status: status.status,
        phoneNumber: status.phoneNumber,
        qrCode: status.qrCode,
        errorMessage: status.errorMessage
    }
}

export const connectService = async (schoolId: string) => {
    const status = await whatsappService.connect(schoolId)

    return {
        success: true,
        schoolId,
        status: status.status,
        phoneNumber: status.phoneNumber,
        qrCode: status.qrCode,
        errorMessage: status.errorMessage
    }
}

export const disconnectService = async (schoolId: string) => {
    await whatsappService.disconnect(schoolId)

    return {
        success: true,
        schoolId,
        status: 'disconnected'
    }
}

export interface IAttendanceReminderItem {
    grNumber: string
    studentName: string
    status: string
}

export const sendAttendanceWhatsAppRemindersService = async (
    schoolId: string,
    className: string,
    section: string,
    date: Date,
    records: IAttendanceReminderItem[],
    whatsappTemplateId?: string
) => {
    try {
        const DEFAULT_TEMPLATE = 'Dear {guardian_name}, {student_name} from class {class_name} has been marked {status} for attendance on {date}.'
        let templateBody = DEFAULT_TEMPLATE
        if (whatsappTemplateId && whatsappTemplateId !== 'default') {
            const customTemplate = await whatsappRepo.findTemplateById(whatsappTemplateId)
            if (customTemplate && customTemplate.schoolId === schoolId && customTemplate.category.toLowerCase() === 'attendance') {
                templateBody = customTemplate.body
            }
        }

        const studentLikeRecords = await fetchStudentLikeRecords(schoolId)
        const studentMap = new Map<string, { guardianName?: string; guardianPhone?: string }>()
        for (const item of studentLikeRecords) {
            const gr = getStringValue(item.grNumber)
            if (gr) {
                studentMap.set(gr, {
                    guardianName: getStringValue(item.guardianName),
                    guardianPhone: normalizePhone(getStringValue(item.guardianPhone))
                })
            }
        }

        const formattedDate = date.toISOString().slice(0, 10)

        for (const rec of records) {
            const studentInfo = studentMap.get(rec.grNumber)
            const guardianPhone = studentInfo?.guardianPhone || ''
            if (!guardianPhone || guardianPhone.length < 8) {
                continue
            }

            const formatStatus = (s: string) => {
                const lower = s.toLowerCase()
                if (lower === 'present') return 'Present'
                if (lower === 'absent') return 'Absent'
                if (lower === 'on_leave') return 'On Leave'
                return s
            }

            const guardianName = studentInfo?.guardianName || ''
            const recipient: IWhatsAppRecipient = {
                targetType: 'parent',
                targetId: '',
                name: guardianName ? `${guardianName} (Parent of ${rec.studentName})` : rec.studentName,
                studentName: rec.studentName,
                guardianName,
                phone: guardianPhone,
                className,
                section,
                statusText: formatStatus(rec.status),
                dateText: formattedDate,
                status: 'queued',
                sentAt: null,
                error: ''
            }

            const personalizedBody = applyTemplateVariables(templateBody, recipient)
            try {
                await sendWhatsAppMessage(schoolId, guardianPhone, personalizedBody)
            } catch (err) {
                logger.error('Failed to send attendance reminder to phone', {
                    meta: { phone: guardianPhone, error: err }
                })
            }
        }
    } catch (err) {
        logger.error('Error in sendAttendanceWhatsAppRemindersService', {
            meta: { schoolId, className, section, error: err }
        })
    }
}
