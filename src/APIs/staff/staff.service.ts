import staffRepo from './_shared/repo/staff.repository'
import { ICreateStaffRequest, IUpdateStaffRequest } from './types/staff.interface'

export const createStaffService = async (payload: ICreateStaffRequest) => {
    const staff = await staffRepo.createStaff({
        schoolId: payload.schoolId,
        name: payload.name,
        role: payload.role,
        email: payload.email,
        phone: payload.phone,
        accessPages: payload.accessPages || [],
        status: payload.status || 'pending',
        photoUrl: payload.photoUrl || '',
        documentUrls: payload.documentUrls || []
    })

    return {
        success: true,
        staff
    }
}

export const listStaffService = async (schoolId: string) => {
    const staff = await staffRepo.findStaffBySchool(schoolId)
    return {
        success: true,
        staff
    }
}

export const updateStaffService = async (id: string, payload: IUpdateStaffRequest) => {
    const staff = await staffRepo.updateStaff(id, payload)
    return {
        success: true,
        staff
    }
}
