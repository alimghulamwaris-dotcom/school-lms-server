import { NextFunction, Request, Response } from 'express'
import responseMessage from '../../constant/responseMessage'
import asyncHandler from '../../handlers/async'
import httpError from '../../handlers/errorHandler/httpError'
import httpResponse from '../../handlers/httpResponse'
import { CustomError } from '../../utils/errors'
import { validateSchema } from '../../utils/joi-validate'
import { IAuthenticateRequest } from '../../types/types'
import { ICheckIn, ICheckInRequest, ICheckOut, ICheckOutRequest, IListStaffAttendance, IMyAttendance } from './types/staffAttendance.interface'
import { checkInStaffService, checkOutStaffService, listStaffAttendanceService, myStaffAttendanceService } from './staffAttendance.service'
import { checkInSchema, checkOutSchema } from './validation/validation.schema'

export default {
    checkIn: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ICheckIn
            const { error, payload } = validateSchema<ICheckInRequest>(checkInSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await checkInStaffService(payload.schoolId, request as IAuthenticateRequest)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    checkOut: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ICheckOut
            const { error, payload } = validateSchema<ICheckOutRequest>(checkOutSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await checkOutStaffService(payload.schoolId, request as IAuthenticateRequest)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    my: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as IMyAttendance
            const schoolId = query.schoolId || ''
            const date = typeof query.date === 'string' ? query.date : undefined
            const result = await myStaffAttendanceService(schoolId, request as IAuthenticateRequest, date)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
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
            const { query } = request as IListStaffAttendance
            const schoolId = query.schoolId || ''
            const staffId = typeof query.staffId === 'string' ? query.staffId : undefined
            const dateFrom = typeof query.dateFrom === 'string' ? query.dateFrom : undefined
            const dateTo = typeof query.dateTo === 'string' ? query.dateTo : undefined
            const limit = query.limit ? Number(query.limit) : undefined

            const result = await listStaffAttendanceService(schoolId, request as IAuthenticateRequest, {
                staffId,
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
    })
}
