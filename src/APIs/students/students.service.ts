import { ensureClassSectionExists } from '../classes/classes.service'
import responseMessage from '../../constant/responseMessage'
import { CustomError } from '../../utils/errors'
import { generateUniqueGrNumber } from '../../services/grNumber'
import admissionRepo from '../admissions/_shared/repo/admission.repository'
import attendanceRepo from '../attendance/_shared/repo/attendance.repository'
import feesRepo from '../fees/_shared/repo/fees.repository'
import { getFinalSemesterSummaryService } from '../exams/exams.service'
import { getSchoolAcademicConfigService } from '../school/school.service'
import studentRepo from './_shared/repo/student.repository'
import studentPromotionRepo from './_shared/repo/studentPromotion.repository'
import { IStudentPromotion } from './_shared/types/studentPromotion.interface'
import { ICreateStudentRequest, IExecutePromotionsRequest, IPreviewPromotionsRequest, IUpdateStudentRequest } from './types/student.interface'
import { IAuthenticateRequest } from '../../types/types'

const normalizeSection = (value?: string) => (value ? value.trim().toUpperCase() : '')
const normalize = (value: string) => value.trim().toLowerCase()
const normalizeName = (value: string) => normalize(value).replace(/\s+/g, ' ')

type TStudentLikeRecord = {
    _id?: unknown
    schoolId: string
    name: string
    grNumber: string
    className: string
    section?: string
    guardianName: string
    guardianPhone: string
    address?: string
    status?: string
    admissionDate?: Date | null
    previousSchool?: string | null
    photoUrl?: string
    documentUrls?: string[]
    createdAt?: Date
    updatedAt?: Date
}

type TAttendanceLikeRecord = {
    date: Date
    totalStudents: number
    present: number
    late: number
    absentNames?: string[]
    notes?: string
}

type TPromotionPreviewItem = {
    studentId: string
    studentName: string
    grNumber: string
    resultStatus: 'pass' | 'fail'
    fromClassName: string
    fromSection: string
    recommendedAction: 'promote' | 'retain'
    recommendedClassName: string
    recommendedSection: string
    canApply: boolean
    reason: string
}

const isAbsentForStudent = (studentName: string, absentNames: string[]) => {
    const studentToken = normalizeName(studentName)
    return absentNames.some((name) => normalizeName(name) === studentToken)
}

const buildAttendanceSummary = (studentName: string, records: TAttendanceLikeRecord[]) => {
    const totalDays = records.length
    const absentDays = records.reduce((count, record) => {
        if (isAbsentForStudent(studentName, record.absentNames || [])) {
            return count + 1
        }
        return count
    }, 0)
    const presentDays = Math.max(0, totalDays - absentDays)
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0

    return {
        totalDays,
        presentDays,
        absentDays,
        attendanceRate,
        lastMarkedDate: totalDays > 0 ? records[0].date : null,
        recentLogs: records.slice(0, 12).map((record) => ({
            date: record.date,
            totalStudents: record.totalStudents,
            present: record.present,
            late: record.late,
            isAbsent: isAbsentForStudent(studentName, record.absentNames || []),
            notes: record.notes || ''
        }))
    }
}

const mapAdmissionToStudentPayload = (admission: {
    schoolId: string
    name: string
    grNumber: string
    feeAmount: number
    className: string
    section?: string
    guardianName: string
    guardianPhone: string
    address?: string
    admissionDate?: Date | null
    previousSchool?: string | null
    photoUrl?: string
    documentUrls?: string[]
}) => {
    return {
        schoolId: admission.schoolId,
        name: admission.name,
        grNumber: admission.grNumber,
        feeAmount: admission.feeAmount || 0,
        className: admission.className,
        section: normalizeSection(admission.section),
        guardianName: admission.guardianName,
        guardianPhone: admission.guardianPhone,
        address: admission.address || '',
        status: 'active',
        admissionDate: admission.admissionDate || null,
        previousSchool: admission.previousSchool || null,
        photoUrl: admission.photoUrl || '',
        documentUrls: admission.documentUrls || []
    }
}

