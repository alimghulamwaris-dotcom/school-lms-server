import { Document, Schema, Types, model } from 'mongoose'

export interface ICounter {
    schoolId: Types.ObjectId | string
    name: string
    value: number
}

export interface ICounterDocument extends ICounter, Document {
    createdAt: Date
    updatedAt: Date
}

const counterSchema = new Schema<ICounterDocument>(
    {
        schoolId: {
            type: Schema.Types.ObjectId,
            ref: 'School',
            required: true,
            index: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        value: {
            type: Number,
            required: true,
            default: 0
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
)

counterSchema.index({ schoolId: 1, name: 1 }, { unique: true })

export default model<ICounterDocument>('Counter', counterSchema)
