import { NextFunction, Request, Response } from 'express'
import responseMessage from '../../../constant/responseMessage'
import { EUserRoles } from '../../../constant/users'
import httpError from '../../../handlers/errorHandler/httpError'
import httpResponse from '../../../handlers/httpResponse'
import { CustomError } from '../../../utils/errors'
import schoolRepo from '../../school/_shared/repo/school.repository'
import staffRepo from '../../staff/_shared/repo/staff.repository'
import { IMyUser } from './types/management.interface'

const dashboardPages = ['Dashboard', 'Attendance', 'Messages', 'Students', 'Staff', 'Admissions', 'Fees', 'Exams']

const toPlainObject = (value: unknown): Record<string, unknown> => {
    const withToObject = value as { toObject?: () => unknown }
    const candidate = typeof withToObject?.toObject === 'function' ? withToObject.toObject() : value

    if (candidate && typeof candidate === 'object') {
        return candidate as Record<string, unknown>
    }

    return {}
}

export default {
    me: async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { authenticatedUser, authenticatedSchool, authenticatedSchoolId } = request as unknown as IMyUser

            if (authenticatedSchool) {
                const schoolObj = toPlainObject(authenticatedSchool)
                httpResponse(response, request, 200, responseMessage.SUCCESS, {
                    ...schoolObj,
                    role: 'school_owner',
                    schoolId: String(authenticatedSchool._id),
                    schoolCode: authenticatedSchool.code,
                    accessPages: dashboardPages
                })
                return
            }

            if (!authenticatedUser) {
                return httpError(next, new Error(responseMessage.UNAUTHORIZED), request, 401)
            }

            const userObj = toPlainObject(authenticatedUser)

            if (authenticatedUser.role === EUserRoles.SUPER_ADMIN) {
                httpResponse(response, request, 200, responseMessage.SUCCESS, {
                    ...userObj,
                    role: authenticatedUser.role,
                    schoolId: null,
                    schoolCode: null,
                    accessPages: []
                })
                return
            }

            if (authenticatedUser.role === EUserRoles.USER) {
                let staff = null
                if (authenticatedSchoolId) {
                    staff = await staffRepo.findStaffByEmailAndSchool(authenticatedUser.email, authenticatedSchoolId)
                }
                if (!staff) {
                    staff = await staffRepo.findStaffByEmail(authenticatedUser.email)
                }
                httpResponse(response, request, 200, responseMessage.SUCCESS, {
                    ...userObj,
                    accessPages: staff?.accessPages || [],
                    staffId: staff?._id ? String(staff._id) : null,
                    staffRole: staff?.role || '',
                    staffStatus: staff?.status || null,
                    staffPhone: staff?.phone || '',
                    staffPhotoUrl: staff?.photoUrl || '',
                    staffDocumentUrls: staff?.documentUrls || [],
                    schoolId: staff?.schoolId || null,
                    schoolCode: null
                })
                return
            }

            const primarySchool = await schoolRepo.findSchoolByAdminUserId(String(authenticatedUser._id))
            let adminStaff = null
            if (authenticatedSchoolId) {
                adminStaff = await staffRepo.findStaffByEmailAndSchool(authenticatedUser.email, authenticatedSchoolId)
            }
            if (!adminStaff) {
                adminStaff = await staffRepo.findStaffByEmail(authenticatedUser.email)
            }

            const schoolId = primarySchool ? String(primarySchool._id) : adminStaff?.schoolId || null
            const schoolCode = primarySchool?.code || null

            httpResponse(response, request, 200, responseMessage.SUCCESS, {
                ...userObj,
                role: authenticatedUser.role,
                schoolId,
                schoolCode,
                accessPages: dashboardPages,
                staffId: adminStaff?._id ? String(adminStaff._id) : null,
                staffRole: adminStaff?.role || '',
                staffStatus: adminStaff?.status || null,
                staffPhone: adminStaff?.phone || '',
                staffPhotoUrl: adminStaff?.photoUrl || '',
                staffDocumentUrls: adminStaff?.documentUrls || []
            })
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }
}
