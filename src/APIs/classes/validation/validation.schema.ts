import joi from 'joi'
import { IAddSectionRequest, ICreateClassRequest, IUpdateClassRequest } from '../types/class.interface'

export const createClassSchema = joi.object<ICreateClassRequest, true>({
    schoolId: joi.string().required(),
    className: joi.string().min(1).max(40).trim().required()
})

export const addSectionSchema = joi.object<IAddSectionRequest, true>({
    schoolId: joi.string().required(),
    section: joi.string().min(1).max(20).trim().required()
})

export const updateClassSchema = joi.object<IUpdateClassRequest, true>({
    className: joi.string().min(1).max(40).trim().optional(),
    sections: joi.array().items(joi.string().trim()).optional(),
    status: joi.string().valid('active', 'archived').optional()
})
