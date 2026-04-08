import studentPromotionModel from '../models/studentPromotion.model'
import { IStudentPromotion } from '../types/studentPromotion.interface'

export default {
    createPromotions: (payload: IStudentPromotion[]) => {
        return studentPromotionModel.insertMany(payload)
    },
    listPromotionsByFilters: (
        schoolId: string,
        filters: {
            academicYear?: string
            examId?: string
            className?: string
            section?: string
            studentId?: string
            search?: string
            limit?: number
        }
    ) => {
        const query: Record<string, unknown> = { schoolId }
        const andConditions: Record<string, unknown>[] = []

        if (filters.academicYear) {
            query.academicYear = filters.academicYear
        }
        if (filters.examId) {
            query.examId = filters.examId
        }
        if (filters.className) {
            andConditions.push({
                $or: [{ fromClassName: filters.className }, { toClassName: filters.className }]
            })
        }
        if (filters.section) {
            andConditions.push({
                $or: [{ fromSection: filters.section }, { toSection: filters.section }]
            })
        }
        if (filters.studentId) {
            query.studentId = filters.studentId
        }
        if (filters.search) {
            const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            andConditions.push({
                $or: [
                    { studentName: { $regex: escaped, $options: 'i' } },
                    { grNumber: { $regex: escaped, $options: 'i' } },
                    { promotedByEmail: { $regex: escaped, $options: 'i' } }
                ]
            })
        }

        if (andConditions.length > 0) {
            query.$and = andConditions
        }

        const limit = typeof filters.limit === 'number' && filters.limit > 0 ? filters.limit : 100
        return studentPromotionModel.find(query).sort({ promotedAt: -1, createdAt: -1 }).limit(limit)
    }
}
