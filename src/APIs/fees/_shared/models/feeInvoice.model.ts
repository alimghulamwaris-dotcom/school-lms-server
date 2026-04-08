import mongoose from 'mongoose'
import { IFeeInvoice, IFeeInvoiceItem, IFeeInvoicePayment } from '../types/fees.interface'

const feeInvoiceItemSchema = new mongoose.Schema<IFeeInvoiceItem>(
    {
        label: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            required: true
        }
    },
    { _id: false }
)

const feeInvoicePaymentSchema = new mongoose.Schema<IFeeInvoicePayment>(
    {
        amount: {
            type: Number,
            required: true
        },
        paidAt: {
            type: Date,
            required: true
        },
        method: {
            type: String,
            required: true
        },
        reference: {
            type: String,
            default: ''
        },
        note: {
            type: String,
            default: ''
        }
    },
    { _id: false }
)

const feeInvoiceSchema = new mongoose.Schema<IFeeInvoice>(
    {
        schoolId: {
            type: String,
            required: true
        },
        invoiceNumber: {
            type: String,
            required: true
        },
        studentId: {
            type: String,
            default: null
        },
        grNumber: {
            type: String,
            required: true
        },
        studentName: {
            type: String,
            required: true
        },
        guardianName: {
            type: String,
            required: true
        },
        guardianPhone: {
            type: String,
            required: true
        },
        className: {
            type: String,
            required: true
        },
        section: {
            type: String,
            default: ''
        },
        month: {
            type: String,
            required: true
        },
        issueDate: {
            type: Date,
            required: true
        },
        dueDate: {
            type: Date,
            required: true
        },
        items: {
            type: [feeInvoiceItemSchema],
            default: []
        },
        subtotal: {
            type: Number,
            required: true
        },
        discount: {
            type: Number,
            default: 0
        },
        lateFee: {
            type: Number,
            default: 0
        },
        totalAmount: {
            type: Number,
            required: true
        },
        paidAmount: {
            type: Number,
            default: 0
        },
        balanceAmount: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'partially_paid', 'paid'],
            default: 'pending'
        },
        notes: {
            type: String,
            default: ''
        },
        paymentHistory: {
            type: [feeInvoicePaymentSchema],
            default: []
        }
    },
    { timestamps: true }
)

feeInvoiceSchema.index({ schoolId: 1, invoiceNumber: 1 }, { unique: true })
feeInvoiceSchema.index({ schoolId: 1, grNumber: 1, month: 1 })

export default mongoose.model<IFeeInvoice>('FeeInvoice', feeInvoiceSchema)