const resolveStudentGrNumber = async (schoolId: string, grNumber?: string) => {
    const manualGrNumber = typeof grNumber === 'string' ? grNumber.trim() : ''

    if (!manualGrNumber) {
        return generateUniqueGrNumber(schoolId)
    }

    const [existingStudent, existingAdmission] = await Promise.all([
        studentRepo.findStudentBySchoolAndGr(schoolId, manualGrNumber),
        admissionRepo.findAdmissionBySchoolAndGr(schoolId, manualGrNumber)
    ])

    if (existingStudent || existingAdmission) {
        throw new CustomError(responseMessage.school.GR_ALREADY_EXISTS, 422)
    }

    return manualGrNumber
}

const mergeStudentsAndAdmissions = (
    students: unknown[],
    admissions: unknown[],
    filters: {
        className?: string
        section?: string
        status?: string
        search?: string
    }
) => {
    const byGr = new Map<string, Record<string, unknown>>()

    for (const item of students as Record<string, unknown>[]) {
        const grNumber = typeof item.grNumber === 'string' ? item.grNumber : ''
        if (!grNumber) {
            continue
        }
        byGr.set(grNumber, item)
    }

    for (const item of admissions as Record<string, unknown>[]) {
        const grNumber = typeof item.grNumber === 'string' ? item.grNumber : ''
        if (!grNumber || byGr.has(grNumber)) {
            continue
        }
        byGr.set(grNumber, item)
    }

    const normalizedClass = normalize(filters.className || '')
    const normalizedSection = normalize(filters.section || '')
    const normalizedStatus = normalize(filters.status || '')
    const normalizedSearch = normalize(filters.search || '')
    const toStr = (val: unknown): string => {
        if (val === null || val === undefined) return ''
        if (typeof val === 'string') return val
        if (typeof val === 'number') return String(val)
        return String(val as string)
    }
    return Array.from(byGr.values())
        .filter((item) => {
            const className = normalize(toStr(item.className))
            const section = normalize(toStr(item.section))
            const status = normalize(toStr(item.status))
            const searchable = [toStr(item.name), toStr(item.grNumber), toStr(item.guardianName), toStr(item.guardianPhone)].join(' ').toLowerCase()

            if (normalizedClass && className !== normalizedClass) {
                return false
            }
            if (normalizedSection && section !== normalizedSection) {
                return false
            }
            if (normalizedStatus && status !== normalizedStatus) {
                return false
            }
            if (normalizedSearch && !searchable.includes(normalizedSearch)) {
                return false
            }

            return true
        })
        .sort((a, b) => {
            const aTime = a.createdAt ? new Date(toStr(a.createdAt)).getTime() : 0
            const bTime = b.createdAt ? new Date(toStr(b.createdAt)).getTime() : 0
            return bTime - aTime
        })
}

const resolveStudentLikeRecord = async (id: string): Promise<{ source: 'student' | 'admission'; record: TStudentLikeRecord }> => {
    const student = (await studentRepo.findStudentById(id)) as TStudentLikeRecord | null
    if (student) {
        return {
            source: 'student',
            record: student
        }
    }

    const admission = (await admissionRepo.findAdmissionById(id)) as TStudentLikeRecord | null
    if (admission) {
        return {
            source: 'admission',
            record: admission
        }
    }

    throw new CustomError(responseMessage.NOT_FOUND('Student'), 404)
}

const assertSchoolMatch = (record: TStudentLikeRecord, schoolId: string) => {
    if (!schoolId) {
        return
    }

    if (record.schoolId !== schoolId) {
        throw new CustomError(responseMessage.NOT_FOUND('Student'), 404)
    }
}

const buildFeeSummary = (invoices: Array<{ totalAmount: number; paidAmount: number; balanceAmount: number; status: string; month: string }>) => {
    const totalBilled = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0)
    const totalPaid = invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0)
    const totalBalance = invoices.reduce((sum, invoice) => sum + invoice.balanceAmount, 0)
    const paidInvoices = invoices.filter((invoice) => normalize(invoice.status) === 'paid').length
    const pendingInvoices = invoices.length - paidInvoices

    return {
        totalInvoices: invoices.length,
        paidInvoices,
        pendingInvoices,
        totalBilled,
        totalPaid,
        totalBalance,
        lastInvoiceMonth: invoices.length > 0 ? invoices[0].month : ''
    }
}

