import { NextFunction, Request, Response } from 'express'
import { EUserRoles } from '../constant/users'
import responseMessage from '../constant/responseMessage'
import asyncHandler from '../handlers/async'
import httpError from '../handlers/errorHandler/httpError'
import staffRepo from '../APIs/staff/_shared/repo/staff.repository'
import { IAuthenticateRequest } from '../types/types'

const normalize = (value: string) => value.trim().toLowerCase()

const isFeeManagerRole = (role: string) => {
    const normalized = normalize(role)
    return normalized.includes('account') || normalized.includes('finance')
}

export default asyncHandler(async (request: Request, _response: Response, next: NextFunction) => {
    try {
        const req = request as IAuthenticateRequest

        if (req.authenticatedSchool) {
            return next()
        }

        if (!req.authenticatedUser) {
            return httpError(next, new Error(responseMessage.SESSION_EXPIRED), request, 401)
        }

        if (req.authenticatedUser.role === EUserRoles.ADMIN) {
            return next()
        }

        let staff = null
        if (req.authenticatedSchoolId) {
            staff = await staffRepo.findStaffByEmailAndSchool(req.authenticatedUser.email, req.authenticatedSchoolId)
        }
        if (!staff) {
            staff = await staffRepo.findStaffByEmail(req.authenticatedUser.email)
        }
        if (!staff || (staff.status && normalize(staff.status) !== 'active')) {
            return httpError(next, new Error(responseMessage.FORBIDDEN), request, 403)
        }

        if (isFeeManagerRole(staff.role)) {
            return next()
        }

        return httpError(next, new Error(responseMessage.FORBIDDEN), request, 403)
    } catch (error) {
        return httpError(next, error, request, 500)
    }
})
