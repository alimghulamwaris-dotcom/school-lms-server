import { runDueDailyCampaigns } from '../APIs/whatsapp/whatsapp.service'
import logger from '../handlers/logger'

let schedulerHandle: NodeJS.Timeout | null = null

const INTERVAL_MS = 60 * 1000

export const startWhatsAppScheduler = () => {
    if (schedulerHandle) {
        return
    }

    schedulerHandle = setInterval(() => {
        void (async () => {
            try {
                const result = await runDueDailyCampaigns()
                if (result.processed > 0) {
                    logger.info('Processed scheduled WhatsApp campaigns', {
                        meta: result
                    })
                }
            } catch (error) {
                logger.error('Error while processing scheduled WhatsApp campaigns', {
                    meta: error
                })
            }
        })()
    }, INTERVAL_MS)
}
