import { Request } from 'express'

export type TAttendanceStatus = 'present' | 'absent' | 'on_leave'

export interface IAttendanceStudentEntryRequest {
    studentId?: string | null
    studentName: string
    grNumber: string
    status: TAttendanceStatus
    reason?: string
}

export interface ICreateAttendanceRequest {
    schoolId: string
    className: string
    section?: string
    date: string
    records: IAttendanceStudentEntryRequest[]
    notes?: string
    sendWhatsapp?: boolean
    saveRegister?: boolean
}

export interface IAssignTeacherRequest {
    schoolId: string
    className: string
    section: string
    teacherEmail: string
}

export interface ICreateAttendance extends Request {
    body: ICreateAttendanceRequest
}

export interface IAssignTeacher extends Request {
    body: IAssignTeacherRequest
}

export interface IListAttendance extends Request {
    query: {
        schoolId?: string
        className?: string
        section?: string
        dateFrom?: string
        dateTo?: string
        limit?: string
    }
}

export interface IAttendanceScope extends Request {
    query: {
        schoolId?: string
    }
}

export interface IAttendanceSummary extends Request {
    query: {
        schoolId?: string
        className?: string
        section?: string
        date?: string
    }
}
