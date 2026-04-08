import { Router } from 'express'
import managementController from './management.controller'
import authenticate from '../../../middlewares/authenticate'
import rateLimiter from '../../../middlewares/rateLimiter'

const router = Router()

router.route('/me').get(rateLimiter, authenticate, (request, response, next) => {
    void managementController.me(request, response, next)
})

export default router
