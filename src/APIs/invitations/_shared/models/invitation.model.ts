import mongoose from 'mongoose'
import { IInvitation } from '../types/invitation.interface'

const invitationSchema = new mongoose.Schema<IInvitation>(
    {
        schoolId: {
            type: String,
            required: true,
            index: true
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true
        },
        name: {
            type: String,
            required: true,
            minlength: 2,
            maxlength: 72
        },
        phone: {
            type: String,
            required: true
        },
        role: {
            type: String,
            required: true
        },
        accessPages: {
            type: [String],
            default: []
        },
        token: {
            type: String,
            required: true,
            unique: true
        },
        expiry: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'expired', 'cancelled'],
            default: 'pending'
        },
        invitedByType: {
            type: String,
            enum: ['school', 'user'],
            required: true
        },
        invitedById: {
            type: String,
            required: true
        },
        acceptedUserId: {
            type: String,
            default: null
        }
    },
    { timestamps: true }
)

export default mongoose.model<IInvitation>('Invitation', invitationSchema)
