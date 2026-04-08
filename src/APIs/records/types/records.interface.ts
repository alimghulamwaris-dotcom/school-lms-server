import { Request } from 'express'
import { TBorrowerType, TEquipmentCondition, TInventoryStatus } from '../_shared/types/records.interface'

export interface ICreateEquipmentRequest {
    schoolId: string
    name: string
    category: string
    quantity: number
    location?: string
    condition?: TEquipmentCondition
    notes?: string
}

export interface IUpdateEquipmentRequest {
    name?: string
    category?: string
    quantity?: number
    location?: string
    condition?: TEquipmentCondition
    status?: TInventoryStatus
    notes?: string
}

export interface IIssueEquipmentRequest {
    schoolId: string
    equipmentId: string
    borrowerType: TBorrowerType
    borrowerId?: string
    borrowerName: string
    className?: string
    section?: string
    quantity: number
    dueDate?: string
    notes?: string
}

export interface IReturnEquipmentIssueRequest {
    schoolId: string
    notes?: string
}

export interface IListEquipmentQuery {
    schoolId?: string
    search?: string
    category?: string
    status?: 'active' | 'archived'
}

export interface IListEquipmentIssuesQuery {
    schoolId?: string
    search?: string
    status?: 'issued' | 'returned'
}

export interface ICreateLibraryBookRequest {
    schoolId: string
    title: string
    author: string
    isbn?: string
    category?: string
    shelf?: string
    copiesTotal: number
    notes?: string
}

export interface IUpdateLibraryBookRequest {
    title?: string
    author?: string
    isbn?: string
    category?: string
    shelf?: string
    copiesTotal?: number
    status?: TInventoryStatus
    notes?: string
}

export interface IIssueLibraryBookRequest {
    schoolId: string
    bookId: string
    borrowerType: TBorrowerType
    borrowerId?: string
    borrowerName: string
    className?: string
    section?: string
    quantity: number
    dueDate: string
    notes?: string
}

export interface IReturnLibraryLoanRequest {
    schoolId: string
    notes?: string
}

export interface IListLibraryBooksQuery {
    schoolId?: string
    search?: string
    category?: string
    status?: 'active' | 'archived'
}

export interface IListLibraryLoansQuery {
    schoolId?: string
    search?: string
    status?: 'issued' | 'returned' | 'overdue'
}

export interface ICreateEquipment extends Request {
    body: ICreateEquipmentRequest
}

export interface IUpdateEquipment extends Request {
    params: { id: string }
    body: IUpdateEquipmentRequest
}

export interface IIssueEquipment extends Request {
    body: IIssueEquipmentRequest
}

export interface IReturnEquipmentIssue extends Request {
    params: { id: string }
    body: IReturnEquipmentIssueRequest
}

export interface ICreateLibraryBook extends Request {
    body: ICreateLibraryBookRequest
}

export interface IUpdateLibraryBook extends Request {
    params: { id: string }
    body: IUpdateLibraryBookRequest
}

export interface IIssueLibraryBook extends Request {
    body: IIssueLibraryBookRequest
}

export interface IReturnLibraryLoan extends Request {
    params: { id: string }
    body: IReturnLibraryLoanRequest
}
