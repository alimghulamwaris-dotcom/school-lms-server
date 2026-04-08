import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../handlers/httpResponse'
import responseMessage from '../../constant/responseMessage'
import httpError from '../../handlers/errorHandler/httpError'
import asyncHandler from '../../handlers/async'
import { CustomError } from '../../utils/errors'
import { validateSchema } from '../../utils/joi-validate'
import {
    bulkGenerateFeeInvoicesSchema,
    createFeeExpenseSchema,
    createFeeInvoiceSchema,
    createFeeReminderSchema,
    createFeeSlipSchema,
    recordInvoicePaymentSchema,
    updateFeeExpenseSchema,
    updateFeeInvoiceSchema
} from './validation/validation.schema'
import {
    bulkGenerateFeeInvoicesService,
    createFeeExpenseService,
    createFeeInvoiceService,
    createFeeReminderService,
    createFeeSlipService,
    getClassWiseFeeReportService,
    getFeeInvoiceService,
    getProfitLossReportService,
    getStudentWiseFeeReportService,
    listFeeRemindersService,
    listFeeExpensesService,
    listFeeSlipsService,
    listFeeInvoicesService,
    recordFeeInvoicePaymentService,
    updateFeeExpenseService,
    updateFeeInvoiceService
} from './fees.service'
import {
    IBulkGenerateFeeInvoices,
    IBulkGenerateFeeInvoicesRequest,
    ICreateFeeExpense,
    ICreateFeeExpenseRequest,
    ICreateFeeInvoice,
    ICreateFeeInvoiceRequest,
    ICreateFeeReminder,
    ICreateFeeReminderRequest,
    ICreateFeeSlip,
    ICreateFeeSlipRequest,
    IGetFeeInvoice,
    IListFees,
    IRecordInvoicePayment,
    IRecordInvoicePaymentRequest,
    IUpdateFeeExpense,
    IUpdateFeeExpenseRequest,
    IUpdateFeeInvoice,
    IUpdateFeeInvoiceRequest
} from './types/fees.interface'

