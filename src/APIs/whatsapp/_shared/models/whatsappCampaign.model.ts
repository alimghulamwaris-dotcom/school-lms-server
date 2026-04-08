import mongoose from 'mongoose'
import { IWhatsAppCampaign, IWhatsAppRecipient } from '../types/whatsapp.interface'

const recipientSchema = new mongoose.Schema<IWhatsAppRecipient>(
    {
        targetType: {
            type: String,
            enum: ['parent', 'staff', 'custom'],
            required: true
        },
        targetId: {
            type: String,
            default: ''
        },
        name: {
            type: String,
            default: ''
        },
        phone: {
            type: String,
            required: true
        },
        className: {
            type: String,
            default: ''
        },
        section: {
            type: String,
            default: ''
        },
        role: {
            type: String,
            default: ''
        },
        status: {
            type: String,
            enum: ['queued', 'sent', 'failed'],
            default: 'queued'
        },
        sentAt: {
            type: Date,
            default: null
        },
        error: {
            type: String,
            default: ''
        }
    },
    { _id: false }
)

const whatsappCampaignSchema = new mongoose.Schema<IWhatsAppCampaign>(
    {
        schoolId: {
            type: String,
            required: true,
            index: true
        },
        title: {
            type: String,
            required: true
        },
        body: {
            type: String,
            required: true
        },
        messageType: {
            type: String,
            required: true
        },
        templateName: {
            type: String,
            default: ''
        },
        audience: {
            type: {
                type: String,
                required: true
            },
            className: {
                type: String,
                default: ''
            },
            section: {
                type: String,
                default: ''
            },
            studentIds: {
                type: [String],
                default: []
            },
            staffIds: {
                type: [String],
                default: []
            },
            staffRoles: {
                type: [String],
                default: []
            },
            customPhones: {
                type: [String],
                default: []
            }
        },
        sendMode: {
            type: String,
            enum: ['now', 'daily'],
            default: 'now'
        },
        dailyTime: {
            type: String,
            default: null
        },
        nextRunAt: {
            type: Date,
            default: null
        },
        lastRunAt: {
            type: Date,
            default: null
        },
        status: {
            type: String,
            enum: ['scheduled', 'sent', 'failed'],
            default: 'sent'
        },
        recipientCount: {
            type: Number,
            default: 0
        },
        sentCount: {
            type: Number,
            default: 0
        },
        failedCount: {
            type: Number,
            default: 0
        },
        recipients: {
            type: [recipientSchema],
            default: []
        }
    },
    { timestamps: true }
)

export default mongoose.model<IWhatsAppCampaign>('WhatsAppCampaign', whatsappCampaignSchema)
