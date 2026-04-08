import mongoose from 'mongoose'
import config from '../config/config'
import { EUserRoles } from '../constant/users'
import userRepo from '../APIs/user/_shared/repo/user.repository'
import hashing from '../utils/hashing'
import code from '../utils/code'
import database from '../services/database'
import { IUser } from '../APIs/user/_shared/types/users.interface'
import logger from '../handlers/logger'

const readArg = (name: string) => {
    const prefix = `--${name}=`
    const arg = process.argv.slice(2).find((item) => item.startsWith(prefix))
    return arg ? arg.slice(prefix.length).trim() : ''
}

const normalizeEmail = (value: string) => value.trim().toLowerCase()

const normalizePhone = (value: string) => {
    const onlyDigits = value.replace(/\D/g, '')
    if (!onlyDigits) {
        return {
            isoCode: 'PK',
            countryCode: '92',
            internationalNumber: '3000000000'
        }
    }

    const normalized = onlyDigits.startsWith('92') ? onlyDigits : `92${onlyDigits}`
    return {
        isoCode: 'PK',
        countryCode: '92',
        internationalNumber: normalized.slice(2)
    }
}

const run = async () => {
    const email = normalizeEmail(readArg('email'))
    const password = readArg('password')
    const name = readArg('name') || 'Super Admin'
    const phone = readArg('phone') || '923000000000'

    if (!email || !password) {
        logger.error(
            'Usage: npx ts-node src/bin/create-super-admin.ts --email=admin@example.com --password=StrongPass@123 [--name=Platform Owner] [--phone=923001112233]'
        )
        process.exit(1)
    }

    if (!config.DATABASE_URL) {
        logger.error('DATABASE_URL is missing in environment.')
        process.exit(1)
    }

    await database.connect()

    try {
        const existingUser = await userRepo.findUserByEmail(email, '+password')
        const passwordHash = await hashing.hashPassword(password)

        if (existingUser) {
            existingUser.name = name
            existingUser.password = passwordHash
            existingUser.role = EUserRoles.SUPER_ADMIN
            existingUser.phoneNumber = normalizePhone(phone)
            existingUser.timezone = 'Asia/Karachi'
            existingUser.accountConfimation.status = true
            existingUser.accountConfimation.timestamp = new Date()
            await existingUser.save()

            logger.info(`Updated existing user as super admin: ${email}`)
            return
        }

        const newUserPayload: IUser = {
            name,
            email,
            phoneNumber: normalizePhone(phone),
            timezone: 'Asia/Karachi',
            password: passwordHash,
            role: EUserRoles.SUPER_ADMIN,
            accountConfimation: {
                status: true,
                token: code.generateRandomId(),
                code: code.generateOTP(6),
                timestamp: new Date()
            },
            passwordReset: {
                token: null,
                expiry: null,
                lastResetAt: null
            },
            lastLoginAt: null,
            consent: true
        }

        await userRepo.createUser(newUserPayload)
        logger.info(`Created super admin user: ${email}`)
    } finally {
        await mongoose.connection.close()
    }
}

void run().catch(async (error: unknown) => {
    logger.error('Failed to create/update super admin:', {
        meta: error
    })
    await mongoose.connection.close()
    process.exit(1)
})
