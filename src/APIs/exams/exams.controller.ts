import { NextFunction, Request, Response } from 'express'
import responseMessage from '../../constant/responseMessage'
import asyncHandler from '../../handlers/async'
import httpError from '../../handlers/errorHandler/httpError'
import httpResponse from '../../handlers/httpResponse'
import { CustomError } from '../../utils/errors'
import { validateSchema } from '../../utils/joi-validate'
import {
    ICreateExam,
    ICreateExamRequest,
    IExamAwardQuery,
    IExamResultCardsQuery,
    IExamResultsQuery,
    IGetExamById,
    IListExamQuery,
    ISaveExamResults,
    ISaveExamResultsRequest
} from './types/exam.interface'
import {
    createExamService,
    getAwardListService,
    getExamByIdService,
    getFinalSemesterSummaryService,
    getExamPrintDataService,
    getResultCardsService,
    listExamResultsService,
    listExamsService,
    saveExamResultsService
} from './exams.service'
import { createExamSchema, saveExamResultsSchema } from './validation/validation.schema'
import { IAuthenticateRequest } from '../../types/types'

export default {
    create: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ICreateExam
            const { error, payload } = validateSchema<ICreateExamRequest>(createExamSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await createExamService(payload, request as IAuthenticateRequest)
            httpResponse(response, request, 201, responseMessage.school.EXAM_CREATED, result)
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
            const { query } = request as IListExamQuery
            const schoolId = query.schoolId || ''
            const className = typeof query.className === 'string' ? query.className : undefined
            const section = typeof query.section === 'string' ? query.section : undefined
            const type = typeof query.type === 'string' ? query.type : undefined
            const semester = typeof query.semester === 'string' ? query.semester : undefined
            const academicYear = typeof query.academicYear === 'string' ? query.academicYear : undefined
            const semesterNumber = query.semesterNumber ? Number(query.semesterNumber) : undefined
            const status = typeof query.status === 'string' ? query.status : undefined

            const result = await listExamsService(schoolId, {
                className,
                section,
                type,
                semester,
                academicYear,
                semesterNumber,
                status
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
            const { params, query } = request as IGetExamById
            const schoolId = query.schoolId || ''
            const result = await getExamByIdService(params.id, schoolId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    saveResults: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params, body } = request as ISaveExamResults
            const { error, payload } = validateSchema<ISaveExamResultsRequest>(saveExamResultsSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await saveExamResultsService(params.id, payload)
            httpResponse(response, request, 200, responseMessage.school.EXAM_RESULT_SAVED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    listResults: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params, query } = request as IExamResultsQuery
            const schoolId = query.schoolId || ''
            const result = await listExamResultsService(params.id, schoolId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    printData: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params, query } = request as IExamResultsQuery
            const schoolId = query.schoolId || ''
            const result = await getExamPrintDataService(params.id, schoolId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    awardList: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params, query } = request as IExamAwardQuery
            const schoolId = query.schoolId || ''
            const mode = query.mode === 'final' ? 'final' : 'exam'
            const result = await getAwardListService(params.id, schoolId, mode)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    resultCards: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params, query } = request as IExamResultCardsQuery
            const schoolId = query.schoolId || ''
            const studentId = typeof query.studentId === 'string' ? query.studentId : undefined
            const result = await getResultCardsService(params.id, schoolId, studentId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    finalSummary: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params, query } = request as IExamResultsQuery
            const schoolId = query.schoolId || ''
            const result = await getFinalSemesterSummaryService(params.id, schoolId)
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
