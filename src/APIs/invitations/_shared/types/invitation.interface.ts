export type TInvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled'

export interface IInvitation {
    schoolId: string
    email: string
    name: string
    phone: string
    role: string
    accessPages: string[]
    token: string
    expiry: Date
    status: TInvitationStatus
    invitedByType: 'school' | 'user'
    invitedById: string
    acceptedUserId: string | null
}

export interface IInvitationWithId extends IInvitation {
    _id: string
}
