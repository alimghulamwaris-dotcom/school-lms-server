import { Request } from 'express'
import { TAcademicYearStatus, TSemesterStatus } from '../_shared/types/school.interface'

export interface ISchoolRegisterRequest {
    schoolName: string
    campus: string
    contactPhone: string
    contactEmail: string
    password: string
}

export interface ISchoolRegister extends Request {
    body: ISchoolRegisterRequest
}

export interface ISchoolLookup extends Request {
    query: {
        code?: string
    }
}

export interface ISchoolVerify extends Request {
    params: {
        token: string
    }
}

export interface ISchoolGrConfigRequest {
    schoolId: string
    grPattern: string
}

export interface ISchoolGrConfigUpdate extends Request {
    body: ISchoolGrConfigRequest
}

export interface ISchoolGrConfigQuery extends Request {
    query: {
        schoolId?: string
    }
}

export interface ISchoolStaffAttendanceConfigRequest {
    schoolId: string
    checkInTime: string
    graceMinutes: number
}

export interface ISchoolStaffAttendanceConfigUpdate extends Request {
    body: ISchoolStaffAttendanceConfigRequest
}

export interface ISchoolStaffAttendanceConfigQuery extends Request {
    query: {
        schoolId?: string
    }
}

export interface ISchoolSemesterInput {
    number: number
    name: string
    startDate?: string | null
    endDate?: string | null
    status: TSemesterStatus
}

export interface ISchoolAcademicConfigRequest {
    schoolId: string
    academicYear: string
    academicYearStatus: TAcademicYearStatus
    passPercentage: number
    currentSemesterNumber: number
    semesters: ISchoolSemesterInput[]
}

export interface ISchoolAcademicConfigUpdate extends Request {
    body: ISchoolAcademicConfigRequest
}

export interface ISchoolAcademicConfigQuery extends Request {
    query: {
        schoolId?: string
    }
}

export interface ISchoolAdvanceSemesterRequest {
    schoolId: string
}

export interface ISchoolAdvanceSemester extends Request {
    body: ISchoolAdvanceSemesterRequest
}

export interface ISchoolRolloverAcademicYearRequest {
    schoolId: string
    nextAcademicYear?: string
    totalSemesters?: number
    semesterNames?: string[]
}

export interface ISchoolRolloverAcademicYear extends Request {
    body: ISchoolRolloverAcademicYearRequest
}

export interface ISchoolBrandingRequest {
    schoolId: string
    logoUrl?: string | null
    address?: string | null
}

export interface ISchoolBrandingUpdate extends Request {
    body: ISchoolBrandingRequest
}

export interface ISchoolBrandingQuery extends Request {
    query: { schoolId?: string }
}
