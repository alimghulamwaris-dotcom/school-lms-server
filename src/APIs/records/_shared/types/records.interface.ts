export type TEquipmentCondition = 'new' | 'good' | 'fair' | 'damaged'
export type TInventoryStatus = 'active' | 'archived'
export type TBorrowerType = 'student' | 'staff' | 'other'
export type TIssueStatus = 'issued' | 'returned'

export interface IEquipment {
    schoolId: string
    name: string
    category: string
    quantity: number
    availableQuantity: number
    location: string
    condition: TEquipmentCondition
    status: TInventoryStatus
    notes: string
}

export interface IEquipmentIssue {
    schoolId: string
    equipmentId: string
    equipmentName: string
    borrowerType: TBorrowerType
    borrowerId?: string
    borrowerName: string
    className?: string
    section?: string
    quantity: number
    issuedAt: Date
    dueDate?: Date
    status: TIssueStatus
    returnedAt?: Date
    notes?: string
}

export interface ILibraryBook {
    schoolId: string
    title: string
    author: string
    isbn?: string
    category: string
    shelf: string
    copiesTotal: number
    copiesAvailable: number
    status: TInventoryStatus
    notes: string
}

export interface ILibraryLoan {
    schoolId: string
    bookId: string
    bookTitle: string
    borrowerType: TBorrowerType
    borrowerId?: string
    borrowerName: string
    className?: string
    section?: string
    quantity: number
    issuedAt: Date
    dueDate: Date
    status: TIssueStatus
    returnedAt?: Date
    notes?: string
}
