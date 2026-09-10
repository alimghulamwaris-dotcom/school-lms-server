import responseMessage from '../../constant/responseMessage'
import { CustomError } from '../../utils/errors'
import recordsRepo from './_shared/repo/records.repository'
import {
    ICreateEquipmentRequest,
    ICreateLibraryBookRequest,
    IIssueEquipmentRequest,
    IIssueLibraryBookRequest,
    IListEquipmentIssuesQuery,
    IListEquipmentQuery,
    IListLibraryBooksQuery,
    IListLibraryLoansQuery,
    IReturnEquipmentIssueRequest,
    IReturnLibraryLoanRequest,
    IUpdateEquipmentRequest,
    IUpdateLibraryBookRequest
} from './types/records.interface'

const normalize = (value: string) => value.trim().toLowerCase()

const ensureSchoolId = (schoolId: string) => {
    const id = schoolId.trim()
    if (!id) {
        throw new CustomError('School id is required.', 422)
    }
    return id
}

const ensureNonNegativeInt = (value: number, label: string) => {
    if (!Number.isInteger(value) || value < 0) {
        throw new CustomError(`${label} must be a non-negative integer.`, 422)
    }
}

const ensurePositiveInt = (value: number, label: string) => {
    if (!Number.isInteger(value) || value <= 0) {
        throw new CustomError(`${label} must be greater than zero.`, 422)
    }
}

const parseOptionalDate = (value?: string) => {
    if (!value) return undefined
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
        throw new CustomError('Invalid date.', 422)
    }
    return parsed
}

const parseRequiredDate = (value: string, label: string) => {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
        throw new CustomError(`Invalid ${label}.`, 422)
    }
    return parsed
}

const ensureStringValue = (value: unknown, label: string) => {
    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (trimmed) return trimmed
    }

    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        const converted = String(value).trim()
        if (converted) return converted
    }
    if (value && typeof value === 'object' && typeof (value as { toString?: () => string }).toString === 'function') {
        const str = (value as { toString: () => string }).toString()
        const converted = typeof str === 'string' ? str.trim() : ''
        if (converted && converted !== '[object Object]') return converted
    }

    throw new CustomError(`${label} is missing.`, 422)
}

const getDocumentId = (documentValue: unknown, label: string) => {
    if (!documentValue || typeof documentValue !== 'object') {
        throw new CustomError(`${label} is missing.`, 422)
    }

    const doc = documentValue as Record<string, unknown>
    return ensureStringValue(doc.id ?? doc._id, label)
}

export const createEquipmentService = async (payload: ICreateEquipmentRequest) => {
    const schoolId = ensureSchoolId(payload.schoolId)
    ensurePositiveInt(payload.quantity, 'Quantity')

    const equipment = await recordsRepo.createEquipment({
        schoolId,
        name: payload.name.trim(),
        category: payload.category.trim(),
        quantity: payload.quantity,
        availableQuantity: payload.quantity,
        location: payload.location?.trim() || '',
        condition: payload.condition || 'good',
        status: 'active',
        notes: payload.notes?.trim() || ''
    })

    return {
        success: true,
        equipment
    }
}

export const listEquipmentService = async (query: IListEquipmentQuery) => {
    const schoolId = ensureSchoolId(query.schoolId || '')
    const equipment = await recordsRepo.listEquipment(schoolId, {
        search: query.search?.trim() || undefined,
        category: query.category?.trim() || undefined,
        status: query.status
    })

    return {
        success: true,
        equipment
    }
}

