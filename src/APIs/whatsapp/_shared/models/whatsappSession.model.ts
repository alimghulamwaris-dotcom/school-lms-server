import mongoose, { Document, Schema } from 'mongoose'

export type TWhatsAppSessionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface IWhatsAppSession extends Document {
    schoolId: string
    phoneNumber?: string
    status: TWhatsAppSessionStatus
    qrCode?: string
    errorMessage?: string
    // Rate-limit state (per Step 2 of anti-ban spec)
    connectedAt?: Date | null
    dailySendCount: number
    dailySendDate: string | null
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
        errorMessage: { type: String, default: '' },
        // Anti-ban rate-limit fields (Step 2)
        connectedAt: { type: Date, default: null },
        dailySendCount: { type: Number, default: 0 },
        dailySendDate: { type: String, default: null }
    },
    {
        timestamps: true
    }
)

const whatsappSessionModel =
    (mongoose.models.WhatsAppSession as mongoose.Model<IWhatsAppSession> | undefined) ||
    mongoose.model<IWhatsAppSession>('WhatsAppSession', whatsappSessionSchema)

export default whatsappSessionModel
