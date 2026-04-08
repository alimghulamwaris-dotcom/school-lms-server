import config from '../../config/config'
import { uploadBuffer } from '../../services/cloudinary'
import { IUploadOptions } from './types/upload.interface'

const normalizeResourceType = (value?: string) => {
    if (!value) return 'auto'
    const normalized = value.toLowerCase()
    if (normalized === 'image') return 'image'
    if (normalized === 'raw') return 'raw'
    if (normalized === 'video') return 'video'
    return 'auto'
}

export const uploadFileService = async (file: Express.Multer.File, options: IUploadOptions) => {
    const resourceType = normalizeResourceType(options.resourceType)
    const folder = options.folder?.trim() || config.CLOUDINARY.FOLDER

    const result = await uploadBuffer(file.buffer, {
        folder,
        resourceType
    })

    return {
        success: true,
        file: {
            url: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
            bytes: result.bytes,
            format: result.format,
            originalFilename: file.originalname
        }
    }
}