export const updateEquipmentService = async (id: string, payload: IUpdateEquipmentRequest) => {
    const equipment = await recordsRepo.findEquipmentById(id)
    if (!equipment) {
        throw new CustomError(responseMessage.NOT_FOUND('Equipment item'), 404)
    }

    const patch: Partial<{
        name: string
        category: string
        quantity: number
        availableQuantity: number
        location: string
        condition: 'new' | 'good' | 'fair' | 'damaged'
        status: 'active' | 'archived'
        notes: string
    }> = {}

    if (payload.name !== undefined) {
        patch.name = payload.name.trim()
    }
    if (payload.category !== undefined) {
        patch.category = payload.category.trim()
    }
    if (payload.location !== undefined) {
        patch.location = payload.location.trim()
    }
    if (payload.condition !== undefined) {
        patch.condition = payload.condition
    }
    if (payload.status !== undefined) {
        patch.status = payload.status
    }
    if (payload.notes !== undefined) {
        patch.notes = payload.notes.trim()
    }

    if (payload.quantity !== undefined) {
        ensureNonNegativeInt(payload.quantity, 'Quantity')
        const issuedCount = Math.max(0, equipment.quantity - equipment.availableQuantity)
        if (payload.quantity < issuedCount) {
            throw new CustomError(`Quantity cannot be less than currently issued count (${issuedCount}).`, 422)
        }
        patch.quantity = payload.quantity
        patch.availableQuantity = Math.max(0, payload.quantity - issuedCount)
    }

    const updatedEquipment = await recordsRepo.updateEquipmentById(id, patch)

    return {
        success: true,
        equipment: updatedEquipment
    }
}

export const issueEquipmentService = async (payload: IIssueEquipmentRequest) => {
    const schoolId = ensureSchoolId(payload.schoolId)
    ensurePositiveInt(payload.quantity, 'Issue quantity')
    const equipment = await recordsRepo.findEquipmentById(payload.equipmentId)

    if (!equipment || equipment.schoolId !== schoolId) {
        throw new CustomError(responseMessage.NOT_FOUND('Equipment item'), 404)
    }

    if (normalize(equipment.status) !== 'active') {
        throw new CustomError('Equipment item is archived and cannot be issued.', 422)
    }

    if (equipment.availableQuantity < payload.quantity) {
        throw new CustomError('Not enough available quantity for issue.', 422)
    }

    const dueDate = parseOptionalDate(payload.dueDate)
    if (dueDate && dueDate.getTime() < Date.now()) {
        throw new CustomError('Due date cannot be in the past.', 422)
    }

    const issue = await recordsRepo.createEquipmentIssue({
        schoolId,
        equipmentId: payload.equipmentId,
        equipmentName: equipment.name,
        borrowerType: payload.borrowerType,
        borrowerId: payload.borrowerId?.trim() || '',
        borrowerName: payload.borrowerName.trim(),
        className: payload.className?.trim() || '',
        section: payload.section?.trim() || '',
        quantity: payload.quantity,
        issuedAt: new Date(),
        dueDate,
        status: 'issued',
        notes: payload.notes?.trim() || ''
    })

    const equipmentDocId = getDocumentId(equipment, 'Equipment id')
    const updatedEquipment = await recordsRepo.updateEquipmentById(equipmentDocId, {
        availableQuantity: equipment.availableQuantity - payload.quantity
    })

    return {
        success: true,
        issue,
        equipment: updatedEquipment
    }
}

export const listEquipmentIssuesService = async (query: IListEquipmentIssuesQuery) => {
    const schoolId = ensureSchoolId(query.schoolId || '')

    const issues = await recordsRepo.listEquipmentIssues(schoolId, {
        status: query.status,
        search: query.search?.trim() || undefined
    })

    return {
        success: true,
        issues
    }
}

