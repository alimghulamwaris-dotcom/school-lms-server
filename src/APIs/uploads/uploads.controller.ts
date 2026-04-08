import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../handlers/httpResponse'
import responseMessage from '../../constant/responseMessage'
import httpError from '../../handlers/errorHandler/httpError'
import asyncHandler from '../../handlers/async'
import { CustomError } from '../../utils/errors'
import { uploadFileService } from './uploads.service'

export default {
    upload: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const file = (request as Request & { file?: Express.Multer.File }).file

            if (!file) {
                return httpError(next, new Error('File is required'), request, 422)
            }

            const { resourceType, folder } = request.body as {
                resourceType?: string
                folder?: string
            }

            const result = await uploadFileService(file, { resourceType, folder })
            httpResponse(response, request, 201, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    })
}
