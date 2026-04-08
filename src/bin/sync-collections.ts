import mongoose from 'mongoose'
import { IndexSpecification } from 'mongodb'
import logger from '../handlers/logger'

type TCollectionInfo = {
    name?: string
    type?: string
}

type TMongoIndex = {
    name?: string
    key?: Record<string, unknown>
} & Record<string, unknown>

const readArg = (name: string) => {
    const prefix = `--${name}=`
    const arg = process.argv.slice(2).find((item) => item.startsWith(prefix))
    return arg ? arg.slice(prefix.length).trim() : ''
}

const ensureUri = (value: string, label: string) => {
    if (!value || !(value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'))) {
        throw new Error(`${label} must be a valid MongoDB connection string.`)
    }
    return value
}

const sanitizeIndexOptions = (index: TMongoIndex) => {
    const options: Record<string, unknown> = {}
    const allowed = [
        'name',
        'unique',
        'sparse',
        'expireAfterSeconds',
        'weights',
        'default_language',
        'language_override',
        'textIndexVersion',
        '2dsphereIndexVersion',
        'bits',
        'min',
        'max',
        'bucketSize',
        'partialFilterExpression',
        'collation',
        'wildcardProjection',
        'hidden'
    ]

    for (const field of allowed) {
        if (Object.prototype.hasOwnProperty.call(index, field)) {
            options[field] = index[field]
        }
    }

    return options
}

const syncCollections = async (sourceUri: string, targetUri: string) => {
    const sourceConnection = await mongoose.createConnection(sourceUri).asPromise()
    const targetConnection = await mongoose.createConnection(targetUri).asPromise()

    try {
        if (!sourceConnection.db || !targetConnection.db) {
            throw new Error('Failed to access source or target database.')
        }

        const sourceDb = sourceConnection.db
        const targetDb = targetConnection.db

        const sourceCollectionsRaw = (await sourceDb.listCollections({}, { nameOnly: false }).toArray()) as TCollectionInfo[]
        const targetCollectionsRaw = (await targetDb.listCollections({}, { nameOnly: true }).toArray()) as TCollectionInfo[]

        const sourceCollections = sourceCollectionsRaw
            .filter((item) => item.type !== 'view')
            .map((item) => item.name || '')
            .filter((name) => Boolean(name))

        const targetCollectionSet = new Set(targetCollectionsRaw.map((item) => item.name || '').filter((name) => Boolean(name)))

        for (const collectionName of sourceCollections) {
            if (!targetCollectionSet.has(collectionName)) {
                await targetDb.createCollection(collectionName)
                logger.info(`Created collection in target DB`, { meta: { collection: collectionName } })
            }
        }

        for (const collectionName of sourceCollections) {
            const sourceIndexes = (await sourceDb.collection(collectionName).indexes()) as TMongoIndex[]
            const targetIndexes = (await targetDb.collection(collectionName).indexes()) as TMongoIndex[]
            const targetIndexNameSet = new Set(targetIndexes.map((index) => index.name || '').filter((name) => Boolean(name)))

            for (const index of sourceIndexes) {
                const indexName = index.name || ''
                if (!indexName || indexName === '_id_' || targetIndexNameSet.has(indexName)) {
                    continue
                }

                const indexKey = index.key
                if (!indexKey || typeof indexKey !== 'object') {
                    continue
                }

                const options = sanitizeIndexOptions(index)
                await targetDb.collection(collectionName).createIndex(indexKey as IndexSpecification, options)
                logger.info(`Created index in target DB`, {
                    meta: { collection: collectionName, indexName }
                })
            }
        }

        logger.info('Collection sync completed', {
            meta: {
                sourceDb: sourceConnection.name,
                targetDb: targetConnection.name,
                collectionCount: sourceCollections.length
            }
        })
    } finally {
        await Promise.all([sourceConnection.close(), targetConnection.close()])
    }
}

const run = async () => {
    const source = ensureUri(readArg('source'), 'Source URI')
    const target = ensureUri(readArg('target'), 'Target URI')

    await syncCollections(source, target)
}

void run().catch((error: unknown) => {
    logger.error('Failed to sync collections', { meta: error })
    process.exit(1)
})
