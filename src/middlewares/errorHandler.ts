import { NextFunction, Request, Response } from 'express'
import { THttpError } from '../types/types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default (err: THttpError, _: Request, res: Response, __: NextFunction) => {
    const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500
    res.status(statusCode).json({
        ...err,
        statusCode,
        success: false
    })
}
