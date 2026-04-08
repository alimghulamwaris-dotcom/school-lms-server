import responseMessage from '../../constant/responseMessage'
import { CustomError } from '../../utils/errors'
import classroomRepo from './_shared/repo/classroom.repository'
import { IAddSectionRequest, ICreateClassRequest, IUpdateClassRequest } from './types/class.interface'

const normalizeClassKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '-')
const normalizeSection = (value: string) => value.trim().toUpperCase()

export const createClassService = async (payload: ICreateClassRequest) => {
    const className = payload.className.trim()
    const classKey = normalizeClassKey(className)

    const existing = await classroomRepo.findClassroomBySchoolAndKey(payload.schoolId, classKey)
    if (existing) {
        throw new CustomError('Class already exists for this school.', 422)
    }

    const classroom = await classroomRepo.createClassroom({
        schoolId: payload.schoolId,
        className,
        classKey,
        sections: [],
        status: 'active'
    })

    return {
        success: true,
        classroom
    }
}

export const listClassesService = async (schoolId: string) => {
    const classes = await classroomRepo.findClassroomsBySchool(schoolId)
    return {
        success: true,
        classes
    }
}

export const getClassByIdService = async (classId: string, schoolId: string) => {
    const classroom = await classroomRepo.findClassroomById(classId)
    if (!classroom) {
        throw new CustomError(responseMessage.NOT_FOUND('Class'), 404)
    }

    if (schoolId && classroom.schoolId !== schoolId) {
        throw new CustomError(responseMessage.UNAUTHORIZED, 403)
    }

    return {
        success: true,
        classroom
    }
}

export const addSectionService = async (classId: string, payload: IAddSectionRequest) => {
    const classroom = await classroomRepo.findClassroomById(classId)
    if (!classroom) {
        throw new CustomError(responseMessage.NOT_FOUND('Class'), 404)
    }

    if (classroom.schoolId !== payload.schoolId) {
        throw new CustomError(responseMessage.UNAUTHORIZED, 403)
    }

    const section = normalizeSection(payload.section)
    const existing = (classroom.sections || []).map(normalizeSection)
    if (existing.includes(section)) {
        throw new CustomError('Section already exists in this class.', 422)
    }

    classroom.sections = [...(classroom.sections || []), section]
    await classroom.save()

    return {
        success: true,
        classroom
    }
}

export const updateClassService = async (classId: string, payload: IUpdateClassRequest) => {
    const currentClass = await classroomRepo.findClassroomById(classId)
    if (!currentClass) {
        throw new CustomError(responseMessage.NOT_FOUND('Class'), 404)
    }

    const patch: IUpdateClassRequest = {}

    if (payload.className !== undefined) {
        patch.className = payload.className.trim()
        const classKey = normalizeClassKey(patch.className)
        const existing = await classroomRepo.findClassroomBySchoolAndKey(currentClass.schoolId, classKey)
        if (existing && String(existing._id) !== classId) {
            throw new CustomError('Class already exists for this school.', 422)
        }
    }

    if (payload.sections !== undefined) {
        patch.sections = payload.sections.map((item) => normalizeSection(item)).filter((item, index, arr) => item && arr.indexOf(item) === index)
    }

    if (payload.status !== undefined) {
        patch.status = payload.status
    }

    const updatePayload: Record<string, unknown> = { ...patch }
    if (typeof patch.className === 'string') {
        updatePayload.classKey = normalizeClassKey(patch.className)
    }

    const classroom = await classroomRepo.updateClassroomById(classId, updatePayload)
    return {
        success: true,
        classroom
    }
}

export const ensureClassSectionExists = async (schoolId: string, className: string, section?: string) => {
    const classKey = normalizeClassKey(className)
    const classroom = await classroomRepo.findClassroomBySchoolAndKey(schoolId, classKey)
    if (!classroom) {
        throw new CustomError('Class is not found. Please create class first.', 422)
    }

    if (section && section.trim().length > 0) {
        const normalizedSection = normalizeSection(section)
        const existingSections = (classroom.sections || []).map(normalizeSection)
        if (!existingSections.includes(normalizedSection)) {
            throw new CustomError('Section is not found for the selected class.', 422)
        }
    }
}
