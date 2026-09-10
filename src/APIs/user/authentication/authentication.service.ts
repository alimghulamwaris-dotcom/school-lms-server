import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'
import config from '../../../config/config'
import responseMessage from '../../../constant/responseMessage'
import { EUserRoles } from '../../../constant/users'
import logger from '../../../handlers/logger'
import emailService from '../../../services/email'
import { IToken } from '../_shared/types/token.interface'
import { CustomError } from '../../../utils/errors'
import hashing from '../../../utils/hashing'
import jwt from '../../../utils/jwt'
import parsers from '../../../utils/parsers'
import code from '../../../utils/code'
import dateAndTime from '../../../utils/date-and-time'
import invitationRepo from '../../invitations/_shared/repo/invitation.repository'
import schoolRepo from '../../school/_shared/repo/school.repository'
import staffRepo from '../../staff/_shared/repo/staff.repository'
import tokenRepository from '../_shared/repo/token.repository'
import query from '../_shared/repo/user.repository'
import { IUser } from '../_shared/types/users.interface'
import { ILoginRequest, IRegisterRequest } from './types/authentication.interface'
import validate from './validation/validations'
import { IDecryptedJwt } from '../../../types/types'

dayjs.extend(utc)

const normalize = (value: string) => value.trim().toLowerCase()

const normalizeParsedPhone = (countryCode: string, internationalNumber: string) => {
    const normalizedCountryCode = (countryCode || '').replace(/\D/g, '')
    const digits = (internationalNumber || '').replace(/\D/g, '')

    if (!normalizedCountryCode) {
        return digits
    }

    if (digits.startsWith(normalizedCountryCode)) {
        return digits
    }

    return `${normalizedCountryCode}${digits}`
}

export const registrationService = async (payload: IRegisterRequest) => {
    const { name, phoneNumber, email, password, invitationToken } = payload

    const { countryCode, internationalNumber, isoCode } = parsers.parsePhoneNumber('+' + phoneNumber)
    if (!countryCode || !internationalNumber || !isoCode) {
        throw new CustomError(responseMessage.auth.INVALID_PHONE_NUMBER, 422)
    }

    const timezone = dateAndTime.countryTimezone(isoCode)
    if (!timezone || timezone.length === 0) {
        throw new CustomError(responseMessage.auth.INVALID_PHONE_NUMBER, 422)
    }

    const normalizedEmail = normalize(email)
    await validate.userAlreadyExistsViaEmail(normalizedEmail)

    let role = EUserRoles.USER
    let invitedSchoolId: string | null = null
    let invitedRole = 'Staff'
    let invitedAccessPages: string[] = []

    if (invitationToken) {
        const invitation = await invitationRepo.findPendingInvitationByToken(invitationToken)
        if (!invitation) {
            throw new CustomError(responseMessage.NOT_FOUND('Invitation'), 404)
        }

        if (invitation.expiry.getTime() < Date.now()) {
            invitation.status = 'expired'
            await invitation.save()
            throw new CustomError('Invitation has expired.', 422)
        }

        if (normalize(invitation.email) !== normalizedEmail) {
            throw new CustomError('Email does not match invitation.', 422)
        }

        invitedSchoolId = invitation.schoolId
        invitedRole = invitation.role
        invitedAccessPages = invitation.accessPages || []
        role = normalize(invitation.role) === 'admin' ? EUserRoles.ADMIN : EUserRoles.USER
    }

    const hashedPassword = await hashing.hashPassword(password)
    const token = code.generateRandomId()
    const otp = code.generateOTP(6)

    const userObj: IUser = {
        name,
        email: normalizedEmail,
        phoneNumber: {
            countryCode,
            isoCode,
            internationalNumber
        },
        accountConfimation: {
            status: false,
            token,
            code: otp,
            timestamp: null
        },
        passwordReset: {
            token: null,
            expiry: null,
            lastResetAt: null
        },
        lastLoginAt: null,
        role,
        timezone: timezone[0].name,
        password: hashedPassword,
        consent: true
    }

    const newUser = await query.createUser(userObj)

    if (invitationToken && invitedSchoolId) {
        const invitation = await invitationRepo.findPendingInvitationByToken(invitationToken)
        if (invitation) {
            invitation.status = 'accepted'
            invitation.acceptedUserId = String(newUser._id)
            await invitation.save()
        }

        const existingStaff = await staffRepo.findStaffByEmailAndSchool(normalizedEmail, invitedSchoolId)
        if (existingStaff) {
            existingStaff.name = name
            existingStaff.phone = normalizeParsedPhone(countryCode, internationalNumber)
            existingStaff.role = invitedRole
            existingStaff.accessPages = invitedAccessPages
            existingStaff.status = 'active'
            await existingStaff.save()
        } else {
            await staffRepo.createStaff({
                schoolId: invitedSchoolId,
                name,
                role: invitedRole,
                email: normalizedEmail,
                phone: normalizeParsedPhone(countryCode, internationalNumber),
                accessPages: invitedAccessPages,
                status: 'active',
                photoUrl: '',
                documentUrls: []
            })
        }

        if (role === EUserRoles.ADMIN) {
            const school = await schoolRepo.findSchoolById(invitedSchoolId)
            if (school && !school.adminUserId) {
                school.adminUserId = String(newUser._id)
                await school.save()
            }
        }
    }

    const confirmationURL = `${config.CLIENT_URL}/verify-user?token=${token}&code=${otp}`
    const to = [normalizedEmail]
    const subject = 'Confirm your account'
    const text = `Hey ${name}, please confirm your account using this link:\n\n${confirmationURL}`

    emailService.sendEmail(to, subject, text).catch((error) => {
        logger.error('Error sending email', {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            meta: error
        })
    })

    return {
        success: true,
        _id: newUser._id,
        schoolId: invitedSchoolId,
        invitedRole
    }
}

