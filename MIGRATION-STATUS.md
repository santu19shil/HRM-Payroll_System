# HR Payroll Enterprise Migration - Status

## Completed
- ✅ Backend migrated from in-memory store to SQLite (`backend/db/sqlite.js`)
- ✅ Added JWT auth + RBAC scaffolding (`backend/middleware/auth.js`)
- ✅ Added auth endpoints
  - `POST /api/auth/register`
  - `POST /api/auth/login`
- ✅ Added company endpoint
  - `GET /api/companies/me`
- ✅ Updated employee/payroll/report endpoints to be company-aware and protected
  - `backend/routes/employees.js`
  - `backend/routes/payroll.js`
  - `backend/routes/reports.js`
- ✅ Frontend updated to send `Authorization: Bearer <token>` from `localStorage.accessToken`

## Backend install
- ✅ `npm install` succeeded in `backend/`

## Backend run blocker (PowerShell execution policy)
- ❌ `npm start` is blocked because PowerShell prevents loading `npm.ps1`.

### Fix
Run once in PowerShell:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```
Then run:
```powershell
cd "C:\Users\Santu\OneDrive\Desktop\hr-payroll\backend"
npm start
```

## Frontend
- Pending: install + `npm run dev` after backend is reachable.

## Next enterprise steps (not yet implemented)
- Build full Auth UI (login/register) + token persistence
- Add Dashboard + charts
- Add Departments/Designations management
- Add Attendance + Leave modules
- Add Payroll approval workflow + payslip generation (PDF)
- Add audit logs + exports (PDF/CSV/Excel)

