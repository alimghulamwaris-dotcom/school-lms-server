import { Request } from 'express'

export interface ICreateStudentRequest {
    schoolId: string
    name: string
    grNumber?: string
    feeAmount?: number
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

export interface ICreateStudent extends Request {
    body: ICreateStudentRequest
}

export interface IListStudents extends Request {
    query: {
        schoolId?: string
        className?: string
        section?: string
        status?: string
        search?: string
    }
}

export interface IUpdateStudentRequest {
    name?: string
    className?: string
    section?: string
    guardianName?: string
    guardianPhone?: string
    address?: string
    admissionDate?: string
    previousSchool?: string
    status?: string
    photoUrl?: string
    documentUrls?: string[]
}

export interface IUpdateStudent extends Request {
    params: {
        id: string
    }
    body: IUpdateStudentRequest
}

export interface IApproveStudent extends Request {
    params: {
        id: string
    }
}

export interface IBulkApproveStudentsRequest {
    ids: string[]
}

export interface IBulkApproveStudents extends Request {
    body: IBulkApproveStudentsRequest
}

export interface IDeleteStudent extends Request {
    params: {
        id: string
    }
}

export interface IGetStudentDetail extends Request {
    params: {
        id: string
    }
    query: {
        schoolId?: string
    }
}

export interface IPromotionSelectionRequest {
    studentId: string
    action: 'promote' | 'retain'
    targetClassName?: string
    targetSection?: string
    forcePromote?: boolean
    reason?: string
}

export interface IPreviewPromotionsRequest {
    schoolId: string
    examId: string
    defaultNextClassName?: string
    defaultNextSection?: string
}

export interface IExecutePromotionsRequest extends IPreviewPromotionsRequest {
    selections?: IPromotionSelectionRequest[]
}

export interface IPreviewPromotions extends Request {
    body: IPreviewPromotionsRequest
}

export interface IExecutePromotions extends Request {
    body: IExecutePromotionsRequest
}

export interface IListPromotions extends Request {
    query: {
        schoolId?: string
        academicYear?: string
        examId?: string
        className?: string
        section?: string
        studentId?: string
        search?: string
        limit?: string
    }
}
