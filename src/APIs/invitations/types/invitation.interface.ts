import { Request } from 'express'

export interface ICreateInvitationRequest {
    schoolId: string
    email: string
    role?: string
    accessPages?: string[]
}

export interface ICreateInvitation extends Request {
    body: ICreateInvitationRequest
}

export interface IListInvitations extends Request {
    query: {
        schoolId?: string
    }
}
