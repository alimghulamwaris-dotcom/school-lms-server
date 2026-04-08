import { Router } from 'express'
import authenticate from '../../middlewares/authenticate'
import authorizeSuperAdmin from '../../middlewares/authorizeSuperAdmin'
import rateLimiter from '../../middlewares/rateLimiter'
import superAdminController from './superAdmin.controller'

const router = Router()

router.use(rateLimiter, authenticate, authorizeSuperAdmin)

router.route('/super-admin/overview').get(superAdminController.overview)
router.route('/super-admin/schools').get(superAdminController.listSchools).post(superAdminController.createSchool)

export default router
