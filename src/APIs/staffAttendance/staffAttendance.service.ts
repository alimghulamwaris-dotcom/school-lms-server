import { EUserRoles } from '../../constant/users'
import responseMessage from '../../constant/responseMessage'
import { CustomError } from '../../utils/errors'
import { IAuthenticateRequest } from '../../types/types'
import schoolRepo from '../school/_shared/repo/school.repository'
import staffRepo from '../staff/_shared/repo/staff.repository'
import staffAttendanceRepo from './_shared/repo/staffAttendance.repository'

const normalize = (value: string) => value.trim().toLowerCase()

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

const buildConfiguredCheckInDate = (date: Date, checkInTime: string) => {
    const [hoursText, minutesText] = checkInTime.split(':')
    const hours = Number(hoursText)
    const minutes = Number(minutesText)
    const configured = toStartOfDay(date)
    configured.setHours(hours, minutes, 0, 0)
    return configured
}

const resolveLateMeta = (checkInAt: Date | null | undefined, date: Date, checkInTime: string, graceMinutes: number) => {
    if (!checkInAt) {
        return {
            isLate: false,
            lateMinutes: 0
        }
    }

    const scheduledCheckIn = buildConfiguredCheckInDate(date, checkInTime)
    const lateBoundary = new Date(scheduledCheckIn.getTime() + graceMinutes * 60000)
    const lateMinutes = checkInAt.getTime() > lateBoundary.getTime() ? Math.round((checkInAt.getTime() - lateBoundary.getTime()) / 60000) : 0

    return {
        isLate: lateMinutes > 0,
        lateMinutes
    }
}

const resolveRequestedDate = (value?: string) => {
    if (!value) {
        return toStartOfDay(new Date())
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        throw new CustomError('Invalid date value', 422)
    }

    return toStartOfDay(date)
}

const resolveStaffContext = async (request: IAuthenticateRequest, schoolIdInput: string) => {
    if (request.authenticatedSchool) {
        throw new CustomError('Please sign in as staff/teacher to mark check-in.', 403)
    }

    const user = request.authenticatedUser
    if (!user) {
        throw new CustomError(responseMessage.UNAUTHORIZED, 401)
    }

    let schoolId = schoolIdInput.trim() || (request.authenticatedSchoolId || '').trim()
    const email = normalize(user.email)

    if (!schoolId) {
        const primaryStaff = await staffRepo.findStaffByEmail(email)
        schoolId = primaryStaff?.schoolId || ''
    }

    if (!schoolId) {
        throw new CustomError('School is required', 422)
    }

    const staff = await staffRepo.findStaffByEmailAndSchool(email, schoolId)
    if (!staff) {
        throw new CustomError('Staff profile is not found for this school.', 404)
    }

    if (staff.status !== 'active') {
        throw new CustomError('Staff profile is not active.', 403)
    }

    return {
        schoolId,
        email,
        staff
    }
}

const resolveManagerSchoolId = async (request: IAuthenticateRequest, schoolIdInput: string) => {
    if (request.authenticatedSchool) {
        return schoolIdInput || String(request.authenticatedSchool._id)
    }

    const user = request.authenticatedUser
    if (!user || user.role !== EUserRoles.ADMIN) {
        throw new CustomError(responseMessage.UNAUTHORIZED, 403)
    }

    if (schoolIdInput) {
        return schoolIdInput
    }

    if (request.authenticatedSchoolId) {
        return request.authenticatedSchoolId
    }

    const school = await schoolRepo.findSchoolByAdminUserId(String(user._id))
    if (school) {
        return String(school._id)
    }

    const staff = await staffRepo.findStaffByEmail(user.email)
    if (staff?.schoolId) {
        return staff.schoolId
    }

    throw new CustomError('School is required', 422)
}

export const checkInStaffService = async (schoolIdInput: string, request: IAuthenticateRequest) => {
    const context = await resolveStaffContext(request, schoolIdInput)
    const school = await schoolRepo.findSchoolById(context.schoolId)
    if (!school) {
        throw new CustomError(responseMessage.NOT_FOUND('School'), 404)
    }

    const configuredCheckInTime = school.staffCheckInTime || '08:00'
    const configuredGraceMinutes = typeof school.staffCheckInGraceMinutes === 'number' ? school.staffCheckInGraceMinutes : 0
    const today = toStartOfDay(new Date())
    const existing = await staffAttendanceRepo.findBySchoolStaffDate(context.schoolId, String(context.staff._id), today)

    if (existing) {
        Object.assign(existing, resolveLateMeta(existing.checkInAt, today, configuredCheckInTime, configuredGraceMinutes))
        return {
            success: true,
            alreadyCheckedIn: true,
            attendance: existing,
            checkInTime: configuredCheckInTime,
            graceMinutes: configuredGraceMinutes
        }
    }

    const now = new Date()
    const scheduledCheckIn = buildConfiguredCheckInDate(today, configuredCheckInTime)
    const lateBoundary = new Date(scheduledCheckIn.getTime() + configuredGraceMinutes * 60000)
    const lateMinutes = now.getTime() > lateBoundary.getTime() ? Math.round((now.getTime() - lateBoundary.getTime()) / 60000) : 0
    const isLate = lateMinutes > 0

    const attendance = await staffAttendanceRepo.create({
        schoolId: context.schoolId,
        staffId: String(context.staff._id),
        staffEmail: context.email,
        staffName: context.staff.name,
        staffRole: context.staff.role,
        date: today,
        checkInAt: now,
        checkOutAt: null,
        workedMinutes: 0,
        isLate,
        lateMinutes
    })

    return {
        success: true,
        alreadyCheckedIn: false,
        attendance,
        checkInTime: configuredCheckInTime,
        graceMinutes: configuredGraceMinutes
    }
}

