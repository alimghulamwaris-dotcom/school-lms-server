import { Types } from 'mongoose'
import responseMessage from '../../constant/responseMessage'
import { CustomError } from '../../utils/errors'
import admissionRepo from '../admissions/_shared/repo/admission.repository'
import studentRepo from '../students/_shared/repo/student.repository'
import feesRepo from './_shared/repo/fees.repository'
import {
    IBulkGenerateFeeInvoicesRequest,
    ICreateFeeExpenseRequest,
    ICreateFeeInvoiceRequest,
    ICreateFeeReminderRequest,
    ICreateFeeSlipRequest,
    IRecordInvoicePaymentRequest,
    IUpdateFeeExpenseRequest,
    IUpdateFeeInvoiceRequest
} from './types/fees.interface'

const normalize = (value: string) => value.trim().toLowerCase()
const normalizeSection = (value?: string) => (value ? value.trim().toUpperCase() : '')

type TVoucherCandidate = {
    studentId: string | null
    grNumber: string
    studentName: string
    guardianName: string
    guardianPhone: string
    className: string
    section: string
    status: string
    feeAmount: number
}

const parsePositiveAmount = (value: number | undefined, fallback: number = 0) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return fallback
    }
    return value < 0 ? fallback : value
}

const parseMonthToken = (value?: string) => {
    if (!value) return null
    const [yearPart, monthPart] = value.split('-')
    const year = Number(yearPart)
    const month = Number(monthPart)
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
        return null
    }
    return { year, month }
}

const getMonthRangeDates = (monthToken?: string, fromMonthToken?: string, toMonthToken?: string) => {
    if (monthToken) {
        const parsed = parseMonthToken(monthToken)
        if (!parsed) {
            throw new CustomError('Invalid month. Use YYYY-MM format.', 422)
        }
        const startDate = new Date(parsed.year, parsed.month - 1, 1, 0, 0, 0, 0)
        const endDate = new Date(parsed.year, parsed.month, 0, 23, 59, 59, 999)
        return { startDate, endDate }
    }

    const from = parseMonthToken(fromMonthToken)
    const to = parseMonthToken(toMonthToken)

    if (!from && !to) {
        return { startDate: undefined, endDate: undefined }
    }
    if (fromMonthToken && !from) {
        throw new CustomError('Invalid fromMonth. Use YYYY-MM format.', 422)
    }
    if (toMonthToken && !to) {
        throw new CustomError('Invalid toMonth. Use YYYY-MM format.', 422)
    }

    const startDate = from ? new Date(from.year, from.month - 1, 1, 0, 0, 0, 0) : undefined
    const endDate = to ? new Date(to.year, to.month, 0, 23, 59, 59, 999) : undefined

    if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
        throw new CustomError('fromMonth cannot be greater than toMonth.', 422)
    }

    return { startDate, endDate }
}

const formatInvoiceNumber = (year: number, sequence: number) => {
    return `INV-${year}-${String(sequence).padStart(5, '0')}`
}

const parseInvoiceDates = (issueDateInput: string | undefined, dueDateInput: string) => {
    const issueDate = issueDateInput ? new Date(issueDateInput) : new Date()
    const dueDate = new Date(dueDateInput)

    if (Number.isNaN(issueDate.getTime()) || Number.isNaN(dueDate.getTime())) {
        throw new CustomError('Invalid issue date or due date.', 422)
    }

    return {
        issueDate,
        dueDate
    }
}

const cleanInvoiceItems = (items: { label: string; amount: number }[]) => {
    const cleanedItems = items
        .map((item) => ({
            label: item.label.trim(),
            amount: parsePositiveAmount(item.amount)
        }))
        .filter((item) => item.label.length > 0)

    if (cleanedItems.length === 0) {
        throw new CustomError('At least one invoice item is required.', 422)
    }

    return cleanedItems
}

