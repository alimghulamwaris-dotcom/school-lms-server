import mongoose from 'mongoose'
import { IExamResult } from '../types/exam.interface'

const examResultSubjectSchema = new mongoose.Schema(
    {
        subjectName: {
            type: String,
            required: true,
            trim: true
        },
        maxMarks: {
            type: Number,
            required: true
        },
        passMarks: {
            type: Number,
            required: true
        },
        obtainedMarks: {
            type: Number,
            required: true
        },
        absent: {
            type: Boolean,
            default: false
        }
    },
    { _id: false }
)

const examResultSchema = new mongoose.Schema<IExamResult>(
    {
        schoolId: {
            type: String,
            required: true,
            trim: true
        },
        examId: {
            type: String,
            required: true,
            trim: true
        },
        studentId: {
            type: String,
            required: true,
            trim: true
        },
        studentName: {
            type: String,
            required: true,
            trim: true
        },
        grNumber: {
            type: String,
            required: true,
            trim: true
        },
        className: {
            type: String,
            required: true,
            trim: true
        },
        section: {
            type: String,
            default: '',
            trim: true
        },
        subjects: {
            type: [examResultSubjectSchema],
            default: []
        },
        totalMaxMarks: {
            type: Number,
            required: true
        },
        totalObtainedMarks: {
            type: Number,
            required: true
        },
        percentage: {
            type: Number,
            required: true
        },
        grade: {
            type: String,
            required: true,
            trim: true
        },
        resultStatus: {
            type: String,
            enum: ['pass', 'fail'],
            required: true
        },
        remarks: {
            type: String,
            default: '',
            trim: true
        }
    },
    { timestamps: true }
)

examResultSchema.index({ examId: 1, studentId: 1 }, { unique: true })
examResultSchema.index({ schoolId: 1, examId: 1 })

export default mongoose.model<IExamResult>('ExamResult', examResultSchema)
