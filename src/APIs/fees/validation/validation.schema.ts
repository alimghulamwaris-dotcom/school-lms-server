import joi from 'joi'
import {
    IBulkGenerateFeeInvoicesRequest,
    ICreateFeeInvoiceRequest,
    ICreateFeeExpenseRequest,
    ICreateFeeReminderRequest,
    ICreateFeeSlipRequest,
    IRecordInvoicePaymentRequest,
    IUpdateFeeExpenseRequest,
    IUpdateFeeInvoiceRequest
} from '../types/fees.interface'

export const createFeeReminderSchema = joi.object<ICreateFeeReminderRequest, true>({
    schoolId: joi.string().required(),
    className: joi.string().required(),
    month: joi.string().required(),
    dueDate: joi.string().required(),
    includeLateFee: joi.boolean().required(),
    sendTime: joi.string().required(),
    message: joi.string().allow('').required(),
    status: joi.string().optional()
})

export const createFeeSlipSchema = joi.object<ICreateFeeSlipRequest, true>({
    schoolId: joi.string().required(),
    className: joi.string().required(),
    month: joi.string().required(),
    paperSize: joi.string().required(),
    copies: joi.string().required(),
    includeTransport: joi.boolean().required(),
    showDiscounts: joi.boolean().required()
})

export const createFeeInvoiceSchema = joi.object<ICreateFeeInvoiceRequest, true>({
    schoolId: joi.string().required(),
    grNumber: joi.string().required(),
    month: joi.string().required(),
    dueDate: joi.string().required(),
    issueDate: joi.string().optional(),
    items: joi
        .array()
        .items(
            joi.object({
                label: joi.string().min(1).max(120).required(),
                amount: joi.number().min(0).required()
            })
        )
        .min(1)
        .required(),
    discount: joi.number().min(0).optional(),
    lateFee: joi.number().min(0).optional(),
    notes: joi.string().allow('').optional()
})

export const createFeeExpenseSchema = joi.object<ICreateFeeExpenseRequest, true>({
    schoolId: joi.string().required(),
    title: joi.string().min(2).max(200).required(),
    category: joi.string().allow('').max(100).optional(),
    amount: joi.number().positive().required(),
    spentAt: joi.string().isoDate().required(),
    paymentMode: joi.string().allow('').max(40).optional(),
    reference: joi.string().allow('').max(120).optional(),
    notes: joi.string().allow('').max(800).optional()
})

export const updateFeeExpenseSchema = joi.object<IUpdateFeeExpenseRequest, true>({
    title: joi.string().min(2).max(200).optional(),
    category: joi.string().allow('').max(100).optional(),
    amount: joi.number().positive().optional(),
    spentAt: joi.string().isoDate().optional(),
    paymentMode: joi.string().allow('').max(40).optional(),
    reference: joi.string().allow('').max(120).optional(),
    notes: joi.string().allow('').max(800).optional(),
    status: joi.string().valid('active', 'archived').optional()
})

export const recordInvoicePaymentSchema = joi.object<IRecordInvoicePaymentRequest, true>({
    amount: joi.number().positive().required(),
    method: joi.string().min(2).max(40).required(),
    paidAt: joi.string().optional(),
    reference: joi.string().allow('').optional(),
    note: joi.string().allow('').optional()
})

export const updateFeeInvoiceSchema = joi.object<IUpdateFeeInvoiceRequest, true>({
    month: joi.string().optional(),
    dueDate: joi.string().optional(),
    issueDate: joi.string().optional(),
    items: joi
        .array()
        .items(
            joi.object({
                label: joi.string().min(1).max(120).required(),
                amount: joi.number().min(0).required()
            })
        )
        .min(1)
        .optional(),
    discount: joi.number().min(0).optional(),
    lateFee: joi.number().min(0).optional(),
    notes: joi.string().allow('').optional()
})

export const bulkGenerateFeeInvoicesSchema = joi.object<IBulkGenerateFeeInvoicesRequest, true>({
    schoolId: joi.string().required(),
    month: joi.string().required(),
    dueDate: joi.string().required(),
    issueDate: joi.string().optional(),
    className: joi.string().allow('').optional(),
    section: joi.string().allow('').optional(),
    items: joi
        .array()
        .items(
            joi.object({
                label: joi.string().min(1).max(120).required(),
                amount: joi.number().min(0).required()
            })
        )
        .min(1)
        .required(),
    discount: joi.number().min(0).optional(),
    lateFee: joi.number().min(0).optional(),
    notes: joi.string().allow('').optional()
})