const calculateTotals = (items: { label: string; amount: number }[], discount: number, lateFee: number, paidAmount: number) => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
    const totalAmount = Math.max(0, subtotal - discount + lateFee)
    const normalizedPaidAmount = Math.max(0, Math.min(totalAmount, paidAmount))
    const balanceAmount = Math.max(0, totalAmount - normalizedPaidAmount)

    let status: 'pending' | 'partially_paid' | 'paid' = 'pending'
    if (normalizedPaidAmount > 0 && balanceAmount > 0) {
        status = 'partially_paid'
    }
    if (balanceAmount === 0) {
        status = 'paid'
    }

    return {
        subtotal,
        totalAmount,
        paidAmount: normalizedPaidAmount,
        balanceAmount,
        status
    }
}

const mapStudentToCandidate = (student: {
    _id?: string | Types.ObjectId
    grNumber: string
    name: string
    guardianName: string
    guardianPhone: string
    className: string
    section?: string
    status?: string
    feeAmount?: number
}): TVoucherCandidate => {
    return {
        studentId: student._id ? (typeof student._id === 'string' ? student._id : student._id.toHexString()) : null,
        grNumber: student.grNumber,
        studentName: student.name,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        className: student.className,
        section: normalizeSection(student.section),
        status: student.status || 'active',
        feeAmount: student.feeAmount || 0
    }
}

const mapAdmissionToCandidate = (admission: {
    _id?: unknown
    grNumber: string
    name: string
    guardianName: string
    guardianPhone: string
    className: string
    section?: string
    status?: string
    feeAmount?: number
}): TVoucherCandidate => {
    return {
        studentId: null,
        grNumber: admission.grNumber,
        studentName: admission.name,
        guardianName: admission.guardianName,
        guardianPhone: admission.guardianPhone,
        className: admission.className,
        section: normalizeSection(admission.section),
        status: admission.status || 'pending',
        feeAmount: admission.feeAmount || 0
    }
}

const isCandidateStatusAllowed = (status: string) => {
    const normalized = normalize(status)
    return normalized !== 'inactive' && normalized !== 'transferred'
}

const getVoucherCandidates = async (schoolId: string, className?: string, section?: string): Promise<TVoucherCandidate[]> => {
    const [students, admissions] = await Promise.all([
        studentRepo.findStudentsByFilters(schoolId, {
            className: className || undefined,
            section: section || undefined
        }),
        admissionRepo.findAdmissionsBySchool(schoolId)
    ])

    const byGr = new Map<string, TVoucherCandidate>()

    for (const student of students) {
        const candidate = mapStudentToCandidate(student)
        if (!isCandidateStatusAllowed(candidate.status)) {
            continue
        }
        byGr.set(candidate.grNumber, candidate)
    }

    const normalizedClass = normalize(className || '')
    const normalizedSection = normalize(section || '')

    for (const admission of admissions) {
        const candidate = mapAdmissionToCandidate(admission)
        if (byGr.has(candidate.grNumber)) {
            continue
        }

        if (normalizedClass && normalize(candidate.className) !== normalizedClass) {
            continue
        }
        if (normalizedSection && normalize(candidate.section) !== normalizedSection) {
            continue
        }
        if (!isCandidateStatusAllowed(candidate.status)) {
            continue
        }

        byGr.set(candidate.grNumber, candidate)
    }

    return Array.from(byGr.values())
}

const resolveStudentByGr = async (schoolId: string, grNumber: string) => {
    const candidates = await getVoucherCandidates(schoolId)
    const candidate = candidates.find((item) => item.grNumber === grNumber)

    if (!candidate) {
        throw new CustomError(responseMessage.NOT_FOUND('Student'), 404)
    }

    return candidate
}

const assertInvoiceDoesNotExistForMonth = async (schoolId: string, month: string, grNumber: string) => {
    const existing = await feesRepo.findInvoicesBySchoolMonthAndGrNumbers(schoolId, month, [grNumber])
    if (existing.length > 0) {
        throw new CustomError(`Invoice already exists for GR ${grNumber} in month ${month}.`, 422)
    }
}

