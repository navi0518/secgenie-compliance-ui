import { useState } from "react";
import type { ReactNode } from "react";
import { Archive, Check, ChevronDown, ChevronRight, Copy, LockKeyhole, MoreHorizontal, Pencil, RotateCcw } from "lucide-react";
import { useSecurityContext } from "../../context/useSecurityContext";
import { CHECK_FRAMEWORKS, type CheckFrameworkId, type CheckItem, type CheckSeverity } from "../../types/checksCatalogue";

interface Props {
  checks: CheckItem[];
  loading: boolean;
  error: boolean;
  mappingCount: number;
  selectedFrameworks: CheckFrameworkId[];
  onRetry: () => void;
  onFrameworkClick: (id: CheckFrameworkId) => void;
  onToggleActive: (check: CheckItem, active: boolean) => void;
  onEdit: (check: CheckItem) => void;
  onDuplicate: (check: CheckItem) => void;
  onDeleteOrDeactivate: (check: CheckItem) => void;
  onReset: (check: CheckItem) => void;
  onViewRunbook: (check: CheckItem) => void;
  accountIds?: string[];
}

const severityTone: Record<CheckSeverity, string> = {
  Critical: "border-rose-200 bg-rose-50 text-rose-800",
  High: "border-orange-200 bg-orange-50 text-orange-800",
  Medium: "border-amber-200 bg-amber-50 text-amber-800",
  Low: "border-slate-200 bg-slate-100 text-slate-700",
};
const frameworkTone: Record<CheckFrameworkId, string> = {
  "CIS-5.0": "border-indigo-200 bg-indigo-50 text-indigo-800",
  "CIS-8.0": "border-sky-200 bg-sky-50 text-sky-800",
  "CIS-8.1": "border-cyan-200 bg-cyan-50 text-cyan-800",
  "ISO27001-2013": "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
};

export function ChecksRegistryTable({ checks, loading, error, mappingCount, selectedFrameworks, onRetry, onFrameworkClick, onToggleActive, onEdit, onDuplicate, onDeleteOrDeactivate, onReset, onViewRunbook, accountIds = [] }: Props) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0"><h2 className="text-xs font-semibold text-slate-900">Checks registry <span className="ml-1 font-medium text-slate-400">({checks.length.toLocaleString()})</span></h2><p className="mt-0.5 text-xs text-slate-500">Expand for a short risk preview; use the runbook drawer for detailed remediation.</p></div>
        <div className="flex flex-wrap items-center justify-end gap-2"><span className="hidden rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-500 sm:inline-flex">{mappingCount.toLocaleString()} requirement mappings</span>{accountIds.length > 0 && <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] text-slate-500"><span>Account scope</span><span className="font-mono font-medium text-slate-700">{accountIds[0]}</span>{accountIds.length > 1 && <span className="text-slate-400">+{accountIds.length - 1}</span>}</span>}<span className="rounded-md bg-slate-50 px-2 py-1.5 text-[11px] text-slate-500">Compact view</span></div>
      </div>

      {loading ? <div className="px-4 py-14 text-center text-xs text-slate-500">Loading check definitions…</div> : error ? <div className="px-4 py-14 text-center"><p className="text-xs font-semibold text-rose-700">Could not load the checks catalogue.</p><button type="button" onClick={onRetry} className="mt-2 text-xs font-medium text-sky-700 hover:underline">Retry request</button></div> : (
        <div className="max-h-[calc(100vh-390px)] min-h-[320px] overflow-auto">
          <table className="w-full min-w-[1060px] table-fixed border-collapse text-left">
            <colgroup><col style={{ width: "7%" }} /><col style={{ width: "25%" }} /><col style={{ width: "17%" }} /><col style={{ width: "8%" }} /><col style={{ width: "24%" }} /><col style={{ width: "10%" }} /><col style={{ width: "9%" }} /></colgroup>
            <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 shadow-[0_1px_0_#e2e8f0]">
              <tr><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Check name / ID</th><th className="px-3 py-2.5">Service / resource</th><th className="px-3 py-2.5">Severity</th><th className="px-3 py-2.5">Framework coverage</th><th className="px-3 py-2.5">Type</th><th className="px-3 py-2.5 text-right">Action</th></tr>
            </thead>
            {checks.map((check, rowIndex) => <RegistryRow key={check.checkId} rowIndex={rowIndex} check={check} selectedFrameworks={selectedFrameworks} onFrameworkClick={onFrameworkClick} onToggleActive={(active) => onToggleActive(check, active)} onEdit={() => onEdit(check)} onDuplicate={() => onDuplicate(check)} onDeleteOrDeactivate={() => onDeleteOrDeactivate(check)} onReset={() => onReset(check)} onViewRunbook={() => onViewRunbook(check)} />)}
          </table>
          {checks.length === 0 && <div className="px-4 py-14 text-center"><div className="text-[11px] font-semibold text-slate-800">No checks match these filters</div><p className="mt-1 text-[10px] text-slate-500">Try a broader search or clear one of the selected facets.</p></div>}
        </div>
      )}
      {!loading && !error && <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] text-slate-500"><span>Standard definitions are read-only at source; edits are represented as local overrides.</span><span>{checks.filter((check) => check.isActive && !check.isArchived).length} active in current view</span></footer>}
    </section>
  );
}

