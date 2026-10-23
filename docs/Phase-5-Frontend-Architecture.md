# Phase 5 — Frontend Architecture

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS 3 with SecGenie-style tokens in `tailwind.config.js`
- Redux Toolkit and RTK Query for data cache, refresh, invalidation and API boundaries
- Lucide React for consistent line icons

## Project layout

```text
src/
  app/
    store.ts
    securityApi.ts
  components/
    FindingsTable.tsx
    InvestigationDrawer.tsx
    MetricCard.tsx
    StatusBadge.tsx
  pages/
    ComplianceDashboard.tsx
  types.ts
  main.tsx
  index.css
public/mock/normalized-dataset.json
source-data/
  asset_discovery.json
  CIS-5.0_findings.json
  CIS-8.1_findings.json
  ISO27001-2013_findings.json
scripts/normalize_data.py
docs/
  Phase-4-Component-Specifications.md
  Phase-5-Frontend-Architecture.md
```

## Data/API boundaries

The runnable demo fetches `GET /mock/normalized-dataset.json` via RTK Query. The API service exposes four typed endpoints using the same normalized response for the static demo:

- `getNormalizedDataset()` — full normalized contract
- `getFrameworkSummaries()` — framework aggregates
- `getFilteredFindings({ framework, status, search })` — filtered finding records
- `getAssetDetail(uid)` — selected asset plus associated findings

For production, replace the mock path with authenticated endpoints such as:

- `GET /api/security/dataset`
- `GET /api/security/framework-summaries?framework=...`
- `GET /api/security/findings?framework=...&status=...&q=...`
- `GET /api/security/assets/:uid`
- `GET /api/security/assets/:uid/relationships`

Apply account/customer authorization and paging server-side. Do not expose the bundled source exports or their raw evidence without the same authorization as the platform's security findings.

## Normalization

`python scripts/normalize_data.py` reads the four original source exports and rebuilds the public mock contract. Resource findings are attached only through identity resolution (exact composite `assetId`, then exact ARN/resource ID and cautious ARN-resource suffix matching). Account-scoped findings are associated with an account scope entity, not an individual asset. Unresolved rows remain unattached. The response includes original source IDs, raw finding payloads, assessment counts, relationship provenance, and diagnostics.

## Derived-data caveats

- Source scan IDs differ: discovery `AWS-001`; each framework `AWS-0002`.
- No historical snapshots exist in the provided sources. Trend charts remain in an explicit empty state.
- Standard finding severity is missing in the source exports. Do not infer severity from asset `riskLevel`.
- Pass rate is record-level `PASS / (PASS + FAIL)` with MANUAL excluded; avoid calling it a fully assessed or coverage-adjusted compliance score.
- Repeated finding IDs are preserved; a signature only flags duplicate candidates.

## Run locally

```bash
npm install
npm run normalize:data  # optional; rebuilds the generated mock JSON
npm run dev
```

Open the Vite local URL printed in the terminal (normally `http://localhost:5173`). To create a production build, run `npm run build` and then `npm run preview`.
