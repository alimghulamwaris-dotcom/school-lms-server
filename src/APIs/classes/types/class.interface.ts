import { Request } from 'express'

export interface ICreateClassRequest {
    schoolId: string
    className: string
}

export interface IAddSectionRequest {
    schoolId: string
    section: string
}

export interface IUpdateClassRequest {
    className?: string
    sections?: string[]
    status?: 'active' | 'archived'
}

export interface ICreateClass extends Request {
    body: ICreateClassRequest
}

export interface IListClasses extends Request {
    query: {
        schoolId?: string
    }
}

export interface IGetClassById extends Request {
    params: {
        id: string
    }
    query: {
        schoolId?: string
    }
}

export interface IAddSection extends Request {
    params: {
        id: string
    }
    body: IAddSectionRequest
}

export interface IUpdateClass extends Request {
    params: {
        id: string
    }
    body: IUpdateClassRequest
}
