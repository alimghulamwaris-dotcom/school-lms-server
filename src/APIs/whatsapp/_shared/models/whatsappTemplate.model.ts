import mongoose from 'mongoose'
import { IWhatsAppTemplate } from '../types/whatsapp.interface'

const whatsappTemplateSchema = new mongoose.Schema<IWhatsAppTemplate>(
    {
        schoolId: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        category: {
            type: String,
            required: true
        },
        language: {
            type: String,
            required: true
        },
        body: {
            type: String,
            required: true
        },
        variables: {
            type: [String],
            default: []
        }
    },
    { timestamps: true }
)

export default mongoose.model<IWhatsAppTemplate>('WhatsAppTemplate', whatsappTemplateSchema)
