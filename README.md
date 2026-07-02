# Dexa WFH Attendance

Fullstack web technical test implementation for an employee Work From Home attendance application. The project uses React for the frontend, NestJS for backend services, NestJS TCP transport for internal microservice communication, and MySQL for persistence.

## Architecture

The application is a monorepo with one HTTP entrypoint and three internal services.

| App | Responsibility | Runtime |
| --- | --- | --- |
| `frontend` | React web application for employee and HRD admin screens | Vite |
| `apps/api-gateway` | REST API, JWT guard, role guard, DTO validation, file upload boundary | NestJS HTTP |
| `apps/auth-service` | Login, JWT issuing, password hashing, user active status, admin seed | NestJS TCP microservice |
| `apps/employee-service` | Employee master data CRUD and active employee lookup | NestJS TCP microservice |
| `apps/attendance-service` | Attendance submission, server-side timestamping, proof photo storage, history and monitoring data | NestJS TCP microservice |

The frontend calls only the API Gateway. The gateway communicates with the internal services through NestJS TCP microservice clients. MySQL is run as one local container with three logical databases: `dexa_auth`, `dexa_employee`, and `dexa_attendance`.

In Docker Compose, only MySQL and the API Gateway are published to the host. The internal TCP services stay inside the Docker network and are reached by the gateway through service names.

For proof photos, MySQL stores only attendance metadata such as `proof_path`, `stored_filename`, MIME type, file size, timestamp, and location. The actual image file is stored by `attendance-service` through a storage abstraction: local disk with a Docker named volume for local development, and S3-compatible private object storage such as Railway Bucket for production.

## Database Choice

The original test allows several database engines and explicitly prefers Oracle or MySQL. This implementation intentionally uses MySQL because it satisfies that preference while keeping the project easy for a reviewer to run locally through Docker. The application data is naturally relational: users, employees, attendance records, unique employee numbers, unique emails, role constraints, active flags, monitoring indexes, and the one-attendance-per-employee-per-date rule all map cleanly to MySQL tables, constraints, and indexes.

Oracle would also be a valid enterprise database choice, but it would add setup weight and reviewer friction that does not improve the assessment signal for a 3 to 5 day fullstack test. PostgreSQL and SQL Server are technically capable, but they are not the preferred options named by the test. MongoDB is allowed by the document, but it is less appropriate for this use case because the important behavior depends on structured relational records and uniqueness rules rather than flexible document storage.

For the microservice demonstration, each service owns its own logical database: `auth-service` owns `dexa_auth`, `employee-service` owns `dexa_employee`, and `attendance-service` owns `dexa_attendance`. Cross-database foreign keys are not used in the local setup; service boundaries enforce identity references by explicit IDs. This is a deliberate technical-test tradeoff: it preserves service ownership without making local execution harder than necessary.

## Features

- HRD admin login with seeded account.
- HRD admin employee management: create, list, update, deactivate, and reactivate employees.
- Employee login.
- Employee WFH attendance submission with proof photo upload.
- Mandatory one-time geolocation capture during attendance submission with a 500 meter accuracy threshold.
- Server-side attendance timestamp based on `APP_TIMEZONE`.
- One attendance record per employee per business date.
- Employee attendance history with pagination.
- HRD admin attendance monitoring with date and employee filters, pagination, and location map links.
- Protected proof photo access through the gateway.
- Deployment-ready auth using httpOnly cookies and CSRF protection.

## Security Controls

- JWT authentication for protected endpoints, delivered to browsers through an httpOnly cookie instead of `localStorage`.
- CSRF protection for mutating API requests using a CSRF cookie plus `X-CSRF-Token` header.
- Role-based authorization for `EMPLOYEE` and `HRD_ADMIN` routes.
- Active-account checks on protected requests, so deactivated users cannot keep using an old token.
- Password hashing with bcrypt in `auth-service`.
- Backend DTO validation with whitelist and unknown-field rejection.
- Gateway DTO normalization trims normal text fields and lowercases email addresses. Password fields are not trimmed because passwords should be treated as exact secrets.
- CORS allowlist through `CORS_ORIGIN`.
- In-memory API rate limiting in the gateway. Defaults are 100 requests per IP per 60 seconds globally, 5 login attempts per IP per 60 seconds, and 10 attendance submissions per IP per 60 seconds.
- Basic API security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and a strict CSP for API responses.
- Upload validation for size, allowed MIME types, and proof-photo magic bytes.
- Generated proof-photo filenames and protected proof-photo access.
- Local proof-photo storage for Docker development and S3-compatible private Railway Bucket support for production.

The rate limiter is intentionally local in-memory code to avoid adding deployment dependencies for this technical test. For production or multi-instance API Gateway deployments, move rate-limit counters to Redis, a reverse proxy, or a managed edge gateway.

## Prerequisites

- Node.js 20 or newer.
- npm 9 or newer.
- Docker and Docker Compose for the recommended setup.

## Windows And WSL Workflow

