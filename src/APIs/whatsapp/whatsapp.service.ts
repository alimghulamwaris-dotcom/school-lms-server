import classroomRepo from '../classes/_shared/repo/classroom.repository'
import staffRepo from '../staff/_shared/repo/staff.repository'
import studentRepo from '../students/_shared/repo/student.repository'
import admissionRepo from '../admissions/_shared/repo/admission.repository'
import { CustomError } from '../../utils/errors'
import whatsappRepo from './_shared/repo/whatsapp.repository'
import { sendWhatsAppText } from '../../services/whatsappProvider'
import { IWhatsAppAudience, IWhatsAppCampaign, IWhatsAppRecipient } from './_shared/types/whatsapp.interface'
import { ICampaignListQuery, ICreateCampaignRequest, ICreateTemplateRequest, ICreateTestRequest } from './types/whatsapp.interface'

const normalize = (value: string) => value.trim().toLowerCase()
const normalizePhone = (value?: string) => (value || '').replace(/\D/g, '')

const getRecordId = (value: unknown) => {
    if (!value || typeof value !== 'object') {
        return ''
    }

    const data = value as { _id?: unknown }
    return data._id ? String(data._id) : ''
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
        phone: normalizePhone(getStringValue(data.guardianPhone)),
        className: getStringValue(data.className),
        section: getStringValue(data.section),
        status: 'queued',
        sentAt: null,
        error: ''
    }
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

const dispatchNow = async (body: string, recipients: IWhatsAppRecipient[]) => {
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

        const result = await sendWhatsAppText({
            to: item.phone,
            body
        })

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

const resolveRecipientsForAudience = async (schoolId: string, audience: IWhatsAppAudience) => {
    const [studentLikeRecords, staff] = await Promise.all([fetchStudentLikeRecords(schoolId), staffRepo.findStaffBySchool(schoolId)])

    const studentRecipients = resolveStudentsByAudience(studentLikeRecords, audience).map(toStudentRecipient)
    const staffRecipients = resolveStaffByAudience(staff as unknown[], audience).map(toStaffRecipient)

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
    const merged = await resolveRecipientsForAudience(payload.schoolId, payload.audience)

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

export const listTemplatesService = async (schoolId: string) => {
    const templates = await whatsappRepo.listTemplates(schoolId)
    return {
        success: true,
        templates
    }
}

export const createTestService = async (payload: ICreateTestRequest) => {
    const testMessage = await whatsappRepo.createTest({
        schoolId: payload.schoolId,
        templateName: payload.templateName,
        phone: payload.phone,
        sampleData: payload.sampleData
    })

    return {
        success: true,
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
    const recipients = await buildCampaignRecipients(payload)

    const campaignPayload: IWhatsAppCampaign = {
        schoolId: payload.schoolId,
        title: payload.title,
        body: payload.body,
        messageType: payload.messageType,
        templateName: payload.templateName || '',
        audience: payload.audience,
        sendMode: payload.sendMode,
        dailyTime: payload.sendMode === 'daily' ? payload.dailyTime || null : null,
        nextRunAt: payload.sendMode === 'daily' && payload.dailyTime ? getNextRunAt(payload.dailyTime) : null,
        lastRunAt: null,
        status: 'scheduled',
        recipientCount: recipients.length,
        sentCount: 0,
        failedCount: 0,
        recipients
    }

    if (payload.sendMode === 'now') {
        const dispatched = await dispatchNow(payload.body, recipients)
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
        }

        const schoolId = getStringValue(data.schoolId)
        const dailyTime = getStringValue(data.dailyTime)

        if (!schoolId || !dailyTime) {
            continue
        }

        try {
            const recipients = await resolveRecipientsForAudience(schoolId, data.audience as IWhatsAppAudience)
            const body = getStringValue((campaign as { body?: unknown }).body)
            const dispatched = await dispatchNow(body, recipients)

            await whatsappRepo.updateCampaignById(campaignId, {
                recipients: dispatched.recipients,
                recipientCount: recipients.length,
                sentCount: dispatched.sentCount,
                failedCount: dispatched.failedCount,
                status: 'scheduled',
                dailyTime,
                lastRunAt: new Date(),
                nextRunAt: getNextRunAt(dailyTime)
            })
            processed += 1
        } catch {
            await whatsappRepo.updateCampaignById(campaignId, {
                sentCount: 0,
                failedCount: 0,
                status: 'scheduled',
                dailyTime,
                lastRunAt: new Date(),
                nextRunAt: getNextRunAt(dailyTime)
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
