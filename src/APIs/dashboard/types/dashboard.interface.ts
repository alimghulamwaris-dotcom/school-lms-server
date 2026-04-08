import { Request } from 'express'

export interface IDashboardRequest extends Request {
    query: {
        schoolId?: string
    }
}
