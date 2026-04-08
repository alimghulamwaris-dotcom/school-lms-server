import mongoose from 'mongoose'
import { IAttendance, IAttendanceRecordItem } from '../types/attendance.interface'

const attendanceRecordItemSchema = new mongoose.Schema<IAttendanceRecordItem>(
    {
        studentId: {
            type: String,
            default: null
        },
        studentName: {
            type: String,
            required: true
        },
        grNumber: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['present', 'absent', 'on_leave'],
            required: true
        },
        reason: {
            type: String,
            default: ''
        }
    },
    { _id: false }
)

const attendanceSchema = new mongoose.Schema<IAttendance>(
    {
        schoolId: {
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
        date: {
            type: Date,
            required: true
        },
        totalStudents: {
            type: Number,
            required: true
        },
        present: {
            type: Number,
            required: true
        },
        absent: {
            type: Number,
            default: 0
        },
        onLeave: {
            type: Number,
            default: 0
        },
        late: {
            type: Number,
            default: 0
        },
        absentNames: {
            type: [String],
            default: []
        },
        records: {
            type: [attendanceRecordItemSchema],
            default: []
        },
        notes: {
            type: String,
            default: ''
        },
        sendWhatsapp: {
            type: Boolean,
            default: false
        },
        saveRegister: {
            type: Boolean,
            default: true
        },
        markedByEmail: {
            type: String,
            default: ''
        },
        markedByName: {
            type: String,
            default: ''
        }
    },
    { timestamps: true }
)

attendanceSchema.index({ schoolId: 1, className: 1, section: 1, date: 1 }, { unique: true })

export default mongoose.model<IAttendance>('Attendance', attendanceSchema)
