import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../handlers/httpResponse'
import responseMessage from '../../constant/responseMessage'
import httpError from '../../handlers/errorHandler/httpError'
import asyncHandler from '../../handlers/async'
import { CustomError } from '../../utils/errors'
import { validateSchema } from '../../utils/joi-validate'
import { createStaffSchema, updateStaffSchema } from './validation/validation.schema'
import { createStaffService, listStaffService, updateStaffService } from './staff.service'
import { ICreateStaff, ICreateStaffRequest, IListStaff, IUpdateStaff, IUpdateStaffRequest } from './types/staff.interface'

export default {
    create: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ICreateStaff
            const { error, payload } = validateSchema<ICreateStaffRequest>(createStaffSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await createStaffService(payload)
            httpResponse(response, request, 201, responseMessage.school.STAFF_CREATED, result)
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
            const { query } = request as IListStaff
            const schoolId = query.schoolId || ''
            const result = await listStaffService(schoolId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    update: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params, body } = request as IUpdateStaff
            const { error, payload } = validateSchema<IUpdateStaffRequest>(updateStaffSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await updateStaffService(params.id, payload)
            httpResponse(response, request, 200, responseMessage.school.STAFF_UPDATED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    })
}
