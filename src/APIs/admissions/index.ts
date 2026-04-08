import { Router } from 'express'
import admissionsController from './admissions.controller'
import rateLimiter from '../../middlewares/rateLimiter'
import authenticate from '../../middlewares/authenticate'
import authorizeAccess from '../../middlewares/authorizeAccess'

const router = Router()

router.route('/admissions').post(rateLimiter, authenticate, authorizeAccess('Admissions'), admissionsController.create)
router.route('/admissions').get(rateLimiter, authenticate, authorizeAccess('Admissions'), admissionsController.list)
router.route('/admissions/import').post(rateLimiter, authenticate, authorizeAccess('Admissions'), admissionsController.import)

export default router
