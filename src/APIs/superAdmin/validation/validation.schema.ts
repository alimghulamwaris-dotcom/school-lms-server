import joi from 'joi'
import { ISuperAdminSchoolsQuery } from '../types/superAdmin.interface'

export const superAdminSchoolListSchema = joi.object<ISuperAdminSchoolsQuery, true>({
    search: joi.string().allow('').optional(),
    page: joi.number().integer().min(1).default(1),
    limit: joi.number().integer().min(1).max(100).default(20)
})
