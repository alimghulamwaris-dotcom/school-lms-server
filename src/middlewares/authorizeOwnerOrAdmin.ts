import { NextFunction, Request, Response } from 'express'
import { EUserRoles } from '../constant/users'
import responseMessage from '../constant/responseMessage'
import httpError from '../handlers/errorHandler/httpError'
import { IAuthenticateRequest } from '../types/types'

export default (request: Request, _response: Response, next: NextFunction) => {
    try {
        const req = request as IAuthenticateRequest

        if (req.authenticatedSchool) {
            next()
            return
        }

        if (req.authenticatedUser?.role === EUserRoles.ADMIN) {
            next()
            return
        }

        httpError(next, new Error(responseMessage.FORBIDDEN), request, 403)
    } catch (error) {
        httpError(next, error, request, 500)
    }
}
