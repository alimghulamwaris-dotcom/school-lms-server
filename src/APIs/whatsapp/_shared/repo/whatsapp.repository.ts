import whatsappCampaignModel from '../models/whatsappCampaign.model'
import whatsappTemplateModel from '../models/whatsappTemplate.model'
import whatsappTestModel from '../models/whatsappTest.model'
import { IWhatsAppCampaign, IWhatsAppTemplate, IWhatsAppTest } from '../types/whatsapp.interface'

export default {
    findTemplateById: (id: string) => {
        return whatsappTemplateModel.findById(id)
    },
    createTemplate: (payload: IWhatsAppTemplate) => {
        return whatsappTemplateModel.create(payload)
    },
    updateTemplate: (id: string, payload: Partial<IWhatsAppTemplate>) => {
        return whatsappTemplateModel.findByIdAndUpdate(id, payload, { new: true })
    },
    deleteTemplate: (id: string) => {
        return whatsappTemplateModel.findByIdAndDelete(id)
    },
    listTemplates: (schoolId: string) => {
        return whatsappTemplateModel.find({ schoolId }).sort({ createdAt: -1 })
    },
    createTest: (payload: IWhatsAppTest) => {
        return whatsappTestModel.create(payload)
    },
    createCampaign: (payload: IWhatsAppCampaign) => {
        return whatsappCampaignModel.create(payload)
    },
    listCampaigns: (schoolId: string, limit: number = 20) => {
        return whatsappCampaignModel.find({ schoolId }).sort({ createdAt: -1 }).limit(limit)
    },
    findDueDailyCampaigns: (now: Date, limit: number = 25) => {
        return whatsappCampaignModel
            .find({ sendMode: 'daily', status: 'scheduled', nextRunAt: { $lte: now } })
            .sort({ nextRunAt: 1 })
            .limit(limit)
    },
    updateCampaignById: (id: string, payload: Partial<IWhatsAppCampaign>) => {
        return whatsappCampaignModel.findByIdAndUpdate(id, payload, { new: true })
    }
}
