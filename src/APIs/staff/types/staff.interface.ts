import { Request } from 'express'

export interface ICreateStaffRequest {
    schoolId: string
    name: string
    role: string
    email: string
    phone: string
    accessPages: string[]
    status?: string
    photoUrl?: string
    documentUrls?: string[]
}

export interface ICreateStaff extends Request {
    body: ICreateStaffRequest
}

export interface IUpdateStaffRequest {
    name?: string
    email?: string
    phone?: string
    accessPages?: string[]
    status?: string
    role?: string
    photoUrl?: string
    documentUrls?: string[]
}

export interface IUpdateStaff extends Request {
    params: {
        id: string
    }
    body: IUpdateStaffRequest
}

export interface IListStaff extends Request {
    query: {
        schoolId?: string
    }
}

export interface IDeleteStaff extends Request {
    params: {
        id: string
    }
}
