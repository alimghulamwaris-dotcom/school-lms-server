// Script to clean up orphaned users
// Run with: npx ts-node src/scripts/cleanup-users.ts

import mongoose from 'mongoose'
import userModel from '../APIs/user/_shared/models/user.model'
import schoolRepo from '../APIs/school/_shared/repo/school.repository'
import { EUserRoles } from '../constant/users'
import config from '../config/config'

const cleanupOrphanedUsers = async (): Promise<void> => {
    if (!config.DATABASE_URL) {
        process.exit(1)
    }

    try {
        await mongoose.connect(config.DATABASE_URL)

        const schools = await schoolRepo.listSchools({}, 1, 1000)
        const validAdminUserIds = new Set(schools.map((s) => s.adminUserId).filter((id): id is string => Boolean(id)))

        const allUsers = await userModel.find({}).lean()

        const orphanedUsers = allUsers.filter((user) => {
            if (user.role === EUserRoles.SUPER_ADMIN) return false
            if (validAdminUserIds.has(String(user._id))) return false
            return true
        })

        if (orphanedUsers.length === 0) {
            await mongoose.disconnect()
            return
        }

        const orphanedUserIds = orphanedUsers.map((u) => String(u._id))
        await userModel.deleteMany({
            _id: { $in: orphanedUserIds }
        })

        await mongoose.disconnect()
        process.exit(0)
    } catch {
        await mongoose.disconnect()
        process.exit(1)
    }
}

if (require.main === module) {
    void cleanupOrphanedUsers()
}

export default cleanupOrphanedUsers