const inferNextClassName = (className: string) => {
    const trimmed = className.trim()
    if (!trimmed) {
        return ''
    }

    const directNumber = Number(trimmed)
    if (!Number.isNaN(directNumber) && Number.isFinite(directNumber)) {
        return String(directNumber + 1)
    }

    const classMatch = trimmed.match(/^(class\s*)(\d+)$/i)
    if (classMatch) {
        return `${classMatch[1]}${Number(classMatch[2]) + 1}`
    }

    const gradeMatch = trimmed.match(/^(grade\s*)(\d+)$/i)
    if (gradeMatch) {
        return `${gradeMatch[1]}${Number(gradeMatch[2]) + 1}`
    }

    return ''
}

const getActorEmail = (request: IAuthenticateRequest) => {
    if (request.authenticatedSchool) {
        return request.authenticatedSchool.contactEmail
    }
    if (request.authenticatedUser) {
        return request.authenticatedUser.email
    }
    throw new CustomError(responseMessage.UNAUTHORIZED, 401)
}

const buildPromotionPreview = async (payload: IPreviewPromotionsRequest) => {
    const schoolId = payload.schoolId
    const examId = payload.examId
    const finalSummary = await getFinalSemesterSummaryService(examId, schoolId)
    const academicConfig = await getSchoolAcademicConfigService(schoolId)
    const sameAcademicYear = (academicConfig.academicYear || '').trim() === (finalSummary.exam.academicYear || '').trim()
    if (sameAcademicYear) {
        const finalSemester = (academicConfig.semesters || []).find((item) => item.number === finalSummary.exam.semesterNumber)
        const isClosed = finalSemester?.status === 'closed'
        if (!isClosed) {
            throw new CustomError('Close the final semester in Academic Settings before running student promotion.', 422)
        }
    }

    const examClassName = finalSummary.exam.className
    const examSection = normalizeSection(finalSummary.exam.section)
    const defaultNextClassName = (payload.defaultNextClassName || '').trim()
    const defaultNextSection = normalizeSection(payload.defaultNextSection || '')

    const activeStudents = await studentRepo.findStudentsByFilters(schoolId, {
        className: examClassName,
        section: examSection,
        status: 'active'
    })
    const studentsById = new Map(activeStudents.map((student) => [String(student._id), student]))

    const items = await Promise.all(
        finalSummary.consolidatedResults.map(async (result) => {
            const student = studentsById.get(result.studentId)
            const fromClassName = student?.className || examClassName
            const fromSection = normalizeSection(student?.section || examSection)
            const resultStatus: 'pass' | 'fail' = result.overallStatus === 'pass' ? 'pass' : 'fail'
            const recommendedAction: 'promote' | 'retain' = resultStatus === 'pass' ? 'promote' : 'retain'

            const recommendedClassName = recommendedAction === 'promote' ? defaultNextClassName || inferNextClassName(fromClassName) : fromClassName
            const recommendedSection = recommendedAction === 'promote' ? defaultNextSection || fromSection : fromSection

            let canApply = true
            let reason = ''

            if (recommendedAction === 'promote') {
                if (!recommendedClassName) {
                    canApply = false
                    reason = 'Target class is required for promotion. Set it manually before applying.'
                } else {
                    try {
                        await ensureClassSectionExists(schoolId, recommendedClassName, recommendedSection)
                    } catch (error) {
                        canApply = false
                        reason = error instanceof Error ? error.message : 'Target class/section validation failed.'
                    }
                }
            } else {
                reason = 'Student will be retained in current class.'
            }

            if (resultStatus === 'fail') {
                reason = reason
                    ? `${reason} Force promote can be used by admin/owner if needed.`
                    : 'Student failed final summary. Keep retained, or use force promote override.'
            }

            return {
                studentId: result.studentId,
                studentName: result.studentName,
                grNumber: result.grNumber,
                resultStatus,
                fromClassName,
                fromSection,
                recommendedAction,
                recommendedClassName,
                recommendedSection,
                canApply,
                reason
            } as TPromotionPreviewItem
        })
    )

    return {
        exam: {
            _id: examId,
            title: finalSummary.exam.title,
            academicYear: finalSummary.exam.academicYear,
            className: finalSummary.exam.className,
            section: finalSummary.exam.section,
            semester: finalSummary.exam.semester,
            semesterNumber: finalSummary.exam.semesterNumber,
            totalSemesters: finalSummary.exam.totalSemesters,
            isFinalSemester: finalSummary.exam.isFinalSemester
        },
        summary: finalSummary.summary,
        items
    }
}

