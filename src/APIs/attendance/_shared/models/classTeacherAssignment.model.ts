import mongoose from 'mongoose'
import { IClassTeacherAssignment } from '../types/attendance.interface'

const classTeacherAssignmentSchema = new mongoose.Schema<IClassTeacherAssignment>(
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
            required: true
        },
        teacherEmail: {
            type: String,
            required: true
        },
        teacherName: {
            type: String,
            required: true
        },
        staffId: {
            type: String,
            default: null
        },
        assignedByEmail: {
            type: String,
            default: ''
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active'
        }
    },
    { timestamps: true }
)

classTeacherAssignmentSchema.index({ schoolId: 1, className: 1, section: 1 }, { unique: true })
classTeacherAssignmentSchema.index({ schoolId: 1, teacherEmail: 1, status: 1 })

export default mongoose.model<IClassTeacherAssignment>('ClassTeacherAssignment', classTeacherAssignmentSchema)
