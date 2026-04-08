import { NextFunction, Request, Response } from 'express'
import responseMessage from '../../constant/responseMessage'
import asyncHandler from '../../handlers/async'
import httpError from '../../handlers/errorHandler/httpError'
import httpResponse from '../../handlers/httpResponse'
import { IAuthenticateRequest } from '../../types/types'
import { CustomError } from '../../utils/errors'
import { validateSchema } from '../../utils/joi-validate'
import { createInvitationService, listInvitationsService } from './invitation.service'
import { ICreateInvitation, ICreateInvitationRequest, IListInvitations } from './types/invitation.interface'
import { createInvitationSchema } from './validation/validation.schema'

export default {
    create: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ICreateInvitation
            const { error, payload } = validateSchema<ICreateInvitationRequest>(createInvitationSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await createInvitationService(request as IAuthenticateRequest, payload)
            httpResponse(response, request, 201, responseMessage.school.INVITATION_SENT, result)
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
            const { query } = request as IListInvitations
            const schoolId = query.schoolId || ''
            const result = await listInvitationsService(request as IAuthenticateRequest, schoolId)
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