export const createStudentService = async (payload: ICreateStudentRequest) => {
    const resolvedGrNumber = await resolveStudentGrNumber(payload.schoolId, payload.grNumber)

    await ensureClassSectionExists(payload.schoolId, payload.className, payload.section)

    const admissionDate = payload.admissionDate ? new Date(payload.admissionDate) : null

    const student = await studentRepo.createStudent({
        schoolId: payload.schoolId,
        name: payload.name,
        grNumber: resolvedGrNumber,
        feeAmount: payload.feeAmount || 0,
        className: payload.className,
        section: normalizeSection(payload.section),
        guardianName: payload.guardianName,
        guardianPhone: payload.guardianPhone,
        address: payload.address || '',
        status: payload.status || 'active',
        admissionDate,
        previousSchool: payload.previousSchool || null,
        photoUrl: payload.photoUrl || '',
        documentUrls: payload.documentUrls || []
    })

    return {
        success: true,
        student
    }
}

export const listStudentsService = async (
    schoolId: string,
    filters: {
        className?: string
        section?: string
        status?: string
        search?: string
    } = {}
) => {
    const [students, admissions] = await Promise.all([studentRepo.findStudentsBySchool(schoolId), admissionRepo.findAdmissionsBySchool(schoolId)])

    const merged = mergeStudentsAndAdmissions(students as unknown[], admissions as unknown[], filters)

    return {
        success: true,
        students: merged
    }
}

export const getStudentDetailService = async (id: string, schoolId: string) => {
    const { source, record } = await resolveStudentLikeRecord(id)
    assertSchoolMatch(record, schoolId)

    const [invoiceDocs, attendanceDocs] = await Promise.all([
        feesRepo.findInvoicesBySchoolAndGr(record.schoolId, record.grNumber),
        attendanceRepo.findAttendanceBySchoolAndClass(record.schoolId, record.className)
    ])

    const invoices = invoiceDocs.map((invoice) => ({
        _id: String(invoice._id),
        invoiceNumber: invoice.invoiceNumber,
        month: invoice.month,
        dueDate: invoice.dueDate,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        balanceAmount: invoice.balanceAmount,
        status: invoice.status
    }))

    const attendanceSummary = buildAttendanceSummary(record.name, attendanceDocs as unknown as TAttendanceLikeRecord[])
    const feeSummary = buildFeeSummary(invoices)

    const profileFields = [record.name, record.guardianName, record.guardianPhone, record.className, record.grNumber]
    const completedProfileFields = profileFields.filter((item) => normalize(item).length > 0).length
    const profileCompletion = Math.round((completedProfileFields / profileFields.length) * 100)

    const progress = {
        profileCompletion,
        attendanceRate: attendanceSummary.attendanceRate,
        feeStatus: feeSummary.totalBalance > 0 ? 'payment_due' : 'clear',
        approvalStatus: normalize(record.status || 'active')
    }

    return {
        success: true,
        source,
        student: {
            _id: record._id ? String(record._id as unknown as string) : id,
            schoolId: record.schoolId,
            name: record.name,
            grNumber: record.grNumber,
            className: record.className,
            section: record.section || '',
            guardianName: record.guardianName,
            guardianPhone: record.guardianPhone,
            address: record.address || '',
            status: record.status || 'active',
            admissionDate: record.admissionDate || null,
            previousSchool: record.previousSchool || null,
            photoUrl: record.photoUrl || '',
            documentUrls: record.documentUrls || [],
            createdAt: record.createdAt || null,
            updatedAt: record.updatedAt || null
        },
        attendance: attendanceSummary,
        fees: {
            summary: feeSummary,
            invoices
        },
        progress
    }
}

