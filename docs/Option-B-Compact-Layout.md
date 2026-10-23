# Option B — Compact Correlation Workbench

## Purpose

This refinement keeps Option B's correlation-heavy analytical direction while moving from a long single-page report to a compact, tabbed workspace. The persistent application shell and tokens remain consistent with SecGenie.AI: white cards, cool gray borders, compact sans-serif typography, restrained shadows, blue active states, and explicit semantic labels paired with color.

## Page hierarchy

1. **Persistent application shell** — sidebar, customer context, refresh and profile controls.
2. **Workspace header** — title, framework and outcome filters, one-line source-alignment warning, and a prominent Explore Findings action.
3. **Secondary segmented navigation**
   - **Overview & Correlation** — compact KPI strip, framework-share donut, grouped framework-outcome chart, and clickable asset-domain density cards.
   - **By Asset Type** — exposure/risk KPIs, asset-domain × framework correlation matrix, and grouped outcome bars.
   - **Framework Breakdown** — framework-share donut, grouped outcome comparison, top five failed-check cards, and status totals.
4. **Findings queue drawer** — search and quality/status filters with the findings table. It is opened by the header CTA or a chart/matrix selection rather than being rendered below the main dashboard.
5. **Investigation drawer** — individual finding or asset evidence, source identifiers, relationships, raw JSON and remediation.

## Progressive disclosure

- Do not render a full finding table in the primary view.
- Selecting a domain switches to the By Asset Type tab; selecting a matrix cell or chart bar opens the Findings Queue drawer with framework, status and domain filters applied.
- Selecting a finding opens the existing Investigation Drawer and closes the queue drawer.
- Detailed raw JSON and extended remediation remain behind the Investigation Drawer tabs.
- Keep the source-scan mismatch visible as a compact warning. Do not imply historical trends from a single snapshot.

## Compactness targets

- Header: 50 px.
- Breadcrumb/toolbar: 42 px.
- Navigation: approximately 42 px.
- KPI strip: 2 rows at mobile and 4 compact cards at large desktop.
- Overview charts: two columns at xl breakpoint.
- No full findings table below charts; granular records live in the queue drawer.
- Donut uses a 152 px SVG footprint to reduce chart-card height.

## Interaction contract

- Framework donut selects/toggles framework scope.
- Outcome chart bars open findings filtered by framework and status.
- Domain density cards switch to By Asset Type with the selected category.
- Matrix cells open the Findings Queue scoped to category + framework + FAIL.
- Failed-check cards open the queue scoped to framework + FAIL + check ID.
- The queue provides a search field and status/record-quality filters.

## Data integrity and accessibility

- Asset-domain cell counts include only findings linked to discovered assets.
- Account-scoped and unresolved assessments stay visible in diagnostics and are not attached to guessed assets.
- Finding severity is not inferred from FAIL status; asset criticality/risk remains a separate dimension.
- Donut and grouped bars retain a legend and labels. Outcome pills show text in addition to color.
- Tabs use `role=tablist` / `role=tab` / `role=tabpanel`, and drawers use dialog semantics and close controls.

## Component tree and responsive grid

```text
OptionBDashboard
├── Sidebar
├── ApplicationHeader
└── Workspace
    ├── WorkspaceHeader
    │   ├── FrameworkFilter
    │   ├── OutcomeFilter
    │   └── ExploreFindingsButton
    ├── SourceAlignmentWarning
    ├── SegmentedAnalysisTabs
    ├── OverviewCorrelationTab
    │   ├── CompactKpiGrid (2 columns mobile / 4 desktop)
    │   ├── FrameworkShare + FrameworkOutcomes (1 / 2 columns)
    │   └── CorrelationDensityCards (1 / 2 / 3 columns)
    ├── ByAssetTypeTab
    │   ├── CompactKpiGrid
    │   ├── CorrelationMatrix
    │   └── DomainOutcomeBars
    ├── FrameworkBreakdownTab
    │   ├── FrameworkShare + FrameworkOutcomes (1 / 2 columns)
    │   ├── TopFailedCheckCards (1 / 2 / 3 columns)
    │   └── OutcomeTotals
    ├── FindingListDrawer
    │   └── FindingsTable
    └── InvestigationDrawer
        ├── Overview
        ├── Evidence
        ├── Relationships
        └── Raw JSON
```

Tailwind grid classes used by the refined layout:

```tsx
<div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
  {/* compact KPI cards */}
</div>

<div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
  {/* donut and grouped chart in a tight pair */}
</div>

<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
  {/* clickable domain density cards */}
</div>
```

The selected tab is the only analysis panel rendered in the primary workspace. Detailed finding rows appear only in the findings queue drawer; the individual record drawer is layered above it when a finding is selected.
