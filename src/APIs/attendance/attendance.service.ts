import staffRepo from '../staff/_shared/repo/staff.repository'
import studentRepo from '../students/_shared/repo/student.repository'
import classroomRepo from '../classes/_shared/repo/classroom.repository'
import { ensureClassSectionExists } from '../classes/classes.service'
import responseMessage from '../../constant/responseMessage'
import { EUserRoles } from '../../constant/users'
import { CustomError } from '../../utils/errors'
import { IAuthenticateRequest } from '../../types/types'
import attendanceRepo from './_shared/repo/attendance.repository'
import classTeacherAssignmentRepo from './_shared/repo/classTeacherAssignment.repository'
import { IAssignTeacherRequest, IAttendanceStudentEntryRequest, ICreateAttendanceRequest } from './types/attendance.interface'

const normalize = (value: string) => value.trim().toLowerCase()
const normalizeSection = (value?: string) => (value ? value.trim().toUpperCase() : '')

const toStartOfDay = (value: Date) => {
    const date = new Date(value)
    date.setHours(0, 0, 0, 0)
    return date
}

const toEndOfDay = (value: Date) => {
    const date = new Date(value)
    date.setHours(23, 59, 59, 999)
    return date
}

const toClassSectionKey = (className: string, section: string) => `${normalize(className)}::${normalize(section)}`

const parseDateRange = (dateFrom?: string, dateTo?: string) => {
    const from = dateFrom ? new Date(dateFrom) : null
    const to = dateTo ? new Date(dateTo) : null

    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
        throw new CustomError('Invalid date range', 422)
    }

    return {
        dateFrom: from ? toStartOfDay(from) : undefined,
        dateTo: to ? toEndOfDay(to) : undefined
    }
}

type TRequesterContext = {
    schoolId: string
    email: string
    name: string
    canManageAll: boolean
}

const resolveRequesterContext = async (request: IAuthenticateRequest, schoolIdInput: string): Promise<TRequesterContext> => {
    let schoolId = schoolIdInput
    let email = ''
    let name = ''
    let canManageAll = false

    if (request.authenticatedSchool) {
        if (!schoolId) {
            schoolId = String(request.authenticatedSchool._id || '')
        }
        email = request.authenticatedSchool.contactEmail || ''
        name = request.authenticatedSchool.name || 'School Owner'
        canManageAll = true
    }

    if (request.authenticatedUser) {
        email = request.authenticatedUser.email
        name = request.authenticatedUser.name || ''

        if (request.authenticatedUser.role === EUserRoles.ADMIN) {
            canManageAll = true
        }

        let staff = null
        const scopedSchoolId = request.authenticatedSchoolId || schoolId
        if (scopedSchoolId) {
            staff = await staffRepo.findStaffByEmailAndSchool(email, scopedSchoolId)
        }
        if (!staff) {
            staff = await staffRepo.findStaffByEmail(email)
        }
        if (!schoolId && staff?.schoolId) {
            schoolId = staff.schoolId
        }

        const staffRole = normalize(staff?.role || '')
        if (staffRole.includes('admin') || staffRole.includes('coordinator') || staffRole.includes('principal')) {
            canManageAll = true
        }
    }

    if (!schoolId) {
        throw new CustomError('School is required', 422)
    }

    return {
        schoolId,
        email: normalize(email),
        name,
        canManageAll
    }
}

const normalizeAttendanceRecords = (records: IAttendanceStudentEntryRequest[]) => {
    const mapped = records.map((item) => ({
        studentId: item.studentId || null,
        studentName: item.studentName.trim(),
        grNumber: item.grNumber.trim(),
        status: item.status,
        reason: item.reason ? item.reason.trim() : ''
    }))

    const valid = mapped.filter((item) => item.studentName && item.grNumber)
    if (valid.length === 0) {
        throw new CustomError('Attendance records are required', 422)
    }

    return valid
}

const aggregateEntries = (entries: Array<{ totalStudents: number; present: number; absent: number; onLeave: number }>) => {
    const totalStudents = entries.reduce((sum, item) => sum + item.totalStudents, 0)
    const present = entries.reduce((sum, item) => sum + item.present, 0)
    const absent = entries.reduce((sum, item) => sum + item.absent, 0)
    const onLeave = entries.reduce((sum, item) => sum + item.onLeave, 0)
    const attendanceRate = totalStudents > 0 ? Number(((present / totalStudents) * 100).toFixed(2)) : 0
    return {
        totalStudents,
        present,
        absent,
        onLeave,
        attendanceRate
    }
}

