# Testing Guide

## One-Command Readiness Test

Run this when you want to check the current production-readiness baseline:

```powershell
cd D:\MyProject\BE
.\scripts\run-readiness-tests.ps1
```

This runs:

- Backend build.
- Backend automated tests.
- Frontend lint.

Expected result:

```text
All requested readiness tests completed.
```

Frontend lint may still show warnings from generated Workbox files and old unused imports. The important signal is `0 errors`.

## Tenant Smoke Test Against A Running API

After the backend is running locally or on staging, run:

```powershell
cd D:\MyProject\BE
.\scripts\run-readiness-tests.ps1 `
  -ApiBaseUrl "http://localhost:5122" `
  -TenantAEmail "admin@tenant-a.example" `
  -TenantAPassword "your-password" `
  -TenantACode "tenant-a" `
  -OtherBranchId 2
```

`TenantACode` is optional when the email exists in only one tenant. Pass it whenever the same email can exist in multiple main stores/business accounts.

`OtherBranchId` must be a branch that belongs to a different tenant. Do not use another branch of the same main store/business account, because tenant admins are allowed to access branches inside their own tenant.

The tenant smoke test logs in as tenant A and tries to request a branch from tenant B. The expected result is:

- `/api/products?branchId=2` returns `403`.
- `/api/customers?branchId=2` returns `403`.
- `/api/reports/pnl?branchId=2` returns `403`.
- `/api/tax-profile?branchId=2` returns `403`.
- `/api/users` must not return users from another tenant.
- `/api/branches` must not return branches from another tenant.

If any check fails, do not launch public SaaS until the cause is fixed.

## When To Run

- After every tenant/auth/security change.
- Before staging deploy.
- Before public SaaS launch.
- After applying migrations to a new environment.
