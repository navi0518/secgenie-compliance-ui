# Checks Catalogue — Visual Refresh Blueprint

## Design intent

Keep the existing compact Option B navigation and content width, but make the catalogue read as part of the same light enterprise application shell. The screen uses white card surfaces, a slate-neutral canvas, subtle `#E2E8F0` dividers, `#0F172A` primary text, and blue active states. Semantic severity badges stay light-tinted rather than becoming dark blocks.

## Hierarchy, top to bottom

1. **Single screen header** — `Checks Catalogue`, a one-line task description, and right-aligned `Refresh` / `Create Custom Check` actions. The route-level duplicate strip is hidden only on this screen; the tab strip remains navigation rather than a second title card.
2. **Five KPI cards** — equal-height cards for total, automated, manual/mixed, custom, and framework coverage. Each uses a small accent icon, one large numeric value, and subdued metadata.
3. **Single compact filter toolbar** — flexible fuzzy-search field followed by searchable multi-select Frameworks and Services menus, severity chips with counts, type, active state, assessment mode, and Clear. Service taxonomy is placed inside one searchable popover instead of 25+ wrapped pills. At narrower widths, controls wrap naturally without creating a multi-row taxonomy cloud.
4. **Registry table** — a light bordered card with fixed proportions (7 / 25 / 17 / 8 / 24 / 10 / 9 percent), sticky pale header, zebra rows, soft hover state, truncation for long IDs/resource types, and compact standard/framework badges.
5. **Short row preview** — only risk summary, optional rationale, asset/finding/mapping counts, and `View Full Runbook` / `Edit`. It does not render raw markdown or multiline commands inside the table.
6. **Runbook drawer** — focused slide-over with Risk Summary, Console Guide, AWS CLI, and Audit Steps. Command content uses a dedicated code surface with Copy and Export Script actions.

## Component responsibilities

- `ChecksHeaderAndMetrics.tsx`: header actions and summary metrics only.
- `ChecksFilterToolbar.tsx`: filter control presentation and facet selection state; filtering remains owned by `ChecksCatalogueView`.
- `ChecksRegistryTable.tsx`: fixed-width table, status toggle, framework chips, action menu, compact disclosure row; CRUD operations are callbacks into the existing RTK Query mutations.
- `CheckRunbookDrawer.tsx`: inspection-only runbook workspace, copy/export affordances, warnings that commands are not executed.
- `ChecksCatalogueView.tsx`: data derivation, mutation orchestration, audit dialog, custom-check wizard, editor drawer, notices.

## Theme behavior

Tailwind v4's `dark` variant is explicitly class-driven. The existing shell is light, so OS-level dark preference no longer independently turns nested catalog panels into slate-950 surfaces. A deliberate `.dark` class on the application root can still activate the existing dark utilities if the design system adopts a full dark theme later.

## Data and interaction rules

- Counts are derived from current catalogue data. No fabricated historical metrics are shown.
- Framework chips filter by framework when clicked; badge counts are linked requirement counts per check.
- The service and framework menus are searchable, multi-select, show per-option check counts, and support clear/done actions.
- The row preview never contains runbook-sized content. Full instructions open in the drawer.
- CLI commands are displayed, copied, or exported only; this interface does not execute them.
- Existing mutation endpoints, safety dialog, editor, custom creation wizard, and reset-to-baseline flow are preserved.
