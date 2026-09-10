export const TEMPLATE_VARIABLES = [
    { key: 'student_name', label: 'Student name' },
    { key: 'guardian_name', label: 'Guardian name' },
    { key: 'class_name', label: 'Class' },
    { key: 'section', label: 'Section' },
    { key: 'status', label: 'Attendance status' },
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Fee amount / Balance' },
    { key: 'due_date', label: 'Due date' },
    { key: 'fee_month', label: 'Fee month' }
] as const

export const TEMPLATE_VARIABLE_KEYS = TEMPLATE_VARIABLES.map((item) => item.key)
