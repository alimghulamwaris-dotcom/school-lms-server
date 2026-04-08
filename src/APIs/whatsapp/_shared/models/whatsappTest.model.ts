import mongoose from 'mongoose'
import { IWhatsAppTest } from '../types/whatsapp.interface'

const whatsappTestSchema = new mongoose.Schema<IWhatsAppTest>(
    {
        schoolId: {
            type: String,
            required: true
        },
        templateName: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        sampleData: {
            type: String,
            default: ''
        }
    },
    { timestamps: true }
)

export default mongoose.model<IWhatsAppTest>('WhatsAppTest', whatsappTestSchema)
