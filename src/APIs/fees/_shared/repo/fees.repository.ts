import counterModel from '../models/counter.model'
import feeExpenseModel from '../models/feeExpense.model'
import feeInvoiceModel from '../models/feeInvoice.model'
import feeReminderModel from '../models/feeReminder.model'
import feeSlipModel from '../models/feeSlip.model'
import { IFeeExpense, IFeeInvoice, IFeeReminder, IFeeSlip } from '../types/fees.interface'

export default {
    createReminder: (payload: IFeeReminder) => {
        return feeReminderModel.create(payload)
    },
    listReminders: (schoolId: string) => {
        return feeReminderModel.find({ schoolId })
    },
    createSlip: (payload: IFeeSlip) => {
        return feeSlipModel.create(payload)
    },
    listSlips: (schoolId: string) => {
        return feeSlipModel.find({ schoolId })
    },
    createInvoice: (payload: IFeeInvoice) => {
        return feeInvoiceModel.create(payload)
    },
    createInvoices: (payload: IFeeInvoice[]) => {
        return feeInvoiceModel.insertMany(payload)
    },
    findInvoiceById: (id: string) => {
        return feeInvoiceModel.findById(id)
    },
    getNextInvoiceSequence: async (schoolId: string, year: number, count: number = 1): Promise<{ start: number; end: number }> => {
        const counterName = `invoice_${year}`

        const counter = await counterModel.findOne({ schoolId, name: counterName })
        if (!counter) {
            // Repair/initialize from existing invoices for this school and year
            const invoices = await feeInvoiceModel.find({ schoolId, invoiceNumber: new RegExp(`^INV-${year}-`) }, { invoiceNumber: 1 }).lean()

            let maxSeq = 0
            for (const inv of invoices) {
                const match = inv.invoiceNumber.match(/(\d+)$/)
                if (match) {
                    const num = parseInt(match[1], 10)
                    if (!Number.isNaN(num) && num > maxSeq) {
                        maxSeq = num
                    }
                }
            }

            try {
                await counterModel.updateOne({ schoolId, name: counterName }, { $setOnInsert: { value: maxSeq } }, { upsert: true })
            } catch {
                // Ignore any concurrent upsert conflict
            }
        }

        const updated = await counterModel.findOneAndUpdate({ schoolId, name: counterName }, { $inc: { value: count } }, { new: true, upsert: true })

        const end = updated.value
        const start = end - count + 1
        return { start, end }
    },
    listInvoicesByFilters: (
        schoolId: string,
        filters: {
            month?: string
            className?: string
            section?: string
            status?: string
            search?: string
        }
    ) => {
        const query: Record<string, unknown> = { schoolId }

        if (filters.month) {
            query.month = filters.month
        }
        if (filters.className) {
            query.className = filters.className
        }
        if (filters.section) {
            query.section = filters.section
        }
        if (filters.status) {
            query.status = filters.status
        }
        if (filters.search) {
            const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            query.$or = [
                { invoiceNumber: { $regex: escaped, $options: 'i' } },
                { studentName: { $regex: escaped, $options: 'i' } },
                { grNumber: { $regex: escaped, $options: 'i' } },
                { guardianName: { $regex: escaped, $options: 'i' } },
                { guardianPhone: { $regex: escaped, $options: 'i' } }
            ]
        }

        return feeInvoiceModel.find(query).sort({ createdAt: -1 })
    },
    findInvoicesBySchoolMonthAndGrNumbers: (schoolId: string, month: string, grNumbers: string[]) => {
        return feeInvoiceModel.find({ schoolId, month, grNumber: { $in: grNumbers } })
    },
    findInvoicesBySchoolAndGr: (schoolId: string, grNumber: string) => {
        return feeInvoiceModel.find({ schoolId, grNumber }).sort({ issueDate: -1, createdAt: -1 })
    },
    createExpense: (payload: IFeeExpense) => {
        return feeExpenseModel.create(payload)
    },
    findExpenseById: (id: string) => {
        return feeExpenseModel.findById(id)
    },
    updateExpenseById: (id: string, payload: Partial<IFeeExpense>) => {
        return feeExpenseModel.findByIdAndUpdate(id, payload, { new: true })
    },
    listExpensesByFilters: (
        schoolId: string,
        filters: {
            search?: string
            category?: string
            status?: string
            startDate?: Date
            endDate?: Date
        }
    ) => {
        const query: Record<string, unknown> = { schoolId }

        if (filters.category) {
            query.category = filters.category
        }
        if (filters.status) {
            query.status = filters.status
        } else {
            query.status = 'active'
        }
        if (filters.startDate || filters.endDate) {
            query.spentAt = {}
            if (filters.startDate) {
                ;(query.spentAt as Record<string, Date>).$gte = filters.startDate
            }
            if (filters.endDate) {
                ;(query.spentAt as Record<string, Date>).$lte = filters.endDate
            }
        }
        if (filters.search) {
            const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            query.$or = [
                { title: { $regex: escaped, $options: 'i' } },
                { category: { $regex: escaped, $options: 'i' } },
                { paymentMode: { $regex: escaped, $options: 'i' } },
                { reference: { $regex: escaped, $options: 'i' } },
                { notes: { $regex: escaped, $options: 'i' } }
            ]
        }

        return feeExpenseModel.find(query).sort({ spentAt: -1, createdAt: -1 })
    },
    updateInvoiceById: (id: string, payload: Partial<IFeeInvoice>) => {
        return feeInvoiceModel.findByIdAndUpdate(id, payload, { new: true })
    }
}
