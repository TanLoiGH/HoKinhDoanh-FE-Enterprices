# Phase 2B - Tenant Isolation Gate

## Objective

Make the current single-database POS backend safe enough for public SaaS use across multiple customers by enforcing tenant boundaries consistently.

In this codebase, `Tenant` is the main store/business account and `Branch` is a physical or operating branch inside that tenant. This matches the KiotViet/Sapo-style model:

- One tenant can own many branches.
- Users belong to one tenant.
- A user can be assigned to one branch.
- Tenant admins can work across branches inside their own tenant.
- Ordinary staff remain branch-bound.
- The same email can exist in different tenants, but cannot be duplicated inside the same tenant.

## Implemented Controls

### Token tenant claim

- Access tokens include both `BranchId` and `TenantId`.
- `TenantId` is the authenticated user's main store/business account.
- `BranchId` is the user's assigned branch.
- Requests without a valid tenant/branch claim are rejected.

### Branch access enforcement

- `ITenantAccessService` resolves requested branches against the token tenant.
- If a request includes a branch from another tenant, the API throws `UnauthorizedAccessException`.
- Tenant admins can access another branch only when that branch belongs to their tenant.
- Non-admin users cannot access a branch different from their assigned branch.
- API middleware converts that exception into HTTP `403`.

### Tenant-aware login and user identity

- Login accepts optional `tenantCode`.
- If an email is unique globally, login works without `tenantCode`.
- If the same email exists in multiple tenants, login requires `tenantCode`.
- User email uniqueness is enforced by `TenantId + Email`, not by global email.
- Existing data is migrated conservatively by creating one tenant per existing branch, preserving the previous isolation behavior until branches are intentionally grouped under a shared tenant.

### Scoped endpoints

Tenant scoping was tightened for:

- Products, categories, inventory, cashflow, dashboard, analytics, reports, tax profile, orders, shifts, e-invoice preview.
- Customers update now loads by `Id + BranchId`, not global `Id`.
- User management now lists, creates, updates, and deactivates users only inside the caller tenant.
- Branch listing and branch profile updates are scoped to the caller tenant.
- The user-management UI now loads branch options from `/api/branches` instead of accepting an arbitrary branch id.
- The first branch in a tenant is automatically treated as the main branch, and a tenant cannot be left without a main branch.
- Tax declaration export resolves body `BranchId` through the tenant access service.
- Simulated IPN is scoped to the caller tenant.

### Cross-tenant application checks

- Creating an order with a customer from another tenant is rejected.
- Cancelling an order requires manager credentials from the same tenant and allowed branch scope.
- Customer spend updates in order/payment flows are scoped by branch.

## Automated Tests

Added tenant isolation regression checks in `D:\MyProject\BE\HKD.Tests\Program.cs`:

- Customer from tenant B cannot be used to create an order in tenant A.
- Manager from tenant B cannot cancel an order in tenant A.
- User management for tenant A cannot list, update, or create users in tenant B.
- A duplicate email is allowed across two different tenants.
- A duplicate email is rejected inside the same tenant.

Run:

```powershell
dotnet run --project D:\MyProject\BE\HKD.Tests\HKD.Tests.csproj
```

Expected:

```text
All tests passed.
```

## SaaS Readiness Notes

This closes the immediate Phase 2B gate for the current architecture, but public SaaS still needs operational controls before launch:

- Create a platform-admin role only if true cross-tenant support is required.
- Keep ordinary business admins tenant-bound.
- Add API integration tests that call real controllers with JWTs from different tenants.
- Add database-level review before adding new tables: every tenant-owned table needs a tenant key or a parent relation that enforces tenant scope.
- Add an admin workflow for intentionally grouping or moving branches under a tenant after data migration.
- Review background jobs and exports before enabling customer self-service.
