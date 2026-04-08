import { NextFunction, Request, Response } from 'express'
import responseMessage from '../../constant/responseMessage'
import asyncHandler from '../../handlers/async'
import httpError from '../../handlers/errorHandler/httpError'
import httpResponse from '../../handlers/httpResponse'
import { CustomError } from '../../utils/errors'
import { validateSchema } from '../../utils/joi-validate'
import {
    createEquipmentService,
    createLibraryBookService,
    issueEquipmentService,
    issueLibraryBookService,
    listEquipmentIssuesService,
    listEquipmentService,
    listLibraryBooksService,
    listLibraryLoansService,
    returnEquipmentIssueService,
    returnLibraryLoanService,
    updateEquipmentService,
    updateLibraryBookService
} from './records.service'
import {
    ICreateEquipment,
    ICreateEquipmentRequest,
    ICreateLibraryBook,
    ICreateLibraryBookRequest,
    IIssueEquipment,
    IIssueEquipmentRequest,
    IIssueLibraryBook,
    IIssueLibraryBookRequest,
    IListEquipmentIssuesQuery,
    IListEquipmentQuery,
    IListLibraryBooksQuery,
    IListLibraryLoansQuery,
    IReturnEquipmentIssue,
    IReturnEquipmentIssueRequest,
    IReturnLibraryLoan,
    IReturnLibraryLoanRequest,
    IUpdateEquipment,
    IUpdateEquipmentRequest,
    IUpdateLibraryBook,
    IUpdateLibraryBookRequest
} from './types/records.interface'
import {
    createEquipmentSchema,
    createLibraryBookSchema,
    issueEquipmentSchema,
    issueLibraryBookSchema,
    returnEquipmentIssueSchema,
    returnLibraryLoanSchema,
    updateEquipmentSchema,
    updateLibraryBookSchema
} from './validation/validation.schema'

export default {
    createEquipment: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ICreateEquipment
            const { error, payload } = validateSchema<ICreateEquipmentRequest>(createEquipmentSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await createEquipmentService(payload)
            httpResponse(response, request, 201, responseMessage.school.EQUIPMENT_CREATED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    listEquipment: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const query = request.query as IListEquipmentQuery
            const result = await listEquipmentService(query)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    updateEquipment: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params, body } = request as IUpdateEquipment
            const { error, payload } = validateSchema<IUpdateEquipmentRequest>(updateEquipmentSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await updateEquipmentService(params.id, payload)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    issueEquipment: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as IIssueEquipment
            const { error, payload } = validateSchema<IIssueEquipmentRequest>(issueEquipmentSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await issueEquipmentService(payload)
            httpResponse(response, request, 201, responseMessage.school.EQUIPMENT_ISSUED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    listEquipmentIssues: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const query = request.query as IListEquipmentIssuesQuery
            const result = await listEquipmentIssuesService(query)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    returnEquipmentIssue: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params, body } = request as IReturnEquipmentIssue
            const { error, payload } = validateSchema<IReturnEquipmentIssueRequest>(returnEquipmentIssueSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await returnEquipmentIssueService(params.id, payload)
            httpResponse(response, request, 200, responseMessage.school.EQUIPMENT_RETURNED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    createLibraryBook: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ICreateLibraryBook
            const { error, payload } = validateSchema<ICreateLibraryBookRequest>(createLibraryBookSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await createLibraryBookService(payload)
            httpResponse(response, request, 201, responseMessage.school.LIBRARY_BOOK_CREATED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    listLibraryBooks: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const query = request.query as IListLibraryBooksQuery
            const result = await listLibraryBooksService(query)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    updateLibraryBook: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params, body } = request as IUpdateLibraryBook
            const { error, payload } = validateSchema<IUpdateLibraryBookRequest>(updateLibraryBookSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await updateLibraryBookService(params.id, payload)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    issueLibraryBook: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as IIssueLibraryBook
            const { error, payload } = validateSchema<IIssueLibraryBookRequest>(issueLibraryBookSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await issueLibraryBookService(payload)
            httpResponse(response, request, 201, responseMessage.school.LIBRARY_BOOK_ISSUED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    listLibraryLoans: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const query = request.query as IListLibraryLoansQuery
            const result = await listLibraryLoansService(query)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    returnLibraryLoan: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params, body } = request as IReturnLibraryLoan
            const { error, payload } = validateSchema<IReturnLibraryLoanRequest>(returnLibraryLoanSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await returnLibraryLoanService(params.id, payload)
            httpResponse(response, request, 200, responseMessage.school.LIBRARY_BOOK_RETURNED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    })
}
