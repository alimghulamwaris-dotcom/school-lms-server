import { v2 as cloudinary } from 'cloudinary'
import type { UploadApiResponse } from 'cloudinary'
import config from '../config/config'

cloudinary.config({
    cloud_name: config.CLOUDINARY.CLOUD_NAME,
    api_key: config.CLOUDINARY.API_KEY,
    api_secret: config.CLOUDINARY.API_SECRET
})

type UploadOptions = {
    folder?: string
    resourceType?: 'image' | 'auto' | 'raw' | 'video'
    publicId?: string
}

export const uploadBuffer = (buffer: Buffer, options: UploadOptions) => {
    return new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: options.folder,
                resource_type: options.resourceType || 'auto',
                public_id: options.publicId
            },
            (error, result) => {
                if (error || !result) {
                    if (error instanceof Error) {
                        return reject(error)
                    }
                    return reject(new Error('Upload failed'))
                }
                return resolve(result)
            }
        )

        stream.end(buffer)
    })
}