export default {
    createReminder: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ICreateFeeReminder
            const { error, payload } = validateSchema<ICreateFeeReminderRequest>(createFeeReminderSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await createFeeReminderService(payload)
            httpResponse(response, request, 201, responseMessage.school.FEE_REMINDER_CREATED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    listReminders: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as IListFees
            const schoolId = query.schoolId || ''
            const result = await listFeeRemindersService(schoolId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    createSlip: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ICreateFeeSlip
            const { error, payload } = validateSchema<ICreateFeeSlipRequest>(createFeeSlipSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await createFeeSlipService(payload)
            httpResponse(response, request, 201, responseMessage.school.FEE_SLIP_CREATED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    listSlips: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as IListFees
            const schoolId = query.schoolId || ''
            const result = await listFeeSlipsService(schoolId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    createExpense: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ICreateFeeExpense
            const { error, payload } = validateSchema<ICreateFeeExpenseRequest>(createFeeExpenseSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await createFeeExpenseService(payload)
            httpResponse(response, request, 201, responseMessage.school.FEE_EXPENSE_CREATED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    listExpenses: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as IListFees
            const schoolId = query.schoolId || ''
            const month = typeof query.month === 'string' ? query.month : undefined
            const fromMonth = typeof query.fromMonth === 'string' ? query.fromMonth : undefined
            const toMonth = typeof query.toMonth === 'string' ? query.toMonth : undefined
            const category = typeof query.category === 'string' ? query.category : undefined
            const status = typeof query.status === 'string' ? query.status : undefined
            const search = typeof query.search === 'string' ? query.search : undefined
            const result = await listFeeExpensesService(schoolId, {
                month,
                fromMonth,
                toMonth,
                category,
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
    updateExpense: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params, body } = request as IUpdateFeeExpense
            const { error, payload } = validateSchema<IUpdateFeeExpenseRequest>(updateFeeExpenseSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await updateFeeExpenseService(params.id, payload)
            httpResponse(response, request, 200, responseMessage.school.FEE_EXPENSE_UPDATED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    createInvoice: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ICreateFeeInvoice
            const { error, payload } = validateSchema<ICreateFeeInvoiceRequest>(createFeeInvoiceSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await createFeeInvoiceService(payload)
            httpResponse(response, request, 201, responseMessage.school.FEE_INVOICE_CREATED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    listInvoices: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as IListFees
            const schoolId = query.schoolId || ''
            const month = typeof query.month === 'string' ? query.month : undefined
            const className = typeof query.className === 'string' ? query.className : undefined
            const section = typeof query.section === 'string' ? query.section : undefined
            const status = typeof query.status === 'string' ? query.status : undefined
            const search = typeof query.search === 'string' ? query.search : undefined
            const result = await listFeeInvoicesService(schoolId, {
                month,
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
    getInvoice: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params } = request as IGetFeeInvoice
            const result = await getFeeInvoiceService(params.id)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    recordInvoicePayment: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params, body } = request as IRecordInvoicePayment
            const { error, payload } = validateSchema<IRecordInvoicePaymentRequest>(recordInvoicePaymentSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await recordFeeInvoicePaymentService(params.id, payload)
            httpResponse(response, request, 200, responseMessage.school.FEE_INVOICE_PAYMENT_RECORDED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    updateInvoice: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params, body } = request as IUpdateFeeInvoice
            const { error, payload } = validateSchema<IUpdateFeeInvoiceRequest>(updateFeeInvoiceSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await updateFeeInvoiceService(params.id, payload)
            httpResponse(response, request, 200, responseMessage.school.FEE_INVOICE_UPDATED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    bulkGenerateInvoices: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as IBulkGenerateFeeInvoices
            const { error, payload } = validateSchema<IBulkGenerateFeeInvoicesRequest>(bulkGenerateFeeInvoicesSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await bulkGenerateFeeInvoicesService(payload)
            httpResponse(response, request, 201, responseMessage.school.FEE_INVOICES_BULK_CREATED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    classWiseReport: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as IListFees
            const schoolId = query.schoolId || ''
            const month = typeof query.month === 'string' ? query.month : undefined
            const fromMonth = typeof query.fromMonth === 'string' ? query.fromMonth : undefined
            const toMonth = typeof query.toMonth === 'string' ? query.toMonth : undefined
            const className = typeof query.className === 'string' ? query.className : undefined
            const section = typeof query.section === 'string' ? query.section : undefined
            const status = typeof query.status === 'string' ? query.status : undefined
            const search = typeof query.search === 'string' ? query.search : undefined
            const result = await getClassWiseFeeReportService(schoolId, {
                month,
                fromMonth,
                toMonth,
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
    studentWiseReport: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as IListFees
            const schoolId = query.schoolId || ''
            const month = typeof query.month === 'string' ? query.month : undefined
            const className = typeof query.className === 'string' ? query.className : undefined
            const section = typeof query.section === 'string' ? query.section : undefined
            const status = typeof query.status === 'string' ? query.status : undefined
            const fromMonth = typeof query.fromMonth === 'string' ? query.fromMonth : undefined
            const toMonth = typeof query.toMonth === 'string' ? query.toMonth : undefined
            const search = typeof query.search === 'string' ? query.search : undefined
            const result = await getStudentWiseFeeReportService(schoolId, {
                month,
                fromMonth,
                toMonth,
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
    profitLossReport: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as IListFees
            const schoolId = query.schoolId || ''
            const month = typeof query.month === 'string' ? query.month : undefined
            const fromMonth = typeof query.fromMonth === 'string' ? query.fromMonth : undefined
            const toMonth = typeof query.toMonth === 'string' ? query.toMonth : undefined
            const className = typeof query.className === 'string' ? query.className : undefined
            const section = typeof query.section === 'string' ? query.section : undefined
            const status = typeof query.status === 'string' ? query.status : undefined
            const category = typeof query.category === 'string' ? query.category : undefined
            const search = typeof query.search === 'string' ? query.search : undefined

            const result = await getProfitLossReportService(schoolId, {
                month,
                fromMonth,
                toMonth,
                className,
                section,
                status,
                category,
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
    })
}
