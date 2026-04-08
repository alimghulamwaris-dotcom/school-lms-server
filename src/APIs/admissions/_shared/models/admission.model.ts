import mongoose from 'mongoose'
import { IAdmission } from '../types/admission.interface'

const admissionSchema = new mongoose.Schema<IAdmission>(
    {
        schoolId: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        grNumber: {
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
        guardianName: {
            type: String,
            required: true
        },
        guardianPhone: {
            type: String,
            required: true
        },
        address: {
            type: String,
            default: ''
        },
        status: {
            type: String,
            default: 'pending'
        },
        admissionDate: {
            type: Date,
            default: null
        },
        previousSchool: {
            type: String,
            default: null
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

admissionSchema.index({ schoolId: 1, grNumber: 1 }, { unique: true })

export default mongoose.model<IAdmission>('Admission', admissionSchema)
