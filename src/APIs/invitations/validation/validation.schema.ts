import joi from 'joi'
import { ICreateInvitationRequest } from '../types/invitation.interface'

export const createInvitationSchema = joi.object<ICreateInvitationRequest, true>({
    schoolId: joi.string().required(),
    email: joi.string().email().trim().required(),
    role: joi.string().min(2).max(40).trim().optional(),
    accessPages: joi.array().items(joi.string().trim()).optional().default([])
})
