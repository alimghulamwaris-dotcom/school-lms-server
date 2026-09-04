import dotenvFlow from 'dotenv-flow'
import dns from 'dns'

dns.setServers(['8.8.8.8', '8.8.4.4'])

dotenvFlow.config()

export default {
    // General
    ENV: process.env.ENV,
    PORT: process.env.PORT,
    SERVER_URL: process.env.SERVER_URL,
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',

    // Database
    DATABASE_URL: process.env.DATABASE_URL,

    //Email
    EMAIL_API_KEY: process.env.EMAIL_SERVICE_API_KEY,
    SMTP: {
        HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
        PORT: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
        USER: process.env.SMTP_USER || '',
        PASS: process.env.SMTP_PASS || '',
        FROM: process.env.SMTP_FROM || 'School LMS'
    },

    //Tokens
    TOKENS: {
        ACCESS: {
            SECRET: process.env.ACCESS_TOKEN_SECRET as string,
            EXPIRY: 3600
        },
        REFRESH: {
            SECRET: process.env.REFRESH_TOKEN_SECRET as string,
            EXPIRY: 3600 * 24 * 365
        }
    },

    CLOUDINARY: {
        CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME as string,
        API_KEY: process.env.CLOUDINARY_API_KEY as string,
        API_SECRET: process.env.CLOUDINARY_API_SECRET as string,
        FOLDER: (process.env.CLOUDINARY_FOLDER as string) || 'school-lms'
    },

    WHATSAPP: {
        ENABLED: process.env.WHATSAPP_ENABLED === 'true',
        PROVIDER: (process.env.WHATSAPP_PROVIDER || 'meta').toLowerCase(),
        META: {
            API_VERSION: process.env.WHATSAPP_META_API_VERSION || 'v22.0',
            ACCESS_TOKEN: process.env.WHATSAPP_META_ACCESS_TOKEN || '',
            PHONE_NUMBER_ID: process.env.WHATSAPP_META_PHONE_NUMBER_ID || ''
        },
        GREEN: {
            API_URL: process.env.WHATSAPP_GREEN_API_URL || 'https://api.green-api.com',
            INSTANCE_ID: process.env.WHATSAPP_GREEN_INSTANCE_ID || '',
            TOKEN: process.env.WHATSAPP_GREEN_TOKEN || ''
        },
        TWILIO: {
            ACCOUNT_SID: process.env.WHATSAPP_TWILIO_ACCOUNT_SID || '',
            AUTH_TOKEN: process.env.WHATSAPP_TWILIO_AUTH_TOKEN || '',
            FROM_NUMBER: process.env.WHATSAPP_TWILIO_FROM_NUMBER || 'whatsapp:+14155238886'
        }
    }
}
