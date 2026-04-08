import mongoose from 'mongoose'
import { IStudent } from '../types/student.interface'

const studentSchema = new mongoose.Schema<IStudent>(
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
            default: 'active'
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

studentSchema.index({ schoolId: 1, grNumber: 1 }, { unique: true })

export default mongoose.model<IStudent>('Student', studentSchema)
