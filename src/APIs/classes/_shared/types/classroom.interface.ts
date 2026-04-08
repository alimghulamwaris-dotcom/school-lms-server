export interface IClassroom {
    schoolId: string
    className: string
    classKey: string
    sections: string[]
    status: 'active' | 'archived'
}

export interface IClassroomWithId extends IClassroom {
    _id: string
}
