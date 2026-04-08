import staffAttendanceModel from '../models/staffAttendance.model'
import { IStaffAttendance } from '../types/staffAttendance.interface'

type TListFilters = {
    staffId?: string
    dateFrom?: Date
    dateTo?: Date
    limit?: number
}

export default {
    create: (payload: IStaffAttendance) => {
        return staffAttendanceModel.create(payload)
    },
    findBySchoolStaffDate: (schoolId: string, staffId: string, date: Date) => {
        return staffAttendanceModel.findOne({ schoolId, staffId, date })
    },
    findBySchoolEmailDate: (schoolId: string, staffEmail: string, date: Date) => {
        return staffAttendanceModel.findOne({ schoolId, staffEmail, date })
    },
    updateById: (id: string, payload: Partial<IStaffAttendance>) => {
        return staffAttendanceModel.findByIdAndUpdate(id, payload, { new: true })
    },
    listBySchool: (schoolId: string, filters: TListFilters = {}) => {
        const query: Record<string, unknown> = { schoolId }

        if (filters.staffId) {
            query.staffId = filters.staffId
        }

        if (filters.dateFrom || filters.dateTo) {
            query.date = {}
            if (filters.dateFrom) {
                ;(query.date as { $gte?: Date }).$gte = filters.dateFrom
            }
            if (filters.dateTo) {
                ;(query.date as { $lte?: Date }).$lte = filters.dateTo
            }
        }

        return staffAttendanceModel
            .find(query)
            .sort({ date: -1, checkInAt: -1 })
            .limit(filters.limit || 60)
    }
}
