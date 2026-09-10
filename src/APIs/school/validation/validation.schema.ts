import joi from 'joi'
import {
    ISchoolAcademicConfigRequest,
    ISchoolAdvanceSemesterRequest,
    ISchoolBrandingRequest,
    ISchoolGrConfigRequest,
    ISchoolRegisterRequest,
    ISchoolRolloverAcademicYearRequest,
    ISchoolStaffAttendanceConfigRequest
} from '../types/school.interface'

type TSemesterValidationShape = {
    number: number
    status: string
}

type TAcademicValidationShape = {
    currentSemesterNumber: number
    semesters: TSemesterValidationShape[]
}

const parseAcademicValidationShape = (input: unknown): TAcademicValidationShape | null => {
    if (!input || typeof input !== 'object') {
        return null
    }

    const data = input as Record<string, unknown>
    const rawCurrentSemesterNumber = data.currentSemesterNumber
    const rawSemesters = data.semesters

    if (typeof rawCurrentSemesterNumber !== 'number' || !Array.isArray(rawSemesters)) {
        return null
    }

    const semesters: TSemesterValidationShape[] = []
    for (const item of rawSemesters) {
        if (!item || typeof item !== 'object') {
            return null
        }
        const semester = item as Record<string, unknown>
        if (typeof semester.number !== 'number' || typeof semester.status !== 'string') {
            return null
        }
        semesters.push({
            number: semester.number,
            status: semester.status
        })
    }

    return {
        currentSemesterNumber: rawCurrentSemesterNumber,
        semesters
    }
}

export const schoolRegisterSchema = joi.object<ISchoolRegisterRequest, true>({
    schoolName: joi.string().min(2).max(120).trim().required(),
    campus: joi.string().min(2).max(120).trim().required(),
    contactPhone: joi.string().min(4).max(20).required(),
    contactEmail: joi.string().email().required(),
    password: joi
        .string()
        .min(8)
        .max(24)
        .regex(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.* ).{8,16}$/)
        .trim()
        .required()
})

export const schoolLookupSchema = joi.object<{ code: string }, true>({
    code: joi.string().required()
})

export const schoolVerifySchema = joi.object<{ token: string }, true>({
    token: joi.string().required()
})

export const schoolGrConfigSchema = joi.object<ISchoolGrConfigRequest, true>({
    schoolId: joi.string().required(),
    grPattern: joi
        .string()
        .min(3)
        .max(80)
        .trim()
        .custom((rawValue: unknown, helpers: joi.CustomHelpers) => {
            const value = typeof rawValue === 'string' ? rawValue : ''
            if (!/\{SEQ(\d+)?\}/.test(value)) {
                return helpers.error('any.invalid')
            }
            return value
        }, 'GR pattern validation')
        .required()
        .messages({
            'any.invalid': 'GR pattern must include {SEQ} or {SEQ4} style placeholder.'
        })
})

export const schoolGrConfigQuerySchema = joi.object<{ schoolId: string }, true>({
    schoolId: joi.string().required()
})

export const schoolStaffAttendanceConfigSchema = joi.object<ISchoolStaffAttendanceConfigRequest, true>({
    schoolId: joi.string().required(),
    checkInTime: joi
        .string()
        .trim()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .required()
        .messages({
            'string.pattern.base': 'Check-in time must be in HH:mm format.'
        }),
    graceMinutes: joi.number().integer().min(0).max(180).required()
})

export const schoolStaffAttendanceConfigQuerySchema = joi.object<{ schoolId: string }, true>({
    schoolId: joi.string().required()
})

const semesterSchema = joi.object({
    number: joi.number().integer().min(1).max(12).required(),
    name: joi.string().trim().min(2).max(80).required(),
    startDate: joi.date().iso().allow(null).optional(),
    endDate: joi.date().iso().allow(null).optional(),
    status: joi.string().valid('upcoming', 'active', 'closed').required()
})

export const schoolAcademicConfigSchema = joi
    .object<ISchoolAcademicConfigRequest, true>({
        schoolId: joi.string().required(),
        academicYear: joi
            .string()
            .trim()
            .pattern(/^\d{4}-\d{4}$/)
            .required()
            .messages({
                'string.pattern.base': 'Academic year must be in YYYY-YYYY format.'
            }),
        academicYearStatus: joi.string().valid('open', 'closed').required(),
        passPercentage: joi.number().min(1).max(100).required(),
        currentSemesterNumber: joi.number().integer().min(1).max(12).required(),
        semesters: joi.array().items(semesterSchema).min(2).max(4).required()
    })
    .custom((rawValue: unknown, helpers: joi.CustomHelpers) => {
        const value = parseAcademicValidationShape(rawValue)
        if (!value) {
            return helpers.error('any.custom', { message: 'Invalid academic configuration payload.' })
        }

        const numbers = value.semesters.map((item) => item.number)
        const unique = new Set(numbers)
        if (unique.size !== numbers.length) {
            return helpers.error('any.custom', { message: 'Semester numbers must be unique.' })
        }
        if (value.currentSemesterNumber > value.semesters.length) {
            return helpers.error('any.custom', {
                message: 'Current semester number cannot exceed total configured semesters.'
            })
        }
        const activeCount = value.semesters.filter((item) => item.status === 'active').length
        if (activeCount > 1) {
            return helpers.error('any.custom', { message: 'Only one semester can be active at a time.' })
        }
        return rawValue
    })
    .messages({
        'any.custom': '{{#message}}'
    })

export const schoolAcademicConfigQuerySchema = joi.object<{ schoolId: string }, true>({
    schoolId: joi.string().required()
})

export const schoolAdvanceSemesterSchema = joi.object<ISchoolAdvanceSemesterRequest, true>({
    schoolId: joi.string().required()
})

export const schoolRolloverAcademicYearSchema = joi.object<ISchoolRolloverAcademicYearRequest, true>({
    schoolId: joi.string().required(),
    nextAcademicYear: joi
        .string()
        .trim()
        .pattern(/^\d{4}-\d{4}$/)
        .optional()
        .messages({
            'string.pattern.base': 'Academic year must be in YYYY-YYYY format.'
        }),
    totalSemesters: joi.number().integer().min(2).max(4).optional(),
    semesterNames: joi.array().items(joi.string().trim().min(2).max(80)).max(4).optional()
})

export const schoolBrandingQuerySchema = joi.object<{ schoolId: string }, true>({
    schoolId: joi.string().required()
})

export const schoolBrandingSchema = joi.object<ISchoolBrandingRequest, true>({
    schoolId: joi.string().required(),
    logoUrl: joi.string().uri().allow(null, '').optional(),
    address: joi.string().max(300).allow(null, '').optional()
})
