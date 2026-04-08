import mongoose from 'mongoose'
import { ILibraryLoan } from '../types/records.interface'

const libraryLoanSchema = new mongoose.Schema<ILibraryLoan>(
    {
        schoolId: {
            type: String,
            required: true,
            index: true
        },
        bookId: {
            type: String,
            required: true,
            index: true
        },
        bookTitle: {
            type: String,
            required: true
        },
        borrowerType: {
            type: String,
            enum: ['student', 'staff', 'other'],
            default: 'other'
        },
        borrowerId: {
            type: String,
            default: ''
        },
        borrowerName: {
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
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        issuedAt: {
            type: Date,
            required: true
        },
        dueDate: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            enum: ['issued', 'returned'],
            default: 'issued'
        },
        returnedAt: {
            type: Date
        },
        notes: {
            type: String,
            default: ''
        }
    },
    { timestamps: true }
)

libraryLoanSchema.index({ schoolId: 1, status: 1, dueDate: 1 })

export default mongoose.model<ILibraryLoan>('LibraryLoan', libraryLoanSchema)
