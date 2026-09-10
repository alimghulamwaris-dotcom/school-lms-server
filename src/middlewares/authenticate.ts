import { NextFunction, Request, Response } from 'express'
import { TokenExpiredError } from 'jsonwebtoken'
import { IAuthenticateRequest, IDecryptedJwt } from '../types/types'
import jwt from '../utils/jwt'
import config from '../config/config'
import query from '../APIs/user/_shared/repo/user.repository'
import schoolRepo from '../APIs/school/_shared/repo/school.repository'
import httpError from '../handlers/errorHandler/httpError'
import responseMessage from '../constant/responseMessage'
import asyncHandler from '../handlers/async'

export default asyncHandler(async (request: Request, _response: Response, next: NextFunction) => {
    try {
        const req = request as IAuthenticateRequest

        const { cookies } = req

        const { accessToken } = cookies as {
            accessToken: string | undefined
        }

        if (accessToken) {
            const decoded = jwt.verifyToken(accessToken, config.TOKENS.ACCESS.SECRET) as IDecryptedJwt

            if (decoded.principalType === 'school' && decoded.schoolId) {
                const school = await schoolRepo.findSchoolById(decoded.schoolId)
                if (school) {
                    req.authenticatedSchool = school
                    return next()
                }
            }

            if (decoded.userId) {
                const user = await query.findUserById(decoded.userId)
                if (user) {
                    req.authenticatedUser = user
                    req.authenticatedSchoolId = decoded.schoolId || null
                    return next()
                }
            }
        }
        httpError(next, new Error(responseMessage.SESSION_EXPIRED), request, 401)
    } catch (error) {
        if (error instanceof TokenExpiredError) {
            return httpError(next, new Error(responseMessage.SESSION_EXPIRED), request, 401)
        }
        httpError(next, error, request, 500)
    }
})
