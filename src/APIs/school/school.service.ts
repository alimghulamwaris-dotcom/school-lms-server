import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import responseMessage from '../../constant/responseMessage'
import config from '../../config/config'
import logger from '../../handlers/logger'
import emailService from '../../services/email'
import { CustomError } from '../../utils/errors'
import hashing from '../../utils/hashing'
import parsers from '../../utils/parsers'
import code from '../../utils/code'
import { getSchoolGrConfig, updateSchoolGrPattern } from '../../services/grNumber'
import schoolRepo from './_shared/repo/school.repository'
import {
    ISchoolAcademicConfigRequest,
    ISchoolAdvanceSemesterRequest,
    ISchoolGrConfigRequest,
    ISchoolRolloverAcademicYearRequest,
    ISchoolRegisterRequest,
    ISchoolSemesterInput,
    ISchoolStaffAttendanceConfigRequest
} from './types/school.interface'
import { ISchoolSemester, TSemesterStatus } from './_shared/types/school.interface'

dayjs.extend(utc)

const generateSchoolCode = (schoolName: string) => {
    const cleaned = schoolName.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    const prefix = cleaned.slice(0, 4) || 'SCHL'
    const suffix = code.generateOTP(4)
    return `${prefix}${suffix}`
}

const getDefaultAcademicYear = () => {
    const year = new Date().getFullYear()
    return `${year}-${year + 1}`
}

const normalizeSemesterStatus = (status?: string): TSemesterStatus => {
    const value = (status || '').trim().toLowerCase()
    if (value === 'active' || value === 'closed') {
        return value
    }
    return 'upcoming'
}

const buildDefaultSemesters = (totalSemesters: number): ISchoolSemester[] => {
    const count = Math.min(4, Math.max(2, Number(totalSemesters) || 2))
    return Array.from({ length: count }, (_, index) => ({
        number: index + 1,
        name: `Semester ${index + 1}`,
        startDate: null,
        endDate: null,
        status: index === 0 ? 'active' : 'upcoming'
    }))
}

const nextAcademicYearFrom = (academicYear: string) => {
    const match = academicYear.trim().match(/^(\d{4})-(\d{4})$/)
    if (!match) {
        return getDefaultAcademicYear()
    }
    const start = Number(match[1]) + 1
    const end = Number(match[2]) + 1
    return `${start}-${end}`
}

const normalizeSemesterDate = (value?: Date | string | null) => {
    if (!value) {
        return null
    }
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
        return null
    }
    return parsed
}

const normalizeSemesters = (semesters: Array<ISchoolSemesterInput | ISchoolSemester>, fallbackTotalSemesters: number) => {
    const fallback = buildDefaultSemesters(fallbackTotalSemesters)

    if (!Array.isArray(semesters) || semesters.length === 0) {
        return fallback
    }

    const sorted = [...semesters].sort((a, b) => Number(a.number) - Number(b.number))
    const normalized = sorted.map((semester, index) => {
        const number = Number(semester.number) || index + 1
        const name = String(semester.name || `Semester ${number}`).trim() || `Semester ${number}`
        return {
            number,
            name,
            startDate: normalizeSemesterDate(semester.startDate),
            endDate: normalizeSemesterDate(semester.endDate),
            status: normalizeSemesterStatus(semester.status)
        } as ISchoolSemester
    })

    const uniqueNumbers = new Set(normalized.map((item) => item.number))
    if (uniqueNumbers.size !== normalized.length) {
        throw new CustomError('Semester numbers must be unique.', 422)
    }

    const activeSemesters = normalized.filter((item) => item.status === 'active').length
    if (activeSemesters > 1) {
        throw new CustomError('Only one semester can be active at a time.', 422)
    }

    return normalized
}

const getEffectiveSchoolAcademicConfig = async (schoolId: string) => {
    const school = await schoolRepo.findSchoolById(schoolId)
    if (!school) {
        throw new CustomError(responseMessage.NOT_FOUND('School'), 404)
    }

    const semesters = normalizeSemesters(school.semesters || [], (school.semesters || []).length || 2)
    const academicYear = (school.academicYear || '').trim() || getDefaultAcademicYear()
    const passPercentage = typeof school.passPercentage === 'number' && Number.isFinite(school.passPercentage) ? school.passPercentage : 50
    const currentSemesterNumberRaw = typeof school.currentSemesterNumber === 'number' ? school.currentSemesterNumber : 1
    const currentSemesterNumber = Math.min(semesters.length, Math.max(1, currentSemesterNumberRaw))
    const academicYearStatus = school.academicYearStatus === 'closed' ? 'closed' : 'open'

    return {
        school,
        config: {
            schoolId,
            academicYear,
            academicYearStatus,
            passPercentage,
            currentSemesterNumber,
            totalSemesters: semesters.length,
            semesters
        }
    }
}

