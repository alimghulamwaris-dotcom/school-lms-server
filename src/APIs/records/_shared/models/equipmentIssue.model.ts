import mongoose from 'mongoose'
import { IEquipmentIssue } from '../types/records.interface'

const equipmentIssueSchema = new mongoose.Schema<IEquipmentIssue>(
    {
        schoolId: {
            type: String,
            required: true,
            index: true
        },
        equipmentId: {
            type: String,
            required: true,
            index: true
        },
        equipmentName: {
            type: String,
            required: true
        },
        borrowerType: {
            type: String,
            enum: ['student', 'staff', 'other'],
            default: 'other'
        },
        borrowerId: {
            type: String,
            default: ''
        },
        borrowerName: {
            type: String,
            required: true
        },
        className: {
            type: String,
            default: ''
        },
        section: {
            type: String,
            default: ''
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        issuedAt: {
            type: Date,
            required: true
        },
        dueDate: {
            type: Date
        },
        status: {
            type: String,
            enum: ['issued', 'returned'],
            default: 'issued'
        },
        returnedAt: {
            type: Date
        },
        notes: {
            type: String,
            default: ''
        }
    },
    { timestamps: true }
)

equipmentIssueSchema.index({ schoolId: 1, status: 1, issuedAt: -1 })

export default mongoose.model<IEquipmentIssue>('EquipmentIssue', equipmentIssueSchema)
