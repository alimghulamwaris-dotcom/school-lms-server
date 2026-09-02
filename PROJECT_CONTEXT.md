# School LMS Server Project Context
Last updated: 2026-09-02

## Project overview
The backend is a Node.js/Express TypeScript API for a multi-school LMS. It uses MongoDB through Mongoose, JWT/cookie authentication, Joi validation, and role/page authorization. The API is mounted under `/v1` and returns the project-standard `{ success, statusCode, message, data }` response envelope.

## Architecture and important files
- `src/bin/server.ts`: server entry point.
- `src/bootstrap/index.ts`: application/bootstrap setup.
- `src/app.ts`: Express application and middleware composition.
- `src/APIs/index.ts`: API module registration under `/v1`.
- `src/APIs/<module>/index.ts`: module routes.
- `src/APIs/<module>/<module>.controller.ts`: request/response handlers.
- `src/APIs/<module>/<module>.service.ts`: business logic.
- `src/APIs/<module>/_shared/repo`: Mongoose repository access.
- `src/APIs/<module>/_shared/models`: Mongoose schemas/models.
- `src/APIs/<module>/validation`: Joi request validation.
- `src/middlewares`: authentication, rate limiting, access-page, owner/admin, and fee-manager authorization.

## Main flows
- Admissions validate the school, manually supplied GR number, student details, class/section, and monthly fee; the service checks GR uniqueness across admissions and students, creates the admission, then creates the linked student.
- Admission imports normalize and validate manual GR numbers and monthly fees before creating admission/student records.
- Fee voucher candidates are loaded from students and fallback admissions, filtered by school/class/section/status, and de-duplicated by GR number.
- Single and bulk fee invoice creation uses the candidate's stored `feeAmount` as the authoritative `Tuition Fee` line. Bulk generation calculates totals separately for each candidate, while preserving discounts, late fees, notes, and duplicate-month skipping.

## Recent changes
- `feeAmount` is present in admission and student interfaces, Joi schemas, and Mongoose models.
- The admissions GR pattern-save route and controller/service wiring were removed. The admissions flow no longer auto-generates GR numbers.
- Legacy GR pattern fields and the separate direct-student auto-numbering service remain for compatibility with the existing non-admission student endpoint; admissions themselves require manual GR input.
- Fee candidate mapping now carries `feeAmount` into voucher creation.

## Coding and safety conventions
- Preserve the existing module/controller/service/repository architecture.
- Make focused changes and keep request validation aligned with TypeScript interfaces and Mongoose models.
- Use `CustomError` and the existing response-message conventions for business errors.
- Run `npm run build` after TypeScript changes; use `npm run lint` for lint checks.

## Known considerations
- Admission creation currently performs admission and linked-student writes sequentially, matching the existing flow.
- Older records without a stored fee amount resolve to zero until updated.
- Production runtime still depends on the configured MongoDB, authentication, and external service environment variables.