export const accountConfirmationService = async (token: string, codeValue: string) => {
    const user = await query.findUserByConfirmationTokenAndCode(token, codeValue)
    if (!user) {
        throw new CustomError(responseMessage.auth.USER_NOT_EXIST, 404)
    }

    if (user.accountConfimation.status) {
        throw new CustomError(responseMessage.auth.ALREADY_CONFIRMED('Account'), 400)
    }

    user.accountConfimation.status = true
    user.accountConfimation.timestamp = dayjs().utc().toDate()

    await user.save()

    const to = [user.email]
    const subject = 'Welcome to School LMS'
    const text = 'Account has been confirmed. You can sign in now.'

    emailService.sendEmail(to, subject, text).catch((error) => {
        logger.error('Error sending email', {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            meta: error
        })
    })

    return {
        success: true,
        _id: user._id
    }
}

export const loginService = async (payload: ILoginRequest) => {
    const { email, password } = payload
    const normalizedEmail = normalize(email)

    const user = await query.findUserByEmail(normalizedEmail, '+password')

    if (user) {
        const isValidPassword = await hashing.comparePassword(password, user.password)
        if (!isValidPassword) {
            throw new CustomError(responseMessage.auth.INVALID_EMAIL_OR_PASSWORD, 400)
        }

        if (!user.accountConfimation.status) {
            throw new CustomError('Please verify your email before login.', 403)
        }

        const primarySchool = await schoolRepo.findSchoolByAdminUserId(String(user._id))
        const staff = await staffRepo.findStaffByEmail(user.email)
        const resolvedSchoolId = primarySchool ? String(primarySchool._id) : staff?.schoolId || null
        const resolvedSchoolCode = primarySchool?.code || null

        const accessToken = jwt.generateToken(
            { userId: user._id, principalType: 'user', schoolId: resolvedSchoolId || undefined },
            config.TOKENS.ACCESS.SECRET,
            config.TOKENS.ACCESS.EXPIRY
        )
        const refreshToken = jwt.generateToken(
            { userId: user._id, principalType: 'user', schoolId: resolvedSchoolId || undefined },
            config.TOKENS.REFRESH.SECRET,
            config.TOKENS.REFRESH.EXPIRY
        )

        user.lastLoginAt = dayjs().utc().toDate()
        await user.save()

        const token: IToken = {
            token: refreshToken
        }
        await tokenRepository.createToken(token)

        return {
            success: true,
            principalType: 'user',
            role: user.role,
            schoolId: resolvedSchoolId,
            schoolCode: resolvedSchoolCode,
            accessToken,
            refreshToken
        }
    }

    const school = await schoolRepo.findSchoolByEmail(normalizedEmail, '+password')
    if (!school) {
        throw new CustomError(responseMessage.NOT_FOUND('User'), 404)
    }

    const isValidSchoolPassword = await hashing.comparePassword(password, school.password)
    if (!isValidSchoolPassword) {
        throw new CustomError(responseMessage.auth.INVALID_EMAIL_OR_PASSWORD, 400)
    }

    if (!school.isVerified) {
        throw new CustomError(responseMessage.school.SCHOOL_NOT_VERIFIED, 403)
    }

    const accessToken = jwt.generateToken({ schoolId: school._id, principalType: 'school' }, config.TOKENS.ACCESS.SECRET, config.TOKENS.ACCESS.EXPIRY)
    const refreshToken = jwt.generateToken(
        { schoolId: school._id, principalType: 'school' },
        config.TOKENS.REFRESH.SECRET,
        config.TOKENS.REFRESH.EXPIRY
    )

    const token: IToken = {
        token: refreshToken
    }
    await tokenRepository.createToken(token)

    return {
        success: true,
        principalType: 'school',
        role: 'school_owner',
        schoolId: String(school._id),
        schoolCode: school.code,
        accessToken,
        refreshToken
    }
}

