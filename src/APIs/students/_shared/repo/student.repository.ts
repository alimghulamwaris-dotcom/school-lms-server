import studentModel from '../models/student.model'
import { IStudent } from '../types/student.interface'

export default {
    createStudent: (payload: IStudent) => {
        return studentModel.create(payload)
    },
    createStudents: (payload: IStudent[]) => {
        return studentModel.insertMany(payload)
    },
    findStudentsBySchool: (schoolId: string) => {
        return studentModel.find({ schoolId })
    },
    findStudentById: (id: string) => {
        return studentModel.findById(id)
    },
    findStudentBySchoolAndGr: (schoolId: string, grNumber: string) => {
        return studentModel.findOne({ schoolId, grNumber })
    },
    findStudentsBySchoolAndGrNumbers: (schoolId: string, grNumbers: string[]) => {
        return studentModel.find({ schoolId, grNumber: { $in: grNumbers } })
    },
    findStudentsByFilters: (
        schoolId: string,
        filters: {
            className?: string
            section?: string
            status?: string
            search?: string
        }
    ) => {
        const query: Record<string, unknown> = { schoolId }

        if (filters.className) {
            query.className = filters.className
        }
        if (filters.section) {
            query.section = filters.section
        }
        if (filters.status) {
            query.status = filters.status
        }
        if (filters.search) {
            const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            query.$or = [
                { name: { $regex: escaped, $options: 'i' } },
                { grNumber: { $regex: escaped, $options: 'i' } },
                { guardianName: { $regex: escaped, $options: 'i' } },
                { guardianPhone: { $regex: escaped, $options: 'i' } }
            ]
        }

        return studentModel.find(query).sort({ createdAt: -1 })
    },
    updateStudent: (id: string, payload: Partial<IStudent> | Record<string, unknown>) => {
        return studentModel.findByIdAndUpdate(id, payload, { new: true })
    },
    deleteStudentById: (id: string) => {
        return studentModel.findByIdAndDelete(id)
    }
}
