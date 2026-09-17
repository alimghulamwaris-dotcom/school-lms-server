import { initRateLimiter } from '../config/rate-limiter'
import logger from '../handlers/logger'
import database from '../services/database'
import whatsappService from '../services/whatsappService'
import { startWhatsAppScheduler } from '../services/whatsappScheduler'
import { recoverStuckCampaigns } from '../APIs/whatsapp/recovery'

let bootstrapPromise: Promise<void> | null = null

const runBootstrap = async (): Promise<void> => {
    try {
        logger.info('[bootstrap] database connection starting')
        // Connect to the database
        const connection = await database.connect()
        logger.info('[bootstrap] database connection established')
        logger.info(`Database connection established`, {
            meta: { CONNECTION_NAME: connection.name }
        })

        // Initialize rate limiter
        initRateLimiter(connection)
        logger.info(`Rate limiter initiated`)

        startWhatsAppScheduler()
        logger.info(`WhatsApp scheduler initiated`)

        logger.info('[bootstrap] WhatsApp session restore starting')
        await whatsappService.restoreConnectedSessions()
        logger.info('[bootstrap] WhatsApp session restore completed')
        logger.info(`WhatsApp sessions restored`)

        // Recover any campaigns stuck at 'sending' status from previous server run
        logger.info('[bootstrap] WhatsApp campaign recovery starting')
        await recoverStuckCampaigns()
        logger.info('[bootstrap] WhatsApp campaign recovery completed')
        logger.info(`WhatsApp campaign recovery completed`)
    } catch (error) {
        logger.error(`Error during bootstrap:`, { meta: error })
        throw error // Re-throw the error to stop server startup
    }
}

export async function bootstrap(): Promise<void> {
    if (!bootstrapPromise) {
        bootstrapPromise = runBootstrap().catch((error) => {
            bootstrapPromise = null
            throw error
        })
    }

    return bootstrapPromise
}
