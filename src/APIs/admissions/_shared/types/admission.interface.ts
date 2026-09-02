export interface IAdmission {
    schoolId: string
    name: string
    grNumber: string
    feeAmount: number
    className: string
    section: string
    guardianName: string
    guardianPhone: string
    address: string
    status: string
    admissionDate: Date | null
    previousSchool: string | null
    photoUrl?: string
    documentUrls?: string[]
}

export interface IAdmissionWithId extends IAdmission {
    _id: string
}
