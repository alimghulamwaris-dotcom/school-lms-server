import joi from 'joi'
import { ICheckInRequest, ICheckOutRequest } from '../types/staffAttendance.interface'

export const checkInSchema = joi.object<ICheckInRequest, true>({
    schoolId: joi.string().required()
})

export const checkOutSchema = joi.object<ICheckOutRequest, true>({
    schoolId: joi.string().required()
})
