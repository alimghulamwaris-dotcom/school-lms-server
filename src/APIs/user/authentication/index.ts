import { Router } from 'express'
import authenticationController from './authentication.controller'
import authenticate from '../../../middlewares/authenticate'

const router = Router()

router.route('/register').post(authenticationController.register)
router.route('/registeration/confirm/:token').patch(authenticationController.confirmRegistration)

router.route('/login').post(authenticationController.login)
// Deliberately NOT behind `authenticate`: the access token is already expired when this is called.
router.route('/user/refresh').patch(authenticationController.refresh)
router.route('/logout').put(authenticate, authenticationController.logout)

export default router
