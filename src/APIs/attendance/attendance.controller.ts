import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../handlers/httpResponse'
import responseMessage from '../../constant/responseMessage'
import httpError from '../../handlers/errorHandler/httpError'
import asyncHandler from '../../handlers/async'
import { CustomError } from '../../utils/errors'
import { validateSchema } from '../../utils/joi-validate'
import { assignTeacherSchema, createAttendanceSchema, updateAttendanceReminderConfigSchema } from './validation/validation.schema'
import {
    assignTeacherToClassService,
    createAttendanceService,
    getAttendanceReminderConfigService,
    getAttendanceScopeService,
    getAttendanceSummaryService,
    listAttendanceService,
    updateAttendanceReminderConfigService
} from './attendance.service'
import {
    IAssignTeacher,
    IAssignTeacherRequest,
    IAttendanceScope,
    IAttendanceSummary,
    ICreateAttendance,
    ICreateAttendanceRequest,
    IGetAttendanceReminderConfig,
    IListAttendance,
    IUpdateAttendanceReminderConfig,
    IUpdateAttendanceReminderConfigRequest
} from './types/attendance.interface'
import { IAuthenticateRequest } from '../../types/types'

export default {
    create: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ICreateAttendance
            const { error, payload } = validateSchema<ICreateAttendanceRequest>(createAttendanceSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await createAttendanceService(payload, request as IAuthenticateRequest)
            httpResponse(response, request, 201, responseMessage.school.ATTENDANCE_CREATED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    list: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as IListAttendance
            const schoolId = query.schoolId || ''
            const className = typeof query.className === 'string' ? query.className : undefined
            const section = typeof query.section === 'string' ? query.section : undefined
            const dateFrom = typeof query.dateFrom === 'string' ? query.dateFrom : undefined
            const dateTo = typeof query.dateTo === 'string' ? query.dateTo : undefined
            const limit = query.limit ? Number(query.limit) : undefined

            const result = await listAttendanceService(schoolId, request as IAuthenticateRequest, {
                className,
                section,
                dateFrom,
                dateTo,
                limit
            })
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    scope: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as IAttendanceScope
            const schoolId = query.schoolId || ''
            const result = await getAttendanceScopeService(schoolId, request as IAuthenticateRequest)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    summary: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as IAttendanceSummary
            const schoolId = query.schoolId || ''
            const className = typeof query.className === 'string' ? query.className : undefined
            const section = typeof query.section === 'string' ? query.section : undefined
            const date = typeof query.date === 'string' ? query.date : undefined
            const result = await getAttendanceSummaryService(schoolId, request as IAuthenticateRequest, {
                className,
                section,
                date
            })
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    assignTeacher: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as IAssignTeacher
            const { error, payload } = validateSchema<IAssignTeacherRequest>(assignTeacherSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await assignTeacherToClassService(payload, request as IAuthenticateRequest)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    getReminderConfig: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as IGetAttendanceReminderConfig
            const schoolId = query.schoolId || ''
            const result = await getAttendanceReminderConfigService(schoolId, request as IAuthenticateRequest)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    updateReminderConfig: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as IUpdateAttendanceReminderConfig
            const { error, payload } = validateSchema<IUpdateAttendanceReminderConfigRequest>(updateAttendanceReminderConfigSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await updateAttendanceReminderConfigService(payload, request as IAuthenticateRequest)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    })
}
