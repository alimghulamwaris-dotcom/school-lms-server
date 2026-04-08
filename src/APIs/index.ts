import { Application } from 'express'
import { API_ROOT } from '../constant/application'

import General from './router'
import admissionsRoutes from './admissions'
import attendanceRoutes from './attendance'
import classesRoutes from './classes'
import dashboardRoutes from './dashboard'
import examsRoutes from './exams'
import feesRoutes from './fees'
import invitationsRoutes from './invitations'
import recordsRoutes from './records'
import schoolRoutes from './school'
import staffRoutes from './staff'
import staffAttendanceRoutes from './staffAttendance'
import studentsRoutes from './students'
import superAdminRoutes from './superAdmin'
import uploadRoutes from './uploads'
import authRoutes from './user/authentication'
import userManagementRoutes from './user/management'
import whatsappRoutes from './whatsapp'

const App = (app: Application) => {
    app.use(`${API_ROOT}`, General)
    app.use(`${API_ROOT}`, authRoutes)
    app.use(`${API_ROOT}/user`, userManagementRoutes)

    app.use(`${API_ROOT}`, schoolRoutes)
    app.use(`${API_ROOT}`, superAdminRoutes)
    app.use(`${API_ROOT}`, invitationsRoutes)
    app.use(`${API_ROOT}`, classesRoutes)
    app.use(`${API_ROOT}`, staffRoutes)
    app.use(`${API_ROOT}`, staffAttendanceRoutes)
    app.use(`${API_ROOT}`, studentsRoutes)
    app.use(`${API_ROOT}`, admissionsRoutes)
    app.use(`${API_ROOT}`, attendanceRoutes)
    app.use(`${API_ROOT}`, examsRoutes)
    app.use(`${API_ROOT}`, feesRoutes)
    app.use(`${API_ROOT}`, whatsappRoutes)
    app.use(`${API_ROOT}`, recordsRoutes)
    app.use(`${API_ROOT}`, dashboardRoutes)
    app.use(`${API_ROOT}`, uploadRoutes)
}

export default App
