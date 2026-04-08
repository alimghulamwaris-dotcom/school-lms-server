export interface IStaff {
    schoolId: string
    name: string
    role: string
    email: string
    phone: string
    accessPages: string[]
    status: string
    photoUrl?: string
    documentUrls?: string[]
}

export interface IStaffWithId extends IStaff {
    _id: string
}
