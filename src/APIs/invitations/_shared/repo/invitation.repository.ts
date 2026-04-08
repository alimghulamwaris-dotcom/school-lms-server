import invitationModel from '../models/invitation.model'
import { IInvitation } from '../types/invitation.interface'

export default {
    createInvitation: (payload: IInvitation) => {
        return invitationModel.create(payload)
    },
    findPendingInvitationByToken: (token: string) => {
        return invitationModel.findOne({ token, status: 'pending' })
    },
    findPendingInvitationByEmailAndSchool: (schoolId: string, email: string) => {
        return invitationModel.findOne({
            schoolId,
            email,
            status: 'pending',
            expiry: { $gt: new Date() }
        })
    },
    listInvitationsBySchool: (schoolId: string) => {
        return invitationModel.find({ schoolId }).sort({ createdAt: -1 }).limit(100)
    }
}