export const refreshSessionService = async (currentRefreshToken: string | undefined) => {
    if (!currentRefreshToken) {
        throw new CustomError(responseMessage.SESSION_EXPIRED, 401)
    }

    // The refresh token must still exist in the store, otherwise it was rotated away or logged out.
    const storedToken = await tokenRepository.findToken(currentRefreshToken)
    if (!storedToken) {
        throw new CustomError(responseMessage.SESSION_EXPIRED, 401)
    }

    let decoded: IDecryptedJwt
    try {
        decoded = jwt.verifyToken(currentRefreshToken, config.TOKENS.REFRESH.SECRET) as IDecryptedJwt
    } catch (error) {
        if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError) {
            await tokenRepository.deleteToken(currentRefreshToken)
            throw new CustomError(responseMessage.SESSION_EXPIRED, 401)
        }
        throw error
    }

    // Rebuild exactly the same payload shape login issues.
    let payload: { userId?: string; schoolId?: string; principalType: 'user' | 'school' }

    if (decoded.principalType === 'school' && decoded.schoolId) {
        const school = await schoolRepo.findSchoolById(decoded.schoolId)
        if (!school) {
            await tokenRepository.deleteToken(currentRefreshToken)
            throw new CustomError(responseMessage.SESSION_EXPIRED, 401)
        }

        payload = { schoolId: String(school._id), principalType: 'school' }
    } else if (decoded.userId) {
        const user = await query.findUserById(decoded.userId)
        if (!user) {
            await tokenRepository.deleteToken(currentRefreshToken)
            throw new CustomError(responseMessage.SESSION_EXPIRED, 401)
        }

        payload = { userId: String(user._id), principalType: 'user' }
        if (decoded.schoolId) {
            payload.schoolId = decoded.schoolId
        }
    } else {
        await tokenRepository.deleteToken(currentRefreshToken)
        throw new CustomError(responseMessage.SESSION_EXPIRED, 401)
    }

    const accessToken = jwt.generateToken(payload, config.TOKENS.ACCESS.SECRET, config.TOKENS.ACCESS.EXPIRY)
    const refreshToken = jwt.generateToken(payload, config.TOKENS.REFRESH.SECRET, config.TOKENS.REFRESH.EXPIRY)

    // Rotate: store the new refresh token, then invalidate the old one.
    await tokenRepository.createToken({ token: refreshToken })
    await tokenRepository.deleteToken(currentRefreshToken)

    return {
        success: true,
        accessToken,
        refreshToken
    }
}