export const registerSchoolService = async (payload: ISchoolRegisterRequest) => {
    const { schoolName, campus, contactPhone, contactEmail, password } = payload

    const { countryCode, internationalNumber, isoCode } = parsers.parsePhoneNumber('+' + contactPhone)
    if (!countryCode || !internationalNumber || !isoCode) {
        throw new CustomError(responseMessage.auth.INVALID_PHONE_NUMBER, 422)
    }

    const existingSchool = await schoolRepo.findSchoolByEmail(contactEmail)
    if (existingSchool) {
        throw new CustomError(responseMessage.auth.ALREADY_EXISTS('School', contactEmail), 422)
    }

    const hashedPassword = await hashing.hashPassword(password)
    const verificationToken = code.generateRandomId()
    const verificationExpiry = dayjs().utc().add(24, 'hour').toDate()

    let schoolCode = generateSchoolCode(schoolName)
    const existingCode = await schoolRepo.findSchoolByCode(schoolCode)
    if (existingCode) {
        schoolCode = `${schoolCode}${code.generateOTP(2)}`
    }

    const school = await schoolRepo.createSchool({
        name: schoolName,
        campus,
        code: schoolCode,
        adminUserId: null,
        contactEmail,
        contactPhone: `${countryCode}${internationalNumber}`,
        password: hashedPassword,
        grPattern: 'GR-{YYYY}-{SEQ4}',
        grCounter: 0,
        isVerified: false,
        verificationToken,
        verificationExpiry,
        staffCheckInTime: '08:00',
        staffCheckInGraceMinutes: 0,
        academicYear: getDefaultAcademicYear(),
        academicYearStatus: 'open',
        currentSemesterNumber: 1,
        passPercentage: 50,
        semesters: buildDefaultSemesters(2)
    })

    const verifyUrl = `${config.CLIENT_URL}/verify-school?token=${verificationToken}`
    const to = [contactEmail]
    const subject = 'Verify your school account'
    const text = `Your school ${schoolName} has been created. Verify your account using this link:\n\n${verifyUrl}`

    try {
        await emailService.sendEmail(to, subject, text)
    } catch (error) {
        logger.error('Error sending school verification email', {
            meta: error
        })

        try {
            await schoolRepo.deleteSchoolById(String(school._id))
        } catch (rollbackError) {
            logger.error('Error rolling back school creation after email failure', {
                meta: rollbackError
            })
        }

        throw new CustomError('Unable to send verification email right now. Please try creating the school again.', 503)
    }

    return {
        success: true,
        schoolId: school._id,
        schoolCode: school.code,
        contactEmail: school.contactEmail,
        verified: school.isVerified
    }
}

export const verifySchoolService = async (token: string) => {
    const school = await schoolRepo.findSchoolByVerificationToken(token)
    if (!school) {
        throw new CustomError(responseMessage.NOT_FOUND('School verification token'), 404)
    }

    if (school.isVerified) {
        return {
            success: true,
            schoolId: school._id,
            schoolCode: school.code,
            verified: true
        }
    }

    if (!school.verificationExpiry || school.verificationExpiry.getTime() < Date.now()) {
        throw new CustomError(responseMessage.school.SCHOOL_NOT_VERIFIED, 422)
    }

    school.isVerified = true
    school.verificationToken = null
    school.verificationExpiry = null
    await school.save()

    return {
        success: true,
        schoolId: school._id,
        schoolCode: school.code,
        verified: true
    }
}

export const lookupSchoolService = async (codeValue: string) => {
    const school = await schoolRepo.findSchoolByCode(codeValue)
    if (!school) {
        throw new CustomError(responseMessage.NOT_FOUND('School'), 404)
    }

    return {
        success: true,
        schoolId: school._id,
        schoolCode: school.code,
        schoolName: school.name,
        campus: school.campus
    }
}

export const getSchoolGrConfigService = async (schoolId: string) => {
    return getSchoolGrConfig(schoolId)
}

export const updateSchoolGrConfigService = async (payload: ISchoolGrConfigRequest) => {
    return updateSchoolGrPattern(payload.schoolId, payload.grPattern)
}

export const getSchoolStaffAttendanceConfigService = async (schoolId: string) => {
    const school = await schoolRepo.findSchoolById(schoolId)
    if (!school) {
        throw new CustomError(responseMessage.NOT_FOUND('School'), 404)
    }

    return {
        success: true,
        schoolId,
        checkInTime: school.staffCheckInTime || '08:00',
        graceMinutes: typeof school.staffCheckInGraceMinutes === 'number' ? school.staffCheckInGraceMinutes : 0
    }
}

