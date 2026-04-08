export interface IStaffAttendance {
    schoolId: string
    staffId: string
    staffEmail: string
    staffName: string
    staffRole: string
    date: Date
    checkInAt: Date
    checkOutAt?: Date | null
    workedMinutes?: number
    isLate: boolean
    lateMinutes: number
}

export interface IStaffAttendanceWithId extends IStaffAttendance {
    _id: string
}
