import { NextFunction, Request, Response } from 'express'
import responseMessage from '../../constant/responseMessage'
import asyncHandler from '../../handlers/async'
import httpError from '../../handlers/errorHandler/httpError'
import httpResponse from '../../handlers/httpResponse'
import { CustomError } from '../../utils/errors'
import { validateSchema } from '../../utils/joi-validate'
import { addSectionService, createClassService, getClassByIdService, listClassesService, updateClassService } from './classes.service'
import {
    IAddSection,
    IAddSectionRequest,
    ICreateClass,
    ICreateClassRequest,
    IGetClassById,
    IListClasses,
    IUpdateClass,
    IUpdateClassRequest
} from './types/class.interface'
import { addSectionSchema, createClassSchema, updateClassSchema } from './validation/validation.schema'

export default {
    create: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ICreateClass
            const { error, payload } = validateSchema<ICreateClassRequest>(createClassSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await createClassService(payload)
            httpResponse(response, request, 201, responseMessage.school.CLASS_CREATED, result)
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
            const { query } = request as IListClasses
            const schoolId = query.schoolId || ''
            const result = await listClassesService(schoolId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    getById: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params, query } = request as IGetClassById
            const schoolId = query.schoolId || ''
            const result = await getClassByIdService(params.id, schoolId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    addSection: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params, body } = request as IAddSection
            const { error, payload } = validateSchema<IAddSectionRequest>(addSectionSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await addSectionService(params.id, payload)
            httpResponse(response, request, 200, responseMessage.school.SECTION_ADDED, result)
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
            const { params, body } = request as IUpdateClass
            const { error, payload } = validateSchema<IUpdateClassRequest>(updateClassSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await updateClassService(params.id, payload)
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
