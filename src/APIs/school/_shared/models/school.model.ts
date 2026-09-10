import mongoose from 'mongoose'
import { ISchool } from '../types/school.interface'

const defaultAcademicYear = () => {
    const year = new Date().getFullYear()
    return `${year}-${year + 1}`
}

const defaultSemesters = () => [
    {
        number: 1,
        name: 'Semester 1',
        startDate: null,
        endDate: null,
        status: 'active'
    },
    {
        number: 2,
        name: 'Semester 2',
        startDate: null,
        endDate: null,
        status: 'upcoming'
    }
]

const semesterSchema = new mongoose.Schema(
    {
        number: { type: Number, required: true },
        name: { type: String, required: true },
        startDate: { type: Date, default: null },
        endDate: { type: Date, default: null },
        status: {
            type: String,
            enum: ['upcoming', 'active', 'closed'],
            default: 'upcoming'
        }
    },
    { _id: false }
)

const schoolSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            minlength: 2,
            maxlength: 120
        },
        campus: {
            type: String,
            required: true,
            minlength: 2,
            maxlength: 120
        },
        code: {
            type: String,
            required: true,
            unique: true
        },
        adminUserId: {
            type: String,
            default: null
        },
        contactEmail: {
            type: String,
            required: true,
            unique: true
        },
        contactPhone: {
            type: String,
            required: true
        },
        password: {
            type: String,
            required: true,
            select: false
        },
        grPattern: {
            type: String,
            default: 'GR-{YYYY}-{SEQ4}'
        },
        grCounter: {
            type: Number,
            default: 0
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        verificationToken: {
            type: String,
            default: null
        },
        verificationExpiry: {
            type: Date,
            default: null
        },
        staffCheckInTime: {
            type: String,
            default: '08:00'
        },
        staffCheckInGraceMinutes: {
            type: Number,
            default: 0
        },
        academicYear: {
            type: String,
            default: defaultAcademicYear
        },
        academicYearStatus: {
            type: String,
            enum: ['open', 'closed'],
            default: 'open'
        },
        currentSemesterNumber: {
            type: Number,
            default: 1
        },
        passPercentage: {
            type: Number,
            default: 50
        },
        attendanceReminderEnabled: {
            type: Boolean,
            default: true
        },
        logoUrl: {
            type: String,
            default: null
        },
        address: {
            type: String,
            default: null,
            maxlength: 300
        },
        semesters: {
            type: [semesterSchema],
            default: defaultSemesters
        }
    },
    { timestamps: true }
)

export default mongoose.model<ISchool>('School', schoolSchema)
