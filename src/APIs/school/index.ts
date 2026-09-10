import { Router } from 'express'
import authenticate from '../../middlewares/authenticate'
import authorizeAccess from '../../middlewares/authorizeAccess'
import authorizeOwnerOrAdmin from '../../middlewares/authorizeOwnerOrAdmin'
import authorizeSuperAdmin from '../../middlewares/authorizeSuperAdmin'
import rateLimiter from '../../middlewares/rateLimiter'
import schoolController from './school.controller'

const router = Router()

router.route('/schools/register').post(rateLimiter, authenticate, authorizeSuperAdmin, schoolController.register)
router.route('/schools/verify/:token').get(rateLimiter, schoolController.verify)
router.route('/schools/lookup').get(rateLimiter, schoolController.lookup)
router.route('/schools/gr-config').get(rateLimiter, authenticate, authorizeAccess(['Students', 'Admissions']), schoolController.getGrConfig)
router
    .route('/schools/staff-attendance-config')
    .get(rateLimiter, authenticate, authorizeOwnerOrAdmin, schoolController.getStaffAttendanceConfig)
    .patch(rateLimiter, authenticate, authorizeOwnerOrAdmin, schoolController.updateStaffAttendanceConfig)
router
    .route('/schools/academic-config')
    .get(rateLimiter, authenticate, authorizeAccess('Exams'), schoolController.getAcademicConfig)
    .put(rateLimiter, authenticate, authorizeOwnerOrAdmin, schoolController.updateAcademicConfig)
router.route('/schools/academic-config/advance-semester').post(rateLimiter, authenticate, authorizeOwnerOrAdmin, schoolController.advanceSemester)
router.route('/schools/academic-config/rollover').post(rateLimiter, authenticate, authorizeOwnerOrAdmin, schoolController.rolloverAcademicYear)
router
    .route('/schools/branding')
    .get(rateLimiter, authenticate, authorizeAccess('Fees'), schoolController.getBranding)
    .patch(rateLimiter, authenticate, authorizeOwnerOrAdmin, schoolController.updateBranding)

export default router
