import { ensureClassSectionExists } from '../classes/classes.service'
import responseMessage from '../../constant/responseMessage'
import { CustomError } from '../../utils/errors'
import { generateUniqueGrNumber } from '../../services/grNumber'
import studentRepo from '../students/_shared/repo/student.repository'
import admissionRepo from './_shared/repo/admission.repository'
import { ICreateAdmissionRequest, IImportAdmissionItem, IImportAdmissionsRequest } from './types/admission.interface'

const normalizeSection = (value?: string) => (value ? value.trim().toUpperCase() : '')

const mapAdmission = (payload: ICreateAdmissionRequest & { grNumber: string }) => {
    return {
        schoolId: payload.schoolId,
        name: payload.name,
        grNumber: payload.grNumber.trim(),
        className: payload.className,
        section: normalizeSection(payload.section),
        guardianName: payload.guardianName,
        guardianPhone: payload.guardianPhone,
        address: payload.address || '',
        status: payload.status || 'pending',
        admissionDate: payload.admissionDate ? new Date(payload.admissionDate) : null,
        previousSchool: payload.previousSchool || null,
        photoUrl: payload.photoUrl || '',
        documentUrls: payload.documentUrls || []
    }
}

const mapStudentFromAdmission = (payload: ICreateAdmissionRequest & { grNumber: string }) => {
    return {
        schoolId: payload.schoolId,
        name: payload.name,
        grNumber: payload.grNumber.trim(),
        className: payload.className,
        section: normalizeSection(payload.section),
        guardianName: payload.guardianName,
        guardianPhone: payload.guardianPhone,
        address: payload.address || '',
        status: payload.status || 'pending',
        admissionDate: payload.admissionDate ? new Date(payload.admissionDate) : null,
        previousSchool: payload.previousSchool || null,
        photoUrl: payload.photoUrl || '',
        documentUrls: payload.documentUrls || []
    }
}

const resolveAdmissionGrNumber = async (schoolId: string, grNumber?: string) => {
    const manualGrNumber = typeof grNumber === 'string' ? grNumber.trim() : ''

    if (!manualGrNumber) {
        return generateUniqueGrNumber(schoolId)
    }

    const [existingAdmission, existingStudent] = await Promise.all([
        admissionRepo.findAdmissionBySchoolAndGr(schoolId, manualGrNumber),
        studentRepo.findStudentBySchoolAndGr(schoolId, manualGrNumber)
    ])

    if (existingAdmission || existingStudent) {
        throw new CustomError(responseMessage.school.GR_ALREADY_EXISTS, 422)
    }

    return manualGrNumber
}

export const createAdmissionService = async (payload: ICreateAdmissionRequest) => {
    const resolvedGrNumber = await resolveAdmissionGrNumber(payload.schoolId, payload.grNumber)

    await ensureClassSectionExists(payload.schoolId, payload.className, payload.section)

    const normalizedPayload = {
        ...payload,
        grNumber: resolvedGrNumber
    }

    const admission = await admissionRepo.createAdmission(mapAdmission(normalizedPayload))
    await studentRepo.createStudent(mapStudentFromAdmission(normalizedPayload))

    return {
        success: true,
        admission
    }
}

export const importAdmissionsService = async (payload: IImportAdmissionsRequest) => {
    const normalizedAdmissions: IImportAdmissionItem[] = payload.admissions.map((item) => ({
        ...item,
        grNumber: item.grNumber.trim()
    }))

    const missingGr = normalizedAdmissions.find((item) => !item.grNumber)
    if (missingGr) {
        throw new CustomError('GR number is required for imported admissions.', 422)
    }

    const grNumbers = normalizedAdmissions.map((item) => item.grNumber)
    const unique = new Set(grNumbers)
    if (unique.size !== grNumbers.length) {
        throw new CustomError(responseMessage.school.GR_ALREADY_EXISTS, 422)
    }

    const existingAdmissions = await admissionRepo.findAdmissionsBySchoolAndGrNumbers(payload.schoolId, grNumbers)
    if (existingAdmissions.length > 0) {
        throw new CustomError(responseMessage.school.GR_ALREADY_EXISTS, 422)
    }

    const existingStudents = await studentRepo.findStudentsBySchoolAndGrNumbers(payload.schoolId, grNumbers)
    if (existingStudents.length > 0) {
        throw new CustomError(responseMessage.school.GR_ALREADY_EXISTS, 422)
    }

    for (const item of normalizedAdmissions) {
        await ensureClassSectionExists(payload.schoolId, item.className, item.section)
    }

    const admissions = normalizedAdmissions.map(mapAdmission)
    const students = normalizedAdmissions.map(mapStudentFromAdmission)

    const created = await admissionRepo.createAdmissions(admissions)
    await studentRepo.createStudents(students)

    return {
        success: true,
        admissions: created
    }
}

export const listAdmissionsService = async (schoolId: string) => {
    const admissions = await admissionRepo.findAdmissionsBySchool(schoolId)
    return {
        success: true,
        admissions
    }
}
