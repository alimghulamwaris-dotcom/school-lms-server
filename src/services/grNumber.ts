import admissionRepo from '../APIs/admissions/_shared/repo/admission.repository'
import schoolRepo from '../APIs/school/_shared/repo/school.repository'
import studentRepo from '../APIs/students/_shared/repo/student.repository'
import { CustomError } from '../utils/errors'

export const DEFAULT_GR_PATTERN = 'GR-{YYYY}-{SEQ4}'

const formatGrNumber = (pattern: string, sequence: number, date: Date = new Date()) => {
    const yyyy = String(date.getFullYear())
    const yy = yyyy.slice(-2)
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')

    let formatted = pattern
        .replace(/\{YYYY\}/g, yyyy)
        .replace(/\{YY\}/g, yy)
        .replace(/\{MM\}/g, mm)
        .replace(/\{DD\}/g, dd)

    formatted = formatted.replace(/\{SEQ(\d+)?\}/g, (_match, digits: string | undefined) => {
        if (!digits) {
            return String(sequence)
        }
        const length = Number(digits)
        if (!Number.isFinite(length) || length < 1 || length > 12) {
            return String(sequence)
        }
        return String(sequence).padStart(length, '0')
    })

    return formatted
}

const hasGrCollision = async (schoolId: string, grNumber: string) => {
    const [student, admission] = await Promise.all([
        studentRepo.findStudentBySchoolAndGr(schoolId, grNumber),
        admissionRepo.findAdmissionBySchoolAndGr(schoolId, grNumber)
    ])

    return !!student || !!admission
}

export const getSchoolGrConfig = async (schoolId: string) => {
    const school = await schoolRepo.findSchoolById(schoolId)
    if (!school) {
        throw new CustomError('School is not found', 404)
    }

    const pattern = school.grPattern || DEFAULT_GR_PATTERN
    const nextPreview = await peekNextGrNumber(schoolId)

    return {
        schoolId: String(school._id),
        grPattern: pattern,
        grCounter: school.grCounter || 0,
        nextPreview
    }
}

export const updateSchoolGrPattern = async (schoolId: string, grPattern: string) => {
    const school = await schoolRepo.updateSchoolById(schoolId, {
        grPattern: grPattern.trim()
    })

    if (!school) {
        throw new CustomError('School is not found', 404)
    }

    return {
        schoolId: String(school._id),
        grPattern: school.grPattern,
        grCounter: school.grCounter || 0
    }
}

export const peekNextGrNumber = async (schoolId: string) => {
    const school = await schoolRepo.findSchoolById(schoolId)
    if (!school) {
        throw new CustomError('School is not found', 404)
    }

    const pattern = school.grPattern || DEFAULT_GR_PATTERN
    const sequence = (school.grCounter || 0) + 1

    for (let i = 0; i < 3000; i += 1) {
        const candidate = formatGrNumber(pattern, sequence + i)
        const collision = await hasGrCollision(schoolId, candidate)
        if (!collision) {
            return candidate
        }
    }

    throw new CustomError('Unable to generate GR number. Please update GR pattern.', 500)
}

export const generateUniqueGrNumber = async (schoolId: string) => {
    const school = await schoolRepo.findSchoolById(schoolId)
    if (!school) {
        throw new CustomError('School is not found', 404)
    }

    const pattern = school.grPattern || DEFAULT_GR_PATTERN

    for (let i = 0; i < 3000; i += 1) {
        const updated = await schoolRepo.incrementGrCounterBySchoolId(schoolId)
        if (!updated) {
            throw new CustomError('School is not found', 404)
        }

        const nextSequence = updated.grCounter || 0
        const candidate = formatGrNumber(pattern, nextSequence)
        const collision = await hasGrCollision(schoolId, candidate)

        if (!collision) {
            return candidate
        }
    }

    throw new CustomError('Unable to generate GR number. Please update GR pattern.', 500)
}
