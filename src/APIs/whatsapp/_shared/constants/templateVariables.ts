export const TEMPLATE_VARIABLES = [
    { key: 'student_name', label: 'Student name' },
    { key: 'guardian_name', label: 'Guardian name' },
    { key: 'class_name', label: 'Class' },
    { key: 'section', label: 'Section' }
] as const

export const TEMPLATE_VARIABLE_KEYS = TEMPLATE_VARIABLES.map((item) => item.key)
