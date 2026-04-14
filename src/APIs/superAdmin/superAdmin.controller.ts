import { NextFunction, Request, Response } from 'express'
import responseMessage from '../../constant/responseMessage'
import asyncHandler from '../../handlers/async'
import httpError from '../../handlers/errorHandler/httpError'
import httpResponse from '../../handlers/httpResponse'
import { CustomError } from '../../utils/errors'
import { validateSchema } from '../../utils/joi-validate'
import { ISchoolRegisterRequest } from '../school/types/school.interface'
import { schoolRegisterSchema } from '../school/validation/validation.schema'
import {
    createSchoolBySuperAdminService,
    deleteSchoolBySuperAdminService,
    getSuperAdminOverviewService,
    listSuperAdminSchoolsService
} from './superAdmin.service'
import {
    ISuperAdminCreateSchool,
    ISuperAdminDeleteSchoolRequest,
    ISuperAdminListSchoolsRequest,
    ISuperAdminSchoolsQuery
} from './types/superAdmin.interface'
import { superAdminSchoolListSchema } from './validation/validation.schema'

export default {
    overview: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const result = await getSuperAdminOverviewService()
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    listSchools: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as ISuperAdminListSchoolsRequest
            const { error, payload } = validateSchema<ISuperAdminSchoolsQuery>(superAdminSchoolListSchema, {
                search: query.search,
                page: query.page ? Number(query.page) : 1,
                limit: query.limit ? Number(query.limit) : 20
            })
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await listSuperAdminSchoolsService(payload)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    createSchool: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ISuperAdminCreateSchool
            const { error, payload } = validateSchema<ISchoolRegisterRequest>(schoolRegisterSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await createSchoolBySuperAdminService(payload)
            httpResponse(response, request, 201, responseMessage.school.SCHOOL_VERIFICATION_SENT, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    deleteSchool: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params } = request as ISuperAdminDeleteSchoolRequest
            const { schoolId } = params

            if (!schoolId || typeof schoolId !== 'string') {
                return httpError(next, new Error('Invalid school ID'), request, 400)
            }

            const result = await deleteSchoolBySuperAdminService(schoolId)
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
