# Phase 7A - Automated Testing Baseline

## Status

Complete as the first automated testing slice.

## Changes Implemented

### Test Harness

- Added `HKD.Tests` console test project.
- Added the test project to `HKD.slnx`.
- The harness runs without introducing a separate xUnit/NUnit dependency.

### Core POS Test

Added an order idempotency test covering:

- same `ClientRequestId` returns the existing order id;
- duplicate request does not create a second order;
- stock is deducted only once;
- cashflow is recorded only once;
- business create audit for the order is recorded only once.

## How to Run

```powershell
dotnet run --project D:\MyProject\BE\HKD.Tests\HKD.Tests.csproj
```

Expected output:

```text
All tests passed.
```

## Remaining Test Work

- Convert or expand into a formal test runner if needed.
- Add cancellation tests.
- Add shift reconciliation tests.
- Add payment callback tests.
- Add auth/security tests.
- Add frontend E2E tests for login, checkout, receipt, cancellation, and shift close.

