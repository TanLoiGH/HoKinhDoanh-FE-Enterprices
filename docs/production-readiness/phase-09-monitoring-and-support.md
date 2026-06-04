# Phase 9 - Monitoring and Support Baseline

## Status

Complete for Track A pilot baseline.

## Changes Implemented

### Health Endpoints

Existing liveness endpoint:

- `GET /health`

New readiness endpoint:

- `GET /health/ready`

Readiness checks:

- SQL Server connectivity.
- Redis distributed cache read/write.

The readiness endpoint returns HTTP `200` when all checks pass and HTTP `503` when any dependency fails.

### Correlation ID

Every request now receives an `X-Correlation-ID` response header.

If the client sends `X-Correlation-ID`, the API preserves it. Otherwise, the API generates a new value.

This gives support a stable request identifier to correlate frontend errors, API logs, and reverse proxy logs.

### Health Check Script

Added:

- `D:\MyProject\BE\scripts\check-health.ps1`

Usage:

```powershell
cd D:\MyProject\BE
.\scripts\check-health.ps1 -BaseUrl http://localhost
```

For a production domain:

```powershell
.\scripts\check-health.ps1 -BaseUrl https://your-domain.example
```

## Minimum Monitoring Policy

For Track A pilot, monitor:

- frontend availability;
- API `/health`;
- API `/health/ready`;
- disk usage on the host;
- SQL Server container status;
- Redis container status;
- latest backup age.

## Minimum Alert Conditions

Alert when:

- `/health` is unavailable for more than 2 minutes;
- `/health/ready` returns `503` for more than 2 minutes;
- disk free space is below 15%;
- no SQL backup exists in the expected backup window;
- API container restarts repeatedly;
- DB container restarts unexpectedly.

## Support Runbook

### API Unavailable

1. Check containers:

```powershell
docker compose -f compose.prod.yaml ps
```

2. Check logs:

```powershell
docker logs hkd-api-server-prod --tail 200
docker logs hkd-nginx-prod --tail 200
```

3. Run health script:

```powershell
.\scripts\check-health.ps1 -BaseUrl http://localhost
```

### Database or Redis Not Ready

1. Check readiness output.
2. Check DB/Redis containers.
3. Check host disk usage.
4. Restart dependency only if logs show transient startup failure.
5. Restore from backup only after confirming data corruption or unrecoverable DB failure.

### User Reports a Failed Sale

1. Ask for time, cashier, order code if available, and screenshot.
2. Check browser/network error and `X-Correlation-ID` if visible.
3. Check order list for duplicate or pending order.
4. Check inventory ledger for product movement.
5. Check cashflow entry for payment movement.
6. If payment callback is involved, check payment reference.

## Known Gaps

- No centralized log aggregation yet.
- No external uptime monitor configured yet.
- No metric dashboard yet.
- No automated alert delivery configured yet.
- No frontend error tracking yet.

