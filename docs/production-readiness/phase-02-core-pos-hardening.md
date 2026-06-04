# Phase 2 - Core POS Hardening

## Status

Complete for Track A pilot.

Track B can reuse these changes, but still requires Phase 2B tenant isolation before public SaaS launch.

## Changes Implemented

### Order Idempotency

- Added `ClientRequestId` to orders.
- Added a unique database index on `BranchId + ClientRequestId`.
- Backend returns the existing order when the same client request is submitted again.
- Backend handles concurrent duplicate requests that race into the unique index.
- POS frontend now sends a unique `clientRequestId` for each checkout attempt.
- POS frontend blocks same-tick double submit with an in-flight guard.

### Order Code Robustness

- Order codes now include millisecond precision and a GUID fragment.
- This reduces collision risk compared with timestamp-to-second codes.

### Order Validation

- Backend rejects empty carts.
- Backend rejects item quantities less than or equal to zero.
- Backend rejects negative discounts.
- Backend rejects discounts greater than the order total.

### Inventory Ledger Correctness

- Sale inventory movements now set:
  - `BranchId`
  - `RefId`
  - `Note`
- Cancel inventory movements now set `BranchId`.
- This makes inventory ledger rows branch-scoped and auditable.

### Cancellation Correctness

- Cancelling a pending order no longer reduces customer `TotalSpent`.
- Customer spend is reduced only when the cancelled order was previously completed.
- Cashflow reversal remains based on existing sales cashflow entries, avoiding false reversal for pending orders.

### Shift Reconciliation

- Shift summary now includes:
  - cash sales total and count;
  - transfer sales total and count;
  - card sales total and count;
  - discount total;
  - completed order count;
  - cancelled order count;
  - cancelled order total;
  - net sales total.
- Expected cash drawer remains based on opening float plus cash sales only.
- Shift close audit now records broader reconciliation data.
- Shift UI displays the expanded reconciliation data.

## Database Migration

Added migration:

- `20260603093000_AddOrderClientRequestId`

This migration adds:

- nullable `Orders.ClientRequestId`;
- unique filtered index `IX_Orders_Branch_ClientRequestId`.

The running API must be restarted or redeployed for the migration to apply in the current setup.

## Verification

Completed:

- Backend compile check passed using a separate output directory.
- Frontend lint passed with no blocking errors.

Known warnings remain from existing generated/public files and unrelated unused imports.

## Remaining Work Moved to Later Phases

- Automated tests for duplicate order submission, cancellation, stock restoration, and shift reconciliation belong to Phase 7.
- Security hardening for auth, CORS, HTTPS, refresh tokens, and default admin belongs to Phase 3.
- Payment webhook idempotency belongs to Phase 5.
- Tenant isolation for SaaS belongs to Phase 2B.

