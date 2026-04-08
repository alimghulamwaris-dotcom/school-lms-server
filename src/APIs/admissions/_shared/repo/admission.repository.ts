import admissionModel from '../models/admission.model'
import { IAdmission } from '../types/admission.interface'

export default {
    createAdmission: (payload: IAdmission) => {
        return admissionModel.create(payload)
    },
    createAdmissions: (payload: IAdmission[]) => {
        return admissionModel.insertMany(payload)
    },
    findAdmissionsBySchool: (schoolId: string) => {
        return admissionModel.find({ schoolId })
    },
    findAdmissionById: (id: string) => {
        return admissionModel.findById(id)
    },
    findAdmissionBySchoolAndGr: (schoolId: string, grNumber: string) => {
        return admissionModel.findOne({ schoolId, grNumber })
    },
    findAdmissionsBySchoolAndGrNumbers: (schoolId: string, grNumbers: string[]) => {
        return admissionModel.find({ schoolId, grNumber: { $in: grNumbers } })
    },
    updateAdmissionById: (id: string, payload: Partial<IAdmission>) => {
        return admissionModel.findByIdAndUpdate(id, payload, { new: true })
    }
}
