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
    listTemplates: (schoolId: string, category?: string) => {
        let categoryFilter: Record<string, unknown> = {}
        if (category) {
            if (category.toLowerCase() === 'fees' || category.toLowerCase() === 'fee_reminder') {
                categoryFilter = { category: new RegExp('^(fees|fee_reminder)$', 'i') }
            } else {
                categoryFilter = { category: new RegExp(`^${category}$`, 'i') }
            }
        }
        return whatsappTemplateModel
            .find({
                schoolId,
                ...categoryFilter
            })
            .sort({ createdAt: -1 })
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
            .find({ sendMode: { $in: ['daily', 'monthly'] }, status: 'scheduled', nextRunAt: { $lte: now } })
            .sort({ nextRunAt: 1 })
            .limit(limit)
    },
    claimScheduledCampaign: (id: string, payload: Partial<IWhatsAppCampaign>) => {
        return whatsappCampaignModel.findOneAndUpdate({ _id: id, status: 'scheduled' }, { $set: payload }, { new: true })
    },
    updateCampaignById: (id: string, payload: Partial<IWhatsAppCampaign>) => {
        return whatsappCampaignModel.findByIdAndUpdate(id, payload, { new: true })
    },
    updateRecipientStatus: (campaignId: string, recipientIndex: number, status: string, sentAt?: Date | null, error?: string) => {
        const $set: Record<string, unknown> = {
            [`recipients.${recipientIndex}.status`]: status,
            [`recipients.${recipientIndex}.sentAt`]: sentAt || null
        }
        // Always set error field: clear it when status is 'sent', otherwise use provided error
        if (status === 'sent') {
            $set[`recipients.${recipientIndex}.error`] = ''
        } else if (error) {
            $set[`recipients.${recipientIndex}.error`] = error
        }
        return whatsappCampaignModel.findByIdAndUpdate(campaignId, { $set }, { new: true })
    },
    updateCampaignCounts: (id: string, sentCount: number, failedCount: number) => {
        return whatsappCampaignModel.findByIdAndUpdate(
            id,
            {
                $set: {
                    sentCount,
                    failedCount
                }
            },
            { new: true }
        )
    },
    updateCampaignStatus: (id: string, status: string) => {
        return whatsappCampaignModel.findByIdAndUpdate(
            id,
            {
                $set: { status }
            },
            { new: true }
        )
    },
    findCampaignById: (id: string) => {
        return whatsappCampaignModel.findById(id)
    },
    findCampaignsByStatus: (status: string) => {
        return whatsappCampaignModel.find({ status })
    },
    deleteCampaignById: (id: string) => {
        return whatsappCampaignModel.findByIdAndDelete(id)
    },
    findLatestAttendanceCampaign: (schoolId: string, className: string, section: string, date: Date | string) => {
        const targetDate = new Date(date)
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
        const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1)

        return whatsappCampaignModel
            .findOne({
                schoolId,
                messageType: 'attendance_update',
                'audience.className': className,
                'audience.section': section,
                $or: [{ attendanceDate: { $gte: startOfDay, $lt: endOfDay } }, { createdAt: { $gte: startOfDay, $lt: endOfDay } }]
            })
            .sort({ createdAt: -1 })
    }
}