export const updateStudentService = async (id: string, payload: IUpdateStudentRequest) => {
    const existingStudent = await studentRepo.findStudentById(id)
    if (!existingStudent) {
        throw new CustomError(responseMessage.NOT_FOUND('Student'), 404)
    }

    const nextClassName = payload.className ?? existingStudent.className
    const nextSection = payload.section ?? existingStudent.section

    if (payload.className !== undefined || payload.section !== undefined) {
        await ensureClassSectionExists(existingStudent.schoolId, nextClassName, nextSection)
    }

    const updatePayload = {
        ...payload,
        section: payload.section !== undefined ? normalizeSection(payload.section) : undefined,
        admissionDate: payload.admissionDate ? new Date(payload.admissionDate) : undefined
    }

    const student = await studentRepo.updateStudent(id, updatePayload as Record<string, unknown>)
    return {
        success: true,
        student
    }
}

export const approveStudentService = async (id: string) => {
    const existingStudent = await studentRepo.findStudentById(id)

    if (existingStudent) {
        const student = await studentRepo.updateStudent(id, { status: 'active' })
        const linkedAdmission = await admissionRepo.findAdmissionBySchoolAndGr(existingStudent.schoolId, existingStudent.grNumber)
        if (linkedAdmission) {
            await admissionRepo.updateAdmissionById(String(linkedAdmission._id), { status: 'active' })
        }

        return {
            success: true,
            student
        }
    }

    const admission = await admissionRepo.findAdmissionById(id)
    if (!admission) {
        throw new CustomError(responseMessage.NOT_FOUND('Student'), 404)
    }

    const existingByGr = await studentRepo.findStudentBySchoolAndGr(admission.schoolId, admission.grNumber)
    if (existingByGr) {
        const student = await studentRepo.updateStudent(String(existingByGr._id), { status: 'active' })
        await admissionRepo.updateAdmissionById(String(admission._id), { status: 'active' })
        return {
            success: true,
            student
        }
    }

    const createdStudent = await studentRepo.createStudent(mapAdmissionToStudentPayload(admission))
    await admissionRepo.updateAdmissionById(String(admission._id), { status: 'active' })

    return {
        success: true,
        student: createdStudent
    }
}

export const deleteStudentService = async (id: string) => {
    const existingStudent = await studentRepo.findStudentById(id)
    if (!existingStudent) {
        throw new CustomError(responseMessage.NOT_FOUND('Student'), 404)
    }

    await studentRepo.deleteStudentById(id)

    return {
        success: true,
        message: responseMessage.SUCCESS
    }
}

export const previewPromotionsService = async (payload: IPreviewPromotionsRequest) => {
    const preview = await buildPromotionPreview(payload)
    return {
        success: true,
        ...preview
    }
}

