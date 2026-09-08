import { Router } from 'express'
import attendanceController from './attendance.controller'
import rateLimiter from '../../middlewares/rateLimiter'
import authenticate from '../../middlewares/authenticate'
import authorizeAccess from '../../middlewares/authorizeAccess'

const router = Router()

router.route('/attendance').post(rateLimiter, authenticate, authorizeAccess('Attendance'), attendanceController.create)
router.route('/attendance').get(rateLimiter, authenticate, authorizeAccess('Attendance'), attendanceController.list)
router.route('/attendance/scope').get(rateLimiter, authenticate, authorizeAccess('Attendance'), attendanceController.scope)
router.route('/attendance/summary').get(rateLimiter, authenticate, authorizeAccess('Attendance'), attendanceController.summary)
router.route('/attendance/assign-teacher').post(rateLimiter, authenticate, authorizeAccess('Attendance'), attendanceController.assignTeacher)
router
    .route('/attendance/reminder-config')
    .get(rateLimiter, authenticate, authorizeAccess('Attendance'), attendanceController.getReminderConfig)
    .patch(rateLimiter, authenticate, authorizeAccess('Attendance'), attendanceController.updateReminderConfig)

export default router
