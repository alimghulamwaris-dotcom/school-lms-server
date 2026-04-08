import { Router } from 'express'
import rateLimiter from '../../middlewares/rateLimiter'
import authenticate from '../../middlewares/authenticate'
import authorizeAccess from '../../middlewares/authorizeAccess'
import authorizeOwnerOrAdmin from '../../middlewares/authorizeOwnerOrAdmin'
import staffAttendanceController from './staffAttendance.controller'

const router = Router()

router.route('/staff-attendance/check-in').post(rateLimiter, authenticate, staffAttendanceController.checkIn)

router.route('/staff-attendance/check-out').post(rateLimiter, authenticate, staffAttendanceController.checkOut)

router.route('/staff-attendance/me').get(rateLimiter, authenticate, staffAttendanceController.my)

router.route('/staff-attendance').get(rateLimiter, authenticate, authorizeAccess('Staff'), authorizeOwnerOrAdmin, staffAttendanceController.list)

export default router
