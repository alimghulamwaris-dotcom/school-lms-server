import classTeacherAssignmentModel from '../models/classTeacherAssignment.model'
import { IClassTeacherAssignment } from '../types/attendance.interface'

export default {
    createAssignment: (payload: IClassTeacherAssignment) => {
        return classTeacherAssignmentModel.create(payload)
    },
    findAssignmentsBySchool: (schoolId: string) => {
        return classTeacherAssignmentModel.find({ schoolId, status: 'active' }).sort({ className: 1, section: 1 })
    },
    findAssignmentsByTeacherEmail: (schoolId: string, teacherEmail: string) => {
        return classTeacherAssignmentModel.find({ schoolId, teacherEmail, status: 'active' }).sort({ className: 1, section: 1 })
    },
    findAssignmentBySchoolClassSection: (schoolId: string, className: string, section: string) => {
        return classTeacherAssignmentModel.findOne({ schoolId, className, section })
    },
    updateAssignmentById: (id: string, payload: Partial<IClassTeacherAssignment>) => {
        return classTeacherAssignmentModel.findByIdAndUpdate(id, payload, { new: true })
    },
    upsertAssignment: (schoolId: string, className: string, section: string, payload: Partial<IClassTeacherAssignment>) => {
        return classTeacherAssignmentModel.findOneAndUpdate(
            { schoolId, className, section },
            { $set: payload },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        )
    }
}
