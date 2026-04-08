import examModel from '../models/exam.model'
import examResultModel from '../models/examResult.model'
import { IExam, IExamResult } from '../types/exam.interface'

type TExamFilters = {
    className?: string
    section?: string
    type?: string
    semester?: string
    academicYear?: string
    semesterNumber?: number
    status?: string
    includeInFinalResult?: boolean
}

export default {
    createExam: (payload: IExam) => {
        return examModel.create(payload)
    },
    listExamsBySchool: (schoolId: string, filters: TExamFilters = {}) => {
        const query: Record<string, unknown> = { schoolId }
        if (filters.className) {
            query.className = filters.className
        }
        if (filters.section !== undefined && filters.section !== '') {
            query.section = filters.section
        }
        if (filters.type) {
            query.type = filters.type
        }
        if (filters.semester) {
            query.semester = filters.semester
        }
        if (filters.academicYear) {
            query.academicYear = filters.academicYear
        }
        if (typeof filters.semesterNumber === 'number') {
            query.semesterNumber = filters.semesterNumber
        }
        if (typeof filters.includeInFinalResult === 'boolean') {
            query.includeInFinalResult = filters.includeInFinalResult
        }
        if (filters.status) {
            query.status = filters.status
        }

        return examModel.find(query).sort({ startDate: -1, createdAt: -1 })
    },
    findExamById: (id: string) => {
        return examModel.findById(id)
    },
    updateExamById: (id: string, payload: Partial<IExam>) => {
        return examModel.findByIdAndUpdate(id, payload, { new: true })
    },
    upsertExamResult: (examId: string, studentId: string, payload: IExamResult) => {
        return examResultModel.findOneAndUpdate({ examId, studentId }, payload, { new: true, upsert: true })
    },
    listResultsByExam: (examId: string) => {
        return examResultModel.find({ examId }).sort({ studentName: 1 })
    }
}