export const checkOutStaffService = async (schoolIdInput: string, request: IAuthenticateRequest) => {
    const context = await resolveStaffContext(request, schoolIdInput)
    const today = toStartOfDay(new Date())
    const attendance = await staffAttendanceRepo.findBySchoolStaffDate(context.schoolId, String(context.staff._id), today)

    if (!attendance || !attendance.checkInAt) {
        throw new CustomError('Please check in first before check out.', 422)
    }

    if (attendance.checkOutAt) {
        return {
            success: true,
            alreadyCheckedOut: true,
            attendance
        }
    }

    const now = new Date()
    const workedMinutes = Math.max(0, Math.round((now.getTime() - attendance.checkInAt.getTime()) / 60000))

    const updated = await staffAttendanceRepo.updateById(String(attendance._id), {
        checkOutAt: now,
        workedMinutes
    })

    if (!updated) {
        throw new CustomError('Unable to update check out.', 500)
    }

    return {
        success: true,
        alreadyCheckedOut: false,
        attendance: updated
    }
}

export const myStaffAttendanceService = async (schoolIdInput: string, request: IAuthenticateRequest, dateInput?: string) => {
    const context = await resolveStaffContext(request, schoolIdInput)
    const date = resolveRequestedDate(dateInput)
    const school = await schoolRepo.findSchoolById(context.schoolId)
    const configuredCheckInTime = school?.staffCheckInTime || '08:00'
    const configuredGraceMinutes = typeof school?.staffCheckInGraceMinutes === 'number' ? school.staffCheckInGraceMinutes : 0
    const attendance = await staffAttendanceRepo.findBySchoolStaffDate(context.schoolId, String(context.staff._id), date)
    const history = await staffAttendanceRepo.listBySchool(context.schoolId, {
        staffId: String(context.staff._id),
        limit: 30
    })

    const attendanceWithLiveRule = attendance
        ? Object.assign(attendance, resolveLateMeta(attendance.checkInAt, date, configuredCheckInTime, configuredGraceMinutes))
        : null

    const recentRecords = history.map((entry) =>
        Object.assign(entry, resolveLateMeta(entry.checkInAt, entry.date, configuredCheckInTime, configuredGraceMinutes))
    )

    let liveWorkedMinutes = 0
    if (attendanceWithLiveRule?.checkInAt) {
        if (attendanceWithLiveRule.checkOutAt && typeof attendanceWithLiveRule.workedMinutes === 'number') {
            liveWorkedMinutes = attendanceWithLiveRule.workedMinutes
        } else {
            liveWorkedMinutes = Math.max(0, Math.round((Date.now() - attendanceWithLiveRule.checkInAt.getTime()) / 60000))
        }
    }

    const completedDays = recentRecords.filter((item) => item.checkOutAt && (item.workedMinutes || 0) > 0)
    const totalWorkedMinutes = completedDays.reduce((sum, item) => sum + (item.workedMinutes || 0), 0)
    const averageWorkedMinutes = completedDays.length > 0 ? Math.round(totalWorkedMinutes / completedDays.length) : 0

    return {
        success: true,
        attendance: attendanceWithLiveRule,
        canCheckIn: !attendanceWithLiveRule,
        canCheckOut: Boolean(attendanceWithLiveRule && !attendanceWithLiveRule.checkOutAt),
        liveWorkedMinutes,
        averageWorkedMinutes,
        attendanceDays: recentRecords.length,
        recentRecords,
        checkInTime: configuredCheckInTime,
        graceMinutes: configuredGraceMinutes
    }
}

export const listStaffAttendanceService = async (
    schoolIdInput: string,
    request: IAuthenticateRequest,
    filters: {
        staffId?: string
        dateFrom?: string
        dateTo?: string
        limit?: number
    } = {}
) => {
    const schoolId = await resolveManagerSchoolId(request, schoolIdInput)

    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : null

    if ((dateFrom && Number.isNaN(dateFrom.getTime())) || (dateTo && Number.isNaN(dateTo.getTime()))) {
        throw new CustomError('Invalid date range', 422)
    }

    const records = await staffAttendanceRepo.listBySchool(schoolId, {
        staffId: filters.staffId,
        dateFrom: dateFrom ? toStartOfDay(dateFrom) : undefined,
        dateTo: dateTo ? toEndOfDay(dateTo) : undefined,
        limit: filters.limit
    })

    return {
        success: true,
        records
    }
}