export const updateSchoolStaffAttendanceConfigService = async (payload: ISchoolStaffAttendanceConfigRequest) => {
    const school = await schoolRepo.findSchoolById(payload.schoolId)
    if (!school) {
        throw new CustomError(responseMessage.NOT_FOUND('School'), 404)
    }

    school.staffCheckInTime = payload.checkInTime
    school.staffCheckInGraceMinutes = payload.graceMinutes
    await school.save()

    return {
        success: true,
        schoolId: payload.schoolId,
        checkInTime: school.staffCheckInTime,
        graceMinutes: school.staffCheckInGraceMinutes
    }
}

export const getSchoolAcademicConfigService = async (schoolId: string) => {
    const { config } = await getEffectiveSchoolAcademicConfig(schoolId)
    return {
        success: true,
        ...config
    }
}

export const updateSchoolAcademicConfigService = async (payload: ISchoolAcademicConfigRequest) => {
    const { school, config: currentConfig } = await getEffectiveSchoolAcademicConfig(payload.schoolId)
    const semesters = normalizeSemesters(payload.semesters, payload.semesters.length || currentConfig.totalSemesters)
    const currentSemesterNumber = Math.min(semesters.length, Math.max(1, Number(payload.currentSemesterNumber) || 1))
    const passPercentage = Number(payload.passPercentage)

    if (!Number.isFinite(passPercentage) || passPercentage < 1 || passPercentage > 100) {
        throw new CustomError('Pass percentage must be between 1 and 100.', 422)
    }

    school.academicYear = payload.academicYear.trim()
    school.academicYearStatus = payload.academicYearStatus
    school.currentSemesterNumber = currentSemesterNumber
    school.passPercentage = passPercentage
    school.semesters = semesters
    await school.save()

    return {
        success: true,
        schoolId: payload.schoolId,
        academicYear: school.academicYear,
        academicYearStatus: school.academicYearStatus,
        passPercentage: school.passPercentage,
        currentSemesterNumber: school.currentSemesterNumber,
        totalSemesters: school.semesters.length,
        semesters: school.semesters
    }
}

export const advanceSchoolSemesterService = async (payload: ISchoolAdvanceSemesterRequest) => {
    const { school } = await getEffectiveSchoolAcademicConfig(payload.schoolId)
    const semesters = normalizeSemesters(school.semesters || [], (school.semesters || []).length || 2)
    const currentIndex = Math.max(0, Math.min(semesters.length - 1, (school.currentSemesterNumber || 1) - 1))

    semesters[currentIndex].status = 'closed'
    const nextIndex = currentIndex + 1

    if (nextIndex < semesters.length) {
        semesters[nextIndex].status = 'active'
        school.currentSemesterNumber = semesters[nextIndex].number
        school.academicYearStatus = 'open'
    } else {
        school.currentSemesterNumber = semesters[semesters.length - 1].number
        school.academicYearStatus = 'closed'
    }

    school.semesters = semesters
    await school.save()

    return {
        success: true,
        schoolId: payload.schoolId,
        academicYear: school.academicYear,
        academicYearStatus: school.academicYearStatus,
        currentSemesterNumber: school.currentSemesterNumber,
        totalSemesters: school.semesters.length,
        semesters: school.semesters
    }
}

export const rolloverSchoolAcademicYearService = async (payload: ISchoolRolloverAcademicYearRequest) => {
    const { school, config } = await getEffectiveSchoolAcademicConfig(payload.schoolId)
    const totalSemesters = Math.min(4, Math.max(2, payload.totalSemesters || config.totalSemesters || 2))
    const semesterNames = (payload.semesterNames || []).map((item) => item.trim()).filter((item) => item.length > 0)

    const semesters = buildDefaultSemesters(totalSemesters).map((semester, index) => ({
        ...semester,
        name: semesterNames[index] || semester.name
    }))

    school.academicYear = (payload.nextAcademicYear || '').trim() || nextAcademicYearFrom(config.academicYear)
    school.academicYearStatus = 'open'
    school.currentSemesterNumber = 1
    school.semesters = semesters
    await school.save()

    return {
        success: true,
        schoolId: payload.schoolId,
        academicYear: school.academicYear,
        academicYearStatus: school.academicYearStatus,
        currentSemesterNumber: school.currentSemesterNumber,
        totalSemesters: school.semesters.length,
        semesters: school.semesters
    }
}
