# Phase 4 - Offline/PWA Hardening

## Status

Complete for Track A pilot baseline.

## Changes Implemented

### Safer Offline Scope

- Offline mutation queue is now limited to `/orders`.
- Cashflow and inventory import are no longer queued offline because those endpoints do not yet have idempotency guarantees.

### Stable Offline Order Idempotency

- Queued offline orders are guaranteed to have `clientRequestId`.
- Replaying the same queued order uses the same idempotency key.
- Duplicate queue entries with the same URL and `clientRequestId` are deduplicated.

### Retry Visibility

- Offline mutations now track:
  - `attempts`;
  - `lastError`.
- Existing localStorage queue items without `attempts` remain compatible.

## Current Offline Policy

Offline selling is supported only as a controlled pilot behavior for order creation. It is not yet a guarantee for long network outages or complex conflict resolution.

## Remaining Offline Work

- Add a queue management screen for failed queued orders.
- Add conflict handling when stock has changed before replay.
- Add explicit cashier confirmation before replaying old offline orders.
- Add automated tests for offline queue replay and duplicate prevention.

