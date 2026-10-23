import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { CHECK_FRAMEWORKS, CHECK_SEVERITIES, type CheckFrameworkId, type CheckSeverity, type ChecksFilterState } from "../../types/checksCatalogue";

interface Props {
  filters: ChecksFilterState;
  services: string[];
  serviceCounts: Record<string, number>;
  severityCounts: Record<CheckSeverity, number>;
  frameworkCounts: Record<CheckFrameworkId, number>;
  resultCount: number;
  totalCount: number;
  onChange: (patch: Partial<ChecksFilterState>) => void;
  onClear: () => void;
}

interface FacetOption {
  id: string;
  label: string;
  count: number;
}

const severityStyles: Record<CheckSeverity, { selected: string; idle: string; dot: string }> = {
  Critical: { selected: "border-rose-200 bg-rose-50 text-rose-800", idle: "border-slate-200 bg-white text-slate-600 hover:border-rose-200", dot: "bg-rose-500" },
  High: { selected: "border-orange-200 bg-orange-50 text-orange-800", idle: "border-slate-200 bg-white text-slate-600 hover:border-orange-200", dot: "bg-orange-500" },
  Medium: { selected: "border-amber-200 bg-amber-50 text-amber-800", idle: "border-slate-200 bg-white text-slate-600 hover:border-amber-200", dot: "bg-amber-500" },
  Low: { selected: "border-slate-300 bg-slate-100 text-slate-700", idle: "border-slate-200 bg-white text-slate-600 hover:border-slate-300", dot: "bg-slate-400" },
};