export const createFeeReminderService = async (payload: ICreateFeeReminderRequest) => {
    const reminder = await feesRepo.createReminder({
        schoolId: payload.schoolId,
        className: payload.className,
        month: payload.month,
        dueDate: new Date(payload.dueDate),
        includeLateFee: payload.includeLateFee,
        sendTime: payload.sendTime,
        message: payload.message,
        status: payload.status || 'scheduled'
    })

    return {
        success: true,
        reminder
    }
}

export const listFeeRemindersService = async (schoolId: string) => {
    const reminders = await feesRepo.listReminders(schoolId)
    return {
        success: true,
        reminders
    }
}

export const createFeeSlipService = async (payload: ICreateFeeSlipRequest) => {
    const slip = await feesRepo.createSlip({
        schoolId: payload.schoolId,
        className: payload.className,
        month: payload.month,
        paperSize: payload.paperSize,
        copies: payload.copies,
        includeTransport: payload.includeTransport,
        showDiscounts: payload.showDiscounts
    })

    return {
        success: true,
        slip
    }
}

export const listFeeSlipsService = async (schoolId: string) => {
    const slips = await feesRepo.listSlips(schoolId)
    return {
        success: true,
        slips
    }
}

export const createFeeInvoiceService = async (payload: ICreateFeeInvoiceRequest) => {
    const student = await resolveStudentByGr(payload.schoolId, payload.grNumber)
    await assertInvoiceDoesNotExistForMonth(payload.schoolId, payload.month, payload.grNumber)

    const currentYear = new Date().getFullYear()
    const { start } = await feesRepo.getNextInvoiceSequence(payload.schoolId, currentYear, 1)
    const invoiceNumber = formatInvoiceNumber(currentYear, start)

    const { issueDate, dueDate } = parseInvoiceDates(payload.issueDate, payload.dueDate)
    const cleanedItems = cleanInvoiceItems(payload.items)
    const invoiceItems = [
        { label: 'Tuition Fee', amount: student.feeAmount || 0 },
        ...cleanedItems.filter((item) => normalize(item.label) !== 'tuition fee')
    ]

    const discount = parsePositiveAmount(payload.discount, 0)
    const lateFee = parsePositiveAmount(payload.lateFee, 0)
    const totals = calculateTotals(invoiceItems, discount, lateFee, 0)

    const invoice = await feesRepo.createInvoice({
        schoolId: payload.schoolId,
        invoiceNumber,
        studentId: student.studentId,
        grNumber: payload.grNumber,
        studentName: student.studentName,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        className: student.className,
        section: student.section,
        month: payload.month,
        issueDate,
        dueDate,
        items: invoiceItems,
        subtotal: totals.subtotal,
        discount,
        lateFee,
        totalAmount: totals.totalAmount,
        paidAmount: totals.paidAmount,
        balanceAmount: totals.balanceAmount,
        status: totals.status,
        notes: payload.notes || '',
        paymentHistory: []
    })

    return {
        success: true,
        invoice
    }
}

