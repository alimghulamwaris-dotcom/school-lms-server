import admissionModel from '../admissions/_shared/models/admission.model'
import studentModel from '../students/_shared/models/student.model'
import userModel from '../user/_shared/models/user.model'
import whatsappCampaignModel from '../whatsapp/_shared/models/whatsappCampaign.model'
import { EUserRoles } from '../../constant/users'
import schoolRepo from '../school/_shared/repo/school.repository'
import staffModel from '../staff/_shared/models/staff.model'
import feeInvoiceModel from '../fees/_shared/models/feeInvoice.model'
import feeExpenseModel from '../fees/_shared/models/feeExpense.model'
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
        totalUsers,
        totalSuperAdmins,
        totalAdmins,
        pendingAdmissions,
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
        userModel.countDocuments(),
        userModel.countDocuments({ role: EUserRoles.SUPER_ADMIN }),
        userModel.countDocuments({ role: EUserRoles.ADMIN }),
        admissionModel.countDocuments({ status: 'pending' }),
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
            users: totalUsers,
            superAdmins: totalSuperAdmins,
            admins: totalAdmins,
            pendingAdmissions,
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
