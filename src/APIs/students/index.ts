import { Router } from 'express'
import studentsController from './students.controller'
import rateLimiter from '../../middlewares/rateLimiter'
import authenticate from '../../middlewares/authenticate'
import authorizeAccess from '../../middlewares/authorizeAccess'
import authorizeOwnerOrAdmin from '../../middlewares/authorizeOwnerOrAdmin'

const router = Router()

router.route('/students').post(rateLimiter, authenticate, authorizeAccess('Students'), studentsController.create)
router.route('/students').get(rateLimiter, authenticate, authorizeAccess('Students'), studentsController.list)
router
    .route('/students/promotions/preview')
    .post(rateLimiter, authenticate, authorizeAccess('Students'), authorizeOwnerOrAdmin, studentsController.previewPromotions)
router
    .route('/students/promotions/execute')
    .post(rateLimiter, authenticate, authorizeAccess('Students'), authorizeOwnerOrAdmin, studentsController.executePromotions)
router
    .route('/students/promotions')
    .get(rateLimiter, authenticate, authorizeAccess('Students'), authorizeOwnerOrAdmin, studentsController.listPromotions)
router
    .route('/students/bulk-approve')
    .patch(rateLimiter, authenticate, authorizeAccess('Students'), authorizeOwnerOrAdmin, studentsController.bulkApprove)
router.route('/students/:id').get(rateLimiter, authenticate, authorizeAccess('Students'), studentsController.detail)
router.route('/students/:id').patch(rateLimiter, authenticate, authorizeAccess('Students'), studentsController.update)
router.route('/students/:id').delete(rateLimiter, authenticate, authorizeAccess('Students'), authorizeOwnerOrAdmin, studentsController.remove)
router.route('/students/:id/approve').patch(rateLimiter, authenticate, authorizeAccess('Students'), authorizeOwnerOrAdmin, studentsController.approve)

export default router