export const bulkGenerateFeeInvoicesService = async (payload: IBulkGenerateFeeInvoicesRequest) => {
    const candidates = await getVoucherCandidates(payload.schoolId, payload.className, payload.section)

    if (candidates.length === 0) {
        throw new CustomError('No students found for selected class/section.', 422)
    }

    const grNumbers = candidates.map((candidate) => candidate.grNumber)
    const existingInvoices = await feesRepo.findInvoicesBySchoolMonthAndGrNumbers(payload.schoolId, payload.month, grNumbers)
    const existingGrSet = new Set(existingInvoices.map((invoice) => invoice.grNumber))

    const invoiceCandidates = candidates.filter((candidate) => !existingGrSet.has(candidate.grNumber))

    if (invoiceCandidates.length === 0) {
        return {
            success: true,
            summary: {
                totalCandidates: candidates.length,
                createdCount: 0,
                skippedCount: existingGrSet.size,
                skippedGrNumbers: Array.from(existingGrSet)
            },
            invoices: []
        }
    }

    const cleanedItems = cleanInvoiceItems(payload.items)
    const discount = parsePositiveAmount(payload.discount, 0)
    const lateFee = parsePositiveAmount(payload.lateFee, 0)
    const { issueDate, dueDate } = parseInvoiceDates(payload.issueDate, payload.dueDate)

    const currentYear = new Date().getFullYear()
    const { start } = await feesRepo.getNextInvoiceSequence(payload.schoolId, currentYear, invoiceCandidates.length)

    const invoicePayloads = invoiceCandidates.map((candidate, idx) => {
        const candidateItems = [
            { label: 'Tuition Fee', amount: candidate.feeAmount || 0 },
            ...cleanedItems.filter((item) => normalize(item.label) !== 'tuition fee')
        ]
        const candidateTotals = calculateTotals(candidateItems, discount, lateFee, 0)
        const invoiceNumber = formatInvoiceNumber(currentYear, start + idx)

        return {
            schoolId: payload.schoolId,
            invoiceNumber,
            studentId: candidate.studentId,
            grNumber: candidate.grNumber,
            studentName: candidate.studentName,
            guardianName: candidate.guardianName,
            guardianPhone: candidate.guardianPhone,
            className: candidate.className,
            section: candidate.section,
            month: payload.month,
            issueDate,
            dueDate,
            items: candidateItems,
            subtotal: candidateTotals.subtotal,
            discount,
            lateFee,
            totalAmount: candidateTotals.totalAmount,
            paidAmount: candidateTotals.paidAmount,
            balanceAmount: candidateTotals.balanceAmount,
            status: candidateTotals.status,
            notes: payload.notes || '',
            paymentHistory: []
        }
    })

    const createdInvoices = await feesRepo.createInvoices(invoicePayloads)

    return {
        success: true,
        summary: {
            totalCandidates: candidates.length,
            createdCount: createdInvoices.length,
            skippedCount: existingGrSet.size,
            skippedGrNumbers: Array.from(existingGrSet)
        },
        invoices: createdInvoices
    }
}

export const listFeeInvoicesService = async (
    schoolId: string,
    filters: {
        month?: string
        className?: string
        section?: string
        status?: string
        search?: string
    }
) => {
    const invoices = await feesRepo.listInvoicesByFilters(schoolId, filters)
    return {
        success: true,
        invoices
    }
}

export const getFeeInvoiceService = async (id: string) => {
    const invoice = await feesRepo.findInvoiceById(id)
    if (!invoice) {
        throw new CustomError(responseMessage.NOT_FOUND('Invoice'), 404)
    }

    return {
        success: true,
        invoice
    }
}

export const updateFeeInvoiceService = async (id: string, payload: IUpdateFeeInvoiceRequest) => {
    const invoice = await feesRepo.findInvoiceById(id)
    if (!invoice) {
        throw new CustomError(responseMessage.NOT_FOUND('Invoice'), 404)
    }

    const issueDate = payload.issueDate ? new Date(payload.issueDate) : invoice.issueDate
    const dueDate = payload.dueDate ? new Date(payload.dueDate) : invoice.dueDate

    if (Number.isNaN(issueDate.getTime()) || Number.isNaN(dueDate.getTime())) {
        throw new CustomError('Invalid issue date or due date.', 422)
    }

    const items = payload.items ? cleanInvoiceItems(payload.items) : invoice.items
    const discount = payload.discount !== undefined ? parsePositiveAmount(payload.discount, 0) : invoice.discount
    const lateFee = payload.lateFee !== undefined ? parsePositiveAmount(payload.lateFee, 0) : invoice.lateFee
    const totals = calculateTotals(items, discount, lateFee, invoice.paidAmount)

    const updatedInvoice = await feesRepo.updateInvoiceById(id, {
        month: payload.month || invoice.month,
        issueDate,
        dueDate,
        items,
        subtotal: totals.subtotal,
        discount,
        lateFee,
        totalAmount: totals.totalAmount,
        paidAmount: totals.paidAmount,
        balanceAmount: totals.balanceAmount,
        status: totals.status,
        notes: payload.notes !== undefined ? payload.notes : invoice.notes
    })

    return {
        success: true,
        invoice: updatedInvoice
    }
}

