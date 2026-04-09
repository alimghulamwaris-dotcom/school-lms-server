import schoolModel from '../models/school.model'
import { ISchool } from '../types/school.interface'

export default {
    createSchool: (payload: ISchool) => {
        return schoolModel.create(payload)
    },
    findSchoolByEmail: (contactEmail: string, select: string = '') => {
        return schoolModel.findOne({ contactEmail }).select(select)
    },
    findSchoolByCode: (code: string) => {
        return schoolModel.findOne({ code })
    },
    findSchoolByVerificationToken: (verificationToken: string) => {
        return schoolModel.findOne({ verificationToken })
    },
    findSchoolByAdminUserId: (adminUserId: string) => {
        return schoolModel.findOne({ adminUserId })
    },
    findSchoolById: (id: string) => {
        return schoolModel.findById(id)
    },
    listSchools: (query: Record<string, unknown> = {}, page: number = 1, limit: number = 20) => {
        const skip = Math.max(0, (page - 1) * limit)
        return schoolModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
    },
    countSchools: (query: Record<string, unknown> = {}) => {
        return schoolModel.countDocuments(query)
    },
    updateSchoolById: (id: string, payload: Partial<ISchool>) => {
        return schoolModel.findByIdAndUpdate(id, payload, { new: true })
    },
    deleteSchoolById: (id: string) => {
        return schoolModel.findByIdAndDelete(id)
    },
    incrementGrCounterBySchoolId: (id: string) => {
        return schoolModel.findByIdAndUpdate(id, { $inc: { grCounter: 1 } }, { new: true })
    }
}
