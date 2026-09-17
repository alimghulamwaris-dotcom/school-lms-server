import logger from '../../handlers/logger'
import whatsappRepo from './_shared/repo/whatsapp.repository'

/**
 * Determine campaign final status based on recipient statuses
 */
export const determineCampaignFinalStatus = (recipients: Array<{ status?: string }>): 'sending' | 'sent' | 'failed' => {
    const hasQueued = recipients.some((r) => r.status === 'queued')
    if (hasQueued) {
        return 'sending'
    }

    const sentCount = recipients.filter((r) => r.status === 'sent').length
    if (sentCount > 0) {
        return 'sent'
    }

    const failedCount = recipients.filter((r) => r.status === 'failed').length
    if (failedCount > 0) {
        return 'failed'
    }

    return 'sent'
}

/**
 * Startup recovery: Fix campaigns stuck at 'sending' status
 * Recomputes sentCount/failedCount from recipients array
 */
export const recoverStuckCampaigns = async (): Promise<void> => {
    try {
        const stuckCampaigns = await whatsappRepo.findCampaignsByStatus('sending')

        if (stuckCampaigns.length === 0) {
            logger.info('No stuck campaigns found during startup recovery')
            return
        }

        logger.info(`Found ${stuckCampaigns.length} stuck campaigns, recovering...`, {
            meta: { count: stuckCampaigns.length }
        })

        for (const campaign of stuckCampaigns) {
            const campaignId = String(campaign._id)
            const recipients = campaign.recipients || []

            // Recompute counts from actual recipient statuses
            const sentCount = recipients.filter((r) => r.status === 'sent').length
            const failedCount = recipients.filter((r) => r.status === 'failed').length

            // Determine final status
            const finalStatus = determineCampaignFinalStatus(recipients)

            await whatsappRepo.updateCampaignStatus(campaignId, finalStatus)
            await whatsappRepo.updateCampaignCounts(campaignId, sentCount, failedCount)

            logger.info('Recovered stuck campaign', {
                meta: {
                    campaignId,
                    title: campaign.title,
                    finalStatus,
                    sentCount,
                    failedCount
                }
            })
        }

        logger.info(`Successfully recovered ${stuckCampaigns.length} stuck campaigns`)
    } catch (error) {
        logger.error('Error during stuck campaign recovery', {
            meta: { error }
        })
    }
}
