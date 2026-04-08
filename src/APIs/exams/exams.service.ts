import responseMessage from '../../constant/responseMessage'
import { CustomError } from '../../utils/errors'
import { IAuthenticateRequest } from '../../types/types'
import { getSchoolAcademicConfigService } from '../school/school.service'
import studentRepo from '../students/_shared/repo/student.repository'
import { ensureClassSectionExists } from '../classes/classes.service'
import examRepo from './_shared/repo/exam.repository'
import { ICreateExamRequest, ISaveExamResultItemRequest, ISaveExamResultsRequest } from './types/exam.interface'
import { IExamResult, IExamResultSubject, TResultStatus } from './_shared/types/exam.interface'

const normalize = (value: string) => value.trim()
const normalizeSection = (value?: string) => (value ? value.trim().toUpperCase() : '')

const defaultAcademicYear = (baseDate: Date) => {
    const year = baseDate.getFullYear()
    const next = year + 1
    return `${year}-${next}`
}

const toDate = (value: string) => {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
        throw new CustomError('Invalid date value', 422)
    }
    return parsed
}

const getCreatorEmail = (request: IAuthenticateRequest) => {
    if (request.authenticatedSchool) {
        return request.authenticatedSchool.contactEmail
    }
    if (request.authenticatedUser) {
        return request.authenticatedUser.email
    }
    throw new CustomError(responseMessage.UNAUTHORIZED, 401)
}

const calculateGrade = (percentage: number) => {
    if (percentage >= 90) return 'A+'
    if (percentage >= 80) return 'A'
    if (percentage >= 70) return 'B'
    if (percentage >= 60) return 'C'
    if (percentage >= 50) return 'D'
    return 'F'
}

const toExamResultSubjects = (
    examSubjects: Array<{ name: string; maxMarks: number; passMarks: number }>,
    submitted: ISaveExamResultItemRequest['subjects']
) => {
    const submittedMap = new Map(submitted.map((item) => [item.subjectName.trim().toLowerCase(), item]))

    const mapped: IExamResultSubject[] = examSubjects.map((subject) => {
        const key = subject.name.trim().toLowerCase()
        const mark = submittedMap.get(key)
        if (!mark) {
            throw new CustomError(`Missing marks for subject ${subject.name}`, 422)
        }

        const obtainedMarks = mark.absent ? 0 : Number(mark.obtainedMarks)
        if (Number.isNaN(obtainedMarks) || obtainedMarks < 0 || obtainedMarks > subject.maxMarks) {
            throw new CustomError(`Invalid marks for subject ${subject.name}`, 422)
        }

        return {
            subjectName: subject.name,
            maxMarks: subject.maxMarks,
            passMarks: subject.passMarks,
            obtainedMarks,
            absent: Boolean(mark.absent)
        }
    })

    return mapped
}

const calculateSummary = (subjects: IExamResultSubject[]) => {
    const totalMaxMarks = subjects.reduce((sum, item) => sum + item.maxMarks, 0)
    const totalObtainedMarks = subjects.reduce((sum, item) => sum + item.obtainedMarks, 0)
    const percentage = totalMaxMarks > 0 ? Number(((totalObtainedMarks / totalMaxMarks) * 100).toFixed(2)) : 0
    const failedSubject = subjects.some((item) => !item.absent && item.obtainedMarks < item.passMarks)
    const absentFailed = subjects.some((item) => item.absent)
    const resultStatus: TResultStatus = failedSubject || absentFailed ? 'fail' : 'pass'
    const grade = calculateGrade(percentage)

    return {
        totalMaxMarks,
        totalObtainedMarks,
        percentage,
        grade,
        resultStatus
    }
}

const validateSchoolOwnership = (entitySchoolId: string, schoolId: string) => {
    if (entitySchoolId !== schoolId) {
        throw new CustomError(responseMessage.UNAUTHORIZED, 403)
    }
}

