import { Request } from 'express'

export interface ICreateFeeReminderRequest {
    schoolId: string
    className: string
    month: string
    dueDate: string
    includeLateFee: boolean
    sendTime: string
    message: string
    status?: string
}

export interface ICreateFeeSlipRequest {
    schoolId: string
    className: string
    month: string
    paperSize: string
    copies: string
    includeTransport: boolean
    showDiscounts: boolean
}

export interface ICreateFeeInvoiceItemRequest {
    label: string
    amount: number
}

export interface ICreateFeeInvoiceRequest {
    schoolId: string
    grNumber: string
    month: string
    dueDate: string
    issueDate?: string
    items: ICreateFeeInvoiceItemRequest[]
    discount?: number
    lateFee?: number
    notes?: string
}

export interface IUpdateFeeInvoiceRequest {
    month?: string
    dueDate?: string
    issueDate?: string
    items?: ICreateFeeInvoiceItemRequest[]
    discount?: number
    lateFee?: number
    notes?: string
}

export interface IRecordInvoicePaymentRequest {
    amount: number
    method: string
    paidAt?: string
    reference?: string
    note?: string
}

export interface IBulkGenerateFeeInvoicesRequest {
    schoolId: string
    month: string
    dueDate: string
    issueDate?: string
    className?: string
    section?: string
    items: ICreateFeeInvoiceItemRequest[]
    discount?: number
    lateFee?: number
    notes?: string
}

export interface ICreateFeeExpenseRequest {
    schoolId: string
    title: string
    category?: string
    amount: number
    spentAt: string
    paymentMode?: string
    reference?: string
    notes?: string
}

export interface IUpdateFeeExpenseRequest {
    title?: string
    category?: string
    amount?: number
    spentAt?: string
    paymentMode?: string
    reference?: string
    notes?: string
    status?: 'active' | 'archived'
}

export interface ICreateFeeReminder extends Request {
    body: ICreateFeeReminderRequest
}

export interface ICreateFeeSlip extends Request {
    body: ICreateFeeSlipRequest
}

export interface ICreateFeeInvoice extends Request {
    body: ICreateFeeInvoiceRequest
}

export interface IRecordInvoicePayment extends Request {
    params: {
        id: string
    }
    body: IRecordInvoicePaymentRequest
}

export interface IGetFeeInvoice extends Request {
    params: {
        id: string
    }
}

export interface IUpdateFeeInvoice extends Request {
    params: {
        id: string
    }
    body: IUpdateFeeInvoiceRequest
}

export interface IBulkGenerateFeeInvoices extends Request {
    body: IBulkGenerateFeeInvoicesRequest
}

export interface ICreateFeeExpense extends Request {
    body: ICreateFeeExpenseRequest
}

export interface IUpdateFeeExpense extends Request {
    params: {
        id: string
    }
    body: IUpdateFeeExpenseRequest
}

export interface IListFees extends Request {
    query: {
        schoolId?: string
        month?: string
        fromMonth?: string
        toMonth?: string
        className?: string
        section?: string
        status?: string
        category?: string
        search?: string
    }
}
