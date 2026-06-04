# Production Readiness Workflow

This folder tracks the work required to move the POS project from MVP/pilot state to a deployable production system.

## Current Status

| Phase | Name | Status |
| --- | --- | --- |
| 1 | Scope and go-live criteria for Track A pilot and Track B SaaS | Complete |
| 2 | Core POS hardening | Complete |
| 2B | Tenant isolation gate for Track B SaaS | Complete |
| 3 | Security hardening | Complete |
| 4 | Offline/PWA hardening | Complete |
| 5 | Payment and reconciliation | Complete |
| 6 | Tax and e-invoice readiness | Complete |
| 7A | Automated testing baseline | Complete |
| 7 | Automated testing expansion | Complete |
| 8 | DevOps and deployment baseline | Complete |
| 9 | Monitoring and support baseline | Complete |
| 10 | Pilot rollout | Complete |

## Phase Documents

- [Phase 1 - Scope and Go-Live Criteria](./phase-01-scope-and-go-live.md)
- [Phase 2 - Core POS Hardening](./phase-02-core-pos-hardening.md)
- [Phase 2B - Tenant Isolation Gate](./phase-02b-tenant-isolation.md)
- [Phase 3 - Security Hardening](./phase-03-security-hardening.md)
- [Phase 4 - Offline/PWA Hardening](./phase-04-offline-pwa-hardening.md)
- [Phase 5 - Payment and Reconciliation](./phase-05-payment-and-reconciliation.md)
- [Phase 6 - Tax and E-Invoice Readiness](./phase-06-tax-and-einvoice-readiness.md)
- [Phase 7A - Automated Testing Baseline](./phase-07a-automated-testing-baseline.md)
- [Phase 7 - Automated Testing Expansion](./phase-07-automated-testing-expansion.md)
- [Phase 8 - DevOps and Deployment Baseline](./phase-08-devops-and-deployment.md)
- [Phase 9 - Monitoring and Support Baseline](./phase-09-monitoring-and-support.md)
- [Phase 10 - Pilot Rollout](./phase-10-pilot-rollout.md)
- [Testing Guide](./testing-guide.md)

## Working Rule

Complete one phase at a time. Do not expand scope during implementation unless the scope document is updated first.

Track A can continue directly to Phase 2. Track B required Phase 2B before public SaaS launch.

## Current Deployment Decision

Track A is ready for controlled pilot preparation after environment setup, database migration, backup/restore verification, and the Day -1 smoke test.

Track B tenant isolation baseline is implemented. Before public launch, run deployment smoke tests with at least two real tenants and verify no endpoint can read or mutate the other tenant's data.