export const createExamService = async (payload: ICreateExamRequest, request: IAuthenticateRequest) => {
    const section = normalizeSection(payload.section)
    const className = normalize(payload.className)
    const startDate = toDate(payload.startDate)
    const endDate = toDate(payload.endDate)
    if (endDate.getTime() < startDate.getTime()) {
        throw new CustomError('End date must be after start date.', 422)
    }

    if (payload.subjects.some((subject) => subject.passMarks > subject.maxMarks)) {
        throw new CustomError('Pass marks cannot be greater than max marks.', 422)
    }

    const academicConfigResponse = await getSchoolAcademicConfigService(payload.schoolId)
    const configuredSemesters = academicConfigResponse.semesters || []
    const totalSemesters = configuredSemesters.length > 0 ? configuredSemesters.length : payload.totalSemesters || 2
    const semesterNumber = payload.semesterNumber || academicConfigResponse.currentSemesterNumber || 1
    if (semesterNumber > totalSemesters) {
        throw new CustomError('Semester number cannot be greater than total semesters.', 422)
    }

    const configuredSemester = configuredSemesters.find((item) => item.number === semesterNumber) || null
    const semesterLabel = normalize(payload.semester || '') || configuredSemester?.name || `Semester ${semesterNumber}`
    const academicYear =
        normalize(payload.academicYear || '') || normalize(academicConfigResponse.academicYear || '') || defaultAcademicYear(startDate)
    const isFinalSemester = semesterNumber === totalSemesters
    const includeInFinalResult = payload.includeInFinalResult !== undefined ? payload.includeInFinalResult : payload.type === 'exam'

    await ensureClassSectionExists(payload.schoolId, className, section)

    const createdByEmail = getCreatorEmail(request)
    const exam = await examRepo.createExam({
        schoolId: payload.schoolId,
        title: normalize(payload.title),
        type: payload.type,
        semester: semesterLabel,
        academicYear,
        semesterNumber,
        totalSemesters,
        isFinalSemester,
        includeInFinalResult,
        className,
        section,
        startDate,
        endDate,
        subjects: payload.subjects.map((subject) => ({
            name: normalize(subject.name),
            maxMarks: Number(subject.maxMarks),
            passMarks: Number(subject.passMarks)
        })),
        status: 'draft',
        createdByEmail
    })

    return {
        success: true,
        exam
    }
}

export const listExamsService = async (
    schoolId: string,
    filters: {
        className?: string
        section?: string
        type?: string
        semester?: string
        academicYear?: string
        semesterNumber?: number
        status?: string
    } = {}
) => {
    const exams = await examRepo.listExamsBySchool(schoolId, {
        className: filters.className ? normalize(filters.className) : undefined,
        section: filters.section !== undefined ? normalizeSection(filters.section) : undefined,
        type: filters.type,
        semester: filters.semester ? normalize(filters.semester) : undefined,
        academicYear: filters.academicYear ? normalize(filters.academicYear) : undefined,
        semesterNumber: filters.semesterNumber,
        status: filters.status
    })

    return {
        success: true,
        exams
    }
}

export const getExamByIdService = async (examId: string, schoolId: string) => {
    const exam = await examRepo.findExamById(examId)
    if (!exam) {
        throw new CustomError(responseMessage.NOT_FOUND('Exam'), 404)
    }

    validateSchoolOwnership(exam.schoolId, schoolId)

    return {
        success: true,
        exam
    }
}

export const saveExamResultsService = async (examId: string, payload: ISaveExamResultsRequest) => {
    const exam = await examRepo.findExamById(examId)
    if (!exam) {
        throw new CustomError(responseMessage.NOT_FOUND('Exam'), 404)
    }

    validateSchoolOwnership(exam.schoolId, payload.schoolId)

    const savedResults: IExamResult[] = []

    for (const resultItem of payload.results) {
        const student = await studentRepo.findStudentById(resultItem.studentId)
        if (!student) {
            throw new CustomError(responseMessage.NOT_FOUND('Student'), 404)
        }
        if (student.schoolId !== payload.schoolId) {
            throw new CustomError(responseMessage.UNAUTHORIZED, 403)
        }
        if (student.className !== exam.className || normalizeSection(student.section) !== normalizeSection(exam.section)) {
            throw new CustomError(`Student ${student.name} does not belong to exam class/section.`, 422)
        }

        const subjects = toExamResultSubjects(exam.subjects, resultItem.subjects)
        const summary = calculateSummary(subjects)

        const resultPayload: IExamResult = {
            schoolId: payload.schoolId,
            examId: String(exam._id),
            studentId: String(student._id),
            studentName: student.name,
            grNumber: student.grNumber,
            className: student.className,
            section: normalizeSection(student.section),
            subjects,
            totalMaxMarks: summary.totalMaxMarks,
            totalObtainedMarks: summary.totalObtainedMarks,
            percentage: summary.percentage,
            grade: summary.grade,
            resultStatus: summary.resultStatus,
            remarks: normalize(resultItem.remarks || '')
        }

        const saved = await examRepo.upsertExamResult(String(exam._id), String(student._id), resultPayload)
        savedResults.push(saved as IExamResult)
    }

    if (payload.publishResult) {
        await examRepo.updateExamById(String(exam._id), { status: 'published' })
    }

    return {
        success: true,
        savedCount: savedResults.length,
        results: savedResults
    }
}

