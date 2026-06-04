# Phase 5 - Payment and Reconciliation

## Status

Complete for Track A pilot baseline.

## Changes Implemented

### VNPAY IPN Hardening

- Added rate limiting to the public VNPAY IPN endpoint.
- VNPAY payload fields are now validated before parsing.
- Invalid amount parsing no longer throws an unhandled exception.
- Duplicate successful callbacks for the same completed order and same transaction number now return success idempotently.

### VietQR Simulator Hardening

- The simulated IPN endpoint now requires authenticated `CanSell` access.
- Replaying the simulator against an already completed order returns a successful idempotent response.
- Cancelled/non-confirmable orders still reject payment confirmation.

### Reconciliation Baseline

- Payment completion still records cashflow using `SalesTransfer`.
- Payment confirmation still broadcasts realtime cashflow/dashboard changes.
- Shift summary from Phase 2 now exposes transfer/card totals for end-of-shift reconciliation.

## Remaining Payment Work

- Add a real bank/provider transaction table if production provider integration is enabled.
- Add unique transaction reference constraints for real payment provider transaction IDs.
- Add provider-specific retry and reconciliation job.
- Add admin screen for unmatched bank transactions.
- Add tests for VNPAY success, duplicate callback, invalid signature, invalid amount, and failed payment.

