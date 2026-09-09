import attendanceModel from '../attendance/_shared/models/attendance.model'
import admissionModel from '../admissions/_shared/models/admission.model'
import studentModel from '../students/_shared/models/student.model'
import whatsappTemplateModel from '../whatsapp/_shared/models/whatsappTemplate.model'
import whatsappCampaignModel from '../whatsapp/_shared/models/whatsappCampaign.model'

export const getDashboardService = async (schoolId: string) => {
    const studentCount = await studentModel.countDocuments({ schoolId })
    const reminderCount = await whatsappCampaignModel.countDocuments({ schoolId, purpose: 'fee_reminder', status: 'scheduled' })
    const templateCount = await whatsappTemplateModel.countDocuments({ schoolId })

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const attendanceCount = await attendanceModel.countDocuments({
        schoolId,
        date: { $gte: todayStart, $lte: todayEnd }
    })

    const recentAdmissions = await admissionModel.find({ schoolId }).sort({ createdAt: -1 }).limit(3)

    return {
        success: true,
        stats: {
            students: studentCount,
            attendanceToday: attendanceCount,
            feeReminders: reminderCount,
            templates: templateCount
        },
        recentAdmissions
    }
}
