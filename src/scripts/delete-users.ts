// Script to manually delete specific users
// Run with: npx ts-node src/scripts/delete-users.ts

import mongoose from 'mongoose'
import userModel from '../APIs/user/_shared/models/user.model'
import config from '../config/config'

// Paste the user IDs you want to delete here
const USER_IDS_TO_DELETE: string[] = [
    // Example: '60d1234567890abcdef12345'
    // Add the orphaned user IDs here
]

const deleteUsers = async (): Promise<void> => {
    if (!config.DATABASE_URL) {
        process.exit(1)
    }

    if (USER_IDS_TO_DELETE.length === 0) {
        process.exit(0)
    }

    try {
        await mongoose.connect(config.DATABASE_URL)

        await userModel.deleteMany({
            _id: { $in: USER_IDS_TO_DELETE }
        })

        await mongoose.disconnect()
        process.exit(0)
    } catch {
        await mongoose.disconnect()
        process.exit(1)
    }
}

void deleteUsers()
