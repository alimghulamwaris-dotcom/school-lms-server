import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import config from '../../config/config'
import responseMessage from '../../constant/responseMessage'
import { EUserRoles } from '../../constant/users'
import logger from '../../handlers/logger'
import emailService from '../../services/email'
import { IAuthenticateRequest } from '../../types/types'
import code from '../../utils/code'
import { CustomError } from '../../utils/errors'
import schoolRepo from '../school/_shared/repo/school.repository'
import staffRepo from '../staff/_shared/repo/staff.repository'
import invitationRepo from './_shared/repo/invitation.repository'
import { ICreateInvitationRequest } from './types/invitation.interface'

dayjs.extend(utc)

const normalize = (value: string) => value.trim().toLowerCase()

const defaultPages = ['Dashboard']
const adminPages = ['Dashboard', 'Attendance', 'Messages', 'Students', 'Staff', 'Admissions', 'Fees']

const deriveNameFromEmail = (email: string) => {
    const local = email.split('@')[0] || ''
    const cleaned = local.replace(/[^a-zA-Z0-9]/g, ' ').trim()
    if (cleaned.length >= 2) {
        return cleaned
    }
    return 'Invited User'
}

const assertPrincipalCanManageSchool = async (request: IAuthenticateRequest, schoolId: string) => {
    if (request.authenticatedSchool) {
        const school = request.authenticatedSchool
        if (String(school._id) !== schoolId) {
            throw new CustomError(responseMessage.UNAUTHORIZED, 403)
        }

        return {
            school,
            invitedByType: 'school' as const,
            invitedById: String(school._id)
        }
    }

    const user = request.authenticatedUser
    if (!user || user.role !== EUserRoles.ADMIN) {
        throw new CustomError(responseMessage.UNAUTHORIZED, 403)
    }

    const school = await schoolRepo.findSchoolById(schoolId)
    if (!school) {
        throw new CustomError(responseMessage.NOT_FOUND('School'), 404)
    }

    const linkedStaff = await staffRepo.findStaffByEmail(user.email)
    const isPrimaryAdmin = school.adminUserId === String(user._id)
    const isAdminStaff =
        !!linkedStaff && linkedStaff.schoolId === schoolId && normalize(linkedStaff.role).includes('admin') && linkedStaff.status === 'active'

    if (!isPrimaryAdmin && !isAdminStaff) {
        throw new CustomError(responseMessage.UNAUTHORIZED, 403)
    }

    return {
        school,
        invitedByType: 'user' as const,
        invitedById: String(user._id)
    }
}

export const createInvitationService = async (request: IAuthenticateRequest, payload: ICreateInvitationRequest) => {
    const { school, invitedByType, invitedById } = await assertPrincipalCanManageSchool(request, payload.schoolId)

    const normalizedEmail = payload.email.trim().toLowerCase()

    const existingPending = await invitationRepo.findPendingInvitationByEmailAndSchool(payload.schoolId, normalizedEmail)
    if (existingPending) {
        throw new CustomError('A pending invitation already exists for this email.', 422)
    }

    const hasAdminAlready = !!school.adminUserId
    if (invitedByType === 'school' && hasAdminAlready) {
        throw new CustomError('Admin is already configured. Please sign in with admin account to invite more users.', 403)
    }

    let resolvedRole = payload.role?.trim() || 'Staff'
    let resolvedAccessPages = payload.accessPages || []

    if (invitedByType === 'school' && !hasAdminAlready) {
        resolvedRole = 'Admin'
        resolvedAccessPages = adminPages
    }

    if (!Array.isArray(resolvedAccessPages) || resolvedAccessPages.length === 0) {
        resolvedAccessPages = normalize(resolvedRole) === 'admin' ? adminPages : defaultPages
    }

    const token = code.generateRandomId()
    const expiry = dayjs().utc().add(48, 'hour').toDate()

    const invitation = await invitationRepo.createInvitation({
        schoolId: payload.schoolId,
        name: deriveNameFromEmail(normalizedEmail),
        email: normalizedEmail,
        phone: 'NA',
        role: resolvedRole,
        accessPages: resolvedAccessPages,
        token,
        expiry,
        status: 'pending',
        invitedByType,
        invitedById,
        acceptedUserId: null
    })

    const inviteUrl = `${config.CLIENT_URL}/invite/accept?token=${token}&email=${encodeURIComponent(normalizedEmail)}`
    const subject = `Invitation to join ${school.name}`
    const text = `You are invited as ${resolvedRole} in ${school.name}. Complete signup using this link:\n\n${inviteUrl}`

    emailService.sendEmail([normalizedEmail], subject, text).catch((error) => {
        logger.error('Error sending invitation email', {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            meta: error
        })
    })

    return {
        success: true,
        invitation: {
            _id: invitation._id,
            schoolId: invitation.schoolId,
            name: invitation.name,
            email: invitation.email,
            phone: invitation.phone,
            role: invitation.role,
            accessPages: invitation.accessPages,
            status: invitation.status,
            expiry: invitation.expiry
        }
    }
}

export const listInvitationsService = async (request: IAuthenticateRequest, schoolId: string) => {
    if (!schoolId) {
        throw new CustomError('schoolId is required', 422)
    }

    await assertPrincipalCanManageSchool(request, schoolId)

    const invitations = await invitationRepo.listInvitationsBySchool(schoolId)
    return {
        success: true,
        invitations
    }
}
