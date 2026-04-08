import mongoose from 'mongoose'
import { IFeeSlip } from '../types/fees.interface'

const feeSlipSchema = new mongoose.Schema<IFeeSlip>(
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
        paperSize: {
            type: String,
            default: 'A4'
        },
        copies: {
            type: String,
            default: 'Student + Office'
        },
        includeTransport: {
            type: Boolean,
            default: false
        },
        showDiscounts: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
)

export default mongoose.model<IFeeSlip>('FeeSlip', feeSlipSchema)
