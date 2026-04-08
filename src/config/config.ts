import dotenvFlow from 'dotenv-flow'

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
        META: {
            API_VERSION: process.env.WHATSAPP_META_API_VERSION || 'v22.0',
            ACCESS_TOKEN: process.env.WHATSAPP_META_ACCESS_TOKEN || '',
            PHONE_NUMBER_ID: process.env.WHATSAPP_META_PHONE_NUMBER_ID || ''
        }
    }
}
