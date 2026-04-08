export type TPromotionAction = 'promote' | 'retain'

export interface IStudentPromotion {
    schoolId: string
    examId: string
    academicYear: string
    studentId: string
    studentName: string
    grNumber: string
    resultStatus: 'pass' | 'fail'
    action: TPromotionAction
    fromClassName: string
    fromSection: string
    toClassName: string
    toSection: string
    forced: boolean
    reason: string
    promotedByEmail: string
    promotedAt: Date
}

export interface IStudentPromotionWithId extends IStudentPromotion {
    _id: string
}
