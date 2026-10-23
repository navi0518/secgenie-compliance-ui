# Checks Catalogue & Studio

## What is included

- First-class `Checks Catalogue & Studio` workspace tab and primary-navigation shortcut.
- Global KPI strip and faceted search over ID, display name, description, rationale, requirement descriptions, service, resource type, severity, assessment status, and framework mappings.
- Dense registry table with active switch, interactive framework-coverage chips, custom/standard labels, row expansion, runbook preview, and action menu.
- Check editor drawer covering core metadata, severity, automation mode, rationale, impact, console remediation Markdown, AWS CLI script, audit procedure, and requirement-level framework links.
- Four-step custom-check wizard; custom identifiers use lowercase letters, digits, and underscores.
- Audited deactivation and custom-check archive/hard-delete safety modal; baseline reset for modified standard checks.
- RTK Query endpoints in `src/app/checksCatalogueApi.ts`, demo persistence in localStorage, and REST integration contracts when mock mode is disabled.

## Start / demo persistence

The view reads `public/mock/checks-catalogue.json`. Mutations in demo mode persist to localStorage under `secgenie.checks-catalogue.demo.v1`. Clear that key in browser storage to restore the generated fixture.

The catalogue fixture is generated from the four checked-in enriched benchmark JSON files by running:

```bash
npm run build:checks-catalogue
```

The static fixture contains unique checks and framework requirement links. Counts for affected assets and historical findings are optional and intentionally display as unavailable until an authenticated backend hydrates them.

## Backend contract

Set `VITE_USE_MOCK_CHECKS_API=false` to use the REST routes currently declared in `checksCatalogueApi.ts`:

- `GET /api/checks/catalogue`
- `PATCH /api/checks/:checkId`
- `POST /api/checks`
- `DELETE /api/checks/:checkId?mode=archive|hard-delete&auditReason=...`
- `POST /api/checks/:checkId/reset`

Production service requirements:

1. Validate identifiers, severity, service/resource taxonomy, runbook content, and referenced framework requirement IDs on the server.
2. Enforce tenant/account/role authorization for every mutation.
3. Persist actor, timestamp, reason, justification, ticket/approval reference, expiry, and before/after values in an immutable audit log.
4. Populate `affectedAssetCount` and `historicalFindingCount` from server-side joins at confirmation time; do not trust client-supplied counts.
5. Keep standard benchmark definitions immutable as baselines. Store overrides/versioned patches and support reset-to-baseline without rewriting the source benchmark artifacts.
6. Block hard deletion when references exist unless a governed retention policy authorizes it. Prefer archive/soft-delete for custom checks.
7. Keep definition mutation separate from scan execution. A change must not rewrite historic findings or claim compliance changes until a new scan/verification completes.

## Important model behavior

A custom check linked to a benchmark requirement only adds an association. It does not certify the full requirement. Requirements without source checks are included in the mapping picker so users can see the scope gap explicitly.
