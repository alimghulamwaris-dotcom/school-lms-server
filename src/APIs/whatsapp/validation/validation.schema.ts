import joi from 'joi'
import {
    IAudienceOptionsQuery,
    ICampaignListQuery,
    ICreateCampaignRequest,
    ICreateTemplateRequest,
    ICreateTestRequest,
    IUpdateTemplateRequest
} from '../types/whatsapp.interface'
import { TWhatsAppSendMode } from '../_shared/types/whatsapp.interface'
import { TEMPLATE_VARIABLE_KEYS } from '../_shared/constants/templateVariables'

const audienceTypeValues = ['all_students', 'class_all_sections', 'class_section', 'selected_students', 'all_staff', 'staff_role', 'selected_staff']

const messageTypeValues = ['daily_diary', 'daily_update', 'announcement', 'attendance_update', 'fee_reminder', 'custom']

type TAudienceValidationShape = {
    type: string
    className?: string
    section?: string
    studentIds?: string[]
    staffIds?: string[]
    staffRoles?: string[]
}

const parseAudienceShape = (input: unknown): TAudienceValidationShape | null => {
    if (!input || typeof input !== 'object') {
        return null
    }

    const value = input as Record<string, unknown>
    if (typeof value.type !== 'string') {
        return null
    }

    return {
        type: value.type,
        className: typeof value.className === 'string' ? value.className : '',
        section: typeof value.section === 'string' ? value.section : '',
        studentIds: Array.isArray(value.studentIds) ? value.studentIds.map((item) => String(item)) : [],
        staffIds: Array.isArray(value.staffIds) ? value.staffIds.map((item) => String(item)) : [],
        staffRoles: Array.isArray(value.staffRoles) ? value.staffRoles.map((item) => String(item)) : []
    }
}

type TCampaignValidationShape = {
    sendMode: TWhatsAppSendMode
    dailyTime?: string
}

const parseCampaignShape = (input: unknown): TCampaignValidationShape | null => {
    if (!input || typeof input !== 'object') {
        return null
    }

    const value = input as Record<string, unknown>
    if (value.sendMode !== 'now' && value.sendMode !== 'daily') {
        return null
    }

    return {
        sendMode: value.sendMode,
        dailyTime: typeof value.dailyTime === 'string' ? value.dailyTime : ''
    }
}

const audienceSchema = joi
    .object({
        type: joi
            .string()
            .valid(...audienceTypeValues)
            .required(),
        className: joi.string().allow('').optional(),
        section: joi.string().allow('').optional(),
        studentIds: joi.array().items(joi.string()).default([]),
        staffIds: joi.array().items(joi.string()).default([]),
        staffRoles: joi.array().items(joi.string()).default([]),
        customPhones: joi.array().items(joi.string()).default([])
    })
    .custom((rawValue: unknown, helpers: joi.CustomHelpers) => {
        const value = parseAudienceShape(rawValue)
        if (!value) {
            return helpers.error('any.invalid')
        }

        if ((value.type === 'class_all_sections' || value.type === 'class_section') && !value.className) {
            return helpers.error('any.invalid')
        }
        if (value.type === 'class_section' && !value.section) {
            return helpers.error('any.invalid')
        }
        if (value.type === 'selected_students' && (!value.studentIds || value.studentIds.length === 0)) {
            return helpers.error('any.invalid')
        }
        if (value.type === 'selected_staff' && (!value.staffIds || value.staffIds.length === 0)) {
            return helpers.error('any.invalid')
        }
        if (value.type === 'staff_role' && (!value.staffRoles || value.staffRoles.length === 0)) {
            return helpers.error('any.invalid')
        }

        return rawValue
    }, 'audience validation')
    .messages({
        'any.invalid': 'Audience selection is incomplete for the selected audience type.'
    })

export const createTemplateSchema = joi.object<ICreateTemplateRequest, true>({
    schoolId: joi.string().required(),
    name: joi.string().required(),
    category: joi.string().required(),
    language: joi.string().required(),
    body: joi.string().required(),
    variables: joi
        .array()
        .items(joi.string().valid(...TEMPLATE_VARIABLE_KEYS))
        .default([])
})

export const updateTemplateSchema = joi.object<IUpdateTemplateRequest, true>({
    schoolId: joi.string().optional(),
    name: joi.string().min(2).max(100).optional(),
    category: joi.string().min(2).max(50).optional(),
    language: joi.string().min(2).max(30).optional(),
    body: joi.string().min(1).max(2000).optional(),
    variables: joi
        .array()
        .items(joi.string().valid(...TEMPLATE_VARIABLE_KEYS))
        .optional()
})

export const createTestSchema = joi.object<ICreateTestRequest, true>({
    schoolId: joi.string().required(),
    templateName: joi.string().required(),
    phone: joi.string().min(4).max(20).required(),
    sampleData: joi.string().allow('').required()
})

export const createCampaignSchema = joi
    .object<ICreateCampaignRequest, true>({
        schoolId: joi.string().required(),
        messageType: joi
            .string()
            .valid(...messageTypeValues)
            .required(),
        title: joi.string().min(2).max(120).required(),
        body: joi.string().min(2).max(2000).required(),
        templateName: joi.string().allow('').optional(),
        audience: audienceSchema.required(),
        sendMode: joi.string().valid('now', 'daily').required(),
        dailyTime: joi
            .string()
            .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
            .allow('')
            .optional()
    })
    .custom((rawValue: unknown, helpers: joi.CustomHelpers) => {
        const value = parseCampaignShape(rawValue)
        if (!value) {
            return helpers.error('any.invalid')
        }

        if (value.sendMode === 'daily' && !value.dailyTime) {
            return helpers.error('any.invalid')
        }
        return rawValue
    }, 'daily schedule validation')
    .messages({
        'any.invalid': 'Daily time is required when send mode is daily.'
    })

export const campaignListQuerySchema = joi.object<ICampaignListQuery, true>({
    schoolId: joi.string().required(),
    limit: joi.number().min(1).max(100).optional()
})

export const audienceOptionsQuerySchema = joi.object<IAudienceOptionsQuery, true>({
    schoolId: joi.string().required()
})
