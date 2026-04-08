import equipmentIssueModel from '../models/equipmentIssue.model'
import equipmentModel from '../models/equipment.model'
import libraryBookModel from '../models/libraryBook.model'
import libraryLoanModel from '../models/libraryLoan.model'
import { IEquipment, IEquipmentIssue, ILibraryBook, ILibraryLoan } from '../types/records.interface'

type TEquipmentFilters = {
    search?: string
    category?: string
    status?: 'active' | 'archived'
}

type TEquipmentIssueFilters = {
    status?: 'issued' | 'returned'
    search?: string
}

type TBookFilters = {
    search?: string
    status?: 'active' | 'archived'
    category?: string
}

type TLoanFilters = {
    status?: 'issued' | 'returned'
    search?: string
}

export default {
    createEquipment: (payload: IEquipment) => {
        return equipmentModel.create(payload)
    },
    listEquipment: (schoolId: string, filters: TEquipmentFilters) => {
        const query: {
            schoolId: string
            category?: string
            status?: 'active' | 'archived'
            $or?: { name?: RegExp; category?: RegExp; location?: RegExp }[]
        } = { schoolId }

        if (filters.category) {
            query.category = filters.category
        }
        if (filters.status) {
            query.status = filters.status
        }
        if (filters.search) {
            const regex = new RegExp(filters.search, 'i')
            query.$or = [{ name: regex }, { category: regex }, { location: regex }]
        }

        return equipmentModel.find(query).sort({ createdAt: -1 })
    },
    findEquipmentById: (id: string) => {
        return equipmentModel.findById(id)
    },
    updateEquipmentById: (id: string, payload: Partial<IEquipment>) => {
        return equipmentModel.findByIdAndUpdate(id, payload, { new: true })
    },

    createEquipmentIssue: (payload: IEquipmentIssue) => {
        return equipmentIssueModel.create(payload)
    },
    listEquipmentIssues: (schoolId: string, filters: TEquipmentIssueFilters) => {
        const query: {
            schoolId: string
            status?: 'issued' | 'returned'
            $or?: { equipmentName?: RegExp; borrowerName?: RegExp }[]
        } = { schoolId }

        if (filters.status) {
            query.status = filters.status
        }
        if (filters.search) {
            const regex = new RegExp(filters.search, 'i')
            query.$or = [{ equipmentName: regex }, { borrowerName: regex }]
        }

        return equipmentIssueModel.find(query).sort({ issuedAt: -1 })
    },
    findEquipmentIssueById: (id: string) => {
        return equipmentIssueModel.findById(id)
    },
    updateEquipmentIssueById: (id: string, payload: Partial<IEquipmentIssue>) => {
        return equipmentIssueModel.findByIdAndUpdate(id, payload, { new: true })
    },

    createLibraryBook: (payload: ILibraryBook) => {
        return libraryBookModel.create(payload)
    },
    listLibraryBooks: (schoolId: string, filters: TBookFilters) => {
        const query: {
            schoolId: string
            status?: 'active' | 'archived'
            category?: string
            $or?: { title?: RegExp; author?: RegExp; isbn?: RegExp; shelf?: RegExp }[]
        } = { schoolId }

        if (filters.status) {
            query.status = filters.status
        }
        if (filters.category) {
            query.category = filters.category
        }
        if (filters.search) {
            const regex = new RegExp(filters.search, 'i')
            query.$or = [{ title: regex }, { author: regex }, { isbn: regex }, { shelf: regex }]
        }

        return libraryBookModel.find(query).sort({ createdAt: -1 })
    },
    findLibraryBookById: (id: string) => {
        return libraryBookModel.findById(id)
    },
    updateLibraryBookById: (id: string, payload: Partial<ILibraryBook>) => {
        return libraryBookModel.findByIdAndUpdate(id, payload, { new: true })
    },

    createLibraryLoan: (payload: ILibraryLoan) => {
        return libraryLoanModel.create(payload)
    },
    listLibraryLoans: (schoolId: string, filters: TLoanFilters) => {
        const query: {
            schoolId: string
            status?: 'issued' | 'returned'
            $or?: { borrowerName?: RegExp; bookTitle?: RegExp }[]
        } = { schoolId }

        if (filters.status) {
            query.status = filters.status
        }
        if (filters.search) {
            const regex = new RegExp(filters.search, 'i')
            query.$or = [{ borrowerName: regex }, { bookTitle: regex }]
        }

        return libraryLoanModel.find(query).sort({ issuedAt: -1 })
    },
    findLibraryLoanById: (id: string) => {
        return libraryLoanModel.findById(id)
    },
    updateLibraryLoanById: (id: string, payload: Partial<ILibraryLoan>) => {
        return libraryLoanModel.findByIdAndUpdate(id, payload, { new: true })
    }
}