export const listExamResultsService = async (examId: string, schoolId: string) => {
    const exam = await examRepo.findExamById(examId)
    if (!exam) {
        throw new CustomError(responseMessage.NOT_FOUND('Exam'), 404)
    }

    validateSchoolOwnership(exam.schoolId, schoolId)
    const results = await examRepo.listResultsByExam(String(exam._id))

    return {
        success: true,
        exam,
        results
    }
}

export const getExamPrintDataService = async (examId: string, schoolId: string) => {
    const data = await listExamResultsService(examId, schoolId)
    const resultCount = data.results.length
    const passCount = data.results.filter((item) => item.resultStatus === 'pass').length
    const failCount = resultCount - passCount

    return {
        success: true,
        exam: data.exam,
        results: data.results,
        summary: {
            totalStudents: resultCount,
            passCount,
            failCount
        }
    }
}

export const getFinalSemesterSummaryService = async (examId: string, schoolId: string) => {
    const exam = await examRepo.findExamById(examId)
    if (!exam) {
        throw new CustomError(responseMessage.NOT_FOUND('Exam'), 404)
    }
    validateSchoolOwnership(exam.schoolId, schoolId)

    if (!exam.isFinalSemester) {
        throw new CustomError('Selected exam is not marked as final semester.', 422)
    }

    const consideredExams = await examRepo.listExamsBySchool(schoolId, {
        className: exam.className,
        section: normalizeSection(exam.section),
        type: 'exam',
        academicYear: exam.academicYear,
        status: 'published',
        includeInFinalResult: true
    })

    if (consideredExams.length === 0) {
        throw new CustomError('No published semester exams found for final summary.', 422)
    }

    const students = await studentRepo.findStudentsByFilters(schoolId, {
        className: exam.className,
        section: normalizeSection(exam.section),
        status: 'active'
    })

    const aggregate = new Map<
        string,
        {
            studentId: string
            studentName: string
            grNumber: string
            totalMaxMarks: number
            totalObtainedMarks: number
            examCount: number
            failedInAnyExam: boolean
        }
    >()

    students.forEach((student) => {
        aggregate.set(String(student._id), {
            studentId: String(student._id),
            studentName: student.name,
            grNumber: student.grNumber,
            totalMaxMarks: 0,
            totalObtainedMarks: 0,
            examCount: 0,
            failedInAnyExam: false
        })
    })

    for (const semesterExam of consideredExams) {
        const results = await examRepo.listResultsByExam(String(semesterExam._id))
        for (const result of results) {
            const row = aggregate.get(result.studentId)
            if (!row) continue
            row.totalMaxMarks += result.totalMaxMarks
            row.totalObtainedMarks += result.totalObtainedMarks
            row.examCount += 1
            if (result.resultStatus === 'fail') {
                row.failedInAnyExam = true
            }
        }
    }

    const consolidated = Array.from(aggregate.values()).map((row) => {
        const percentage = row.totalMaxMarks > 0 ? Number(((row.totalObtainedMarks / row.totalMaxMarks) * 100).toFixed(2)) : 0
        const completedAll = row.examCount === consideredExams.length
        const overallStatus: TResultStatus = !row.failedInAnyExam && completedAll ? 'pass' : 'fail'

        return {
            ...row,
            totalExamsConsidered: consideredExams.length,
            percentage,
            grade: calculateGrade(percentage),
            overallStatus
        }
    })

    const passed = consolidated
        .filter((item) => item.overallStatus === 'pass')
        .sort((a, b) => b.percentage - a.percentage || b.totalObtainedMarks - a.totalObtainedMarks)

    const positionHolders = passed.slice(0, 3).map((item, index) => ({
        position: index + 1,
        studentId: item.studentId,
        studentName: item.studentName,
        grNumber: item.grNumber,
        percentage: item.percentage,
        grade: item.grade
    }))

    const passCount = consolidated.filter((item) => item.overallStatus === 'pass').length
    const failCount = consolidated.length - passCount

    return {
        success: true,
        exam,
        summary: {
            totalStudents: consolidated.length,
            totalExamsConsidered: consideredExams.length,
            passCount,
            failCount,
            positionHolders
        },
        consolidatedResults: consolidated
    }
}