For this workspace, use Windows CMD or PowerShell as the runtime environment for dependency installation, build, test, Docker, and frontend/backend dev server commands. WSL can be used as a coding and file-editing shell, but it should not run `npm install`, `npm ci`, `npm run build`, `npm run test`, or `npm run dev:*` for this project unless the whole project is intentionally moved to a WSL runtime.

This rule avoids mixed `node_modules` output. Windows npm creates command shims such as `node_modules\.bin\vite.cmd`, while Linux/WSL npm creates POSIX executables and symlinks such as `node_modules/.bin/vite`. If dependencies are installed from WSL and then build scripts are run from Windows CMD, commands can fail with errors like `'vite' is not recognized as an internal or external command` even when the package exists.

If that happens, rebuild dependencies from Windows CMD or PowerShell:

```bat
cd /d "D:\Files\Kuliah\Latihan koding\dexagroup"
rmdir /s /q node_modules
rmdir /s /q frontend\node_modules
rmdir /s /q packages\contracts\node_modules
for /d %D in (apps\*) do @if exist "%D\node_modules" rmdir /s /q "%D\node_modules"
npm ci
npm run build -w @dexa/frontend
```

Do not delete `package-lock.json`; it is required for deterministic installs.

## Environment

Copy the example environment file before running locally.

```bash
cp .env.example .env
```

The default demo account is:

```text
Email: admin@dexa.test
Password: Admin12345!
```

Change `JWT_SECRET`, `MYSQL_ROOT_PASSWORD`, and `MYSQL_PASSWORD` before using this outside a local technical test environment.

Rate limiting can be tuned with:

```text
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

## Run With Docker Compose

For detailed Windows Docker setup and troubleshooting, see [DOCKER_TUTORIAL.md](./DOCKER_TUTORIAL.md).

Install workspace dependencies first if you want local editor type resolution.

```bat
npm ci
```

Start MySQL and all backend services.

```bat
docker compose up --build
```

In another terminal, start the frontend.

```bat
npm run dev:frontend
```

Open:

```text
Frontend: http://localhost:5173
API Gateway: http://localhost:4000
API Health: http://localhost:4000/health
```

## Local Development

Build the shared contracts package before running services directly.

```bash
npm ci
npm run build -w @dexa/contracts
```

Run the services in separate terminals.

```bash
npm run dev:auth
npm run dev:employee
npm run dev:attendance
npm run dev:gateway
npm run dev:frontend
```

For direct local service runs, set service hosts to `127.0.0.1` in `.env` or export matching environment variables.

## Verification

Run the automated verification commands before submitting the technical test.

```bash
npm audit --omit=dev
npm run build
npm run test
```

Or run the combined script.

```bash
npm run verify
```

Expected result:

```text
npm audit --omit=dev -> found 0 vulnerabilities
npm run build -> all workspaces compile and frontend production build succeeds
npm run test -> backend service and gateway unit tests pass
```

Docker Compose includes health checks for MySQL, all internal TCP services, and the API Gateway. After `docker compose up --build`, confirm the gateway responds:

```bash
curl http://localhost:4000/health
```

Expected response:

```json
{"status":"ok"}
```

Additional review documents:

- [CODEBASE_QA_AUDIT.md](./CODEBASE_QA_AUDIT.md)
- [WEB_USER_GUIDE.md](./WEB_USER_GUIDE.md)
- [DOCKER_TUTORIAL.md](./DOCKER_TUTORIAL.md)
- [DEPLOYMENT_RAILWAY_VERCEL.md](./DEPLOYMENT_RAILWAY_VERCEL.md)

## API Summary

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| `GET` | `/auth/csrf` | Public | Issue CSRF token for mutating requests |
| `POST` | `/auth/login` | Public + CSRF | Login and set httpOnly auth cookie |
| `POST` | `/auth/logout` | Public + CSRF | Clear auth and CSRF cookies |
| `GET` | `/health` | Public | API Gateway health check |
| `GET` | `/auth/me` | Authenticated | Current user profile |
| `POST` | `/employees` | `HRD_ADMIN` + CSRF | Create employee and login account |
| `GET` | `/employees?page=1&limit=10` | `HRD_ADMIN` | Paginated employee list |
| `GET` | `/employees/:id` | `HRD_ADMIN` | Get employee |
| `PATCH` | `/employees/:id` | `HRD_ADMIN` + CSRF | Update employee |
| `DELETE` | `/employees/:id` | `HRD_ADMIN` + CSRF | Soft-delete employee and deactivate login |
| `PATCH` | `/employees/:id/deactivate` | `HRD_ADMIN` + CSRF | Backward-compatible soft-delete alias |
| `PATCH` | `/employees/:id/activate` | `HRD_ADMIN` + CSRF | Reactivate employee and login account |
| `POST` | `/attendance` | `EMPLOYEE` + CSRF | Submit attendance with multipart `photo` and location fields |
| `GET` | `/attendance/me?page=1&limit=10` | `EMPLOYEE` | Paginated employee attendance history |
| `GET` | `/attendance?page=1&limit=10` | `HRD_ADMIN` | Paginated HRD monitoring list |
| `GET` | `/attendance/:id/proof` | Owner or `HRD_ADMIN` | Protected proof photo |

Paginated endpoints return:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 1
  }
}
```

