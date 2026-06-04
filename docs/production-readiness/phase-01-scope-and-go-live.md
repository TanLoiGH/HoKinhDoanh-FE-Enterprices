# Phase 1 - Scope and Go-Live Criteria

## Decision

The workflow covers two deployment tracks:

- Track A: controlled pilot for one small retail business.
- Track B: public or multi-tenant SaaS for unrelated businesses.

Track A is the first go-live target. Track B is supported by the workflow, but it has additional gates that must be completed before public launch.

This split is intentional. The current codebase has enough surface area for a real pilot, but it still needs hardening before it should support unrelated customers, public self-registration, subscription billing, or unattended operation.

## Target User

### Track A - Controlled Pilot

- Business type: small household business or small retail shop.
- Deployment model: one owner-controlled deployment.
- Number of branches for first launch: one primary branch.
- Number of concurrent operators: 1-5 users.
- Roles required: Admin, Cashier, Warehouse.
- Technical support model: developer/operator can access logs and server during pilot.

### Track B - Public or Multi-Tenant SaaS

- Business type: multiple unrelated retail businesses.
- Deployment model: shared platform or repeatable isolated deployments.
- Number of branches: multiple branches per business.
- Number of concurrent operators: must be capacity-tested.
- Roles required: platform owner, tenant owner, branch admin, cashier, warehouse, support operator.
- Technical support model: production support must not require direct developer intervention for routine incidents.

## In Scope for First Production Pilot

- Authentication and role-based access.
- Product catalog management.
- Category management with tax rates.
- POS order creation.
- Cash payment.
- Manual transfer payment.
- Inventory deduction when orders complete.
- Inventory adjustment.
- Order receipt view and print/PDF.
- Order cancellation with manager approval.
- Cash shift open/close.
- Cashflow tracking.
- Dashboard and basic reports.
- Revenue ledger and tax-oriented reports.
- Audit log for sensitive business actions.
- Realtime updates across active browser sessions.
- Docker-based deployment.
- SQL Server persistent storage.
- Redis for cache/realtime support.

## Additional Scope Required for Track B

- Tenant isolation across all database reads and writes.
- Tenant-aware authorization and admin boundaries.
- Tenant onboarding and deactivation.
- Self-service or operator-assisted account creation.
- Per-tenant domain, branding, or configuration where needed.
- Subscription billing or license management.
- Platform-level support tools.
- Platform-level audit logs separate from tenant audit logs.
- Per-tenant backup, export, and data deletion policy.
- Capacity planning and load testing for concurrent tenants.
- Legal documents: terms of service, privacy policy, data processing rules.
- Incident response process.

## Explicitly Out of Scope Until Track B Gates Are Complete

- Public self-registration.
- Public SaaS onboarding.
- Subscription billing in production.
- Shared database access by unrelated businesses without tenant isolation verification.
- Production e-invoice issuance with a real provider unless provider integration is validated.
- Full accounting system replacement.
- Advanced promotions, coupons, and loyalty points.
- Native hardware integration for cash drawers, scales, and dedicated receipt printers.
- Guaranteed offline selling for long network outages.
- Mobile app distribution through app stores.

## Required Go-Live Criteria

Track A can go live only when all items below are true.

### Business-Critical Behavior

- Creating an order is transactionally safe.
- Duplicate submits cannot create duplicate completed orders.
- Inventory cannot become incorrect under normal concurrent selling.
- Cancelling an order restores inventory and cashflow correctly.
- Cash shift close report reconciles cash, transfer, card, discount, and cancelled order data.
- Receipts can be printed or exported reliably.
- Reports do not crash when data is missing or incomplete.

### Security

- Default admin credentials are removed or forced to change on first login.
- CORS is restricted to the production frontend domain.
- HTTPS is enabled and HTTP redirects to HTTPS.
- JWT signing key is production-grade and not committed.
- Refresh tokens are protected appropriately.
- Authorization is enforced on backend endpoints, not only in the frontend UI.
- Failed login attempts are rate-limited and audit logged.

### Operations

- Production environment variables are documented.
- Database migrations are applied by an explicit deployment step.
- SQL Server backup runs automatically.
- A restore test has been performed successfully.
- API, frontend, database, and Redis health can be checked.
- Logs are available after container restart.
- There is a documented rollback path.

### Quality

- Backend build passes.
- Frontend build passes.
- Lint has no blocking errors.
- Core order/inventory/cashflow paths have automated tests.
- At least one end-to-end sale flow has been tested from login to receipt.
- Payment callback or manual transfer confirmation has an idempotency check.

## Additional Track B Go-Live Criteria

Track B can go live only after Track A criteria are complete and all items below are true.

### Tenant Isolation

- Every tenant-owned table has a tenant or business boundary.
- Every tenant-scoped query is filtered by the authenticated tenant.
- Cross-tenant access tests exist and pass.
- Platform support users cannot access tenant data without explicit audited permission.
- Tenant deletion/export policy is documented and tested.

### SaaS Operations

- Signup/onboarding flow is tested.
- Billing/license state can block or limit access safely.
- Support tooling can inspect tenant health without direct database access.
- Per-tenant usage metrics are available.
- Capacity tests cover expected tenant and user counts.
- Incident response, support escalation, and maintenance windows are documented.

### Compliance and Trust

- Privacy policy and terms of service exist.
- Data retention policy exists.
- Backup/restore is tenant-aware or explicitly documented.
- Security review covers public attack surface.
- Abuse prevention exists for signup, login, and public endpoints.

## Phase 1 Acceptance

Phase 1 is complete when this document is accepted as the production target and the next phase starts from this scope.

If Track B becomes the immediate target, add the tenant isolation phase before general security hardening and before any public launch.
