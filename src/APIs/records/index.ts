import { Router } from 'express'
import authenticate from '../../middlewares/authenticate'
import authorizeAccess from '../../middlewares/authorizeAccess'
import authorizeOwnerOrAdmin from '../../middlewares/authorizeOwnerOrAdmin'
import rateLimiter from '../../middlewares/rateLimiter'
import recordsController from './records.controller'

const router = Router()

router
    .route('/records/equipment')
    .post(rateLimiter, authenticate, authorizeAccess('Records'), authorizeOwnerOrAdmin, recordsController.createEquipment)
    .get(rateLimiter, authenticate, authorizeAccess('Records'), recordsController.listEquipment)

router
    .route('/records/equipment/:id')
    .patch(rateLimiter, authenticate, authorizeAccess('Records'), authorizeOwnerOrAdmin, recordsController.updateEquipment)

router
    .route('/records/equipment/issues')
    .post(rateLimiter, authenticate, authorizeAccess('Records'), recordsController.issueEquipment)
    .get(rateLimiter, authenticate, authorizeAccess('Records'), recordsController.listEquipmentIssues)

router
    .route('/records/equipment/issues/:id/return')
    .patch(rateLimiter, authenticate, authorizeAccess('Records'), recordsController.returnEquipmentIssue)

router
    .route('/records/library/books')
    .post(rateLimiter, authenticate, authorizeAccess('Records'), authorizeOwnerOrAdmin, recordsController.createLibraryBook)
    .get(rateLimiter, authenticate, authorizeAccess('Records'), recordsController.listLibraryBooks)

router
    .route('/records/library/books/:id')
    .patch(rateLimiter, authenticate, authorizeAccess('Records'), authorizeOwnerOrAdmin, recordsController.updateLibraryBook)

router
    .route('/records/library/loans')
    .post(rateLimiter, authenticate, authorizeAccess('Records'), recordsController.issueLibraryBook)
    .get(rateLimiter, authenticate, authorizeAccess('Records'), recordsController.listLibraryLoans)

router.route('/records/library/loans/:id/return').patch(rateLimiter, authenticate, authorizeAccess('Records'), recordsController.returnLibraryLoan)

export default router
