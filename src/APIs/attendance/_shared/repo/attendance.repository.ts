import attendanceModel from '../models/attendance.model'
import { IAttendance } from '../types/attendance.interface'

export default {
    createAttendance: (payload: IAttendance) => {
        return attendanceModel.create(payload)
    },
    findAttendanceBySchool: (schoolId: string) => {
        return attendanceModel.find({ schoolId }).sort({ date: -1, createdAt: -1 })
    },
    findAttendanceBySchoolAndClass: (schoolId: string, className: string, section?: string) => {
        const query: Record<string, unknown> = { schoolId, className }
        if (section !== undefined) {
            query.section = section
        }
        return attendanceModel.find(query).sort({ date: -1, createdAt: -1 })
    },
    findAttendanceByFilters: (
        schoolId: string,
        filters: {
            className?: string
            section?: string
            dateFrom?: Date
            dateTo?: Date
            limit?: number
        }
    ) => {
        const query: Record<string, unknown> = { schoolId }
        if (filters.className) query.className = filters.className
        if (filters.section) query.section = filters.section
        if (filters.dateFrom || filters.dateTo) {
            const dateQuery: Record<string, unknown> = {}
            if (filters.dateFrom) dateQuery.$gte = filters.dateFrom
            if (filters.dateTo) dateQuery.$lte = filters.dateTo
            query.date = dateQuery
        }

        const dbQuery = attendanceModel.find(query).sort({ date: -1, createdAt: -1 })
        if (filters.limit && filters.limit > 0) {
            dbQuery.limit(filters.limit)
        }
        return dbQuery
    },
    findAttendanceBySchoolClassSectionDate: (schoolId: string, className: string, section: string, date: Date) => {
        return attendanceModel.findOne({ schoolId, className, section, date })
    },
    updateAttendanceById: (id: string, payload: Partial<IAttendance>) => {
        return attendanceModel.findByIdAndUpdate(id, payload, { new: true })
    }
}
