export type TWhatsAppMessageType = 'daily_diary' | 'daily_update' | 'announcement' | 'attendance_update' | 'fee_reminder' | 'custom'

export type TWhatsAppAudienceType =
    | 'all_students'
    | 'class_all_sections'
    | 'class_section'
    | 'selected_students'
    | 'all_staff'
    | 'staff_role'
    | 'selected_staff'

export type TWhatsAppSendMode = 'now' | 'daily' | 'monthly'

export type TWhatsAppRecipientStatus = 'queued' | 'sent' | 'failed'

export type TWhatsAppCampaignStatus = 'scheduled' | 'sent' | 'failed'

export interface IWhatsAppTemplate {
    schoolId: string
    name: string
    category: string
    language: string
    body: string
    variables: string[]
}

export interface IWhatsAppTest {
    schoolId: string
    templateName: string
    phone: string
    sampleData: string
}

export interface IWhatsAppRecipient {
    targetType: 'parent' | 'staff' | 'custom'
    targetId: string
    name: string
    phone: string
    studentName?: string
    guardianName?: string
    className?: string
    section?: string
    statusText?: string
    dateText?: string
    amountText?: string
    dueDateText?: string
    feeMonthText?: string
    role?: string
    status: TWhatsAppRecipientStatus
    sentAt?: Date | null
    error?: string
}

export interface IWhatsAppAudience {
    type: TWhatsAppAudienceType
    className?: string
    section?: string
    studentIds?: string[]
    staffIds?: string[]
    staffRoles?: string[]
    customPhones?: string[]
}

export interface IWhatsAppCampaign {
    schoolId: string
    title: string
    body: string
    messageType: TWhatsAppMessageType
    templateName?: string
    audience: IWhatsAppAudience
    sendMode: TWhatsAppSendMode
    dayOfMonth?: number | null
    dailyTime?: string | null
    purpose?: string
    whatsappTemplateId?: string | null
    includeLateFee?: boolean
    recipientFilter?: 'unpaid' | 'overdue' | 'all'
    nextRunAt?: Date | null
    lastRunAt?: Date | null
    status: TWhatsAppCampaignStatus
    recipientCount: number
    sentCount: number
    failedCount: number
    recipients: IWhatsAppRecipient[]
}

export interface IWhatsAppTemplateWithId extends IWhatsAppTemplate {
    _id: string
}
