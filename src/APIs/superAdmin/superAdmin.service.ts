import admissionModel from '../admissions/_shared/models/admission.model'
import studentModel from '../students/_shared/models/student.model'
import studentPromotionModel from '../students/_shared/models/studentPromotion.model'
import userModel from '../user/_shared/models/user.model'
import whatsappCampaignModel from '../whatsapp/_shared/models/whatsappCampaign.model'
import invitationModel from '../invitations/_shared/models/invitation.model'
import { EUserRoles } from '../../constant/users'
import schoolRepo from '../school/_shared/repo/school.repository'
import staffModel from '../staff/_shared/models/staff.model'
import staffAttendanceModel from '../staffAttendance/_shared/models/staffAttendance.model'
import feeInvoiceModel from '../fees/_shared/models/feeInvoice.model'
import feeExpenseModel from '../fees/_shared/models/feeExpense.model'
import classroomModel from '../classes/_shared/models/classroom.model'
import examModel from '../exams/_shared/models/exam.model'
import examResultModel from '../exams/_shared/models/examResult.model'
import attendanceModel from '../attendance/_shared/models/attendance.model'
import classTeacherAssignmentModel from '../attendance/_shared/models/classTeacherAssignment.model'
import equipmentModel from '../records/_shared/models/equipment.model'
import equipmentIssueModel from '../records/_shared/models/equipmentIssue.model'
import libraryBookModel from '../records/_shared/models/libraryBook.model'
import libraryLoanModel from '../records/_shared/models/libraryLoan.model'
import { registerSchoolService } from '../school/school.service'
import { ISchoolRegisterRequest } from '../school/types/school.interface'
import { ISuperAdminSchoolsQuery } from './types/superAdmin.interface'

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const toNumber = (value: unknown) => {
    const numberValue = Number(value)
    return Number.isFinite(numberValue) ? numberValue : 0
}

const toPlainObject = (value: unknown): Record<string, unknown> => {
    const withToObject = value as { toObject?: () => unknown }
    const candidate = typeof withToObject?.toObject === 'function' ? withToObject.toObject() : value
    if (candidate && typeof candidate === 'object') {
        return candidate as Record<string, unknown>
    }
    return {}
}

export const getSuperAdminOverviewService = async () => {
    const [
        totalSchools,
        verifiedSchools,
        totalStudents,
        totalStaffMembers,
        totalAdmissions,
        totalVouchers,
        pendingVouchers,
        paidVouchers,
        totalCampaigns,
        feeIncomeResult,
        feeExpenseResult,
        recentSchools
    ] = await Promise.all([
        schoolRepo.countSchools(),
        schoolRepo.countSchools({ isVerified: true }),
        studentModel.countDocuments(),
        staffModel.countDocuments(),
        admissionModel.countDocuments(),
        feeInvoiceModel.countDocuments(),
        feeInvoiceModel.countDocuments({ status: { $in: ['pending', 'partially_paid'] } }),
        feeInvoiceModel.countDocuments({ status: 'paid' }),
        whatsappCampaignModel.countDocuments(),
        feeInvoiceModel.aggregate<{ _id: null; total: number }>([{ $group: { _id: null, total: { $sum: '$paidAmount' } } }]),
        feeExpenseModel.aggregate<{ _id: null; total: number }>([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
        schoolRepo.listSchools({}, 1, 8)
    ])

    const totalIncome = toNumber(feeIncomeResult?.[0]?.total)
    const totalExpense = toNumber(feeExpenseResult?.[0]?.total)

    return {
        success: true,
        totals: {
            schools: totalSchools,
            verifiedSchools,
            students: totalStudents,
            staffMembers: totalStaffMembers,
            admissions: totalAdmissions,
            vouchers: totalVouchers,
            pendingVouchers,
            paidVouchers,
            campaigns: totalCampaigns,
            feeIncome: totalIncome,
            feeExpense: totalExpense,
            netBalance: totalIncome - totalExpense
        },
        recentSchools: recentSchools.map((school) => {
            const schoolObj = toPlainObject(school)
            return {
                _id: String(school._id),
                name: school.name,
                campus: school.campus,
                code: school.code,
                contactEmail: school.contactEmail,
                contactPhone: school.contactPhone,
                isVerified: school.isVerified,
                createdAt: schoolObj.createdAt || null
            }
        })
    }
}

export const listSuperAdminSchoolsService = async (payload: ISuperAdminSchoolsQuery) => {
    const page = Math.max(1, Number(payload.page || 1))
    const limit = Math.max(1, Math.min(100, Number(payload.limit || 20)))
    const search = (payload.search || '').trim()

    const query: Record<string, unknown> = {}
    if (search) {
        const searchRegex = new RegExp(escapeRegex(search), 'i')
        query.$or = [{ name: searchRegex }, { campus: searchRegex }, { contactEmail: searchRegex }, { code: searchRegex }]
    }

    const [total, schools] = await Promise.all([schoolRepo.countSchools(query), schoolRepo.listSchools(query, page, limit)])

    const items = await Promise.all(
        schools.map(async (school) => {
            const schoolObj = toPlainObject(school)
            const schoolId = String(school._id)
            const [studentCount, staffCount, activeStaffCount] = await Promise.all([
                studentModel.countDocuments({ schoolId }),
                staffModel.countDocuments({ schoolId }),
                staffModel.countDocuments({ schoolId, status: 'active' })
            ])

            return {
                _id: schoolId,
                name: school.name,
                campus: school.campus,
                code: school.code,
                contactEmail: school.contactEmail,
                contactPhone: school.contactPhone,
                isVerified: school.isVerified,
                adminUserId: school.adminUserId,
                createdAt: schoolObj.createdAt || null,
                counts: {
                    students: studentCount,
                    staff: staffCount,
                    activeStaff: activeStaffCount
                }
            }
        })
    )

    return {
        success: true,
        items,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit))
        }
    }
}

