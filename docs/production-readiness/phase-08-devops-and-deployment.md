# Phase 8 - DevOps and Deployment Baseline

## Status

Complete for Track A pilot baseline.

## Changes Implemented

### Environment Template

Added backend `.env.example` with required production settings:

- `SA_PASSWORD`
- `JWT_KEY`
- `ALLOWED_ORIGINS`
- `NEXT_PUBLIC_LOCAL_API_URL`
- `ConnectionStrings__Redis`

### Backup and Restore Scripts

Added SQL Server scripts:

- `D:\MyProject\BE\scripts\backup-sqlserver.ps1`
- `D:\MyProject\BE\scripts\restore-sqlserver.ps1`

Backup example:

```powershell
cd D:\MyProject\BE
$env:SA_PASSWORD = "<production-sa-password>"
.\scripts\backup-sqlserver.ps1
```

Restore example:

```powershell
cd D:\MyProject\BE
$env:SA_PASSWORD = "<production-sa-password>"
.\scripts\restore-sqlserver.ps1 -BackupPath .\backups\HKD_DB_Enterprise-YYYYMMDD-HHMMSS.bak
```

## Deployment Runbook

### 1. Prepare Environment

Create `D:\MyProject\BE\.env` from `D:\MyProject\BE\.env.example`.

Required production rules:

- Use a strong SQL Server password.
- Use a JWT key with at least 32 characters.
- Set `ALLOWED_ORIGINS` to the real frontend domain only.
- Set `NEXT_PUBLIC_LOCAL_API_URL` to the public API URL.

### 2. Build and Start Production Stack

```powershell
cd D:\MyProject\BE
docker compose -f compose.prod.yaml up -d --build
```

### 3. Verify Health

```powershell
docker compose -f compose.prod.yaml ps
curl http://localhost/health
```

Expected API health response should be successful through Nginx.

### 4. Verify Core Flow

Run a smoke test manually:

- login as admin;
- create product;
- open shift;
- create order;
- print/view receipt;
- close shift;
- export one report;
- create a SQL backup.

### 5. Backup

Run backup before and after deployment:

```powershell
$env:SA_PASSWORD = "<production-sa-password>"
.\scripts\backup-sqlserver.ps1
```

### 6. Rollback

Rollback strategy for Track A pilot:

1. Stop current stack.
2. Restore previous image/version or previous source revision.
3. Restore database backup if migration/data changes must be reverted.
4. Restart stack.
5. Run smoke test.

## Known Gaps

- CI/CD pipeline is not implemented yet.
- Automated scheduled backup is not configured yet.
- Restore script must be tested against the actual production container image before go-live.
- HTTPS certificate automation is not completed.
- Migration execution is still tied to application startup in the current setup.