export const recordFeeInvoicePaymentService = async (id: string, payload: IRecordInvoicePaymentRequest) => {
    const invoice = await feesRepo.findInvoiceById(id)
    if (!invoice) {
        throw new CustomError(responseMessage.NOT_FOUND('Invoice'), 404)
    }

    const amount = parsePositiveAmount(payload.amount, 0)
    if (amount <= 0) {
        throw new CustomError('Payment amount must be greater than zero.', 422)
    }
    if (amount > invoice.balanceAmount) {
        throw new CustomError('Payment amount cannot exceed invoice balance.', 422)
    }

    let paidAt = new Date()
    if (payload.paidAt) {
        const rawDate = typeof payload.paidAt === 'string' ? payload.paidAt.trim() : payload.paidAt
        const isDateOnly = typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
        if (isDateOnly) {
            const [year, month, day] = rawDate.split('-').map(Number)
            const now = new Date()
            paidAt = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds())
        } else {
            paidAt = new Date(rawDate)
        }

        if (Number.isNaN(paidAt.getTime())) {
            throw new CustomError('Invalid payment date.', 422)
        }
    }

    const paymentHistory = [
        ...(invoice.paymentHistory || []),
        {
            amount,
            paidAt,
            method: payload.method,
            reference: payload.reference || '',
            note: payload.note || ''
        }
    ]

    const totals = calculateTotals(invoice.items, invoice.discount, invoice.lateFee, invoice.paidAmount + amount)

    const updatedInvoice = await feesRepo.updateInvoiceById(id, {
        paidAmount: totals.paidAmount,
        balanceAmount: totals.balanceAmount,
        status: totals.status,
        paymentHistory
    })

    return {
        success: true,
        invoice: updatedInvoice
    }
}

type TFeeReportFilters = {
    month?: string
    fromMonth?: string
    toMonth?: string
    className?: string
    section?: string
    status?: string
    category?: string
    search?: string
}

type TProfitLossMonthlyRow = {
    month: string
    billed: number
    collected: number
    pending: number
    expenses: number
    netProfit: number
}

type TExpenseCategoryRow = {
    category: string
    totalAmount: number
    count: number
}

const getMonthKeyFromDate = (value: Date) => {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
}

const isInDateRange = (value: Date, startDate?: Date, endDate?: Date) => {
    const time = value.getTime()
    if (Number.isNaN(time)) return false
    if (startDate && time < startDate.getTime()) return false
    if (endDate && time > endDate.getTime()) return false
    return true
}

export const createFeeExpenseService = async (payload: ICreateFeeExpenseRequest) => {
    const spentAt = new Date(payload.spentAt)
    if (Number.isNaN(spentAt.getTime())) {
        throw new CustomError('Invalid expense date.', 422)
    }

    const expense = await feesRepo.createExpense({
        schoolId: payload.schoolId,
        title: payload.title.trim(),
        category: payload.category?.trim() || 'General',
        amount: parsePositiveAmount(payload.amount),
        spentAt,
        paymentMode: payload.paymentMode?.trim() || 'cash',
        reference: payload.reference?.trim() || '',
        notes: payload.notes?.trim() || '',
        status: 'active'
    })

    return {
        success: true,
        expense
    }
}

export const listFeeExpensesService = async (
    schoolId: string,
    filters: {
        month?: string
        fromMonth?: string
        toMonth?: string
        category?: string
        status?: string
        search?: string
    }
) => {
    const { startDate, endDate } = getMonthRangeDates(filters.month, filters.fromMonth, filters.toMonth)
    const expenses = await feesRepo.listExpensesByFilters(schoolId, {
        category: filters.category,
        status: filters.status,
        search: filters.search,
        startDate,
        endDate
    })

    return {
        success: true,
        expenses
    }
}

