// Script to list all users
// Run with: npx ts-node src/scripts/list-users.ts

import mongoose from 'mongoose'
import userModel from '../APIs/user/_shared/models/user.model'
import schoolRepo from '../APIs/school/_shared/repo/school.repository'
import { EUserRoles } from '../constant/users'
import config from '../config/config'

const listUsers = async (): Promise<void> => {
    if (!config.DATABASE_URL) {
        process.exit(1)
    }

    try {
        await mongoose.connect(config.DATABASE_URL)

        const schools = await schoolRepo.listSchools({}, 1, 1000)
        const validAdminUserIds = new Set(schools.map((s) => s.adminUserId).filter((id): id is string => Boolean(id)))

        const users = await userModel.find({}).lean()

        const orphaned = users.filter((user) => user.role !== EUserRoles.SUPER_ADMIN && !validAdminUserIds.has(String(user._id)))

        // Use the summary data
        const summary = {
            total: users.length,
            superAdmins: users.filter((u) => u.role === EUserRoles.SUPER_ADMIN).length,
            schoolAdmins: users.filter((u) => validAdminUserIds.has(String(u._id))).length,
            orphaned: orphaned.length
        }

        // eslint-disable-next-line no-console
        console.log('User Summary:', summary)

        await mongoose.disconnect()
        process.exit(0)
    } catch {
        await mongoose.disconnect()
        process.exit(1)
    }
}

void listUsers()
