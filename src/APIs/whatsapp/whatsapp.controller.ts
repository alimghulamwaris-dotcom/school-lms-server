import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../handlers/httpResponse'
import responseMessage from '../../constant/responseMessage'
import httpError from '../../handlers/errorHandler/httpError'
import asyncHandler from '../../handlers/async'
import { CustomError } from '../../utils/errors'
import { validateSchema } from '../../utils/joi-validate'
import { IAuthenticateRequest } from '../../types/types'
import {
    audienceOptionsQuerySchema,
    campaignListQuerySchema,
    createCampaignSchema,
    createTemplateSchema
    // createTestSchema
} from './validation/validation.schema'
import {
    createCampaignService,
    createTemplateService,
    createTestService,
    getAudienceOptionsService,
    getStatusService,
    listCampaignsService,
    listTemplatesService,
    connectService,
    disconnectService
} from './whatsapp.service'
import {
    IAudienceOptions,
    IAudienceOptionsQuery,
    ICampaignListQuery,
    ICreateCampaign,
    ICreateCampaignRequest,
    ICreateTemplate,
    ICreateTemplateRequest,
    // ICreateTestRequest,
    IListCampaigns,
    IListTemplates
} from './types/whatsapp.interface'

const resolveSchoolId = (request: Request, schoolIdInput?: string) => {
    const req = request as IAuthenticateRequest

    if (schoolIdInput && schoolIdInput.trim()) {
        return schoolIdInput.trim()
    }

    if (req.authenticatedSchool) {
        return String(req.authenticatedSchool._id)
    }

    if (req.authenticatedSchoolId) {
        return req.authenticatedSchoolId
    }

    return ''
}

export default {
    createTemplate: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ICreateTemplate
            const { error, payload } = validateSchema<ICreateTemplateRequest>(createTemplateSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await createTemplateService(payload)
            httpResponse(response, request, 201, responseMessage.school.TEMPLATE_CREATED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    listTemplates: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as IListTemplates
            const schoolId = query.schoolId || ''
            const result = await listTemplatesService(schoolId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    createTest: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const body = request.body as { schoolId?: string; phoneNumber: string; message: string }
            const req = request as IAuthenticateRequest
            const schoolId = resolveSchoolId(req, body.schoolId)
            if (!schoolId) return httpError(next, new CustomError('School ID required', 400), request, 400)

            const { phoneNumber, message } = body
            const result = await createTestService({
                schoolId,
                templateName: 'manual_test',
                phone: phoneNumber,
                sampleData: message
            })
            httpResponse(response, request, 201, responseMessage.school.TEST_MESSAGE_SENT, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    audienceOptions: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as IAudienceOptions
            const { error, payload } = validateSchema<IAudienceOptionsQuery>(audienceOptionsQuerySchema, query)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await getAudienceOptionsService(payload.schoolId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    createCampaign: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ICreateCampaign
            const { error, payload } = validateSchema<ICreateCampaignRequest>(createCampaignSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await createCampaignService(payload)
            httpResponse(response, request, 201, responseMessage.school.WHATSAPP_CAMPAIGN_CREATED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    listCampaigns: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as IListCampaigns
            const { error, payload } = validateSchema<ICampaignListQuery>(campaignListQuerySchema, {
                schoolId: query.schoolId || '',
                limit: query.limit ? Number(query.limit) : undefined
            })
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await listCampaignsService(payload)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    getStatus: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const schoolId = resolveSchoolId(request, request.query.schoolId as string)
            if (!schoolId) return httpError(next, new CustomError('School ID required', 400), request, 400)

            const result = await getStatusService(schoolId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    connect: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const body = request.body as { schoolId?: string }
            const req = request as IAuthenticateRequest
            const schoolId = resolveSchoolId(req, body.schoolId)
            if (!schoolId) return httpError(next, new CustomError('School ID required', 400), request, 400)

            const result = await connectService(schoolId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    disconnect: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const body = request.body as { schoolId?: string }
            const req = request as IAuthenticateRequest
            const schoolId = resolveSchoolId(req, body.schoolId)
            if (!schoolId) return httpError(next, new CustomError('School ID required', 400), request, 400)

            const result = await disconnectService(schoolId)
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
