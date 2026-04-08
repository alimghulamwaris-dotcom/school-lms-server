import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../handlers/httpResponse'
import responseMessage from '../../constant/responseMessage'
import httpError from '../../handlers/errorHandler/httpError'
import asyncHandler from '../../handlers/async'
import { CustomError } from '../../utils/errors'
import { validateSchema } from '../../utils/joi-validate'
import { createAdmissionSchema, importAdmissionsSchema } from './validation/validation.schema'
import { createAdmissionService, importAdmissionsService, listAdmissionsService } from './admissions.service'
import { ICreateAdmission, ICreateAdmissionRequest, IImportAdmissions, IImportAdmissionsRequest, IListAdmissions } from './types/admission.interface'

export default {
    create: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ICreateAdmission
            const { error, payload } = validateSchema<ICreateAdmissionRequest>(createAdmissionSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await createAdmissionService(payload)
            httpResponse(response, request, 201, responseMessage.school.ADMISSION_CREATED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    import: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as IImportAdmissions
            const { error, payload } = validateSchema<IImportAdmissionsRequest>(importAdmissionsSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await importAdmissionsService(payload)
            httpResponse(response, request, 201, responseMessage.school.ADMISSION_CREATED, result)
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
            const { query } = request as IListAdmissions
            const schoolId = query.schoolId || ''
            const result = await listAdmissionsService(schoolId)
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
