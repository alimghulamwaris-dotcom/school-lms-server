import mongoose from 'mongoose'
import config from '../config/config'

let connectionPromise: Promise<typeof mongoose> | null = null

export default {
    connect: async () => {
        if (!config.DATABASE_URL) {
            throw new Error('DATABASE_URL is missing')
        }

        if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) {
            return mongoose.connection
        }

        if (!connectionPromise) {
            mongoose.set('bufferCommands', false)
            connectionPromise = mongoose.connect(config.DATABASE_URL, {
                serverSelectionTimeoutMS: 30000,
                maxPoolSize: 10
            })
        }

        try {
            await connectionPromise
            return mongoose.connection
        } catch (error) {
            connectionPromise = null
            throw error
        }
    }
}
