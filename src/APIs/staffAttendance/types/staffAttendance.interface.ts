import { Request } from 'express'

export interface ICheckInRequest {
    schoolId: string
}

export interface ICheckOutRequest {
    schoolId: string
}

export interface ICheckIn extends Request {
    body: ICheckInRequest
}

export interface ICheckOut extends Request {
    body: ICheckOutRequest
}

export interface IMyAttendance extends Request {
    query: {
        schoolId?: string
        date?: string
    }
}

export interface IListStaffAttendance extends Request {
    query: {
        schoolId?: string
        staffId?: string
        dateFrom?: string
        dateTo?: string
        limit?: string
    }
}