export function ChecksFilterToolbar({ filters, services, serviceCounts, severityCounts, frameworkCounts, resultCount, totalCount, onChange, onClear }: Props) {
  const frameworkOptions = CHECK_FRAMEWORKS.map((item) => ({ id: item.id, label: item.label, count: frameworkCounts[item.id] ?? 0 }));
  const serviceOptions = services.map((service) => ({ id: service, label: service, count: serviceCounts[service] ?? 0 }));
  const anyFilter = Boolean(filters.query || filters.services.length || filters.severities.length || filters.frameworks.length || filters.kind !== "all" || filters.active !== "all" || filters.assessmentStatus !== "all");

  return (
    <section aria-label="Filter checks" className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[230px] flex-[2_1_260px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={filters.query} onChange={(event) => onChange({ query: event.target.value })} className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100" placeholder="Search check ID, name, description, resource type…" aria-label="Search checks catalogue" />
        </label>

        <FacetDropdown label="Frameworks" options={frameworkOptions} selected={filters.frameworks} onToggle={(id) => onChange({ frameworks: toggle(filters.frameworks, id as CheckFrameworkId) })} searchPlaceholder="Find a framework…" />
        <FacetDropdown label="Services" options={serviceOptions} selected={filters.services} onToggle={(id) => onChange({ services: toggle(filters.services, id) })} searchable searchPlaceholder="Search AWS services…" />

        <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Filter by severity">
          <span className="mr-0.5 hidden items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 2xl:inline-flex"><SlidersHorizontal size={11} /> Severity</span>
          {CHECK_SEVERITIES.map((severity) => {
            const selected = filters.severities.includes(severity);
            return <button key={severity} type="button" aria-pressed={selected} title={`${severity}: ${severityCounts[severity] ?? 0} checks`} onClick={() => onChange({ severities: toggle(filters.severities, severity) })} className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2 text-[11px] font-medium transition ${selected ? severityStyles[severity].selected : severityStyles[severity].idle}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${severityStyles[severity].dot}`} />
              <span>{severity}</span><span className="tabular-nums opacity-70">{severityCounts[severity] ?? 0}</span>
            </button>;
          })}
        </div>

        <select aria-label="Check type" value={filters.kind} onChange={(event) => onChange({ kind: event.target.value as ChecksFilterState["kind"] })} className="h-9 min-w-[115px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
          <option value="all">All checks</option><option value="standard">Standard only</option><option value="custom">Custom only</option>
        </select>
        <select aria-label="Check status" value={filters.active} onChange={(event) => onChange({ active: event.target.value as ChecksFilterState["active"] })} className="h-9 min-w-[112px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
          <option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option>
        </select>
        <select aria-label="Assessment method" title="Assessment method" value={filters.assessmentStatus} onChange={(event) => onChange({ assessmentStatus: event.target.value as ChecksFilterState["assessmentStatus"] })} className="h-9 min-w-[128px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
          <option value="all">Automated + manual</option><option value="Automated">Automated</option><option value="Manual">Manual</option><option value="Mixed">Mixed</option><option value="Unspecified">Unspecified</option>
        </select>
        <button type="button" onClick={onClear} disabled={!anyFilter} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-default disabled:opacity-40"><X size={12} /> Clear</button>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
        <div className="flex min-w-0 items-center gap-2 text-[11px] text-slate-500"><Filter size={11} /><span className="truncate">Facet filters update the catalogue immediately</span></div>
        <div className="shrink-0 text-xs font-medium tabular-nums text-slate-500"><span className="font-semibold text-slate-800">{resultCount.toLocaleString()}</span> of {totalCount.toLocaleString()} checks</div>
      </div>
    </section>
  );
}

function FacetDropdown({ label, options, selected, onToggle, searchable = false, searchPlaceholder }: { label: string; options: FacetOption[]; selected: string[]; onToggle: (id: string) => void; searchable?: boolean; searchPlaceholder: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => { if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOnOutside); document.removeEventListener("keydown", closeOnEscape); };
  }, [open]);
  const visibleOptions = useMemo(() => options.filter((option) => !query.trim() || `${option.label} ${option.id}`.toLowerCase().includes(query.trim().toLowerCase())), [options, query]);
  const selectedSummary = selected.length ? `${selected.length} selected` : `All ${label.toLowerCase()}`;
  return (
    <div ref={rootRef} className="relative shrink-0">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((value) => !value)} className={`inline-flex h-9 min-w-[122px] items-center gap-2 rounded-lg border px-2.5 text-xs transition ${selected.length ? "border-sky-300 bg-sky-50/60 text-sky-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
        <span className="max-w-[118px] truncate font-medium">{label} ({options.length})</span>
        {selected.length > 0 && <span className="inline-flex h-[17px] min-w-[17px] items-center justify-center rounded bg-sky-100 px-1 text-[9px] font-bold text-sky-800">{selected.length}</span>}
        <ChevronDown size={12} className={`ml-auto text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[260px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
        <div className="border-b border-slate-100 px-3 py-2.5"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-800">Filter by {label.toLowerCase()}</p><button type="button" onClick={() => { selected.forEach(onToggle); }} className="text-[10px] font-medium text-sky-700 hover:underline">Clear</button></div><p className="mt-0.5 text-[11px] text-slate-500">{selectedSummary}</p>{(searchable || options.length > 8) && <div className="relative mt-2"><Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 pl-7 pr-2 text-xs outline-none focus:border-sky-400 focus:bg-white" /></div>}</div>
        <div role="listbox" aria-multiselectable="true" className="max-h-64 overflow-y-auto p-1.5">
          {visibleOptions.map((option) => {
            const checked = selected.includes(option.id);
            return <button key={option.id} type="button" role="option" aria-selected={checked} onClick={() => onToggle(option.id)} className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition ${checked ? "bg-sky-50 text-sky-900" : "text-slate-700 hover:bg-slate-50"}`}>
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-transparent"}`}><Check size={10} /></span>
              <span className="min-w-0 flex-1 truncate text-xs">{option.label}</span><span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-slate-500">{option.count}</span>
            </button>;
          })}
          {visibleOptions.length === 0 && <p className="px-2 py-6 text-center text-xs text-slate-400">No matching options</p>}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2"><span className="text-[11px] text-slate-500">{selected.length} selected</span><button type="button" onClick={() => setOpen(false)} className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white">Done</button></div>
      </div>}
    </div>
  );
}

function toggle<T extends string>(values: T[], value: T): T[] { return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]; }