export const returnEquipmentIssueService = async (id: string, payload: IReturnEquipmentIssueRequest) => {
    const schoolId = ensureSchoolId(payload.schoolId)
    const issue = await recordsRepo.findEquipmentIssueById(id)
    if (!issue || issue.schoolId !== schoolId) {
        throw new CustomError(responseMessage.NOT_FOUND('Equipment issue'), 404)
    }

    if (issue.status === 'returned') {
        throw new CustomError('Equipment issue is already returned.', 422)
    }

    const issueObject = issue as unknown as Record<string, unknown>
    const issueEquipmentId = ensureStringValue(issueObject.equipmentId, 'Equipment id')
    const equipment = await recordsRepo.findEquipmentById(issueEquipmentId)
    if (!equipment || equipment.schoolId !== schoolId) {
        throw new CustomError(responseMessage.NOT_FOUND('Equipment item'), 404)
    }

    const issueDocId = getDocumentId(issue, 'Issue id')
    const updatedIssue = await recordsRepo.updateEquipmentIssueById(issueDocId, {
        status: 'returned',
        returnedAt: new Date(),
        notes: payload.notes !== undefined ? payload.notes.trim() : issue.notes
    })

    const nextAvailable = Math.min(equipment.quantity, equipment.availableQuantity + issue.quantity)
    const equipmentDocId = getDocumentId(equipment, 'Equipment id')
    const updatedEquipment = await recordsRepo.updateEquipmentById(equipmentDocId, {
        availableQuantity: nextAvailable
    })

    return {
        success: true,
        issue: updatedIssue,
        equipment: updatedEquipment
    }
}

export const createLibraryBookService = async (payload: ICreateLibraryBookRequest) => {
    const schoolId = ensureSchoolId(payload.schoolId)
    ensurePositiveInt(payload.copiesTotal, 'Copies total')

    const book = await recordsRepo.createLibraryBook({
        schoolId,
        title: payload.title.trim(),
        author: payload.author.trim(),
        isbn: payload.isbn?.trim() || '',
        category: payload.category?.trim() || '',
        shelf: payload.shelf?.trim() || '',
        copiesTotal: payload.copiesTotal,
        copiesAvailable: payload.copiesTotal,
        status: 'active',
        notes: payload.notes?.trim() || ''
    })

    return {
        success: true,
        book
    }
}

export const listLibraryBooksService = async (query: IListLibraryBooksQuery) => {
    const schoolId = ensureSchoolId(query.schoolId || '')
    const books = await recordsRepo.listLibraryBooks(schoolId, {
        search: query.search?.trim() || undefined,
        category: query.category?.trim() || undefined,
        status: query.status
    })

    return {
        success: true,
        books
    }
}

export const updateLibraryBookService = async (id: string, payload: IUpdateLibraryBookRequest) => {
    const book = await recordsRepo.findLibraryBookById(id)
    if (!book) {
        throw new CustomError(responseMessage.NOT_FOUND('Library book'), 404)
    }

    const patch: Partial<{
        title: string
        author: string
        isbn: string
        category: string
        shelf: string
        copiesTotal: number
        copiesAvailable: number
        status: 'active' | 'archived'
        notes: string
    }> = {}

    if (payload.title !== undefined) {
        patch.title = payload.title.trim()
    }
    if (payload.author !== undefined) {
        patch.author = payload.author.trim()
    }
    if (payload.isbn !== undefined) {
        patch.isbn = payload.isbn.trim()
    }
    if (payload.category !== undefined) {
        patch.category = payload.category.trim()
    }
    if (payload.shelf !== undefined) {
        patch.shelf = payload.shelf.trim()
    }
    if (payload.status !== undefined) {
        patch.status = payload.status
    }
    if (payload.notes !== undefined) {
        patch.notes = payload.notes.trim()
    }

    if (payload.copiesTotal !== undefined) {
        ensureNonNegativeInt(payload.copiesTotal, 'Copies total')
        const issuedCount = Math.max(0, book.copiesTotal - book.copiesAvailable)
        if (payload.copiesTotal < issuedCount) {
            throw new CustomError(`Copies total cannot be less than issued count (${issuedCount}).`, 422)
        }
        patch.copiesTotal = payload.copiesTotal
        patch.copiesAvailable = Math.max(0, payload.copiesTotal - issuedCount)
    }

    const updatedBook = await recordsRepo.updateLibraryBookById(id, patch)

    return {
        success: true,
        book: updatedBook
    }
}

