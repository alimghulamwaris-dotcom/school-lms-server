import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../handlers/httpResponse'
import responseMessage from '../../constant/responseMessage'
import httpError from '../../handlers/errorHandler/httpError'
import asyncHandler from '../../handlers/async'
import { CustomError } from '../../utils/errors'
import { validateSchema } from '../../utils/joi-validate'
import {
    audienceOptionsQuerySchema,
    campaignListQuerySchema,
    createCampaignSchema,
    createTemplateSchema,
    createTestSchema
} from './validation/validation.schema'
import {
    createCampaignService,
    createTemplateService,
    createTestService,
    getAudienceOptionsService,
    listCampaignsService,
    listTemplatesService
} from './whatsapp.service'
import {
    IAudienceOptions,
    IAudienceOptionsQuery,
    ICampaignListQuery,
    ICreateCampaign,
    ICreateCampaignRequest,
    ICreateTemplate,
    ICreateTemplateRequest,
    ICreateTest,
    ICreateTestRequest,
    IListCampaigns,
    IListTemplates
} from './types/whatsapp.interface'

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
            const { body } = request as ICreateTest
            const { error, payload } = validateSchema<ICreateTestRequest>(createTestSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await createTestService(payload)
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
    })
}