const ensureTeacherCanAccessClass = async (context: TRequesterContext, className: string, section: string) => {
    if (context.canManageAll) {
        return
    }

    const assignment = await classTeacherAssignmentRepo.findAssignmentBySchoolClassSection(context.schoolId, className, section)

    if (!assignment || normalize(assignment.teacherEmail) !== context.email) {
        throw new CustomError(responseMessage.UNAUTHORIZED, 403)
    }
}

const buildClassSections = async (schoolId: string) => {
    const [classes, assignments, students] = await Promise.all([
        classroomRepo.findClassroomsBySchool(schoolId),
        classTeacherAssignmentRepo.findAssignmentsBySchool(schoolId),
        studentRepo.findStudentsByFilters(schoolId, { status: 'active' })
    ])

    const countMap = new Map<string, number>()
    for (const student of students) {
        const key = toClassSectionKey(student.className, normalizeSection(student.section))
        countMap.set(key, (countMap.get(key) || 0) + 1)
    }

    const assignmentMap = new Map<string, { teacherEmail: string; teacherName: string; staffId: string | null }>()
    for (const assignment of assignments) {
        const key = toClassSectionKey(assignment.className, normalizeSection(assignment.section))
        assignmentMap.set(key, {
            teacherEmail: assignment.teacherEmail,
            teacherName: assignment.teacherName,
            staffId: assignment.staffId || null
        })
    }

    const classSections = classes.flatMap((classroom) => {
        const sections = classroom.sections.length > 0 ? classroom.sections.map(normalizeSection) : ['']

        return sections.map((section) => {
            const key = toClassSectionKey(classroom.className, section)
            const assignment = assignmentMap.get(key)
            return {
                className: classroom.className,
                section,
                studentCount: countMap.get(key) || 0,
                teacherEmail: assignment?.teacherEmail || '',
                teacherName: assignment?.teacherName || '',
                teacherStaffId: assignment?.staffId || null
            }
        })
    })

    return classSections
}

export const createAttendanceService = async (payload: ICreateAttendanceRequest, request: IAuthenticateRequest) => {
    const context = await resolveRequesterContext(request, payload.schoolId)
    const className = payload.className.trim()
    const section = normalizeSection(payload.section)

    await ensureClassSectionExists(context.schoolId, className, section)
    await ensureTeacherCanAccessClass(context, className, section)

    const dateInput = new Date(payload.date)
    if (Number.isNaN(dateInput.getTime())) {
        throw new CustomError('Invalid attendance date', 422)
    }
    const date = toStartOfDay(dateInput)

    const records = normalizeAttendanceRecords(payload.records)
    const present = records.filter((item) => item.status === 'present').length
    const absent = records.filter((item) => item.status === 'absent').length
    const onLeave = records.filter((item) => item.status === 'on_leave').length
    const absentNames = records.filter((item) => item.status === 'absent').map((item) => item.studentName)
    const totalStudents = records.length

    const attendancePayload = {
        schoolId: context.schoolId,
        className,
        section,
        date,
        totalStudents,
        present,
        absent,
        onLeave,
        late: 0,
        absentNames,
        records,
        notes: payload.notes || '',
        sendWhatsapp: payload.sendWhatsapp || false,
        saveRegister: payload.saveRegister !== undefined ? payload.saveRegister : true,
        markedByEmail: context.email,
        markedByName: context.name
    }

    const existing = await attendanceRepo.findAttendanceBySchoolClassSectionDate(context.schoolId, className, section, date)
    const attendance = existing
        ? await attendanceRepo.updateAttendanceById(String(existing._id), attendancePayload)
        : await attendanceRepo.createAttendance(attendancePayload)

    return {
        success: true,
        attendance
    }
}

export const listAttendanceService = async (
    schoolId: string,
    request: IAuthenticateRequest,
    filters: {
        className?: string
        section?: string
        dateFrom?: string
        dateTo?: string
        limit?: number
    } = {}
) => {
    const context = await resolveRequesterContext(request, schoolId)
    const className = filters.className ? filters.className.trim() : undefined
    const section = filters.section ? normalizeSection(filters.section) : undefined
    const { dateFrom, dateTo } = parseDateRange(filters.dateFrom, filters.dateTo)

    if (!context.canManageAll && className) {
        await ensureTeacherCanAccessClass(context, className, section || '')
    }

    const attendance = await attendanceRepo.findAttendanceByFilters(context.schoolId, {
        className,
        section,
        dateFrom,
        dateTo,
        limit: filters.limit
    })

    if (context.canManageAll) {
        return {
            success: true,
            attendance
        }
    }

    const assignments = await classTeacherAssignmentRepo.findAssignmentsByTeacherEmail(context.schoolId, context.email)
    const assignmentKeys = new Set(assignments.map((assignment) => toClassSectionKey(assignment.className, normalizeSection(assignment.section))))

    const filtered = attendance.filter((item) => assignmentKeys.has(toClassSectionKey(item.className, normalizeSection(item.section))))

    return {
        success: true,
        attendance: filtered
    }
}