export const updateFeeExpenseService = async (id: string, payload: IUpdateFeeExpenseRequest) => {
    const existingExpense = await feesRepo.findExpenseById(id)
    if (!existingExpense) {
        throw new CustomError(responseMessage.NOT_FOUND('Expense'), 404)
    }

    const patch: Partial<{
        title: string
        category: string
        amount: number
        spentAt: Date
        paymentMode: string
        reference: string
        notes: string
        status: 'active' | 'archived'
    }> = {}

    if (payload.title !== undefined) {
        patch.title = payload.title.trim()
    }
    if (payload.category !== undefined) {
        patch.category = payload.category.trim() || 'General'
    }
    if (payload.amount !== undefined) {
        patch.amount = parsePositiveAmount(payload.amount)
    }
    if (payload.spentAt !== undefined) {
        const date = new Date(payload.spentAt)
        if (Number.isNaN(date.getTime())) {
            throw new CustomError('Invalid expense date.', 422)
        }
        patch.spentAt = date
    }
    if (payload.paymentMode !== undefined) {
        patch.paymentMode = payload.paymentMode.trim() || 'cash'
    }
    if (payload.reference !== undefined) {
        patch.reference = payload.reference.trim()
    }
    if (payload.notes !== undefined) {
        patch.notes = payload.notes.trim()
    }
    if (payload.status !== undefined) {
        patch.status = payload.status
    }

    const expense = await feesRepo.updateExpenseById(id, patch)

    return {
        success: true,
        expense
    }
}

export const getProfitLossReportService = async (schoolId: string, filters: TFeeReportFilters) => {
    const { startDate, endDate } = getMonthRangeDates(filters.month, filters.fromMonth, filters.toMonth)

    const invoices = await feesRepo.listInvoicesByFilters(schoolId, {
        month: filters.month,
        className: filters.className,
        section: filters.section,
        status: filters.status,
        search: filters.search
    })

    const filteredInvoices =
        startDate || endDate ? invoices.filter((invoice) => isInDateRange(new Date(invoice.issueDate), startDate, endDate)) : invoices

    const expenses = await feesRepo.listExpensesByFilters(schoolId, {
        category: filters.category,
        search: filters.search,
        status: 'active',
        startDate,
        endDate
    })

    const summary = {
        billedAmount: 0,
        collectedAmount: 0,
        pendingAmount: 0,
        expensesAmount: 0,
        netProfit: 0,
        invoicesCount: filteredInvoices.length,
        expensesCount: expenses.length
    }

    const monthlyMap = new Map<string, TProfitLossMonthlyRow>()
    const expenseCategoryMap = new Map<string, TExpenseCategoryRow>()

    for (const invoice of filteredInvoices) {
        summary.billedAmount += invoice.totalAmount
        summary.collectedAmount += invoice.paidAmount
        summary.pendingAmount += invoice.balanceAmount

        const monthKey = invoice.month || getMonthKeyFromDate(new Date(invoice.issueDate))
        const row = monthlyMap.get(monthKey) || {
            month: monthKey,
            billed: 0,
            collected: 0,
            pending: 0,
            expenses: 0,
            netProfit: 0
        }
        row.billed += invoice.totalAmount
        row.collected += invoice.paidAmount
        row.pending += invoice.balanceAmount
        monthlyMap.set(monthKey, row)
    }

    for (const expense of expenses) {
        summary.expensesAmount += expense.amount

        const monthKey = getMonthKeyFromDate(new Date(expense.spentAt))
        const row = monthlyMap.get(monthKey) || {
            month: monthKey,
            billed: 0,
            collected: 0,
            pending: 0,
            expenses: 0,
            netProfit: 0
        }
        row.expenses += expense.amount
        monthlyMap.set(monthKey, row)

        const categoryKey = expense.category || 'General'
        const categoryRow = expenseCategoryMap.get(categoryKey) || {
            category: categoryKey,
            totalAmount: 0,
            count: 0
        }
        categoryRow.totalAmount += expense.amount
        categoryRow.count += 1
        expenseCategoryMap.set(categoryKey, categoryRow)
    }

    summary.netProfit = summary.collectedAmount - summary.expensesAmount

    const monthlyRows = Array.from(monthlyMap.values())
        .map((row) => ({
            ...row,
            netProfit: row.collected - row.expenses
        }))
        .sort((a, b) => a.month.localeCompare(b.month))

    const expenseCategoryRows = Array.from(expenseCategoryMap.values()).sort((a, b) => b.totalAmount - a.totalAmount)

    return {
        success: true,
        summary,
        monthlyRows,
        expenseCategoryRows
    }
}

