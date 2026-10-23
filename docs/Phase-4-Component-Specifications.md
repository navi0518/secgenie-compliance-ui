# Phase 4 — Component Specifications

## Design tokens

| Token | Value | Use |
|---|---|---|
| Canvas | `#F8FAFC` | App workspace backdrop |
| Surface | `#FFFFFF` / `#FDFDFE` | Cards, tables, panels and header |
| Text | `#35344E` | Primary content |
| Muted text | `#64748E` | Metadata, captions and secondary labels |
| Primary blue | `#0284C7` | Selected navigation, links, primary interactions |
| Indigo | `#6366F1` | Secondary data series and graph accents |
| FAIL / critical risk | `#EA6F6C` / rose family | Always paired with text and an icon |
| High | Orange family | Always paired with a severity label |
| PASS / low risk | Green family | Always paired with a status label |
| MANUAL | Amber family | Requires manual validation |
| Border | `#E7EDF4` | Card boundaries and table separators |

Typography uses the platform's compact sans-serif aesthetic: page title 16–18 px, widget title 13–14 px, table body 12–13 px, muted metadata 10–12 px, KPI values 28–32 px. Use 40–45 px as the usual table row height. Cards use a 10 px radius, thin border and subtle shadow; avoid heavy gradients or extra decoration.

## Component inventory

### 1. AppShell / Sidebar / TopBar
- **Layout:** full-height desktop shell; approximately 210 px sidebar; 52 px utility header; white surfaces and thin separators.
- **Hierarchy:** brand at top, current section has pale blue fill and blue text, secondary navigation muted.
- **Interactions:** active Compliances section; global customer context; refresh invalidates/re-fetches the RTK Query data; mobile navigation opens as a drawer.
- **Accessibility:** nav has a label; mobile open/close actions are keyboard operable; focus indicator must remain visible.

### 2. WorkspaceTabs and FilterToolbar
- **Layout:** horizontal Overview / Assets / Findings tabs, framework select, global search, and local risk/exposure/status selectors.
- **Hierarchy:** selected tab gets a 2 px blue underline; filter labels are concise; inputs have white fill and cool-gray borders.
- **Interactions:** framework and status filters apply consistently; asset filters combine risk and exposure; reset clears the local filter state; KPI selections deep-link into a filtered tab.
- **Accessibility:** labels are programmatically associated with selects and inputs; tabs report `aria-selected`; search supports clear and Enter without relying on icons alone.

### 3. MetricCard
- **Layout:** responsive grid, four cards at wide desktop, two at tablet and one at narrow width.
- **Hierarchy:** muted uppercase label, bold KPI value, short explanatory caption, small line icon.
- **Interactions:** failed-assessment, manual-review and exposure cards filter the corresponding table.
- **Accessibility:** interactive cards are buttons and expose a visible focus style; values are accompanied by text, not color alone.

### 4. FrameworkPostureCard
- **Layout:** one card per framework, stacked on narrow viewports; one horizontal PASS/FAIL/MANUAL bar.
- **Hierarchy:** framework name, observed pass rate, compact record counts, check/requirement counts.
- **Interactions:** click applies or clears a framework filter; bar has an accessible text alternative.
- **Caveat:** current value is record-level `PASS / (PASS + FAIL)`, not a coverage-adjusted standard compliance score. MANUAL is excluded and historical trends are unavailable.

### 5. TopFailedChecks
- **Layout:** ranked compact list inside a standard card; each item includes label, framework, requirement multiplicity, count and a horizontal frequency bar.
- **Hierarchy:** control/check name is emphasized; framework context and mapping caveat are muted.
- **Interactions:** click filters Findings to the selected framework, check ID and FAIL status.
- **Caveat:** frequency is assessment-record frequency, not necessarily unique defects or unique affected assets.

### 6. FindingsTable / AssetTable
- **Layout:** dense horizontally scrollable table, sticky-width identity column recommended, 25 rows per page, summary in header and pagination footer.
- **Hierarchy:** blue semibold primary record label, monospace identifier, muted secondary context, compact semantic badges.
- **Interactions:** row action opens the drawer; table search can filter by asset name, resource ID, framework, check, requirement and extended status; sorting/pagination do not change underlying records.
- **Accessibility:** true table markup with scoped headers, accessible row actions and no color-only status encoding; empty state gives recovery guidance.

### 7. InvestigationDrawer
- **Layout:** right-side panel approximately 520–620 px on desktop, full-width on small screens, scrim behind it.
- **Hierarchy:** title and status/risk badges, tab row, compact key/value grids and evidence sections.
- **Sections:** Overview, Evidence, Relationships and Raw JSON. In asset mode, Overview emphasizes identity and linked findings; in finding mode, Overview emphasizes framework/requirement, raw extended status and available remediation.
- **Interactions:** close button, Escape key, copy source ID/evidence, navigate to linked asset/finding, inspect neighboring graph node.
- **Progressive disclosure:** lengthy remediation, rationale, impact, source references and raw JSON are placed in separate tabs/sections. Missing fields show explicit source-data messages.
- **Accessibility:** `role=dialog`, `aria-modal=true`, labelled close action and Escape dismissal. Production hardening should add focus trapping and return focus to the invoking row after close.

### 8. Data quality / historical states
- Always display the scan-ID mismatch between discovery `AWS-001` and findings `AWS-0002` until backend provenance confirms equivalence.
- Keep account-scope findings on account context and unresolved resource findings in their own workflow; never attach them to a guessed asset.
- Render a historical-trend empty state until multiple comparable snapshots are stored.
- Keep source severity null when missing; do not substitute asset risk level for finding severity.
- Display the CIS 8.1 remediation as generic source guidance; ISO findings may have no remediation content in this export.

## Color accessibility

Status badges combine label, shape and distinct foreground/background treatment. Target at least WCAG AA contrast for normal text, keyboard access to every action, visible focus rings, and direct chart labels or legends. Do not use pink/green or red/green alone to encode a decision.


## Scope update

The compliance workspace is findings-focused. It does not expose a duplicate asset-list tab because asset inventory browsing belongs to the existing Asset Map. Asset context is available only as supporting context inside the investigation drawer. The primary views are Overview, Findings Insights, and All Findings.
