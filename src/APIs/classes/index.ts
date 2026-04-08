import { Router } from 'express'
import authenticate from '../../middlewares/authenticate'
import authorizeAccess from '../../middlewares/authorizeAccess'
import rateLimiter from '../../middlewares/rateLimiter'
import classesController from './classes.controller'

const router = Router()

router.route('/classes').post(rateLimiter, authenticate, authorizeAccess(['Students', 'Admissions']), classesController.create)
router.route('/classes').get(rateLimiter, authenticate, authorizeAccess(['Students', 'Admissions']), classesController.list)
router
    .route('/classes/:id')
    .get(rateLimiter, authenticate, authorizeAccess(['Students', 'Admissions']), classesController.getById)
    .patch(rateLimiter, authenticate, authorizeAccess(['Students', 'Admissions']), classesController.update)
router.route('/classes/:id/sections').post(rateLimiter, authenticate, authorizeAccess(['Students', 'Admissions']), classesController.addSection)

export default router
