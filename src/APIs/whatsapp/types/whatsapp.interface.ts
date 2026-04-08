import { Request } from 'express'
import { IWhatsAppAudience, TWhatsAppMessageType, TWhatsAppSendMode } from '../_shared/types/whatsapp.interface'

export interface ICreateTemplateRequest {
    schoolId: string
    name: string
    category: string
    language: string
    body: string
    variables: string[]
}

export interface ICreateTestRequest {
    schoolId: string
    templateName: string
    phone: string
    sampleData: string
}

export interface ICreateCampaignRequest {
    schoolId: string
    messageType: TWhatsAppMessageType
    title: string
    body: string
    templateName?: string
    audience: IWhatsAppAudience
    sendMode: TWhatsAppSendMode
    dailyTime?: string
}

export interface ICampaignListQuery {
    schoolId: string
    limit?: number
}

export interface IAudienceOptionsQuery {
    schoolId: string
}

export interface ICreateTemplate extends Request {
    body: ICreateTemplateRequest
}

export interface ICreateTest extends Request {
    body: ICreateTestRequest
}

export interface ICreateCampaign extends Request {
    body: ICreateCampaignRequest
}

export interface IListTemplates extends Request {
    query: {
        schoolId?: string
    }
}

export interface IListCampaigns extends Request {
    query: {
        schoolId?: string
        limit?: string
    }
}

export interface IAudienceOptions extends Request {
    query: {
        schoolId?: string
    }
}
