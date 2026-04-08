import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../handlers/httpResponse'
import responseMessage from '../../constant/responseMessage'
import httpError from '../../handlers/errorHandler/httpError'
import asyncHandler from '../../handlers/async'
import { CustomError } from '../../utils/errors'
import { getDashboardService } from './dashboard.service'
import { IDashboardRequest } from './types/dashboard.interface'

export default {
    get: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as IDashboardRequest
            const schoolId = query.schoolId || ''
            const result = await getDashboardService(schoolId)
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
