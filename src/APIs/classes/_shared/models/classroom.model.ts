import mongoose from 'mongoose'
import { IClassroom } from '../types/classroom.interface'

const classroomSchema = new mongoose.Schema<IClassroom>(
    {
        schoolId: {
            type: String,
            required: true,
            index: true
        },
        className: {
            type: String,
            required: true,
            trim: true
        },
        classKey: {
            type: String,
            required: true,
            index: true
        },
        sections: {
            type: [String],
            default: []
        },
        status: {
            type: String,
            enum: ['active', 'archived'],
            default: 'active'
        }
    },
    { timestamps: true }
)

classroomSchema.index({ schoolId: 1, classKey: 1 }, { unique: true })

export default mongoose.model<IClassroom>('Classroom', classroomSchema)
