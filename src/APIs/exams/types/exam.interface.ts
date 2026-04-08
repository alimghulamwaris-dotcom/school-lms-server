import { Request } from 'express'
import { TExamType } from '../_shared/types/exam.interface'

export interface ICreateExamSubjectRequest {
    name: string
    maxMarks: number
    passMarks: number
}

export interface ICreateExamRequest {
    schoolId: string
    title: string
    type: TExamType
    semester?: string
    academicYear?: string
    semesterNumber?: number
    totalSemesters?: number
    includeInFinalResult?: boolean
    className: string
    section?: string
    startDate: string
    endDate: string
    subjects: ICreateExamSubjectRequest[]
}

export interface ICreateExam extends Request {
    body: ICreateExamRequest
}

export interface IListExamQuery extends Request {
    query: {
        schoolId?: string
        className?: string
        section?: string
        type?: string
        semester?: string
        academicYear?: string
        semesterNumber?: string
        status?: string
    }
}

export interface IGetExamById extends Request {
    params: {
        id: string
    }
    query: {
        schoolId?: string
    }
}

export interface ISaveExamResultSubjectRequest {
    subjectName: string
    obtainedMarks: number
    absent?: boolean
}

export interface ISaveExamResultItemRequest {
    studentId: string
    subjects: ISaveExamResultSubjectRequest[]
    remarks?: string
}

export interface ISaveExamResultsRequest {
    schoolId: string
    results: ISaveExamResultItemRequest[]
    publishResult?: boolean
}

export interface ISaveExamResults extends Request {
    params: {
        id: string
    }
    body: ISaveExamResultsRequest
}

export interface IExamResultsQuery extends Request {
    params: {
        id: string
    }
    query: {
        schoolId?: string
    }
}

export interface IExamAwardQuery extends Request {
    params: {
        id: string
    }
    query: {
        schoolId?: string
        mode?: 'exam' | 'final'
    }
}

export interface IExamResultCardsQuery extends Request {
    params: {
        id: string
    }
    query: {
        schoolId?: string
        studentId?: string
    }
}
