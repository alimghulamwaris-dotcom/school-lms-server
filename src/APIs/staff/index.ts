import { Router } from 'express'
import staffController from './staff.controller'
import rateLimiter from '../../middlewares/rateLimiter'
import authenticate from '../../middlewares/authenticate'
import authorizeAccess from '../../middlewares/authorizeAccess'

const router = Router()

router
    .route('/staff')
    .post(rateLimiter, authenticate, authorizeAccess('Staff'), staffController.create)
    .get(rateLimiter, authenticate, authorizeAccess('Staff'), staffController.list)

router.route('/staff/me').get(rateLimiter, authenticate, staffController.getMe)
router.route('/staff/me').patch(rateLimiter, authenticate, staffController.updateMe)

router
    .route('/staff/:id')
    .get(rateLimiter, authenticate, authorizeAccess('Staff'), staffController.get)
    .patch(rateLimiter, authenticate, authorizeAccess('Staff'), staffController.update)
    .delete(rateLimiter, authenticate, authorizeAccess('Staff'), staffController.remove)

export default router
