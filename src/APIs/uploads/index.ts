import { Router } from 'express'
import uploadsController from './uploads.controller'
import rateLimiter from '../../middlewares/rateLimiter'
import authenticate from '../../middlewares/authenticate'
import authorizeAccess from '../../middlewares/authorizeAccess'
import upload from '../../middlewares/upload'

const router = Router()

router
    .route('/uploads')
    .post(rateLimiter, authenticate, authorizeAccess(['Admissions', 'Students', 'Staff']), upload.single('file'), uploadsController.upload)

export default router
