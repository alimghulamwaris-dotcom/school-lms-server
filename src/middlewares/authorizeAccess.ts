import { NextFunction, Request, Response } from 'express'
import responseMessage from '../constant/responseMessage'
import { EUserRoles } from '../constant/users'
import asyncHandler from '../handlers/async'
import httpError from '../handlers/errorHandler/httpError'
import staffRepo from '../APIs/staff/_shared/repo/staff.repository'
import { IAuthenticateRequest } from '../types/types'

const normalize = (value: string) => value.trim().toLowerCase()

const authorizeAccess = (pageKey: string | string[]) => {
    return asyncHandler(async (request: Request, _response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest

            if (req.authenticatedSchool) {
                return next()
            }

            const user = req.authenticatedUser
            if (!user) {
                return httpError(next, new Error(responseMessage.UNAUTHORIZED), request, 401)
            }

            if (user.role === EUserRoles.ADMIN) {
                return next()
            }

            let staff = null
            if (req.authenticatedSchoolId) {
                staff = await staffRepo.findStaffByEmailAndSchool(user.email, req.authenticatedSchoolId)
            }
            if (!staff) {
                staff = await staffRepo.findStaffByEmail(user.email)
            }
            if (!staff) {
                return httpError(next, new Error(responseMessage.UNAUTHORIZED), request, 403)
            }

            if (staff.status && staff.status !== 'active') {
                return httpError(next, new Error(responseMessage.UNAUTHORIZED), request, 403)
            }

            const allowedPages = (staff.accessPages || []).map(normalize)
            const pageKeys = Array.isArray(pageKey) ? pageKey : [pageKey]
            const normalizedKeys = pageKeys.map(normalize)
            const isAllowed = normalizedKeys.some((key) => allowedPages.includes(key))
            if (!isAllowed) {
                return httpError(next, new Error(responseMessage.UNAUTHORIZED), request, 403)
            }

            return next()
        } catch (error) {
            return httpError(next, error, request, 500)
        }
    })
}

export default authorizeAccess
