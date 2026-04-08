import joi from 'joi'
import { IAssignTeacherRequest, ICreateAttendanceRequest } from '../types/attendance.interface'

const attendanceRecordSchema = joi.object({
    studentId: joi.string().allow('', null).optional(),
    studentName: joi.string().required(),
    grNumber: joi.string().required(),
    status: joi.string().valid('present', 'absent', 'on_leave').required(),
    reason: joi.string().allow('').optional()
})

export const createAttendanceSchema = joi.object<ICreateAttendanceRequest, true>({
    schoolId: joi.string().required(),
    className: joi.string().required(),
    section: joi.string().allow('').optional(),
    date: joi.string().required(),
    records: joi.array().items(attendanceRecordSchema).min(1).required(),
    notes: joi.string().allow('').optional(),
    sendWhatsapp: joi.boolean().optional(),
    saveRegister: joi.boolean().optional()
})

export const assignTeacherSchema = joi.object<IAssignTeacherRequest, true>({
    schoolId: joi.string().required(),
    className: joi.string().required(),
    section: joi.string().required(),
    teacherEmail: joi.string().email().required()
})