function RegistryRow({ check, rowIndex, selectedFrameworks, onFrameworkClick, onToggleActive, onEdit, onDuplicate, onDeleteOrDeactivate, onReset, onViewRunbook }: { check: CheckItem; rowIndex: number; selectedFrameworks: CheckFrameworkId[]; onFrameworkClick: (id: CheckFrameworkId) => void; onToggleActive: (active: boolean) => void; onEdit: () => void; onDuplicate: () => void; onDeleteOrDeactivate: () => void; onReset: () => void; onViewRunbook: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { canExcludeRules, canManageCheckDefinitions } = useSecurityContext();
  return (
    <tbody className="text-xs">
      <tr className={`border-b border-slate-100 transition-colors ${expanded ? "bg-sky-50/50" : rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-sky-50/60`}>
        <td className="px-3 py-3 align-top">
          <button type="button" role="switch" aria-checked={check.isActive} aria-label={`${check.isActive ? "Deactivate" : "Activate"} ${check.name}`} disabled={check.isArchived || !canExcludeRules} title={!canExcludeRules ? "Action restricted: Requires SecurityEngineer or Admin permissions." : check.isArchived ? "Archived checks cannot be toggled" : undefined} onClick={() => onToggleActive(!check.isActive)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${check.isActive ? "bg-emerald-500" : "bg-slate-300"}`}><span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${check.isActive ? "translate-x-4" : "translate-x-1"} `} /></button>
          <span className={`mt-1 block text-[11px] font-semibold ${check.isArchived ? "text-slate-400" : check.isActive ? "text-emerald-700" : "text-slate-500"}`}>{check.isArchived ? "Archived" : check.isActive ? "Active" : "Inactive"}{!canExcludeRules && (
  <span
    className="ml-1 inline-block"
    title="Requires SecurityEngineer or Admin permissions."
  >
    <LockKeyhole
      size={9}
      className="inline"
      aria-hidden="true"
    />
  </span>
)}</span>
        </td>
        <td className="px-3 py-3 align-top">
          <div className="flex min-w-0 items-start gap-1.5"><button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} preview for ${check.name}`} className="mt-0.5 shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">{expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</button><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold leading-4 text-slate-800" title={check.name}>{check.name}</div><code className="mt-1 block truncate font-mono text-[11px] text-slate-400" title={check.checkId}>{check.checkId}</code>{check.isModified && !check.isCustom && <span className="mt-1 inline-flex rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">Modified from baseline</span>}</div></div>
        </td>
        <td className="px-3 py-3 align-top"><div className="truncate text-[11px] font-medium text-slate-700" title={check.service}>{check.service || "—"}</div><code className="mt-1 block truncate font-mono text-[11px] text-slate-400" title={check.resourceType}>{check.resourceType || "Resource type not set"}</code></td>
        <td className="px-3 py-3 align-top"><span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium ${severityTone[check.severity]}`}>{check.severity}</span></td>
        <td className="px-3 py-3 align-top"><div className="flex max-w-full flex-wrap gap-1">{check.frameworkIds.length ? check.frameworkIds.map((id) => { const framework = CHECK_FRAMEWORKS.find((item) => item.id === id); const count = check.frameworkAssociations.filter((association) => association.frameworkId === id).length; return <button key={id} type="button" onClick={() => onFrameworkClick(id)} title={`Filter catalogue by ${framework?.label ?? id}; ${count} linked requirement${count === 1 ? "" : "s"}`} aria-pressed={selectedFrameworks.includes(id)} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium transition hover:shadow-sm ${frameworkTone[id]} ${selectedFrameworks.includes(id) ? "ring-1 ring-sky-400 ring-offset-1" : ""}`}>{framework?.label ?? id}<span className="text-[11px] font-medium opacity-60">{count}</span></button>; }) : <span className="text-[11px] text-slate-400">Not mapped</span>}</div></td>
        <td className="px-3 py-3 align-top"><span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium ${check.isCustom ? "border-violet-200 bg-violet-50 text-violet-800" : "border-slate-200 bg-slate-100/80 text-slate-600"}`}>{check.isCustom ? "Custom" : "Standard"}</span></td>
        <td className="relative px-3 py-2.5 text-right align-top"><button type="button" disabled={!canManageCheckDefinitions} title={!canManageCheckDefinitions ? "Action restricted: Requires Admin permissions." : `Actions for ${check.name}`} onClick={() => setMenuOpen((value) => !value)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-white hover:text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400" aria-label={`Actions for ${check.name}`} aria-expanded={menuOpen}>{canManageCheckDefinitions ? <MoreHorizontal size={15} /> : <LockKeyhole size={12} />}</button>{menuOpen && <><button type="button" aria-label="Close actions menu" className="fixed inset-0 z-20 cursor-default" onClick={() => setMenuOpen(false)} /><div className="absolute right-2 top-9 z-30 w-48 rounded-lg border border-slate-200 bg-white p-1 text-left shadow-xl shadow-slate-900/10"><MenuItem icon={<Pencil size={12} />} label="Edit check" onClick={() => { setMenuOpen(false); onEdit(); }} /><MenuItem icon={<Copy size={12} />} label="Duplicate as custom" onClick={() => { setMenuOpen(false); onDuplicate(); }} />{check.isModified && !check.isCustom && <MenuItem icon={<RotateCcw size={12} />} label="Reset to baseline" onClick={() => { setMenuOpen(false); onReset(); }} />}<div className="my-1 border-t border-slate-100" /><MenuItem danger icon={<Archive size={12} />} label={check.isCustom ? "Archive / delete…" : "Audit deactivation…"} onClick={() => { setMenuOpen(false); onDeleteOrDeactivate(); }} /></div></>}</td>
      </tr>
      {expanded && <tr className="border-b border-slate-200 bg-sky-50/35"><td colSpan={7} className="px-5 py-3"><div className="grid items-start gap-3 md:grid-cols-[minmax(0,1.65fr)_minmax(210px,1fr)_auto]">
        <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Risk summary</p><p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-700">{check.description || "No plain-English description has been supplied."}</p>{check.rationaleStatement && <p className="mt-1 line-clamp-1 text-[11px] text-slate-500"><span className="font-semibold text-slate-600">Rationale:</span> {check.rationaleStatement}</p>}</div>
        <div className="grid grid-cols-3 gap-2 md:min-w-[210px]"><MiniStat label="Affected assets" value={check.affectedAssetCount} /><MiniStat label="Current findings" value={check.currentFindingCount} /><MiniStat label="Req. links" value={check.frameworkAssociations.length} /></div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end"><button type="button" onClick={onViewRunbook} className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg bg-sky-700 px-2.5 text-[10px] font-semibold text-white transition hover:bg-sky-800"><Check size={12} /> View Full Runbook</button><button type="button" onClick={onEdit} disabled={!canManageCheckDefinitions} title={!canManageCheckDefinitions ? "Action restricted: Requires Admin permissions." : "Edit check definition"} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">{!canManageCheckDefinitions && <LockKeyhole size={10}/>}Edit</button></div>
      </div></td></tr>}
    </tbody>
  );
}

function MiniStat({ label, value }: { label: string; value: number | undefined }) {
  return <div className="rounded-lg border border-slate-200 bg-white px-2 py-2"><p className="truncate text-[11px] font-medium text-slate-500" title={label}>{label}</p><p className="mt-1 text-xs font-semibold tabular-nums text-slate-800">{value == null ? "—" : value.toLocaleString()}</p></div>;
}

function MenuItem({ icon, label, onClick, danger = false }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return <button type="button" onClick={onClick} className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[10px] font-medium transition ${danger ? "text-rose-700 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-50"}`}>{icon}{label}</button>;
}
