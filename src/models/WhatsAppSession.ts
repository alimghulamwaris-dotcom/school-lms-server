// models/WhatsAppSession.ts
import mongoose, { Document, Schema } from 'mongoose'

export interface IWhatsAppSession extends Document {
    schoolId: string
    phoneNumber?: string
    authState: Record<string, unknown> // Store the Baileys auth state
    status: 'disconnected' | 'connecting' | 'connected' | 'error'
    qrCode?: string
    errorMessage?: string
    createdAt: Date
    updatedAt: Date
}

const WhatsAppSessionSchema = new Schema<IWhatsAppSession>(
    {
        schoolId: { type: String, required: true, unique: true },
        phoneNumber: { type: String },
        authState: { type: Schema.Types.Mixed },
        status: {
            type: String,
            enum: ['disconnected', 'connecting', 'connected', 'error'],
            default: 'disconnected'
        },
        qrCode: { type: String },
        errorMessage: { type: String }
    },
    {
        timestamps: true
    }
)

export default mongoose.model<IWhatsAppSession>('WhatsAppSession', WhatsAppSessionSchema)
