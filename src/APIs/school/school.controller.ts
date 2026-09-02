import { NextFunction, Request, Response } from 'express'
import responseMessage from '../../constant/responseMessage'
import httpError from '../../handlers/errorHandler/httpError'
import httpResponse from '../../handlers/httpResponse'
import asyncHandler from '../../handlers/async'
import { CustomError } from '../../utils/errors'
import { validateSchema } from '../../utils/joi-validate'
import {
    advanceSchoolSemesterService,
    getSchoolAcademicConfigService,
    getSchoolGrConfigService,
    getSchoolStaffAttendanceConfigService,
    lookupSchoolService,
    registerSchoolService,
    rolloverSchoolAcademicYearService,
    updateSchoolAcademicConfigService,
    updateSchoolStaffAttendanceConfigService,
    verifySchoolService
} from './school.service'
import {
    ISchoolAcademicConfigQuery,
    ISchoolAcademicConfigRequest,
    ISchoolAcademicConfigUpdate,
    ISchoolAdvanceSemester,
    ISchoolAdvanceSemesterRequest,
    ISchoolGrConfigQuery,
    ISchoolLookup,
    ISchoolRegister,
    ISchoolRegisterRequest,
    ISchoolRolloverAcademicYear,
    ISchoolRolloverAcademicYearRequest,
    ISchoolStaffAttendanceConfigQuery,
    ISchoolStaffAttendanceConfigRequest,
    ISchoolStaffAttendanceConfigUpdate,
    ISchoolVerify
} from './types/school.interface'
import {
    schoolAcademicConfigQuerySchema,
    schoolAcademicConfigSchema,
    schoolAdvanceSemesterSchema,
    schoolGrConfigQuerySchema,
    schoolLookupSchema,
    schoolRegisterSchema,
    schoolRolloverAcademicYearSchema,
    schoolStaffAttendanceConfigQuerySchema,
    schoolStaffAttendanceConfigSchema,
    schoolVerifySchema
} from './validation/validation.schema'

export default {
    register: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ISchoolRegister

            const { error, payload } = validateSchema<ISchoolRegisterRequest>(schoolRegisterSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await registerSchoolService(payload)
            if (result.success === true) {
                httpResponse(response, request, 201, responseMessage.school.SCHOOL_VERIFICATION_SENT, result)
            }
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    verify: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params } = request as ISchoolVerify
            const { error, payload } = validateSchema<{ token: string }>(schoolVerifySchema, params)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await verifySchoolService(payload.token)
            httpResponse(response, request, 200, responseMessage.school.SCHOOL_VERIFIED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    lookup: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as ISchoolLookup
            const { error, payload } = validateSchema<{ code: string }>(schoolLookupSchema, query)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await lookupSchoolService(payload.code)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    getGrConfig: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as ISchoolGrConfigQuery
            const { error, payload } = validateSchema<{ schoolId: string }>(schoolGrConfigQuerySchema, query)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await getSchoolGrConfigService(payload.schoolId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    getStaffAttendanceConfig: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as ISchoolStaffAttendanceConfigQuery
            const { error, payload } = validateSchema<{ schoolId: string }>(schoolStaffAttendanceConfigQuerySchema, query)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await getSchoolStaffAttendanceConfigService(payload.schoolId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    updateStaffAttendanceConfig: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ISchoolStaffAttendanceConfigUpdate
            const { error, payload } = validateSchema<ISchoolStaffAttendanceConfigRequest>(schoolStaffAttendanceConfigSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await updateSchoolStaffAttendanceConfigService(payload)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    getAcademicConfig: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request as ISchoolAcademicConfigQuery
            const { error, payload } = validateSchema<{ schoolId: string }>(schoolAcademicConfigQuerySchema, query)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await getSchoolAcademicConfigService(payload.schoolId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    updateAcademicConfig: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ISchoolAcademicConfigUpdate
            const { error, payload } = validateSchema<ISchoolAcademicConfigRequest>(schoolAcademicConfigSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await updateSchoolAcademicConfigService(payload)
            httpResponse(response, request, 200, responseMessage.school.ACADEMIC_CONFIG_UPDATED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    advanceSemester: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ISchoolAdvanceSemester
            const { error, payload } = validateSchema<ISchoolAdvanceSemesterRequest>(schoolAdvanceSemesterSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await advanceSchoolSemesterService(payload)
            httpResponse(response, request, 200, responseMessage.school.SEMESTER_ADVANCED, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    rolloverAcademicYear: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ISchoolRolloverAcademicYear
            const { error, payload } = validateSchema<ISchoolRolloverAcademicYearRequest>(schoolRolloverAcademicYearSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await rolloverSchoolAcademicYearService(payload)
            httpResponse(response, request, 200, responseMessage.school.ACADEMIC_YEAR_ROLLED_OVER, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    })
}
