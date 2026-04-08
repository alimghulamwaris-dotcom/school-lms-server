import mongoose from 'mongoose'
import { IFeeReminder } from '../types/fees.interface'

const feeReminderSchema = new mongoose.Schema<IFeeReminder>(
    {
        schoolId: {
            type: String,
            required: true
        },
        className: {
            type: String,
            required: true
        },
        month: {
            type: String,
            required: true
        },
        dueDate: {
            type: Date,
            required: true
        },
        includeLateFee: {
            type: Boolean,
            default: false
        },
        sendTime: {
            type: String,
            default: ''
        },
        message: {
            type: String,
            default: ''
        },
        status: {
            type: String,
            default: 'scheduled'
        }
    },
    { timestamps: true }
)

export default mongoose.model<IFeeReminder>('FeeReminder', feeReminderSchema)
