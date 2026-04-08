import joi from 'joi'
import {
    ICreateEquipmentRequest,
    ICreateLibraryBookRequest,
    IIssueEquipmentRequest,
    IIssueLibraryBookRequest,
    IReturnEquipmentIssueRequest,
    IReturnLibraryLoanRequest,
    IUpdateEquipmentRequest,
    IUpdateLibraryBookRequest
} from '../types/records.interface'

const borrowerType = joi.string().valid('student', 'staff', 'other')

export const createEquipmentSchema = joi.object<ICreateEquipmentRequest, true>({
    schoolId: joi.string().required(),
    name: joi.string().min(2).max(160).required(),
    category: joi.string().min(2).max(120).required(),
    quantity: joi.number().integer().min(1).required(),
    location: joi.string().allow('').max(160).optional(),
    condition: joi.string().valid('new', 'good', 'fair', 'damaged').optional(),
    notes: joi.string().allow('').max(600).optional()
})

export const updateEquipmentSchema = joi.object<IUpdateEquipmentRequest, true>({
    name: joi.string().min(2).max(160).optional(),
    category: joi.string().min(2).max(120).optional(),
    quantity: joi.number().integer().min(0).optional(),
    location: joi.string().allow('').max(160).optional(),
    condition: joi.string().valid('new', 'good', 'fair', 'damaged').optional(),
    status: joi.string().valid('active', 'archived').optional(),
    notes: joi.string().allow('').max(600).optional()
})

export const issueEquipmentSchema = joi.object<IIssueEquipmentRequest, true>({
    schoolId: joi.string().required(),
    equipmentId: joi.string().required(),
    borrowerType: borrowerType.required(),
    borrowerId: joi.string().allow('').optional(),
    borrowerName: joi.string().min(2).max(160).required(),
    className: joi.string().allow('').max(80).optional(),
    section: joi.string().allow('').max(20).optional(),
    quantity: joi.number().integer().min(1).required(),
    dueDate: joi.string().isoDate().optional(),
    notes: joi.string().allow('').max(600).optional()
})

export const returnEquipmentIssueSchema = joi.object<IReturnEquipmentIssueRequest, true>({
    schoolId: joi.string().required(),
    notes: joi.string().allow('').max(600).optional()
})

export const createLibraryBookSchema = joi.object<ICreateLibraryBookRequest, true>({
    schoolId: joi.string().required(),
    title: joi.string().min(2).max(200).required(),
    author: joi.string().min(2).max(140).required(),
    isbn: joi.string().allow('').max(60).optional(),
    category: joi.string().allow('').max(120).optional(),
    shelf: joi.string().allow('').max(120).optional(),
    copiesTotal: joi.number().integer().min(1).required(),
    notes: joi.string().allow('').max(600).optional()
})

export const updateLibraryBookSchema = joi.object<IUpdateLibraryBookRequest, true>({
    title: joi.string().min(2).max(200).optional(),
    author: joi.string().min(2).max(140).optional(),
    isbn: joi.string().allow('').max(60).optional(),
    category: joi.string().allow('').max(120).optional(),
    shelf: joi.string().allow('').max(120).optional(),
    copiesTotal: joi.number().integer().min(0).optional(),
    status: joi.string().valid('active', 'archived').optional(),
    notes: joi.string().allow('').max(600).optional()
})

export const issueLibraryBookSchema = joi.object<IIssueLibraryBookRequest, true>({
    schoolId: joi.string().required(),
    bookId: joi.string().required(),
    borrowerType: borrowerType.required(),
    borrowerId: joi.string().allow('').optional(),
    borrowerName: joi.string().min(2).max(160).required(),
    className: joi.string().allow('').max(80).optional(),
    section: joi.string().allow('').max(20).optional(),
    quantity: joi.number().integer().min(1).required(),
    dueDate: joi.string().isoDate().required(),
    notes: joi.string().allow('').max(600).optional()
})

export const returnLibraryLoanSchema = joi.object<IReturnLibraryLoanRequest, true>({
    schoolId: joi.string().required(),
    notes: joi.string().allow('').max(600).optional()
})
