import joi from 'joi'
import { ICreateExamRequest, ISaveExamResultsRequest } from '../types/exam.interface'

export const createExamSchema = joi.object<ICreateExamRequest, true>({
    schoolId: joi.string().required(),
    title: joi.string().trim().min(2).max(120).required(),
    type: joi.string().valid('test', 'exam').required(),
    semester: joi.string().trim().allow('').max(80).optional(),
    academicYear: joi.string().trim().allow('').max(30).optional(),
    semesterNumber: joi.number().integer().min(1).max(12).optional(),
    totalSemesters: joi.number().integer().min(1).max(12).optional(),
    includeInFinalResult: joi.boolean().optional(),
    className: joi.string().trim().required(),
    section: joi.string().trim().allow('').optional(),
    startDate: joi.string().required(),
    endDate: joi.string().required(),
    subjects: joi
        .array()
        .items(
            joi.object({
                name: joi.string().trim().required(),
                maxMarks: joi.number().min(1).max(1000).required(),
                passMarks: joi.number().min(0).max(1000).required()
            })
        )
        .min(1)
        .required()
})

export const saveExamResultsSchema = joi.object<ISaveExamResultsRequest, true>({
    schoolId: joi.string().required(),
    publishResult: joi.boolean().optional(),
    results: joi
        .array()
        .items(
            joi.object({
                studentId: joi.string().required(),
                remarks: joi.string().trim().allow('').max(500).optional(),
                subjects: joi
                    .array()
                    .items(
                        joi.object({
                            subjectName: joi.string().trim().required(),
                            obtainedMarks: joi.number().min(0).max(1000).required(),
                            absent: joi.boolean().optional()
                        })
                    )
                    .min(1)
                    .required()
            })
        )
        .min(1)
        .required()
})
