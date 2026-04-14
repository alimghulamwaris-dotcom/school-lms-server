import { Request } from 'express'
import { ISchool } from '../../../school/_shared/types/school.interface'
import { IUser } from '../../_shared/types/users.interface'

export interface IMyUser extends Request {
    authenticatedUser?: IUser
    authenticatedSchool?: ISchool
    authenticatedSchoolId?: string | null
}
