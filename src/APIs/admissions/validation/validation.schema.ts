import joi from 'joi'
import { ICreateAdmissionRequest, IImportAdmissionsRequest } from '../types/admission.interface'

export const createAdmissionSchema = joi.object<ICreateAdmissionRequest, true>({
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

const importAdmissionItemSchema = joi.object({
    schoolId: joi.string().required(),
    name: joi.string().min(2).max(72).required(),
    grNumber: joi.string().min(2).max(40).required(),
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

export const importAdmissionsSchema = joi.object<IImportAdmissionsRequest, true>({
    schoolId: joi.string().required(),
    admissions: joi.array().items(importAdmissionItemSchema).min(1).required()
})
