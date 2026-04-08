import mongoose from 'mongoose'
import { IStaffAttendance } from '../types/staffAttendance.interface'

const staffAttendanceSchema = new mongoose.Schema<IStaffAttendance>(
    {
        schoolId: {
            type: String,
            required: true,
            trim: true
        },
        staffId: {
            type: String,
            required: true,
            trim: true
        },
        staffEmail: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        staffName: {
            type: String,
            required: true,
            trim: true
        },
        staffRole: {
            type: String,
            required: true,
            trim: true
        },
        date: {
            type: Date,
            required: true
        },
        checkInAt: {
            type: Date,
            required: true
        },
        checkOutAt: {
            type: Date,
            default: null
        },
        workedMinutes: {
            type: Number,
            default: 0
        },
        isLate: {
            type: Boolean,
            default: false
        },
        lateMinutes: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
)

staffAttendanceSchema.index({ schoolId: 1, staffId: 1, date: 1 }, { unique: true })
staffAttendanceSchema.index({ schoolId: 1, staffEmail: 1, date: -1 })

export default mongoose.model<IStaffAttendance>('StaffAttendance', staffAttendanceSchema)
