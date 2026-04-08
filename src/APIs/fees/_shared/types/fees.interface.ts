export interface IFeeReminder {
    schoolId: string
    className: string
    month: string
    dueDate: Date
    includeLateFee: boolean
    sendTime: string
    message: string
    status: string
}

export interface IFeeSlip {
    schoolId: string
    className: string
    month: string
    paperSize: string
    copies: string
    includeTransport: boolean
    showDiscounts: boolean
}

export interface IFeeInvoiceItem {
    label: string
    amount: number
}

export interface IFeeInvoicePayment {
    amount: number
    paidAt: Date
    method: string
    reference?: string
    note?: string
}

export interface IFeeInvoice {
    schoolId: string
    invoiceNumber: string
    studentId?: string | null
    grNumber: string
    studentName: string
    guardianName: string
    guardianPhone: string
    className: string
    section?: string
    month: string
    issueDate: Date
    dueDate: Date
    items: IFeeInvoiceItem[]
    subtotal: number
    discount: number
    lateFee: number
    totalAmount: number
    paidAmount: number
    balanceAmount: number
    status: 'pending' | 'partially_paid' | 'paid'
    notes?: string
    paymentHistory: IFeeInvoicePayment[]
}

export interface IFeeExpense {
    schoolId: string
    title: string
    category: string
    amount: number
    spentAt: Date
    paymentMode: string
    reference?: string
    notes?: string
    status: 'active' | 'archived'
}

export interface IFeeReminderWithId extends IFeeReminder {
    _id: string
}

export interface IFeeSlipWithId extends IFeeSlip {
    _id: string
}

export interface IFeeInvoiceWithId extends IFeeInvoice {
    _id: string
}

export interface IFeeExpenseWithId extends IFeeExpense {
    _id: string
}
