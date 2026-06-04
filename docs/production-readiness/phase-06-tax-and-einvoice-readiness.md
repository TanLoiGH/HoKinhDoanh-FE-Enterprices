# Phase 6 - Tax and E-Invoice Readiness

## Status

Complete for Track A pilot baseline.

## Changes Implemented

### Tax Profile Validation

- Tax profile save now validates required legal fields:
  - taxpayer/business name;
  - tax code;
  - business address;
  - tax authority;
  - representative/signing person.
- Basic email and tax code length validation were added.
- Invalid profile data now returns `400 Bad Request` with an error list.

### Tax Declaration Validation

- Tax declaration export now validates:
  - year range;
  - taxpayer name;
  - tax code;
  - business address;
  - non-negative revenue values;
  - total revenue `[11]` matches sum of `[08a]` through `[08g]`.
- Validation errors return `400 Bad Request` instead of becoming server errors.

### E-Invoice Demo Preview

- Demo preview now checks that the requested order exists in the current branch.
- Demo preview is allowed only for completed orders.
- Demo preview response now includes the order net amount.

## Current Policy

E-invoice is still demo-only. The system does not issue legally valid electronic invoices and does not send data to VNPT/MISA or another provider.

## Remaining Work

- Choose actual e-invoice provider and sandbox.
- Define invoice XML/PDF mapping.
- Add provider credentials storage and secret handling.
- Add issue/retry/cancel invoice states.
- Add invoice transaction table if real issuance is enabled.
- Add tests for tax declaration validation and e-invoice preview.

