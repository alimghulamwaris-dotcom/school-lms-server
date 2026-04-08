import mongoose from 'mongoose'
import { IExam } from '../types/exam.interface'

const examSubjectSchema = new mongoose.Schema(
    {
        name: {
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
        }
    },
    { _id: false }
)

const examSchema = new mongoose.Schema<IExam>(
    {
        schoolId: {
            type: String,
            required: true,
            trim: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        type: {
            type: String,
            enum: ['test', 'exam'],
            default: 'exam'
        },
        semester: {
            type: String,
            default: '',
            trim: true
        },
        academicYear: {
            type: String,
            default: '',
            trim: true
        },
        semesterNumber: {
            type: Number,
            default: 1
        },
        totalSemesters: {
            type: Number,
            default: 2
        },
        isFinalSemester: {
            type: Boolean,
            default: false
        },
        includeInFinalResult: {
            type: Boolean,
            default: true
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
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        },
        subjects: {
            type: [examSubjectSchema],
            default: []
        },
        status: {
            type: String,
            enum: ['draft', 'published'],
            default: 'draft'
        },
        createdByEmail: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        }
    },
    { timestamps: true }
)

examSchema.index({
    schoolId: 1,
    className: 1,
    section: 1,
    academicYear: 1,
    semesterNumber: 1,
    startDate: -1
})

export default mongoose.model<IExam>('Exam', examSchema)
