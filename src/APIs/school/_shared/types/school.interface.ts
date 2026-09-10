export type TAcademicYearStatus = 'open' | 'closed'
export type TSemesterStatus = 'upcoming' | 'active' | 'closed'

export interface ISchoolSemester {
    number: number
    name: string
    startDate: Date | null
    endDate: Date | null
    status: TSemesterStatus
}

export interface ISchool {
    _id?: string
    name: string
    campus: string
    code: string
    adminUserId: string | null
    contactEmail: string
    contactPhone: string
    password: string
    grPattern: string
    grCounter: number
    isVerified: boolean
    verificationToken: string | null
    verificationExpiry: Date | null
    staffCheckInTime: string
    staffCheckInGraceMinutes: number
    academicYear: string
    academicYearStatus: TAcademicYearStatus
    currentSemesterNumber: number
    passPercentage: number
    attendanceReminderEnabled?: boolean
    logoUrl?: string | null
    address?: string | null
    semesters: ISchoolSemester[]
}

export interface ISchoolWithId extends ISchool {
    _id: string
}
