import express, { Application } from 'express'
import path from 'path'
import router from './APIs'
import errorHandler from './middlewares/errorHandler'
import notFound from './handlers/notFound'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app: Application = express()

//Middlewares
app.use(helmet())
app.use(cookieParser())

const allowedOrigins = ['https://xyz.com', 'http://localhost:3000', 'http://127.0.0.1:3000', 'https://school-lms-client.vercel.app/']

app.use(
    cors({
        methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'HEAD', 'PUT', 'PATCH'],
        origin: (origin, callback) => {
            // Allow non-browser requests (e.g. curl/postman) and explicit allow-list origins.
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true)
                return
            }
            callback(new Error('Not allowed by CORS'))
        },
        credentials: true
    })
)
app.use(express.json())
app.use(express.static(path.join(__dirname, '../', 'public')))

//Router
// app.use('/v1', router)
router(app)

//404 handler
app.use(notFound)

//Handlers as Middlewares
app.use(errorHandler)

export default app
