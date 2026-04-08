import { Router } from 'express'
import authenticate from '../../middlewares/authenticate'
import authorizeAccess from '../../middlewares/authorizeAccess'
import rateLimiter from '../../middlewares/rateLimiter'
import invitationController from './invitation.controller'

const router = Router()

router.route('/invitations').post(rateLimiter, authenticate, authorizeAccess('Staff'), invitationController.create)
router.route('/invitations').get(rateLimiter, authenticate, authorizeAccess('Staff'), invitationController.list)

export default router