export const createSchoolBySuperAdminService = async (payload: ISchoolRegisterRequest) => {
    return registerSchoolService(payload)
}

export const deleteSchoolBySuperAdminService = async (schoolId: string) => {
    // Validate schoolId
    if (!schoolId || typeof schoolId !== 'string' || schoolId.trim() === '') {
        throw new Error('Invalid school ID')
    }

    const trimmedSchoolId = schoolId.trim()

    // First verify the school exists
    const school = await schoolRepo.findSchoolById(trimmedSchoolId)
    if (!school) {
        throw new Error('School not found')
    }

    try {
        // Get all staff members for this school BEFORE deleting them
        // so we can find and delete their associated user accounts
        const staffMembers = await staffModel.find({ schoolId: trimmedSchoolId }).lean()
        const staffEmails = staffMembers.map((staff) => staff.email?.toLowerCase()).filter(Boolean)

        // Get invitations to find accepted user IDs
        const invitations = await invitationModel.find({ schoolId: trimmedSchoolId }).lean()
        const acceptedUserIds = invitations.filter((inv) => inv.acceptedUserId).map((inv) => inv.acceptedUserId)

        // Delete attendance records and assignments
        await attendanceModel.deleteMany({ schoolId: trimmedSchoolId })
        await classTeacherAssignmentModel.deleteMany({ schoolId: trimmedSchoolId })
        await staffAttendanceModel.deleteMany({ schoolId: trimmedSchoolId })

        // Delete exam results and exams
        await examResultModel.deleteMany({ schoolId: trimmedSchoolId })
        await examModel.deleteMany({ schoolId: trimmedSchoolId })

        // Delete library records
        await libraryLoanModel.deleteMany({ schoolId: trimmedSchoolId })
        await libraryBookModel.deleteMany({ schoolId: trimmedSchoolId })

        // Delete equipment records
        await equipmentIssueModel.deleteMany({ schoolId: trimmedSchoolId })
        await equipmentModel.deleteMany({ schoolId: trimmedSchoolId })

        // Delete fee records
        await feeExpenseModel.deleteMany({ schoolId: trimmedSchoolId })
        await feeInvoiceModel.deleteMany({ schoolId: trimmedSchoolId })

        // Delete WhatsApp campaigns
        await whatsappCampaignModel.deleteMany({ schoolId: trimmedSchoolId })

        // Delete student promotions and students
        await studentPromotionModel.deleteMany({ schoolId: trimmedSchoolId })
        await studentModel.deleteMany({ schoolId: trimmedSchoolId })

        // Delete invitations for this school
        await invitationModel.deleteMany({ schoolId: trimmedSchoolId })

        // Delete staff records
        await staffModel.deleteMany({ schoolId: trimmedSchoolId })

        // Delete admissions
        await admissionModel.deleteMany({ schoolId: trimmedSchoolId })

        // Delete classrooms
        await classroomModel.deleteMany({ schoolId: trimmedSchoolId })

        // Delete user accounts associated with this school
        // 1. School admin user
        if (school.adminUserId) {
            await userModel.findByIdAndDelete(school.adminUserId)
        }

        // 2. Staff users found via accepted invitations
        if (acceptedUserIds.length > 0) {
            await userModel.deleteMany({ _id: { $in: acceptedUserIds } })
        }

        // 3. Staff users found via staff email matching (excluding super_admins and already deleted)
        // Only delete users who are not super_admins
        if (staffEmails.length > 0) {
            await userModel.deleteMany({
                email: { $in: staffEmails },
                role: { $ne: EUserRoles.SUPER_ADMIN }
            })
        }

        // Finally delete the school itself
        await schoolRepo.deleteSchoolById(trimmedSchoolId)

        return {
            success: true,
            message: `School "${school.name}" and all associated data (including ${staffMembers.length} staff users) have been permanently deleted`
        }
    } catch (error) {
        throw new Error(`Failed to delete school: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}