export const getAttendanceSummaryService = async (
    schoolId: string,
    request: IAuthenticateRequest,
    filters: {
        className?: string
        section?: string
        date?: string
    } = {}
) => {
    const context = await resolveRequesterContext(request, schoolId)
    const className = filters.className ? filters.className.trim() : undefined
    const section = filters.section ? normalizeSection(filters.section) : undefined

    if (!context.canManageAll && className) {
        await ensureTeacherCanAccessClass(context, className, section || '')
    }

    const baseDate = filters.date ? new Date(filters.date) : new Date()
    if (Number.isNaN(baseDate.getTime())) {
        throw new CustomError('Invalid summary date', 422)
    }

    const dayStart = toStartOfDay(baseDate)
    const dayEnd = toEndOfDay(baseDate)

    const weekStart = toStartOfDay(new Date(dayStart))
    weekStart.setDate(weekStart.getDate() - 6)

    const monthStart = toStartOfDay(new Date(dayStart.getFullYear(), dayStart.getMonth(), 1))

    const [dailyEntries, weeklyEntries, monthlyEntries, recentEntries] = await Promise.all([
        attendanceRepo.findAttendanceByFilters(context.schoolId, {
            className,
            section,
            dateFrom: dayStart,
            dateTo: dayEnd
        }),
        attendanceRepo.findAttendanceByFilters(context.schoolId, {
            className,
            section,
            dateFrom: weekStart,
            dateTo: dayEnd
        }),
        attendanceRepo.findAttendanceByFilters(context.schoolId, {
            className,
            section,
            dateFrom: monthStart,
            dateTo: dayEnd
        }),
        attendanceRepo.findAttendanceByFilters(context.schoolId, {
            className,
            section,
            limit: 30
        })
    ])

    return {
        success: true,
        summary: {
            daily: aggregateEntries(dailyEntries),
            weekly: aggregateEntries(weeklyEntries),
            monthly: aggregateEntries(monthlyEntries)
        },
        recentEntries
    }
}

export const getAttendanceScopeService = async (schoolId: string, request: IAuthenticateRequest) => {
    const context = await resolveRequesterContext(request, schoolId)
    const classSections = await buildClassSections(context.schoolId)

    if (context.canManageAll) {
        const staff = await staffRepo.findStaffBySchool(context.schoolId)
        const teacherOptions = staff
            .filter((item) => item.status === 'active')
            .map((item) => ({
                staffId: String(item._id),
                name: item.name,
                email: item.email,
                role: item.role
            }))

        return {
            success: true,
            isAdminView: true,
            classSections,
            teacherOptions
        }
    }

    const assignments = await classTeacherAssignmentRepo.findAssignmentsByTeacherEmail(context.schoolId, context.email)
    const assignmentKeys = new Set(assignments.map((item) => toClassSectionKey(item.className, normalizeSection(item.section))))
    const filteredSections = classSections.filter((item) => assignmentKeys.has(toClassSectionKey(item.className, normalizeSection(item.section))))

    return {
        success: true,
        isAdminView: false,
        classSections: filteredSections,
        teacherOptions: []
    }
}

export const assignTeacherToClassService = async (payload: IAssignTeacherRequest, request: IAuthenticateRequest) => {
    const context = await resolveRequesterContext(request, payload.schoolId)
    if (!context.canManageAll) {
        throw new CustomError(responseMessage.UNAUTHORIZED, 403)
    }

    const className = payload.className.trim()
    const section = normalizeSection(payload.section)
    await ensureClassSectionExists(context.schoolId, className, section)

    const teacherEmail = normalize(payload.teacherEmail)
    const staff = await staffRepo.findStaffByEmailAndSchool(teacherEmail, context.schoolId)
    if (!staff || staff.status !== 'active') {
        throw new CustomError('Teacher is not active in this school', 422)
    }

    const assignment = await classTeacherAssignmentRepo.upsertAssignment(context.schoolId, className, section, {
        schoolId: context.schoolId,
        className,
        section,
        teacherEmail,
        teacherName: staff.name,
        staffId: String(staff._id),
        assignedByEmail: context.email,
        status: 'active'
    })

    return {
        success: true,
        assignment
    }
}
