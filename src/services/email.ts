import nodemailer from 'nodemailer'
import config from '../config/config'
import type Mail from 'nodemailer/lib/mailer'

const transporter = nodemailer.createTransport({
    host: config.SMTP.HOST,
    port: config.SMTP.PORT,
    secure: config.SMTP.PORT === 465,
    auth: {
        user: config.SMTP.USER,
        pass: config.SMTP.PASS
    }
})

let verifyPromise: Promise<void> | null = null

const wait = (ms: number) =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, ms)
    })

const ensureTransportReady = async () => {
    if (!verifyPromise) {
        verifyPromise = transporter.verify().then(() => undefined).catch((error) => {
            verifyPromise = null
            throw error
        })
    }

    await verifyPromise
}

export default {
    sendEmail: async (to: string[], subject: string, text?: string, html?: string) => {
        await ensureTransportReady()

        const options: Mail.Options = {
            from: config.SMTP.FROM,
            to,
            subject,
            ...(html ? { html } : { text: text || '' })
        }

        const attempts = 3
        let lastError: unknown = null

        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                const info = await transporter.sendMail(options)
                return info
            } catch (error) {
                lastError = error
                if (attempt < attempts) {
                    await wait(350 * attempt)
                    continue
                }
            }
        }

        throw lastError
    }
}
