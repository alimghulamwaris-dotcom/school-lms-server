import mongoose from 'mongoose'
import { IEquipment } from '../types/records.interface'

const equipmentSchema = new mongoose.Schema<IEquipment>(
    {
        schoolId: {
            type: String,
            required: true,
            index: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        category: {
            type: String,
            required: true,
            trim: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 0
        },
        availableQuantity: {
            type: Number,
            required: true,
            min: 0
        },
        location: {
            type: String,
            default: '',
            trim: true
        },
        condition: {
            type: String,
            enum: ['new', 'good', 'fair', 'damaged'],
            default: 'good'
        },
        status: {
            type: String,
            enum: ['active', 'archived'],
            default: 'active'
        },
        notes: {
            type: String,
            default: ''
        }
    },
    { timestamps: true }
)

equipmentSchema.index({ schoolId: 1, name: 1, category: 1 })

export default mongoose.model<IEquipment>('Equipment', equipmentSchema)
