# Web User Guide

This guide explains how to use the Dexa WFH Attendance web application for the two use cases in the technical test:

1. Employee WFH attendance submission with photo proof.
2. HRD employee monitoring and employee master data management.

The application has two roles:

- `HRD_ADMIN`
- `EMPLOYEE`

## Before Opening The Web App

Start the backend stack with Docker from Windows CMD or PowerShell:

```bat
cd /d "D:\Files\Kuliah\Latihan koding\dexagroup"
docker compose down -v
docker compose up --build
```

Keep that terminal open. It runs MySQL, API Gateway, and the three internal NestJS services.

In another Windows CMD or PowerShell window, start the frontend:

```bat
cd /d "D:\Files\Kuliah\Latihan koding\dexagroup"
npm run dev:frontend
```

Open the web app:

```text
http://localhost:5173
```

Confirm the API is healthy:

```bat
curl http://localhost:4000/health
```

Expected response:

```json
{"status":"ok"}
```

If Docker setup fails, use `DOCKER_TUTORIAL.md`.

## Login Page

Open:

```text
http://localhost:5173/login
```

The login page accepts email and password. After login, the application redirects by role:

- HRD admin goes to employee management.
- Employee goes to WFH attendance submission.

The browser session is stored in an httpOnly cookie. The JWT should not appear in `localStorage`.

Seeded HRD admin account:

```text
Email: admin@dexa.test
Password: Admin12345!
```

## HRD Admin Flow

### 1. Log In As HRD Admin

Use the seeded account:

```text
admin@dexa.test
Admin12345!
```

After login, the HRD admin sees the HRD navigation:

- Employees
- Monitoring
- Sign out

### 2. Create Employee

Open:

```text
Employees
```

Fill the create employee form:

- Employee Number
- Full Name
- Email
- Department
- Position
- Phone
- Initial Password

Example:

```text
Employee Number: DX-001
Full Name: Demo Employee
Email: employee.demo@dexa.test
Department: IT
Position: Software Engineer
Phone: 081234567890
Initial Password: Employee123!
```

Click:

```text
Create Employee
```

Expected result:

- Success message appears.
- Employee appears in the employee table.
- Employee status is `Active`.
- The system creates both employee master data and login identity.

Validation behavior:

- Employee number must be unique.
- Email must be unique.
- Required fields cannot be empty.
- Initial password must contain at least 8 characters.

### 3. Update Employee

In the Employees table, click the edit icon on an employee row.

Update one or more fields:

- Employee Number
- Full Name
- Email
- Department
- Position
- Phone

Click:

```text
Save Employee
```

Expected result:

- Success message appears.
- Table row updates.
- If email changes, the login email is also updated.

### 4. Update Employee Status

In the Employees table, click the deactivate icon on an active employee row or the reactivate icon on an inactive employee row.

Confirm the browser confirmation prompt.

Expected result:

- Deactivate changes employee status to `Inactive`.
- Deactivate also disables the employee login account.
- Existing attendance history remains available.
- The inactive employee should no longer be able to log in or submit attendance.
- Reactivate returns both the employee master data and login account to `Active`.

This is a soft delete. Historical attendance is not physically deleted.

### 5. View Attendance Monitoring

Open:

```text
Monitoring
```

The monitoring page shows attendance submitted by employees.

Available filters:

- Date
- Employee

Click:

```text
Filter
```

Expected result:

- Matching attendance records appear in the table.
- Each row shows employee identity, attendance date, submitted timestamp, file metadata, location accuracy, and proof action.
- Use the pagination controls under the table to move between result pages.

### 6. Open Proof Photo

On the Monitoring page, click:

```text
Preview
```

Expected result:

- The proof photo opens in an in-page modal dialog.
- HRD admin can view proof photos.
- HRD admin cannot edit, delete, approve, or reject attendance records.

This matches the test requirement: HRD controls attendance in view-only mode.

## Employee Flow

### 1. Log In As Employee

Use the employee account created by HRD admin.

Example:

```text
Email: employee.demo@dexa.test
Password: Employee123!
```

After login, the employee sees employee navigation:

- Attendance
- History
- Sign out

### 2. Submit WFH Attendance

Open:

```text
Attendance
```

Select a proof photo. On supported mobile browsers, the file picker can open the device camera because the uploader includes a camera capture hint.

Modern phone camera photos can be large. The app optimizes supported photos before upload, so a raw camera photo around 6-12 MB can still be accepted as long as it can be compressed successfully.

