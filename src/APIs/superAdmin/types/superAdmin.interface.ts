import { Request } from 'express'
import { ISchoolRegisterRequest } from '../../school/types/school.interface'

export interface ISuperAdminCreateSchool extends Request {
    body: ISchoolRegisterRequest
}

export interface ISuperAdminSchoolsQuery {
    search?: string
    page?: number
    limit?: number
}

export interface ISuperAdminListSchoolsRequest extends Request {
    query: {
        search?: string
        page?: string
        limit?: string
    }
}

export interface ISuperAdminDeleteSchoolRequest extends Request {
    params: {
        schoolId: string
    }
}
