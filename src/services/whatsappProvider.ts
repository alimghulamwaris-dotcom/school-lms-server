import config from '../config/config'

type TSendWhatsAppInput = {
    to: string
    body: string
}

type TSendWhatsAppResult = {
    success: boolean
    error?: string
}

const toDigits = (phone: string) => phone.replace(/\D/g, '')

const toMetaE164 = (phone: string) => {
    const normalized = toDigits(phone)

    if (!normalized) {
        return ''
    }

    if (normalized.startsWith('00')) {
        return normalized.slice(2)
    }

    if (normalized.startsWith('0')) {
        return `92${normalized.slice(1)}`
    }

    return normalized
}

const toPlusE164 = (phone: string) => {
    const value = toMetaE164(phone)
    if (!value) {
        return ''
    }

    return `+${value}`
}

const parseMetaError = async (response: Response) => {
    try {
        const payload = (await response.json()) as {
            error?: {
                message?: string
            }
        }

        if (payload?.error?.message) {
            return payload.error.message
        }
        return response.statusText || 'Unknown WhatsApp API error'
    } catch {
        return response.statusText || 'Unknown WhatsApp API error'
    }
}

const parseTwilioError = async (response: Response) => {
    try {
        const payload = (await response.json()) as {
            message?: string
        }

        if (payload?.message) {
            return payload.message
        }
        return response.statusText || 'Unknown Twilio API error'
    } catch {
        return response.statusText || 'Unknown Twilio API error'
    }
}

const parseGreenError = async (response: Response) => {
    try {
        const payload = (await response.json()) as {
            message?: string
            error?: string
        }

        if (payload?.message) {
            return payload.message
        }

        if (payload?.error) {
            return payload.error
        }

        return response.statusText || 'Unknown Green API error'
    } catch {
        return response.statusText || 'Unknown Green API error'
    }
}

const sendViaMeta = async (input: TSendWhatsAppInput): Promise<TSendWhatsAppResult> => {
    const token = config.WHATSAPP.META.ACCESS_TOKEN
    const phoneNumberId = config.WHATSAPP.META.PHONE_NUMBER_ID
    const apiVersion = config.WHATSAPP.META.API_VERSION

    if (!token || !phoneNumberId) {
        return {
            success: false,
            error: 'WhatsApp Meta credentials are missing.'
        }
    }

    const to = toMetaE164(input.to)
    if (to.length < 8) {
        return {
            success: false,
            error: 'Invalid phone number'
        }
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: {
                body: input.body,
                preview_url: false
            }
        })
    })

    if (!response.ok) {
        const error = await parseMetaError(response)
        return {
            success: false,
            error
        }
    }

    return {
        success: true
    }
}

const normalizeFromNumber = (value: string) => {
    if (value.startsWith('whatsapp:')) {
        return value
    }

    if (value.startsWith('+')) {
        return `whatsapp:${value}`
    }

    const digits = toDigits(value)
    return digits ? `whatsapp:+${digits}` : 'whatsapp:+14155238886'
}

const sendViaTwilio = async (input: TSendWhatsAppInput): Promise<TSendWhatsAppResult> => {
    const accountSid = config.WHATSAPP.TWILIO.ACCOUNT_SID
    const authToken = config.WHATSAPP.TWILIO.AUTH_TOKEN
    const fromNumber = normalizeFromNumber(config.WHATSAPP.TWILIO.FROM_NUMBER)

    if (!accountSid || !authToken || !fromNumber) {
        return {
            success: false,
            error: 'Twilio WhatsApp credentials are missing.'
        }
    }

    const to = toPlusE164(input.to)
    if (to.length < 9) {
        return {
            success: false,
            error: 'Invalid phone number'
        }
    }

    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const body = new URLSearchParams({
        To: `whatsapp:${to}`,
        From: fromNumber,
        Body: input.body
    })

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
    })

    if (!response.ok) {
        const error = await parseTwilioError(response)
        return {
            success: false,
            error
        }
    }

    return {
        success: true
    }
}

const sendViaGreen = async (input: TSendWhatsAppInput): Promise<TSendWhatsAppResult> => {
    const apiUrl = config.WHATSAPP.GREEN.API_URL.replace(/\/$/, '')
    const instanceId = config.WHATSAPP.GREEN.INSTANCE_ID
    const token = config.WHATSAPP.GREEN.TOKEN

    if (!apiUrl || !instanceId || !token) {
        return {
            success: false,
            error: 'Green API credentials are missing.'
        }
    }

    const to = toMetaE164(input.to)
    if (to.length < 8) {
        return {
            success: false,
            error: 'Invalid phone number'
        }
    }

    const endpoint = `${apiUrl}/waInstance${instanceId}/sendMessage/${token}`

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chatId: `${to}@c.us`,
            message: input.body
        })
    })

    if (!response.ok) {
        const error = await parseGreenError(response)
        return {
            success: false,
            error
        }
    }

    return {
        success: true
    }
}

const sendViaMock = (): Promise<TSendWhatsAppResult> => {
    return Promise.resolve({
        success: true
    })
}

export const sendWhatsAppText = async (input: TSendWhatsAppInput): Promise<TSendWhatsAppResult> => {
    if (!config.WHATSAPP.ENABLED) {
        return {
            success: false,
            error: 'WhatsApp provider is not enabled on server.'
        }
    }

    const provider = config.WHATSAPP.PROVIDER

    if (provider === 'meta') {
        return sendViaMeta(input)
    }

    if (provider === 'twilio') {
        return sendViaTwilio(input)
    }

    if (provider === 'green') {
        return sendViaGreen(input)
    }

    if (provider === 'mock') {
        return sendViaMock()
    }

    return {
        success: false,
        error: `Unsupported WhatsApp provider: ${provider}`
    }
}
