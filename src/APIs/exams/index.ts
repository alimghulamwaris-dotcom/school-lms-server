import { Router } from 'express'
import rateLimiter from '../../middlewares/rateLimiter'
import authenticate from '../../middlewares/authenticate'
import authorizeAccess from '../../middlewares/authorizeAccess'
import authorizeOwnerOrAdmin from '../../middlewares/authorizeOwnerOrAdmin'
import examsController from './exams.controller'

const router = Router()

router
    .route('/exams')
    .post(rateLimiter, authenticate, authorizeAccess('Exams'), examsController.create)
    .get(rateLimiter, authenticate, authorizeAccess('Exams'), examsController.list)

router.route('/exams/:id').get(rateLimiter, authenticate, authorizeAccess('Exams'), examsController.detail)

router
    .route('/exams/:id/results')
    .get(rateLimiter, authenticate, authorizeAccess('Exams'), examsController.listResults)
    .post(rateLimiter, authenticate, authorizeAccess('Exams'), authorizeOwnerOrAdmin, examsController.saveResults)

router.route('/exams/:id/print').get(rateLimiter, authenticate, authorizeAccess('Exams'), examsController.printData)

router.route('/exams/:id/award-list').get(rateLimiter, authenticate, authorizeAccess('Exams'), examsController.awardList)

router.route('/exams/:id/result-cards').get(rateLimiter, authenticate, authorizeAccess('Exams'), examsController.resultCards)

router.route('/exams/:id/final-summary').get(rateLimiter, authenticate, authorizeAccess('Exams'), examsController.finalSummary)

export default router
