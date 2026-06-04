# Phase 7 - Automated Testing Expansion

## Objective

Expand the backend regression suite beyond order idempotency so the highest-risk POS money and inventory flows are covered before pilot rollout.

## Implemented Coverage

### Order idempotency

- Re-submitting the same `ClientRequestId` returns the existing order id.
- Duplicate submission does not create a second order.
- Stock, cashflow, and create audit are recorded only once.

### Order cancellation

- Manager authentication is required.
- Completed order is moved to `Cancelled`.
- Product stock is restored.
- Customer `TotalSpent` is reversed safely.
- Inventory ledger records sale stock-out and cancellation stock-in.
- Sale cashflow remains traceable and cancellation creates a `Void` cashflow.
- Cancellation audit log is recorded.

### Shift reconciliation

- Open shift and close shift are audited.
- Cash sales are calculated net of discount.
- Transfer and card sales are separated from cash drawer expectation.
- Discounts are counted for completed orders only.
- Cancelled order count and cancelled order total are reported separately.
- Expected drawer equals opening float plus completed cash sales.
- Variance compares counted cash with expected drawer.

## Verification Command

Run from any workspace path:

```powershell
dotnet run --project D:\MyProject\BE\HKD.Tests\HKD.Tests.csproj
```

Expected result:

```text
All tests passed.
```

## Remaining Test Gaps

- Frontend Playwright/E2E coverage is still missing.
- Real SQL Server migration smoke test is still manual.
- Payment gateway callbacks are covered by implementation hardening, but not yet by automated tests.
- Tax export/e-invoice preview flows need file/API integration tests if they become production-critical during pilot.
