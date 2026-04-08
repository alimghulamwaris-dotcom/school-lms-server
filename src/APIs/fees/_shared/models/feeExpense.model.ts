import mongoose from 'mongoose'
import { IFeeExpense } from '../types/fees.interface'

const feeExpenseSchema = new mongoose.Schema<IFeeExpense>(
    {
        schoolId: {
            type: String,
            required: true,
            index: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        category: {
            type: String,
            default: 'General',
            trim: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        spentAt: {
            type: Date,
            required: true
        },
        paymentMode: {
            type: String,
            default: 'cash',
            trim: true
        },
        reference: {
            type: String,
            default: '',
            trim: true
        },
        notes: {
            type: String,
            default: ''
        },
        status: {
            type: String,
            enum: ['active', 'archived'],
            default: 'active'
        }
    },
    { timestamps: true }
)

feeExpenseSchema.index({ schoolId: 1, spentAt: -1 })
feeExpenseSchema.index({ schoolId: 1, category: 1 })

export default mongoose.model<IFeeExpense>('FeeExpense', feeExpenseSchema)
