import config from '../config/config'

type TSendWhatsAppInput = {
    to: string
    body: string
}

type TSendWhatsAppResult = {
    success: boolean
    error?: string
}

const toE164 = (phone: string) => {
    const normalized = phone.replace(/\D/g, '')
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

const parseError = async (response: Response) => {
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

export const sendWhatsAppText = async (input: TSendWhatsAppInput): Promise<TSendWhatsAppResult> => {
    if (!config.WHATSAPP.ENABLED) {
        return {
            success: false,
            error: 'WhatsApp provider is not enabled on server.'
        }
    }

    const token = config.WHATSAPP.META.ACCESS_TOKEN
    const phoneNumberId = config.WHATSAPP.META.PHONE_NUMBER_ID
    const apiVersion = config.WHATSAPP.META.API_VERSION

    if (!token || !phoneNumberId) {
        return {
            success: false,
            error: 'WhatsApp Meta credentials are missing.'
        }
    }

    const to = toE164(input.to)
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
        const error = await parseError(response)
        return {
            success: false,
            error
        }
    }

    return {
        success: true
    }
}
