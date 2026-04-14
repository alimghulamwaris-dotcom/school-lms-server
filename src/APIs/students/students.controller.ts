import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../handlers/httpResponse'
import responseMessage from '../../constant/responseMessage'
import httpError from '../../handlers/errorHandler/httpError'
import asyncHandler from '../../handlers/async'
import { CustomError } from '../../utils/errors'
import { validateSchema } from '../../utils/joi-validate'
import { createStudentSchema, executePromotionsSchema, previewPromotionsSchema, updateStudentSchema } from './validation/validation.schema'
import {
    approveStudentService,
    createStudentService,
    deleteStudentService,
    executePromotionsService,
    getStudentDetailService,
    listPromotionsService,
    listStudentsService,
    previewPromotionsService,
    updateStudentService
} from './students.service'
import {
    IApproveStudent,
    ICreateStudent,
    ICreateStudentRequest,
    IDeleteStudent,
    IExecutePromotions,
    IExecutePromotionsRequest,
    IGetStudentDetail,
    IListStudents,
    IListPromotions,
    IPreviewPromotions,
    IPreviewPromotionsRequest,
    IUpdateStudent,
    IUpdateStudentRequest
} from './types/student.interface'
import { IAuthenticateRequest } from '../../types/types'

export default {
    create: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ICreateStudent
            const { error, payload } = validateSchema<ICreateStudentRequest>(createStudentSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await createStudentService(payload)
            httpResponse(response, request, 201, responseMessage.school.STUDENT_CREATED, result)
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
            const { query } = request as IListStudents
            const schoolId = query.schoolId || ''
            const className = typeof query.className === 'string' ? query.className : undefined
            const section = typeof query.section === 'string' ? query.section : undefined
            const status = typeof query.status === 'string' ? query.status : undefined
            const search = typeof query.search === 'string' ? query.search : undefined

            const result = await listStudentsService(schoolId, {
                className,
                section,
                status,
                search
            })
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    detail: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params, query } = request as IGetStudentDetail
            const schoolId = query.schoolId || ''
            const result = await getStudentDetailService(params.id, schoolId)
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
            const { params, body } = request as IUpdateStudent
            const { error, payload } = validateSchema<IUpdateStudentRequest>(updateStudentSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            // const typedRequest = request as IUpdateStudent & IAuthenticateRequest
            const result = await updateStudentService(params.id, payload)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    remove: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const typedRequest = request as IDeleteStudent & IAuthenticateRequest
            const result = await deleteStudentService(typedRequest.params.id)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    approve: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params } = request as IApproveStudent
            const result = await approveStudentService(params.id)
            httpResponse(response, request, 200, responseMessage.school.STUDENT_APPROVED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    previewPromotions: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as IPreviewPromotions
            const { error, payload } = validateSchema<IPreviewPromotionsRequest>(previewPromotionsSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await previewPromotionsService(payload)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    executePromotions: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const typedRequest = request as IExecutePromotions & IAuthenticateRequest
            const { error, payload } = validateSchema<IExecutePromotionsRequest>(executePromotionsSchema, typedRequest.body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await executePromotionsService(payload, typedRequest)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    listPromotions: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as IListPromotions
            const schoolId = query.schoolId || ''
            const academicYear = typeof query.academicYear === 'string' ? query.academicYear : undefined
            const examId = typeof query.examId === 'string' ? query.examId : undefined
            const className = typeof query.className === 'string' ? query.className : undefined
            const section = typeof query.section === 'string' ? query.section : undefined
            const studentId = typeof query.studentId === 'string' ? query.studentId : undefined
            const search = typeof query.search === 'string' ? query.search : undefined
            const limit = query.limit ? Number(query.limit) : undefined

            const result = await listPromotionsService(schoolId, {
                academicYear,
                examId,
                className,
                section,
                studentId,
                search,
                limit: Number.isFinite(limit) ? limit : undefined
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
