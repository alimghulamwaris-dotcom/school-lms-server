import joi from 'joi'
import { ICreateStudentRequest, IExecutePromotionsRequest, IPreviewPromotionsRequest, IUpdateStudentRequest } from '../types/student.interface'

export const createStudentSchema = joi.object<ICreateStudentRequest, true>({
    schoolId: joi.string().required(),
    name: joi.string().min(2).max(72).required(),
    grNumber: joi.string().min(2).max(40).allow('').optional(),
    className: joi.string().min(1).max(40).required(),
    section: joi.string().max(10).optional(),
    guardianName: joi.string().min(2).max(72).required(),
    guardianPhone: joi.string().min(4).max(20).required(),
    address: joi.string().allow('').optional(),
    status: joi.string().optional(),
    admissionDate: joi.string().optional(),
    previousSchool: joi.string().allow('').optional(),
    photoUrl: joi.string().allow('').optional(),
    documentUrls: joi.array().items(joi.string()).optional()
})

export const updateStudentSchema = joi.object<IUpdateStudentRequest, true>({
    className: joi.string().optional(),
    section: joi.string().optional(),
    status: joi.string().optional(),
    photoUrl: joi.string().allow('').optional(),
    documentUrls: joi.array().items(joi.string()).optional()
})

export const previewPromotionsSchema = joi.object<IPreviewPromotionsRequest, true>({
    schoolId: joi.string().required(),
    examId: joi.string().required(),
    defaultNextClassName: joi.string().allow('').optional(),
    defaultNextSection: joi.string().allow('').optional()
})

export const executePromotionsSchema = joi.object<IExecutePromotionsRequest, true>({
    schoolId: joi.string().required(),
    examId: joi.string().required(),
    defaultNextClassName: joi.string().allow('').optional(),
    defaultNextSection: joi.string().allow('').optional(),
    selections: joi
        .array()
        .items(
            joi.object({
                studentId: joi.string().required(),
                action: joi.string().valid('promote', 'retain').required(),
                targetClassName: joi.string().allow('').optional(),
                targetSection: joi.string().allow('').optional(),
                forcePromote: joi.boolean().optional(),
                reason: joi.string().allow('').max(240).optional()
            })
        )
        .optional()
})
