import staffModel from '../models/staff.model'
import { IStaff } from '../types/staff.interface'

export default {
    createStaff: (payload: IStaff) => {
        return staffModel.create(payload)
    },
    findStaffById: (id: string) => {
        return staffModel.findById(id)
    },
    findStaffBySchool: (schoolId: string) => {
        return staffModel.find({ schoolId })
    },
    findStaffByEmail: (email: string) => {
        return staffModel.findOne({ email })
    },
    findStaffByEmailAndSchool: (email: string, schoolId: string) => {
        return staffModel.findOne({ email, schoolId })
    },
    updateStaff: (id: string, payload: Partial<IStaff>) => {
        return staffModel.findByIdAndUpdate(id, payload, { new: true })
    },
    deleteStaffById: (id: string) => {
        return staffModel.findByIdAndDelete(id)
    }
}
