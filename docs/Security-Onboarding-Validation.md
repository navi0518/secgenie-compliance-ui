# Security & Onboarding Validation Report

Validated in the build-preparation environment on 2026-10-22.

| Validation | Result | Details |
|---|---|---|
| TypeScript/TSX syntax transpilation | PASS | 44 `.ts` / `.tsx` files; zero transpilation errors |
| Normalized assessment data | PASS | 1,568 assets; 2,200 findings; 488 relationships; statuses 836 FAIL / 1,240 PASS / 124 MANUAL |
| Framework rule catalog | PASS | 153 requirements; 119 unique checks; 222 requirement mappings across original rule catalog sources |
| Enriched checks catalog | PASS | 119 unique checks; 286 framework requirement mappings; 306 requirements; 4 frameworks; zero data validation errors |
| ZIP integrity | PASS | Confirmed after archive creation |
| Full TypeScript project build | NOT RUN / UNVERIFIED | Dependency installation timed out in the preparation environment. Run `npm install` and `npm run build` on the target machine. |

## Workflow verification notes

- Tour suppression, role preference, data-mode display preference, audit events, pending exclusions, and local finding triage use browser local storage for demo persistence.
- SecurityEngineer exclusion requests stay pending. An Admin using a different demo role can approve/reject in the Activity Log panel; an approved exclusion synchronizes the check definition and benchmark rule state in local/demo RTK Query state.
- Critical rules require typed `EXCLUDE` confirmation. Expiry is captured and logged; the front end does not enforce expiry/automatic reinstatement.
- The Add Cloud Account wizard captures connection intent only. No IAM role is assumed and no scan is executed.
- The demo role selector is intentionally exposed to evaluate all three UI roles. Replace it with identity-provider claims before production.

## Production gate

Do not deploy as a security control without server-side RBAC, authenticated user IDs, transactionally enforced maker-checker approval, durable/immutable audit logging, expiry enforcement, tenant-scoped cloud connection APIs, validated least-privilege trust/policy configuration, and tests around denied/partial/error cases. The current implementation demonstrates the UX and local state transitions; it cannot authorize production operations.
