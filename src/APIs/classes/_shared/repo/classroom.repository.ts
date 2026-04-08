import classroomModel from '../models/classroom.model'
import { IClassroom } from '../types/classroom.interface'

export default {
    createClassroom: (payload: IClassroom) => {
        return classroomModel.create(payload)
    },
    findClassroomsBySchool: (schoolId: string) => {
        return classroomModel.find({ schoolId, status: 'active' }).sort({ className: 1 })
    },
    findClassroomBySchoolAndKey: (schoolId: string, classKey: string) => {
        return classroomModel.findOne({ schoolId, classKey })
    },
    findClassroomById: (id: string) => {
        return classroomModel.findById(id)
    },
    updateClassroomById: (id: string, payload: Partial<IClassroom>) => {
        return classroomModel.findByIdAndUpdate(id, payload, { new: true })
    }
}