export const executePromotionsService = async (payload: IExecutePromotionsRequest, request: IAuthenticateRequest) => {
    const preview = await buildPromotionPreview(payload)
    const actorEmail = getActorEmail(request)
    const selectionMap = new Map((payload.selections || []).map((item) => [item.studentId, item]))

    const applied: Array<{
        studentId: string
        studentName: string
        grNumber: string
        action: 'promote' | 'retain'
        fromClassName: string
        fromSection: string
        toClassName: string
        toSection: string
        forced: boolean
    }> = []
    const skipped: Array<{
        studentId: string
        studentName: string
        grNumber: string
        reason: string
    }> = []
    const promotionLogs: IStudentPromotion[] = []
    const promotedAt = new Date()

    for (const item of preview.items) {
        const selection = selectionMap.get(item.studentId)
        const action: 'promote' | 'retain' = selection?.action || item.recommendedAction
        const forcePromote = Boolean(selection?.forcePromote)

        let toClassName = action === 'promote' ? (selection?.targetClassName || item.recommendedClassName || '').trim() : item.fromClassName
        let toSection =
            action === 'promote' ? normalizeSection(selection?.targetSection || item.recommendedSection || item.fromSection) : item.fromSection

        if (action === 'promote' && item.resultStatus === 'fail' && !forcePromote) {
            skipped.push({
                studentId: item.studentId,
                studentName: item.studentName,
                grNumber: item.grNumber,
                reason: 'Failed student needs "Force promote" enabled.'
            })
            continue
        }

        if (action === 'promote') {
            if (!toClassName) {
                skipped.push({
                    studentId: item.studentId,
                    studentName: item.studentName,
                    grNumber: item.grNumber,
                    reason: 'Target class is missing for promotion.'
                })
                continue
            }

            try {
                await ensureClassSectionExists(payload.schoolId, toClassName, toSection)
            } catch (error) {
                skipped.push({
                    studentId: item.studentId,
                    studentName: item.studentName,
                    grNumber: item.grNumber,
                    reason: error instanceof Error ? error.message : 'Target class/section is invalid.'
                })
                continue
            }
        } else {
            toClassName = item.fromClassName
            toSection = item.fromSection
        }

        const existingStudent = await studentRepo.findStudentById(item.studentId)
        if (!existingStudent || existingStudent.schoolId !== payload.schoolId) {
            skipped.push({
                studentId: item.studentId,
                studentName: item.studentName,
                grNumber: item.grNumber,
                reason: 'Student no longer exists in this school.'
            })
            continue
        }

        await studentRepo.updateStudent(item.studentId, {
            className: toClassName,
            section: normalizeSection(toSection)
        })

        const reason = (selection?.reason || item.reason || '').trim()
        const forced = action === 'promote' && item.resultStatus === 'fail' && forcePromote

        promotionLogs.push({
            schoolId: payload.schoolId,
            examId: payload.examId,
            academicYear: preview.exam.academicYear,
            studentId: item.studentId,
            studentName: item.studentName,
            grNumber: item.grNumber,
            resultStatus: item.resultStatus,
            action,
            fromClassName: item.fromClassName,
            fromSection: item.fromSection,
            toClassName,
            toSection: normalizeSection(toSection),
            forced,
            reason,
            promotedByEmail: actorEmail,
            promotedAt
        })

        applied.push({
            studentId: item.studentId,
            studentName: item.studentName,
            grNumber: item.grNumber,
            action,
            fromClassName: item.fromClassName,
            fromSection: item.fromSection,
            toClassName,
            toSection: normalizeSection(toSection),
            forced
        })
    }

    if (promotionLogs.length > 0) {
        await studentPromotionRepo.createPromotions(promotionLogs)
    }

    return {
        success: true,
        exam: preview.exam,
        summary: preview.summary,
        appliedCount: applied.length,
        skippedCount: skipped.length,
        applied,
        skipped
    }
}

export const listPromotionsService = async (
    schoolId: string,
    filters: {
        academicYear?: string
        examId?: string
        className?: string
        section?: string
        studentId?: string
        search?: string
        limit?: number
    } = {}
) => {
    const promotions = await studentPromotionRepo.listPromotionsByFilters(schoolId, {
        academicYear: filters.academicYear,
        examId: filters.examId,
        className: filters.className,
        section: filters.section ? normalizeSection(filters.section) : undefined,
        studentId: filters.studentId,
        search: filters.search,
        limit: filters.limit
    })

    return {
        success: true,
        promotions: promotions.map((item) => ({
            _id: String(item._id),
            schoolId: item.schoolId,
            examId: item.examId,
            academicYear: item.academicYear,
            studentId: item.studentId,
            studentName: item.studentName,
            grNumber: item.grNumber,
            resultStatus: item.resultStatus,
            action: item.action,
            fromClassName: item.fromClassName,
            fromSection: item.fromSection,
            toClassName: item.toClassName,
            toSection: item.toSection,
            forced: item.forced,
            reason: item.reason,
            promotedByEmail: item.promotedByEmail,
            promotedAt: item.promotedAt
        }))
    }
}