export const issueLibraryBookService = async (payload: IIssueLibraryBookRequest) => {
    const schoolId = ensureSchoolId(payload.schoolId)
    ensurePositiveInt(payload.quantity, 'Issue quantity')
    const dueDate = parseRequiredDate(payload.dueDate, 'due date')
    if (dueDate.getTime() < Date.now()) {
        throw new CustomError('Due date cannot be in the past.', 422)
    }

    const book = await recordsRepo.findLibraryBookById(payload.bookId)
    if (!book || book.schoolId !== schoolId) {
        throw new CustomError(responseMessage.NOT_FOUND('Library book'), 404)
    }
    if (normalize(book.status) !== 'active') {
        throw new CustomError('Book is archived and cannot be issued.', 422)
    }
    if (book.copiesAvailable < payload.quantity) {
        throw new CustomError('Not enough copies available.', 422)
    }

    const loan = await recordsRepo.createLibraryLoan({
        schoolId,
        bookId: payload.bookId,
        bookTitle: book.title,
        borrowerType: payload.borrowerType,
        borrowerId: payload.borrowerId?.trim() || '',
        borrowerName: payload.borrowerName.trim(),
        className: payload.className?.trim() || '',
        section: payload.section?.trim() || '',
        quantity: payload.quantity,
        issuedAt: new Date(),
        dueDate,
        status: 'issued',
        notes: payload.notes?.trim() || ''
    })

    const bookDocId = getDocumentId(book, 'Book id')
    const updatedBook = await recordsRepo.updateLibraryBookById(bookDocId, {
        copiesAvailable: book.copiesAvailable - payload.quantity
    })

    return {
        success: true,
        loan,
        book: updatedBook
    }
}

export const listLibraryLoansService = async (query: IListLibraryLoansQuery) => {
    const schoolId = ensureSchoolId(query.schoolId || '')
    const rawStatus = query.status
    const dbStatus = rawStatus === 'overdue' ? undefined : rawStatus

    const allLoans = await recordsRepo.listLibraryLoans(schoolId, {
        status: dbStatus,
        search: query.search?.trim() || undefined
    })

    const now = new Date()
    const loans = rawStatus === 'overdue' ? allLoans.filter((loan) => loan.status === 'issued' && loan.dueDate.getTime() < now.getTime()) : allLoans

    const overdueCount = allLoans.filter((loan) => loan.status === 'issued' && loan.dueDate.getTime() < now.getTime()).length

    return {
        success: true,
        loans,
        overdueCount
    }
}

export const returnLibraryLoanService = async (id: string, payload: IReturnLibraryLoanRequest) => {
    const schoolId = ensureSchoolId(payload.schoolId)
    const loan = await recordsRepo.findLibraryLoanById(id)
    if (!loan || loan.schoolId !== schoolId) {
        throw new CustomError(responseMessage.NOT_FOUND('Library loan'), 404)
    }

    if (loan.status === 'returned') {
        throw new CustomError('Library loan is already returned.', 422)
    }

    const loanObject = loan as unknown as Record<string, unknown>
    const loanBookId = ensureStringValue(loanObject.bookId, 'Book id')
    const book = await recordsRepo.findLibraryBookById(loanBookId)
    if (!book || book.schoolId !== schoolId) {
        throw new CustomError(responseMessage.NOT_FOUND('Library book'), 404)
    }

    const loanDocId = getDocumentId(loan, 'Loan id')
    const updatedLoan = await recordsRepo.updateLibraryLoanById(loanDocId, {
        status: 'returned',
        returnedAt: new Date(),
        notes: payload.notes !== undefined ? payload.notes.trim() : loan.notes
    })

    const nextAvailable = Math.min(book.copiesTotal, book.copiesAvailable + loan.quantity)
    const bookDocId = getDocumentId(book, 'Book id')
    const updatedBook = await recordsRepo.updateLibraryBookById(bookDocId, {
        copiesAvailable: nextAvailable
    })

    return {
        success: true,
        loan: updatedLoan,
        book: updatedBook
    }
}
