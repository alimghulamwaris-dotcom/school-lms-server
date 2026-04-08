export type TExamType = 'test' | 'exam'
export type TResultStatus = 'pass' | 'fail'

export interface IExamSubject {
    name: string
    maxMarks: number
    passMarks: number
}

export interface IExam {
    schoolId: string
    title: string
    type: TExamType
    semester: string
    academicYear: string
    semesterNumber: number
    totalSemesters: number
    isFinalSemester: boolean
    includeInFinalResult: boolean
    className: string
    section: string
    startDate: Date
    endDate: Date
    subjects: IExamSubject[]
    status: 'draft' | 'published'
    createdByEmail: string
}

export interface IExamWithId extends IExam {
    _id: string
}

export interface IExamResultSubject {
    subjectName: string
    maxMarks: number
    passMarks: number
    obtainedMarks: number
    absent: boolean
}

export interface IExamResult {
    schoolId: string
    examId: string
    studentId: string
    studentName: string
    grNumber: string
    className: string
    section: string
    subjects: IExamResultSubject[]
    totalMaxMarks: number
    totalObtainedMarks: number
    percentage: number
    grade: string
    resultStatus: TResultStatus
    remarks: string
}

export interface IExamResultWithId extends IExamResult {
    _id: string
}
