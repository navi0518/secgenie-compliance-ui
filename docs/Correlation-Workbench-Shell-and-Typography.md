# Correlation Workbench Shell and Typography Refactor

## Layout blueprint

1. **Global application topbar** remains owned by `OptionBDashboard` and is unchanged.
2. **Shared workbench shell** is rendered by `CorrelationWorkbenchLayout` for every tab: breadcrumb and Explore findings, workbench eyebrow/title/subtitle, shared framework/outcome controls, source alignment warning, and the unified navigation.
3. **Unified navigation** is owned by `WorkbenchTabBar`, the single source of truth for all five tabs, tab IDs, focus rings, icon dimensions, active state, and typography.
4. **Tab body** is the only conditional area. Exactly one of Overview & Correlation, By Asset Type, Framework Breakdown, Frameworks & Rule Catalog, or Checks Catalogue & Studio renders below the persistent shell.
5. **Checks Catalogue** retains its own in-tab title and metrics, with compact, consistent type sizes. Table runbook text remains in the existing slide-out drawer, not the expanded registry row.

## Styling standards

- Shared tab labels: `text-xs font-medium`, `px-3.5 py-1.5`, `h-4 w-4` icons.
- Catalogue title: `text-base font-semibold text-slate-900`; subtitle: `text-xs text-slate-500`.
- KPI values: `text-2xl font-bold text-slate-900`; labels: `text-[11px]`; helper text: `text-xs font-medium text-slate-500`.
- Registry headings: `text-[11px] font-semibold uppercase tracking-wider text-slate-500`.
- Check names use 12px semibold; technical identifiers use `font-mono text-[11px] text-slate-400`; severity/framework badges use 11px text and reduced vertical padding.

## Architecture guardrail

Do not wrap shell elements in `activeTab !== "checks"`. Only the tab panel content is conditional. This prevents tab 5 from losing the title, warning, filters, breadcrumb, or navigation and keeps behavior identical regardless of the selected view.
