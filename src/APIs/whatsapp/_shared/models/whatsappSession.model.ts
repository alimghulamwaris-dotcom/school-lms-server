import mongoose, { Document, Schema } from 'mongoose'

export type TWhatsAppSessionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface IWhatsAppSession extends Document {
    schoolId: string
    phoneNumber?: string
    status: TWhatsAppSessionStatus
    qrCode?: string
    errorMessage?: string
    createdAt: Date
    updatedAt: Date
}

const whatsappSessionSchema = new Schema<IWhatsAppSession>(
    {
        schoolId: { type: String, required: true, unique: true },
        phoneNumber: { type: String, default: '' },
        status: {
            type: String,
            enum: ['disconnected', 'connecting', 'connected', 'error'],
            default: 'disconnected'
        },
        qrCode: { type: String, default: '' },
        errorMessage: { type: String, default: '' }
    },
    {
        timestamps: true
    }
)

const whatsappSessionModel =
    (mongoose.models.WhatsAppSession as mongoose.Model<IWhatsAppSession> | undefined) ||
    mongoose.model<IWhatsAppSession>('WhatsAppSession', whatsappSessionSchema)

export default whatsappSessionModel