## Manual Verification Checklist

1. Start MySQL and all backend services.
2. Start the frontend.
3. Log in as `admin@dexa.test`.
4. Create an employee with a unique employee number, email, and initial password.
5. Log out from HRD admin.
6. Log in as the employee.
7. Submit WFH attendance with a JPEG, PNG, or WEBP proof photo and browser location permission. Supported mobile browsers may open the device camera from the uploader.
8. Confirm the employee history screen shows the new record.
9. Log back in as HRD admin.
10. Confirm the monitoring screen shows the employee attendance record.
11. Preview the proof photo from monitoring.
12. Update employee data.
13. Delete or deactivate the employee.
14. Confirm the deactivated employee can no longer authenticate or submit attendance.
15. Reactivate the employee.
16. Confirm the reactivated employee can authenticate again.

Additional negative checks:

1. Try submitting attendance without a photo.
2. Try uploading a non-image file.
3. Try submitting attendance twice on the same date.
4. Try calling an HRD endpoint with an employee token.
5. Try calling employee attendance submission with an HRD admin token.

Mobile geolocation note: browser geolocation usually requires HTTPS or `localhost`. If you open the frontend from a phone through plain local-network HTTP, for example `http://192.168.x.x:5173`, the browser may block location access. Use HTTPS tunneling or a hosted HTTPS URL for a real mobile-device test. When using a phone URL or tunnel URL, also include that frontend origin in `CORS_ORIGIN` before starting `api-gateway`.

## Technical Decisions

MySQL is used because the test explicitly prefers MySQL or Oracle, and MySQL gives the best balance of requirement alignment, relational integrity, local Docker simplicity, and reviewer convenience for this scenario. The services use separate logical databases in one MySQL container to keep local setup simple while preserving service-level data ownership.

NestJS TCP transport is used between the gateway and services. This shows a real NestJS microservices concept without adding RabbitMQ, Kafka, or Kubernetes complexity that is not justified for a 3 to 5 day technical test.

Proof photos are stored by `attendance-service` through a small storage abstraction. Docker development uses local disk at `/app/uploads/attendance` backed by the `attendance_uploads` Docker named volume, so normal local restarts keep uploaded proof photos. Production must use S3-compatible object storage such as Railway Bucket through `PROOF_STORAGE_DRIVER=s3`; local container filesystem is not acceptable for production proof photos because a redeploy or restart can remove files while MySQL metadata remains.

In production, the intended data split is:

```text
MySQL:
- users
- employees
- attendance_records
- proof metadata, location, and timestamps

Railway Bucket or S3-compatible storage:
- binary proof photo objects
- example key: attendance-proofs/2026-07-02/<uuid>.jpg
```

If an attendance record was created while production still used local container storage, the database row can remain after the container file disappears. That old image cannot be reconstructed from MySQL. The clean demo path is to delete or ignore the stale record and submit a new attendance after bucket storage is configured.

Database schema is created explicitly from `mysql/init.sql` when the MySQL container is initialized. `TYPEORM_SYNC=false` is the default so services do not mutate database schema at runtime. `TYPEORM_SYNC=true` can still be used as a local emergency shortcut, but it is not the recommended review path.

Employee deletion is implemented as a soft delete through `DELETE /employees/:id`. The employee and auth user are deactivated, while historical attendance records remain available for HRD monitoring. HRD admin can reactivate the employee through `PATCH /employees/:id/activate`.

Employee creation spans `auth-service` and `employee-service`. The gateway uses a simple compensation step to deactivate the auth account if employee creation fails. A production-grade distributed workflow would use stronger saga or outbox handling.

## Current Verification Status

Before the latest mobile navigation, pagination, and mandatory location changes, the application was verified with:

```text
npm audit --omit=dev
npm run build -w @dexa/frontend
npm run build
npm run test
```

Docker Compose was exercised on Windows and exposed a runtime TypeORM metadata issue in `employee-service`; that issue has been fixed by explicitly mapping `phone_number` as `varchar(40)`. Additional hardening has also been applied for CORS, proof-photo content validation, production JWT secret handling, internal Docker service exposure, proof modal preview, employee reactivation, server-side pagination, mandatory attendance location capture, API rate limiting, API security headers, frontend 404 handling, httpOnly cookie auth, CSRF protection, Vercel frontend config, and S3-compatible proof storage support. After the latest changes, rerun `npm run build`, `npm run test`, and `docker compose up --build` from Windows CMD before final submission. If you keep an existing MySQL volume from before the location columns existed, run `mysql/migrations/002-add-attendance-location.sql` once before testing attendance submission.

## Non-Scope

The project intentionally does not include payroll, leave requests, shift scheduling, continuous location tracking, approval/rejection workflow, notifications, or analytics. The geolocation feature captures a single browser-provided location sample during attendance submission only; it is not background tracking and it is not anti-spoofing-grade proof.
