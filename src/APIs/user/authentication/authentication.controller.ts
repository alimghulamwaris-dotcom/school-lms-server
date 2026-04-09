import { NextFunction, Request, Response } from 'express'
import config from '../../../config/config'
import responseMessage from '../../../constant/responseMessage'
import asyncHandler from '../../../handlers/async'
import httpError from '../../../handlers/errorHandler/httpError'
import httpResponse from '../../../handlers/httpResponse'
import { CustomError } from '../../../utils/errors'
import { validateSchema } from '../../../utils/joi-validate'
import query from '../_shared/repo/token.repository'
import { accountConfirmationService, loginService, registrationService } from './authentication.service'
import { IConfirmRegistration, ILogin, ILoginRequest, IRegister, IRegisterRequest } from './types/authentication.interface'
import { loginSchema, registerSchema } from './validation/validation.schema'

const getCookiePolicy = (request: Request): { sameSite: 'none' | 'lax'; secure: boolean } => {
    const origin = (request.headers.origin || '').toLowerCase()
    const isLocalOrigin = origin.includes('localhost') || origin.includes('127.0.0.1')
    const isCrossSite = !isLocalOrigin

    return {
        sameSite: isCrossSite ? 'none' : 'lax',
        secure: isCrossSite
    }
}

export default {
    register: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as IRegister
            const { error, payload } = validateSchema<IRegisterRequest>(registerSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const registrationResult = await registrationService(payload)
            if (registrationResult.success === true) {
                httpResponse(response, request, 201, responseMessage.auth.USER_REGISTERED, registrationResult)
            }
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    confirmRegistration: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params, query } = request as IConfirmRegistration

            const { token } = params
            const { code } = query

            const user = await accountConfirmationService(token, code)

            httpResponse(response, request, 201, responseMessage.auth.USER_REGISTERED, user)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    login: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ILogin

            const { error, payload } = validateSchema<ILoginRequest>(loginSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const isLoggedIn = await loginService(payload)
            if (isLoggedIn.success === true) {
                const cookiePolicy = getCookiePolicy(request)
                response
                    .cookie('accessToken', isLoggedIn.accessToken, {
                        path: '/v1',
                        sameSite: cookiePolicy.sameSite,
                        maxAge: 1000 * config.TOKENS.ACCESS.EXPIRY,
                        httpOnly: true,
                        secure: cookiePolicy.secure
                    })
                    .cookie('refreshToken', isLoggedIn.refreshToken, {
                        path: '/v1',
                        sameSite: cookiePolicy.sameSite,
                        maxAge: 1000 * config.TOKENS.REFRESH.EXPIRY,
                        httpOnly: true,
                        secure: cookiePolicy.secure
                    })

                httpResponse(response, request, 200, responseMessage.auth.LOGIN_SUCCESSFUL, isLoggedIn)
            }
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    logout: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { cookies } = request
            const { refreshToken } = cookies as {
                refreshToken: string | undefined
            }
            if (refreshToken) {
                await query.deleteToken(refreshToken)
            }

            const cookiePolicy = getCookiePolicy(request)
            response
                .clearCookie('accessToken', {
                    path: '/v1',
                    sameSite: cookiePolicy.sameSite,
                    maxAge: 1000 * config.TOKENS.ACCESS.EXPIRY,
                    httpOnly: true,
                    secure: cookiePolicy.secure
                })
                .clearCookie('refreshToken', {
                    path: '/v1',
                    sameSite: cookiePolicy.sameSite,
                    maxAge: 1000 * config.TOKENS.REFRESH.EXPIRY,
                    httpOnly: true,
                    secure: cookiePolicy.secure
                })

            httpResponse(response, request, 200, responseMessage.SUCCESS, null)
        } catch (error) {
            httpError(next, error, request, 500)
        }
    })
}
