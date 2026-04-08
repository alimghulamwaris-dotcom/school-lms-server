import { Router } from 'express'
import dashboardController from './dashboard.controller'
import rateLimiter from '../../middlewares/rateLimiter'
import authenticate from '../../middlewares/authenticate'
import authorizeAccess from '../../middlewares/authorizeAccess'

const router = Router()

router.route('/dashboard').get(rateLimiter, authenticate, authorizeAccess('Dashboard'), dashboardController.get)

export default router
