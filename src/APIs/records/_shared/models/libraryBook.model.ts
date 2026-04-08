import mongoose from 'mongoose'
import { ILibraryBook } from '../types/records.interface'

const libraryBookSchema = new mongoose.Schema<ILibraryBook>(
    {
        schoolId: {
            type: String,
            required: true,
            index: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        author: {
            type: String,
            required: true,
            trim: true
        },
        isbn: {
            type: String,
            default: '',
            trim: true
        },
        category: {
            type: String,
            default: '',
            trim: true
        },
        shelf: {
            type: String,
            default: '',
            trim: true
        },
        copiesTotal: {
            type: Number,
            required: true,
            min: 0
        },
        copiesAvailable: {
            type: Number,
            required: true,
            min: 0
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

libraryBookSchema.index({ schoolId: 1, title: 1, author: 1 })
libraryBookSchema.index({ schoolId: 1, isbn: 1 }, { unique: false })

export default mongoose.model<ILibraryBook>('LibraryBook', libraryBookSchema)
