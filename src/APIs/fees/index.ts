import { Router } from 'express'
import feesController from './fees.controller'
import rateLimiter from '../../middlewares/rateLimiter'
import authenticate from '../../middlewares/authenticate'
import authorizeAccess from '../../middlewares/authorizeAccess'
import authorizeFeeManager from '../../middlewares/authorizeFeeManager'

const router = Router()

router.route('/fees/reminders').post(rateLimiter, authenticate, authorizeAccess('Fees'), feesController.createReminder)
router.route('/fees/reminders').get(rateLimiter, authenticate, authorizeAccess('Fees'), feesController.listReminders)
router.route('/fees/slips').post(rateLimiter, authenticate, authorizeAccess('Fees'), feesController.createSlip)
router.route('/fees/slips').get(rateLimiter, authenticate, authorizeAccess('Fees'), feesController.listSlips)
router
    .route('/fees/expenses')
    .post(rateLimiter, authenticate, authorizeAccess('Fees'), authorizeFeeManager, feesController.createExpense)
    .get(rateLimiter, authenticate, authorizeAccess('Fees'), feesController.listExpenses)
router.route('/fees/expenses/:id').patch(rateLimiter, authenticate, authorizeAccess('Fees'), authorizeFeeManager, feesController.updateExpense)
router.route('/fees/reports/class-wise').get(rateLimiter, authenticate, authorizeAccess('Fees'), feesController.classWiseReport)
router.route('/fees/reports/student-wise').get(rateLimiter, authenticate, authorizeAccess('Fees'), feesController.studentWiseReport)
router.route('/fees/reports/profit-loss').get(rateLimiter, authenticate, authorizeAccess('Fees'), feesController.profitLossReport)
router
    .route('/fees/invoices')
    .post(rateLimiter, authenticate, authorizeAccess('Fees'), authorizeFeeManager, feesController.createInvoice)
    .get(rateLimiter, authenticate, authorizeAccess('Fees'), feesController.listInvoices)
router.route('/fees/invoices/:id').get(rateLimiter, authenticate, authorizeAccess('Fees'), feesController.getInvoice)
router.route('/fees/invoices/:id').patch(rateLimiter, authenticate, authorizeAccess('Fees'), authorizeFeeManager, feesController.updateInvoice)
router
    .route('/fees/invoices/:id/pay')
    .patch(rateLimiter, authenticate, authorizeAccess('Fees'), authorizeFeeManager, feesController.recordInvoicePayment)
router.route('/fees/invoices/bulk').post(rateLimiter, authenticate, authorizeAccess('Fees'), authorizeFeeManager, feesController.bulkGenerateInvoices)
router
    .route('/fees/invoices/bulk-generate')
    .post(rateLimiter, authenticate, authorizeAccess('Fees'), authorizeFeeManager, feesController.bulkGenerateInvoices)

export default router
