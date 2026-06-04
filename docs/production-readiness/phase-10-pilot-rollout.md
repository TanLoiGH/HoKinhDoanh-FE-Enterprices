# Phase 10 - Pilot Rollout

## Objective

Define the operational rollout path for a controlled single-business pilot. This is Track A readiness, not public SaaS readiness.

## Pre-Pilot Gate

Complete these before the first live sale:

- Backend build passes.
- Frontend lint passes.
- `HKD.Tests` passes.
- SQL Server migration is applied to the pilot database.
- `.env` is created from `D:\MyProject\BE\.env.example`.
- Production `Jwt__Key` is at least 32 characters and not reused from development.
- Production CORS origins are explicitly configured.
- `/health/ready` returns healthy.
- Backup script has produced at least one restorable `.bak` file.
- Restore script has been tested on a non-production database.

## Day -2: Data Preparation

- Import or create branch profile, users, categories, products, and opening stock.
- Configure tax profile with real legal business information.
- Configure e-invoice provider fields only if the provider is ready; otherwise keep provider as `None`.
- Create cashier and admin accounts with separate users.
- Disable or rotate any temporary development credentials.

## Day -1: Smoke Test

Use the pilot environment, not local development:

- Login as cashier.
- Open shift.
- Create one cash order.
- Create one transfer/card order if the store accepts those methods.
- Cancel one test order with manager approval.
- Check inventory movement.
- Check cashflow.
- Close shift and confirm expected drawer.
- Generate tax declaration preview/export if the business will use it during pilot.
- Run `D:\MyProject\BE\scripts\check-health.ps1` against the deployed API.
- Delete or clearly mark smoke-test orders if they are not real revenue.

## Day 0: First Live Day

- Keep manual receipt/fallback process available.
- Run the first 3-5 orders with a responsible operator watching stock, payment, and cashflow.
- After the first hour, compare POS sales total with actual cash/transfer evidence.
- At close shift, compare:
  - Cash drawer.
  - Transfer/card settlement evidence.
  - Cancelled orders.
  - Inventory movements for high-value products.

## Daily Close Checklist

- Close all open shifts.
- Export or record daily sales summary.
- Check cancelled orders and manager approvals.
- Check negative stock and low stock warnings.
- Run backup after business close.
- Confirm `/health/ready` is healthy after backup/restart if maintenance occurred.

## Rollback Criteria

Pause live POS usage and switch to manual fallback if any of these happen:

- Orders are duplicated despite stable `clientRequestId`.
- Stock movement is wrong after sale or cancellation.
- Shift expected drawer cannot be reconciled.
- Payment callback marks incorrect order/payment state.
- API health check fails and cannot recover quickly.
- Database backup cannot be produced.

## Pilot Exit Criteria

The project is ready to expand beyond the first pilot location when all conditions are met for at least 7 operating days:

- No unreconciled duplicate orders.
- No unexplained inventory drift in sampled products.
- Daily cash/transfer/card reconciliation matches actual evidence.
- Backup runs successfully every day.
- Staff can operate open shift, sale, cancellation, and close shift without developer intervention.
- Support issues are logged with correlation id, timestamp, user, branch, and reproduction notes.

## Track B Restriction

Do not launch as public SaaS until Phase 2B tenant isolation is implemented and verified. Track A pilot assumes one trusted business scope; Track B requires tenant boundary enforcement across authentication, data access, storage, logs, and operations.