Allowed file types:

- JPEG
- PNG
- WEBP

Maximum backend upload size after optimization:

```text
2 MB
```

The frontend targets about 1.5 MB before upload. If a selected photo is still too large after optimization, choose a smaller image or retake the photo closer to the subject.

Optional:

- Add notes up to 500 characters.

Click:

```text
Submit Attendance
```

Expected result:

- Success message appears with the server-recorded submitted timestamp.
- The browser captures location during submission and the backend accepts it only when accuracy is 500 meters or better.
- Selected photo and notes are cleared after successful submission.
- Attendance is recorded for the current business date based on `APP_TIMEZONE`.

Important behavior:

- The timestamp comes from the server, not the browser.
- Location is captured once at submit time. There is no background or continuous tracking.
- Mobile browser geolocation generally requires HTTPS or `localhost`; testing from a phone through plain `http://192.168.x.x` can be blocked by the browser.
- The system allows only one attendance submission per employee per business date.
- Inactive employees cannot submit attendance.

### 3. View Attendance History

Open:

```text
History
```

Expected result:

- Employee sees only their own attendance records.
- Each row shows date, submitted timestamp, file metadata, notes, location accuracy, and proof action.
- Use the pagination controls under the table to move between result pages.

Click:

```text
Preview
```

Expected result:

- The employee can preview their own proof photo in an in-page modal dialog.
- The employee cannot open another employee's proof photo.

## Negative Test Scenarios

Use these scenarios to verify validation and security boundaries.

### Login

Try logging in with a wrong password.

Expected result:

```text
Invalid email or password.
```

Try logging in as a deactivated employee.

Expected result:

```text
This account is inactive.
```

Try repeating failed login attempts quickly from the same device.

Expected result:

```text
Too many requests. Please try again later.
```

### Employee Management

Try creating an employee with an email already used by another employee.

Expected result:

```text
Email is already registered.
```

Try creating an employee with a duplicate employee number.

Expected result:

```text
Employee auth user, employee number, or email is already registered.
```

Try submitting the employee form with required fields empty.

Expected result:

- Browser blocks required fields, or
- API returns a validation error.

### Attendance Submission

Try submitting attendance without a photo.

Expected result:

```text
Proof photo is required.
```

Try uploading a non-image file.

Expected result:

```text
Proof photo must be a JPEG, PNG, or WEBP image.
```

Try uploading a file that is still larger than 2 MB after frontend optimization, or choose an unsupported/extreme image that cannot be optimized.

Expected result:

```text
The frontend shows a photo optimization error, or the backend returns: Proof photo must be smaller than 2 MB.
```

Try submitting attendance twice on the same business date.

Expected result:

```text
Attendance has already been submitted for today.
```

Try submitting attendance repeatedly in a short period.

Expected result:

```text
Too many requests. Please try again later.
```

### Role Access

Try opening HRD pages as an employee.

Expected result:

- User is redirected away from the HRD page, or
- API rejects the request.

Try submitting employee attendance as HRD admin.

Expected result:

- UI does not show the employee attendance submission page to HRD admin.
- API rejects the request if called directly.

## Expected Reviewer Demo Script

Use this short sequence for a clean demo:

1. Start backend with `docker compose up --build`.
2. Start frontend with `npm run dev:frontend`.
3. Open `http://localhost:5173`.
4. Log in as HRD admin.
5. Create employee `employee.demo@dexa.test`.
6. Log out.
7. Log in as the employee.
8. Submit attendance with a valid image.
9. Open employee history and confirm the new record.
10. Log out.
11. Log in as HRD admin.
12. Open Monitoring.
13. Filter by employee or date.
14. Preview the proof photo.
15. Open Employees.
16. Update employee data.
17. Deactivate employee.
18. Confirm the employee can no longer log in.
19. Reactivate employee.
20. Confirm the employee can log in again.

## Common UI States

The app shows different states during use:

- Skeleton rows while tables load.
- Disabled submit buttons while requests are running.
- Success alerts after confirmed server actions.
- Error alerts for invalid credentials, invalid uploads, duplicate attendance, rate limiting, and forbidden access.
- Empty table messages when no records exist.

Actions are not treated as successful until the backend confirms them.

## Stop The Application

Stop the frontend with:

```text
Ctrl + C
```

Stop Docker containers:

```bat
docker compose down
```

Delete local Docker database and upload volumes:

```bat
docker compose down -v
```

Use `down -v` only when you want a clean local test database.