type TRankRow = {
    studentId: string
    studentName: string
    grNumber: string
    percentage: number
    totalObtainedMarks: number
}

const applyRanking = <T extends TRankRow>(rows: T[]) => {
    const sorted = [...rows].sort((a, b) => b.percentage - a.percentage || b.totalObtainedMarks - a.totalObtainedMarks)

    let lastPercentage: number | null = null
    let lastObtained: number | null = null
    let position = 0

    return sorted.map((item, index) => {
        if (lastPercentage !== item.percentage || lastObtained !== item.totalObtainedMarks) {
            position = index + 1
        }
        lastPercentage = item.percentage
        lastObtained = item.totalObtainedMarks
        return {
            ...item,
            position
        }
    })
}

export const getAwardListService = async (examId: string, schoolId: string, mode: 'exam' | 'final' = 'exam') => {
    const exam = await examRepo.findExamById(examId)
    if (!exam) {
        throw new CustomError(responseMessage.NOT_FOUND('Exam'), 404)
    }
    validateSchoolOwnership(exam.schoolId, schoolId)

    if (mode === 'final') {
        const finalSummary = await getFinalSemesterSummaryService(examId, schoolId)
        const ranked = applyRanking(
            finalSummary.consolidatedResults.map((item) => ({
                studentId: item.studentId,
                studentName: item.studentName,
                grNumber: item.grNumber,
                percentage: item.percentage,
                totalObtainedMarks: item.totalObtainedMarks,
                overallStatus: item.overallStatus,
                grade: item.grade
            }))
        )

        return {
            success: true,
            mode: 'final',
            exam: finalSummary.exam,
            summary: finalSummary.summary,
            awards: ranked
        }
    }

    const results = await examRepo.listResultsByExam(String(exam._id))
    const ranked = applyRanking(
        results.map((item) => ({
            studentId: item.studentId,
            studentName: item.studentName,
            grNumber: item.grNumber,
            percentage: item.percentage,
            totalObtainedMarks: item.totalObtainedMarks,
            resultStatus: item.resultStatus,
            grade: item.grade
        }))
    )

    return {
        success: true,
        mode: 'exam',
        exam,
        summary: {
            totalStudents: ranked.length,
            passCount: ranked.filter((item) => item.resultStatus === 'pass').length,
            failCount: ranked.filter((item) => item.resultStatus === 'fail').length
        },
        awards: ranked
    }
}

export const getResultCardsService = async (examId: string, schoolId: string, studentId?: string) => {
    const exam = await examRepo.findExamById(examId)
    if (!exam) {
        throw new CustomError(responseMessage.NOT_FOUND('Exam'), 404)
    }
    validateSchoolOwnership(exam.schoolId, schoolId)

    const allResults = await examRepo.listResultsByExam(String(exam._id))
    const filteredResults = studentId ? allResults.filter((item) => item.studentId === studentId) : allResults
    const ranked = applyRanking(
        allResults.map((item) => ({
            studentId: item.studentId,
            studentName: item.studentName,
            grNumber: item.grNumber,
            percentage: item.percentage,
            totalObtainedMarks: item.totalObtainedMarks
        }))
    )
    const rankMap = new Map(ranked.map((item) => [item.studentId, item.position]))

    const cards = filteredResults.map((item) => ({
        resultId: String(item._id),
        studentId: item.studentId,
        studentName: item.studentName,
        grNumber: item.grNumber,
        className: item.className,
        section: item.section,
        subjects: item.subjects,
        totalMaxMarks: item.totalMaxMarks,
        totalObtainedMarks: item.totalObtainedMarks,
        percentage: item.percentage,
        grade: item.grade,
        resultStatus: item.resultStatus,
        remarks: item.remarks,
        position: rankMap.get(item.studentId) || null
    }))

    return {
        success: true,
        exam,
        totalCards: cards.length,
        cards
    }
}
