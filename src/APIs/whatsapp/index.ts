import { Router } from 'express'
import whatsappController from './whatsapp.controller'
import rateLimiter from '../../middlewares/rateLimiter'
import authenticate from '../../middlewares/authenticate'
import authorizeAccess from '../../middlewares/authorizeAccess'

const router = Router()

router
    .route('/whatsapp/templates')
    .post(rateLimiter, authenticate, authorizeAccess('Messages'), whatsappController.createTemplate)
    .get(rateLimiter, authenticate, authorizeAccess('Messages'), whatsappController.listTemplates)

router
    .route('/whatsapp/templates/:id')
    .patch(rateLimiter, authenticate, authorizeAccess('Messages'), whatsappController.updateTemplate)
    .delete(rateLimiter, authenticate, authorizeAccess('Messages'), whatsappController.deleteTemplate)

router.route('/whatsapp/test').post(rateLimiter, authenticate, authorizeAccess('Messages'), whatsappController.createTest)
router.route('/whatsapp/audience-options').get(rateLimiter, authenticate, authorizeAccess('Messages'), whatsappController.audienceOptions)

router
    .route('/whatsapp/campaigns')
    .post(rateLimiter, authenticate, authorizeAccess('Messages'), whatsappController.createCampaign)
    .get(rateLimiter, authenticate, authorizeAccess('Messages'), whatsappController.listCampaigns)

router.route('/whatsapp/status').get(rateLimiter, authenticate, authorizeAccess('Messages'), whatsappController.getStatus)
router.route('/whatsapp/connect').post(rateLimiter, authenticate, authorizeAccess('Messages'), whatsappController.connect)
router.route('/whatsapp/disconnect').post(rateLimiter, authenticate, authorizeAccess('Messages'), whatsappController.disconnect)

export default router
