import express, { Application } from 'express'
import path from 'path'
import router from './APIs'
import errorHandler from './middlewares/errorHandler'
import notFound from './handlers/notFound'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { bootstrap } from './bootstrap'

const app: Application = express()
let appBootstrapPromise: Promise<void> | null = null

const ensureBootstrap = async () => {
    if (!appBootstrapPromise) {
        appBootstrapPromise = bootstrap().catch((error) => {
            appBootstrapPromise = null
            throw error
        })
    }

    await appBootstrapPromise
}

//Middlewaress
app.use(helmet())
app.use(cookieParser())

const allowedOrigins = ['https://xyz.com', 'http://localhost:3000', 'http://127.0.0.1:3000', 'https://school-lms-client.vercel.app']

app.use(
    cors({
        methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'HEAD', 'PUT', 'PATCH'],
        origin: (origin, callback) => {
            // Allow non-browser requests (e.g. curl/postman) and explicit allow-list origins.
            const normalizedOrigin = origin?.replace(/\/$/, '')
            if (!origin || (normalizedOrigin && allowedOrigins.includes(normalizedOrigin))) {
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
app.use((_request, _response, next) => {
    void ensureBootstrap()
        .then(() => {
            next()
        })
        .catch((error) => {
            next(error)
        })
})

//Router
// app.use('/v1', router)
router(app)

//404 handler
app.use(notFound)

//Handlers as Middlewares
app.use(errorHandler)

export default app
