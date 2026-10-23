# SecGenie.AI — Option B Compact Correlation Workbench

A compact, tabbed React + TypeScript compliance analytics workspace that keeps Option B's correlation-first approach while minimizing page length and cognitive load. It follows the supplied SecGenie.AI design baseline: white cards, cool-gray borders, compact typography, pale-blue selected states, restrained shadows, and explicit status labels paired with semantic color.

## Layout

- **Overview & Correlation** — compact KPI strip, framework-share donut, grouped framework-outcome bars, and six clickable domain-density cards.
- **By Asset Type** — asset/exposure KPIs, interactive asset-domain × framework matrix, and grouped PASS/FAIL/MANUAL outcome bars.
- **Framework Breakdown** — framework donut, outcome comparison, top-five failed-check cards, and status totals.
- **Frameworks & Rule Catalog** — searchable requirement/check catalog sourced from CIS 5.0, CIS 8.0, and ISO 27001:2013 definitions; category grouping, cross-framework mapping, per-check enable/disable, Level 1 and manual-only batch actions, plus a remediation/audit drawer.
- **Findings queue drawer** — searchable findings table with status and record-quality filtering; no granular table is appended to the dashboard page.
- **Investigation drawer** — individual evidence, remediation, source IDs, relationship context and raw JSON.

Selecting a domain switches to the asset-type view. Selecting a chart bar, failed-check card or matrix cell opens the findings queue in a right-side drawer with applicable filters already set. Opening an individual record moves to the existing investigation drawer.

## Run

Requirements: Node.js 20+ recommended, npm, and Python 3.10+ only if regenerating the normalized JSON.

```powershell
npm install
npm run validate:data
npm run normalize:rules
npm run validate:rules
npm run build
npm run dev
```

Vite prints a local URL (typically `http://localhost:5173`). To rebuild the normalized asset/finding dataset from the four original exports under `source-data/`:

```powershell
npm run normalize:data
npm run validate:data
```

## Data interpretation notes

- Discovery uses scan ID `AWS-001`; all three findings exports use `AWS-0002`. The UI surfaces this mismatch rather than claiming a shared scan run.
- Historical trend charts are omitted until comparable snapshots are stored.
- Finding-level severity is not populated. Chart series represent PASS / FAIL / MANUAL outcomes; asset criticality and public exposure remain separate dimensions.
- Asset-domain correlation includes only findings linked to resolved inventory assets. Account-scoped and unresolved records remain visible in diagnostics and are not attached to guessed assets.
- Counts are source assessment records, not necessarily unique vulnerabilities or distinct defects.

`public/mock/normalized-dataset.json` is a demo artifact containing raw source objects. Do not publicly deploy real customer findings this way. Replace the mock API path with authenticated, tenant-scoped endpoints before production use.

## Benchmark rule catalog

The three new baseline definitions are included in `source-data/` and normalized to `public/mock/rule-catalog.json`. The catalog contains 153 requirements, 119 unique checks, 222 requirement/check mappings, and 45 checks shared across multiple frameworks. See `docs/Rule-Catalog-Integration.md` for the exact data model, cross-framework semantics, batch actions, procedure splitting, live scan-scope preview behavior, and production API integration requirements.

Rule state is client-side demo state persisted in localStorage because the benchmark source files do not declare Active/Enabled. All unique check IDs start enabled as a demonstration default. To make exclusions authoritative for scans, persist a versioned rule-set in the backend and submit that rule-set version to the scan execution service.

The rule catalog uses three framework IDs: `CIS-5.0`, `CIS-8.0`, and `ISO27001-2013`. The existing findings export contains `CIS-8.1`, not `CIS-8.0`; when an 8.1 finding is enriched from the 8.0 catalog, the drawer explicitly labels it as a related check-ID reference, not a claim of benchmark equivalence. ISO entries lack profile, assessment mode, rationale, impact and procedure fields in the supplied source, and those gaps are surfaced rather than invented.

## Documentation

- `docs/Option-B-Compact-Layout.md` — refined hierarchy, layout rules, navigation and progressive disclosure.
- `docs/Option-B-Design-Specification.md` — detailed correlation concepts, chart semantics and data limitations.
- `docs/Option-B-Code-Snippets.md` — core code examples.
- `docs/Rule-Catalog-Integration.md` — benchmark catalog schema, mutations, live posture behavior and production recommendations.

## Compact-layout refinement

The primary workspace now renders exactly one analysis tab at a time. The Overview tab contains a compact KPI strip, a side-by-side donut and grouped chart, and clickable domain-density cards. Asset-type matrix and grouped domain outcomes live in the **By Asset Type** tab. Framework share, grouped outcomes and failed-control ranking live in **Framework Breakdown**. The granular findings table is opened in a wide side drawer rather than being placed underneath every chart.

See `docs/Option-B-Compact-Layout.md` for the layout hierarchy, component tree, grid rules and interaction contract.

## Enriched rule workspace (four framework definitions)

See [`docs/Enriched-Rule-Workspace.md`](docs/Enriched-Rule-Workspace.md). The new drop-in catalog and investigation drawer components consume structured check metadata from CIS 5.0, CIS 8.0, CIS 8.1, and ISO 27001:2013. Build the unified metadata catalog with `python scripts/build_enriched_rule_catalog.py`. Finding counts, score projections, exclusions and re-checks require live API adapters; the demo does not fabricate those results.

## Checks Catalogue & Studio

The first-class **Checks Catalogue & Studio** workspace adds enriched-check search and facets, framework requirement associations, custom check authoring, audited deactivation/archive workflows, and baseline reset for standard definitions.

- Data model and RTK Query contracts: `src/types/checksCatalogue.ts` and `src/app/checksCatalogueApi.ts`
- Main catalogue view: `src/components/checks/ChecksCatalogueView.tsx`
- Editor drawer: `src/components/checks/CheckEditorDrawer.tsx`
- Source-derived unified catalogue: `public/mock/checks-catalogue.json`
- Build and validate: `npm run build:checks-catalogue` and `npm run validate:checks-catalogue`
- Backend/production notes: `docs/Checks-Catalogue-Studio.md`

Demo mutations are stored in browser localStorage (`secgenie.checks-catalogue.demo.v1`). To integrate a secured backend, set `VITE_USE_MOCK_CHECKS_API=false` and implement the REST contracts documented in `docs/Checks-Catalogue-Studio.md`. The demo does not execute AWS commands or mutate scan results.

## Checks Catalogue visual refresh

The Checks Catalogue view now uses a light neutral surface system aligned with the global application shell. Its dedicated UI is split into:

- `src/components/checks/ChecksHeaderAndMetrics.tsx` — consolidated screen header and five KPI cards.
- `src/components/checks/ChecksFilterToolbar.tsx` — single-row responsive search/facet bar with searchable framework and AWS service multi-select menus.
- `src/components/checks/ChecksRegistryTable.tsx` — compact fixed-ratio registry table with subtle zebra striping, badge chips, and concise row expansion.
- `src/components/checks/CheckRunbookDrawer.tsx` — slide-out Console / AWS CLI / Audit workspace with copy and export actions.
- `docs/Checks-Catalogue-Visual-Refresh.md` — layout blueprint and interaction design decisions.

Tailwind CSS v4 `dark:` utility behavior is class-driven in `src/index.css`, so operating-system dark preference cannot turn catalogue panels dark while the platform shell remains light. Apply a `.dark` class deliberately at the application root if the platform later enables a global dark theme.
