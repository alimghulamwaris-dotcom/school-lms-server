import staffRepo from './_shared/repo/staff.repository'
import schoolRepo from '../school/_shared/repo/school.repository'
import classTeacherAssignmentRepo from '../attendance/_shared/repo/classTeacherAssignment.repository'
import responseMessage from '../../constant/responseMessage'
import { EUserRoles } from '../../constant/users'
import { CustomError } from '../../utils/errors'
import { IAuthenticateRequest } from '../../types/types'
import { ICreateStaffRequest, IUpdateStaffRequest } from './types/staff.interface'

const normalize = (value: string) => value.trim().toLowerCase()
const managerRoles = ['admin', 'coordinator', 'principal']

const normalizeStaffPhone = (value: string) => {
    const trimmed = (value || '').trim()
    if (!trimmed) {
        return ''
    }

    let digits = trimmed.replace(/\D/g, '')

    const hasMidPlus = trimmed.includes('+') && !trimmed.startsWith('+')
    if (hasMidPlus) {
        for (let countryCodeLength = 1; countryCodeLength <= 3; countryCodeLength += 1) {
            const countryCode = digits.slice(0, countryCodeLength)
            if (!countryCode) {
                continue
            }
            if (digits.startsWith(`${countryCode}${countryCode}`) && digits.length > countryCodeLength + 7) {
                digits = `${countryCode}${digits.slice(countryCodeLength * 2)}`
                break
            }
        }
    }

    return digits
}

type TStaffActorContext = {
    schoolId: string
    email: string
    canManageAll: boolean
}

const resolveStaffActorContext = async (request: IAuthenticateRequest): Promise<TStaffActorContext> => {
    let schoolId = ''
    let email = ''
    let canManageAll = false

    if (request.authenticatedSchool) {
        schoolId = String(request.authenticatedSchool._id)
        email = normalize(request.authenticatedSchool.contactEmail || '')
        canManageAll = true
    }

    const user = request.authenticatedUser
    if (user) {
        email = normalize(user.email)

        if (user.role === EUserRoles.ADMIN) {
            canManageAll = true
            const linkedSchool = await schoolRepo.findSchoolByAdminUserId(String(user._id))
            if (linkedSchool) {
                schoolId = String(linkedSchool._id)
            }
        }

        let linkedStaff = null
        const scopedSchoolId = request.authenticatedSchoolId || schoolId
        if (scopedSchoolId) {
            linkedStaff = await staffRepo.findStaffByEmailAndSchool(user.email, scopedSchoolId)
        }
        if (!linkedStaff) {
            linkedStaff = await staffRepo.findStaffByEmail(user.email)
        }
        if (linkedStaff?.schoolId) {
            if (!schoolId) {
                schoolId = String(linkedStaff.schoolId)
            }

            const staffRole = normalize(linkedStaff.role || '')
            if (managerRoles.some((role) => staffRole.includes(role))) {
                canManageAll = true
            }
        }
    }

    if (!schoolId) {
        throw new CustomError(responseMessage.UNAUTHORIZED, 403)
    }

    return {
        schoolId,
        email,
        canManageAll
    }
}

const pickAllowedSelfFields = (payload: IUpdateStaffRequest): IUpdateStaffRequest => {
    const next: IUpdateStaffRequest = {}
    if (payload.name !== undefined) next.name = payload.name
    if (payload.phone !== undefined) next.phone = payload.phone
    if (payload.photoUrl !== undefined) next.photoUrl = payload.photoUrl
    if (payload.documentUrls !== undefined) next.documentUrls = payload.documentUrls
    return next
}

export const createStaffService = async (payload: ICreateStaffRequest) => {
    const staff = await staffRepo.createStaff({
        schoolId: payload.schoolId,
        name: payload.name,
        role: payload.role,
        email: payload.email,
        phone: normalizeStaffPhone(payload.phone),
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

export const updateStaffService = async (id: string, payload: IUpdateStaffRequest, request: IAuthenticateRequest) => {
    const existingStaff = await staffRepo.findStaffById(id)
    if (!existingStaff) {
        throw new CustomError(responseMessage.NOT_FOUND('Staff member'), 404)
    }

    const actor = await resolveStaffActorContext(request)
    // ADD THESE LOGS
    // console.log('=== updateStaffService debug ===')
    // console.log('actor.schoolId:', actor.schoolId, typeof actor.schoolId)
    // console.log('existingStaff.schoolId:', existingStaff.schoolId, typeof existingStaff.schoolId)
    // console.log('schoolId match:', actor.schoolId === String(existingStaff.schoolId))
    // console.log('actor.email:', actor.email)
    // console.log('existingStaff.email:', existingStaff.email)
    // console.log('isSelfUpdate:', normalize(existingStaff.email) === normalize(actor.email))
    // console.log('actor.canManageAll:', actor.canManageAll)
    // console.log('payload:', payload)
    // console.log('================================')
    if (actor.schoolId !== String(existingStaff.schoolId)) {
        throw new CustomError(responseMessage.UNAUTHORIZED, 403)
    }

    const isSelfUpdate = normalize(existingStaff.email) === normalize(actor.email)
    if (!actor.canManageAll && !isSelfUpdate) {
        throw new CustomError(responseMessage.UNAUTHORIZED, 403)
    }

    const nextPayload = actor.canManageAll ? { ...payload } : pickAllowedSelfFields(payload)
    if (!actor.canManageAll && Object.keys(nextPayload).length === 0) {
        throw new CustomError('You can only update your own profile data.', 403)
    }

    if (nextPayload.email !== undefined) {
        nextPayload.email = normalize(nextPayload.email)
    }

    if (nextPayload.phone !== undefined) {
        nextPayload.phone = normalizeStaffPhone(nextPayload.phone)
    }

    const staff = await staffRepo.updateStaff(id, nextPayload)
    if (!staff) {
        throw new CustomError(responseMessage.NOT_FOUND('Staff member'), 404)
    }

    return {
        success: true,
        staff
    }
}

export const deleteStaffService = async (id: string, request: IAuthenticateRequest) => {
    const existingStaff = await staffRepo.findStaffById(id)
    if (!existingStaff) {
        throw new CustomError(responseMessage.NOT_FOUND('Staff member'), 404)
    }

    const actor = await resolveStaffActorContext(request)
    if (!actor.canManageAll || actor.schoolId !== existingStaff.schoolId) {
        throw new CustomError(responseMessage.UNAUTHORIZED, 403)
    }

    await staffRepo.deleteStaffById(id)
    await classTeacherAssignmentRepo.deactivateAssignmentsByTeacher(existingStaff.schoolId, existingStaff.email)

    return {
        success: true,
        deletedId: id
    }
}