type TClassWiseReportRow = {
    className: string
    section: string
    totalVouchers: number
    studentsCount: number
    paidCount: number
    pendingCount: number
    partiallyPaidCount: number
    totalBilled: number
    totalCollected: number
    totalPending: number
}

type TStudentWiseReportRow = {
    studentId: string
    grNumber: string
    studentName: string
    guardianName: string
    className: string
    section: string
    totalVouchers: number
    paidCount: number
    pendingCount: number
    partiallyPaidCount: number
    totalBilled: number
    totalCollected: number
    totalPending: number
    latestMonth: string
    latestInvoiceNumber: string
}

const emptySummary = () => ({
    totalVouchers: 0,
    paidCount: 0,
    pendingCount: 0,
    partiallyPaidCount: 0,
    totalBilled: 0,
    totalCollected: 0,
    totalPending: 0
})

const applyInvoiceToSummary = (
    summary: ReturnType<typeof emptySummary>,
    invoice: {
        status: 'pending' | 'partially_paid' | 'paid'
        totalAmount: number
        paidAmount: number
        balanceAmount: number
    }
) => {
    summary.totalVouchers += 1
    if (invoice.status === 'paid') {
        summary.paidCount += 1
    } else if (invoice.status === 'partially_paid') {
        summary.partiallyPaidCount += 1
    } else {
        summary.pendingCount += 1
    }
    summary.totalBilled += invoice.totalAmount
    summary.totalCollected += invoice.paidAmount
    summary.totalPending += invoice.balanceAmount
}

export const getClassWiseFeeReportService = async (schoolId: string, filters: TFeeReportFilters) => {
    const { startDate, endDate } = getMonthRangeDates(filters.month, filters.fromMonth, filters.toMonth)
    const invoicesRaw = await feesRepo.listInvoicesByFilters(schoolId, filters)
    const invoices =
        startDate || endDate ? invoicesRaw.filter((invoice) => isInDateRange(new Date(invoice.issueDate), startDate, endDate)) : invoicesRaw

    const classMap = new Map<
        string,
        TClassWiseReportRow & {
            studentSet: Set<string>
        }
    >()

    const summary = emptySummary()

    for (const invoice of invoices) {
        const rowKey = `${invoice.className}__${invoice.section || ''}`

        const existing = classMap.get(rowKey)
        if (existing) {
            applyInvoiceToSummary(existing, invoice)
            existing.studentSet.add(invoice.grNumber || invoice.studentId || invoice.studentName)
        } else {
            const row: TClassWiseReportRow & { studentSet: Set<string> } = {
                className: invoice.className,
                section: invoice.section || '',
                totalVouchers: 0,
                studentsCount: 0,
                paidCount: 0,
                pendingCount: 0,
                partiallyPaidCount: 0,
                totalBilled: 0,
                totalCollected: 0,
                totalPending: 0,
                studentSet: new Set<string>()
            }
            applyInvoiceToSummary(row, invoice)
            row.studentSet.add(invoice.grNumber || invoice.studentId || invoice.studentName)
            classMap.set(rowKey, row)
        }

        applyInvoiceToSummary(summary, invoice)
    }

    const rows = Array.from(classMap.values())
        .map((row) => ({
            className: row.className,
            section: row.section,
            totalVouchers: row.totalVouchers,
            studentsCount: row.studentSet.size,
            paidCount: row.paidCount,
            pendingCount: row.pendingCount,
            partiallyPaidCount: row.partiallyPaidCount,
            totalBilled: row.totalBilled,
            totalCollected: row.totalCollected,
            totalPending: row.totalPending
        }))
        .sort((a, b) => {
            if (a.className === b.className) {
                return a.section.localeCompare(b.section)
            }
            return a.className.localeCompare(b.className, undefined, { numeric: true, sensitivity: 'base' })
        })

    return {
        success: true,
        summary,
        rows
    }
}

