export type TAttendanceStatus = 'present' | 'absent' | 'on_leave'

export interface IAttendanceRecordItem {
    studentId?: string | null
    studentName: string
    grNumber: string
    status: TAttendanceStatus
    reason?: string
}

export interface IAttendance {
    schoolId: string
    className: string
    section: string
    date: Date
    totalStudents: number
    present: number
    absent: number
    onLeave: number
    late: number
    absentNames: string[]
    records: IAttendanceRecordItem[]
    notes: string
    sendWhatsapp: boolean
    saveRegister: boolean
    markedByEmail: string
    markedByName: string
}

export interface IAttendanceWithId extends IAttendance {
    _id: string
}

export interface IClassTeacherAssignment {
    schoolId: string
    className: string
    section: string
    teacherEmail: string
    teacherName: string
    staffId?: string | null
    assignedByEmail: string
    status: 'active' | 'inactive'
}

export interface IClassTeacherAssignmentWithId extends IClassTeacherAssignment {
    _id: string
}
