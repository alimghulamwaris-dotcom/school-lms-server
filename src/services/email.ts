import nodemailer from 'nodemailer'
import config from '../config/config'

const transporter = nodemailer.createTransport({
    host: config.SMTP.HOST,
    port: config.SMTP.PORT,
    secure: config.SMTP.PORT === 465,
    auth: {
        user: config.SMTP.USER,
        pass: config.SMTP.PASS
    }
})

export default {
    sendEmail: async (to: string[], subject: string, text?: string, html?: string) => {
        try {
            const info = await transporter.sendMail({
                from: config.SMTP.FROM,
                to,
                subject,
                ...(html ? { html } : { text: text || '' })
            })

            return info
        } catch (error) {
            throw error
        }
    }
}
