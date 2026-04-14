import joi from 'joi'
import { ICreateStaffRequest, IUpdateStaffRequest } from '../types/staff.interface'

export const createStaffSchema = joi.object<ICreateStaffRequest, true>({
    schoolId: joi.string().required(),
    name: joi.string().min(2).max(72).required(),
    role: joi.string().min(2).max(40).required(),
    email: joi.string().email().required(),
    phone: joi.string().min(4).max(20).required(),
    accessPages: joi.array().items(joi.string()).default([]),
    status: joi.string().optional(),
    photoUrl: joi.string().allow('').optional(),
    documentUrls: joi.array().items(joi.string()).optional()
})

export const updateStaffSchema = joi.object<IUpdateStaffRequest, true>({
    name: joi.string().min(2).max(72).optional(),
    email: joi.string().email().trim().lowercase().optional(),
    phone: joi.string().min(4).max(20).optional(),
    accessPages: joi.array().items(joi.string()).optional(),
    status: joi.string().optional(),
    role: joi.string().optional(),
    photoUrl: joi.string().allow('').optional(),
    documentUrls: joi.array().items(joi.string()).optional()
})
