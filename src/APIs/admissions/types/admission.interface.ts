import { Request } from 'express'

export interface ICreateAdmissionRequest {
    schoolId: string
    name: string
    grNumber?: string
    className: string
    section?: string
    guardianName: string
    guardianPhone: string
    address?: string
    status?: string
    admissionDate?: string
    previousSchool?: string
    photoUrl?: string
    documentUrls?: string[]
}

export interface ICreateAdmission extends Request {
    body: ICreateAdmissionRequest
}

export interface IImportAdmissionItem extends Omit<ICreateAdmissionRequest, 'grNumber'> {
    grNumber: string
}

export interface IImportAdmissionsRequest {
    schoolId: string
    admissions: IImportAdmissionItem[]
}

export interface IImportAdmissions extends Request {
    body: IImportAdmissionsRequest
}

export interface IListAdmissions extends Request {
    query: {
        schoolId?: string
    }
}
