import mongoose from 'mongoose'
import { IStudentPromotion } from '../types/studentPromotion.interface'

const studentPromotionSchema = new mongoose.Schema<IStudentPromotion>(
    {
        schoolId: {
            type: String,
            required: true,
            index: true
        },
        examId: {
            type: String,
            required: true,
            index: true
        },
        academicYear: {
            type: String,
            required: true
        },
        studentId: {
            type: String,
            required: true,
            index: true
        },
        studentName: {
            type: String,
            required: true
        },
        grNumber: {
            type: String,
            required: true
        },
        resultStatus: {
            type: String,
            enum: ['pass', 'fail'],
            required: true
        },
        action: {
            type: String,
            enum: ['promote', 'retain'],
            required: true
        },
        fromClassName: {
            type: String,
            required: true
        },
        fromSection: {
            type: String,
            default: ''
        },
        toClassName: {
            type: String,
            required: true
        },
        toSection: {
            type: String,
            default: ''
        },
        forced: {
            type: Boolean,
            default: false
        },
        reason: {
            type: String,
            default: ''
        },
        promotedByEmail: {
            type: String,
            required: true
        },
        promotedAt: {
            type: Date,
            required: true
        }
    },
    { timestamps: true }
)

studentPromotionSchema.index({ schoolId: 1, academicYear: 1, studentId: 1, examId: 1 })
studentPromotionSchema.index({ schoolId: 1, promotedAt: -1 })

export default mongoose.model<IStudentPromotion>('StudentPromotion', studentPromotionSchema)
