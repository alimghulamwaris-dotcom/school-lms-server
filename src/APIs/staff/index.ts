import { Router } from 'express'
import staffController from './staff.controller'
import rateLimiter from '../../middlewares/rateLimiter'
import authenticate from '../../middlewares/authenticate'
import authorizeAccess from '../../middlewares/authorizeAccess'

const router = Router()

router.route('/staff').post(rateLimiter, authenticate, authorizeAccess('Staff'), staffController.create)
router.route('/staff').get(rateLimiter, authenticate, authorizeAccess('Staff'), staffController.list)
router.route('/staff/:id').patch(rateLimiter, authenticate, authorizeAccess('Staff'), staffController.update)

export default router