export const getStudentWiseFeeReportService = async (schoolId: string, filters: TFeeReportFilters) => {
    const { startDate, endDate } = getMonthRangeDates(filters.month, filters.fromMonth, filters.toMonth)
    const invoicesRaw = await feesRepo.listInvoicesByFilters(schoolId, filters)
    const invoices =
        startDate || endDate ? invoicesRaw.filter((invoice) => isInDateRange(new Date(invoice.issueDate), startDate, endDate)) : invoicesRaw

    const studentMap = new Map<
        string,
        TStudentWiseReportRow & {
            latestIssueAt: number
        }
    >()

    const summary = emptySummary()

    for (const invoice of invoices) {
        const rowKey = invoice.grNumber || invoice.studentId || invoice.studentName
        const issueDate = new Date(invoice.issueDate).getTime()
        const normalizedIssueDate = Number.isNaN(issueDate) ? 0 : issueDate
        const existing = studentMap.get(rowKey)

        if (existing) {
            applyInvoiceToSummary(existing, invoice)
            if (normalizedIssueDate >= existing.latestIssueAt) {
                existing.latestIssueAt = normalizedIssueDate
                existing.latestMonth = invoice.month
                existing.latestInvoiceNumber = invoice.invoiceNumber
                existing.className = invoice.className
                existing.section = invoice.section || ''
            }
        } else {
            const row: TStudentWiseReportRow & { latestIssueAt: number } = {
                studentId: invoice.studentId || '',
                grNumber: invoice.grNumber,
                studentName: invoice.studentName,
                guardianName: invoice.guardianName,
                className: invoice.className,
                section: invoice.section || '',
                totalVouchers: 0,
                paidCount: 0,
                pendingCount: 0,
                partiallyPaidCount: 0,
                totalBilled: 0,
                totalCollected: 0,
                totalPending: 0,
                latestMonth: invoice.month,
                latestInvoiceNumber: invoice.invoiceNumber,
                latestIssueAt: normalizedIssueDate
            }
            applyInvoiceToSummary(row, invoice)
            studentMap.set(rowKey, row)
        }

        applyInvoiceToSummary(summary, invoice)
    }

    const rows = Array.from(studentMap.values())
        .map((row) => ({
            studentId: row.studentId,
            grNumber: row.grNumber,
            studentName: row.studentName,
            guardianName: row.guardianName,
            className: row.className,
            section: row.section,
            totalVouchers: row.totalVouchers,
            paidCount: row.paidCount,
            pendingCount: row.pendingCount,
            partiallyPaidCount: row.partiallyPaidCount,
            totalBilled: row.totalBilled,
            totalCollected: row.totalCollected,
            totalPending: row.totalPending,
            latestMonth: row.latestMonth,
            latestInvoiceNumber: row.latestInvoiceNumber
        }))
        .sort((a, b) => {
            if (a.className === b.className && a.section === b.section) {
                return a.studentName.localeCompare(b.studentName)
            }
            if (a.className === b.className) {
                return a.section.localeCompare(b.section)
            }
            return a.className.localeCompare(b.className, undefined, { numeric: true, sensitivity: 'base' })
        })

    return {
        success: true,
        summary,
        rows
    }
}
