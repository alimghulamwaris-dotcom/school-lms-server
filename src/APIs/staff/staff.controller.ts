import { NextFunction, Request, Response } from 'express'
import responseMessage from '../../constant/responseMessage'
import asyncHandler from '../../handlers/async'
import httpError from '../../handlers/errorHandler/httpError'
import httpResponse from '../../handlers/httpResponse'
import { CustomError } from '../../utils/errors'
import { validateSchema } from '../../utils/joi-validate'
import { IAuthenticateRequest } from '../../types/types'
import staffRepo from './_shared/repo/staff.repository'
import { createStaffService, deleteStaffService, listStaffService, updateStaffService } from './staff.service'
import { ICreateStaff, ICreateStaffRequest, IDeleteStaff, IListStaff, IUpdateStaff, IUpdateStaffRequest } from './types/staff.interface'
import { createStaffSchema, updateStaffSchema } from './validation/validation.schema'

const resolveSchoolIdFromRequest = (request: IAuthenticateRequest, schoolIdInput?: string) => {
    if (schoolIdInput && schoolIdInput.trim()) {
        return schoolIdInput.trim()
    }

    if (request.authenticatedSchool) {
        return String(request.authenticatedSchool._id)
    }

    if (request.authenticatedSchoolId) {
        return request.authenticatedSchoolId
    }

    return ''
}

const resolveMyStaffProfile = async (request: IAuthenticateRequest, schoolIdInput?: string) => {
    const user = request.authenticatedUser
    if (!user) {
        throw new CustomError(responseMessage.UNAUTHORIZED, 401)
    }

    const schoolId = resolveSchoolIdFromRequest(request, schoolIdInput)
    if (schoolId) {
        const scopedStaff = await staffRepo.findStaffByEmailAndSchool(user.email, schoolId)
        if (scopedStaff) {
            return scopedStaff
        }
    }

    const anyStaff = await staffRepo.findStaffByEmail(user.email)
    if (!anyStaff) {
        throw new CustomError(responseMessage.NOT_FOUND('Staff member'), 404)
    }

    return anyStaff
}

export default {
    create: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ICreateStaff
            const { error, payload } = validateSchema<ICreateStaffRequest>(createStaffSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await createStaffService(payload)
            httpResponse(response, request, 201, responseMessage.school.STAFF_CREATED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),

    list: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const typedRequest = request as IListStaff & IAuthenticateRequest
            const schoolId = resolveSchoolIdFromRequest(typedRequest, typedRequest.query.schoolId)
            if (!schoolId) {
                return httpError(next, new CustomError('schoolId is required', 422), request, 422)
            }

            const result = await listStaffService(schoolId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),

    update: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params, body } = request as IUpdateStaff
            const { error, payload } = validateSchema<IUpdateStaffRequest>(updateStaffSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const typedRequest = request as IUpdateStaff & IAuthenticateRequest
            const result = await updateStaffService(params.id, payload, typedRequest)
            httpResponse(response, request, 200, responseMessage.school.STAFF_UPDATED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),

    remove: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const typedRequest = request as IDeleteStaff & IAuthenticateRequest
            const result = await deleteStaffService(typedRequest.params.id, typedRequest)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),

    getMe: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const typedRequest = request as IAuthenticateRequest & { query: { schoolId?: string } }
            const staff = await resolveMyStaffProfile(typedRequest, typedRequest.query.schoolId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, {
                success: true,
                staff
            })
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),

    updateMe: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const typedRequest = request as IAuthenticateRequest & { query: { schoolId?: string } }
            const { error, payload } = validateSchema<IUpdateStaffRequest>(updateStaffSchema, request.body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const staff = await resolveMyStaffProfile(typedRequest, typedRequest.query.schoolId)
            const result = await updateStaffService(String(staff._id), payload, typedRequest)
            httpResponse(response, request, 200, responseMessage.school.STAFF_UPDATED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),

    get: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const typedRequest = request as IAuthenticateRequest & { params: { id: string } }
            const staffId = typedRequest.params.id

            if (!staffId) {
                return httpError(next, new CustomError('Staff ID is required', 422), request, 422)
            }

            const staff = await staffRepo.findStaffById(staffId)
            if (!staff) {
                return httpError(next, new CustomError(responseMessage.NOT_FOUND('Staff member'), 404), request, 404)
            }

            // Verify that the requesting user has access to this staff member
            const user = typedRequest.authenticatedUser
            if (!user) {
                return httpError(next, new CustomError(responseMessage.UNAUTHORIZED, 401), request, 401)
            }

            // Check if user can access this staff member (same school or admin/owner)
            const userRole = (user.role || '').toLowerCase()
            const canAccess = userRole === 'admin' || userRole === 'school_owner'

            if (!canAccess) {
                // For regular staff, they can only view their own profile
                const myStaff = await resolveMyStaffProfile(typedRequest)
                if (String(myStaff._id) !== staffId) {
                    return httpError(next, new CustomError('Access denied', 403), request, 403)
                }
            }

            httpResponse(response, request, 200, responseMessage.SUCCESS, {
                success: true,
                staff
            })
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    })
}
