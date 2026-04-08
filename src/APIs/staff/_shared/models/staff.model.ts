import mongoose from 'mongoose'
import { IStaff } from '../types/staff.interface'

const staffSchema = new mongoose.Schema<IStaff>(
    {
        schoolId: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        role: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        accessPages: {
            type: [String],
            default: []
        },
        status: {
            type: String,
            default: 'pending'
        },
        photoUrl: {
            type: String,
            default: ''
        },
        documentUrls: {
            type: [String],
            default: []
        }
    },
    { timestamps: true }
)

export default mongoose.model<IStaff>('Staff', staffSchema)
