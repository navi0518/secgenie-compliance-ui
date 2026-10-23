import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpenCheck, Check, Copy, ExternalLink, GitBranch, LockKeyhole, Terminal, X } from "lucide-react";
import { useSecurityContext } from "../../context/useSecurityContext";
import type { RuleDefinition, RuleMapping } from "../../types/rules";

export type ProcedureTab = "console" | "cli" | "audit";

interface Props {
  rule: RuleDefinition | null;
  mapping: RuleMapping | null;
  onClose: () => void;
  onToggle: (checkId: string, enabled: boolean) => void;
  onViewFindings?: (mapping: RuleMapping) => void;
}

function EmptySource({ children = "Not supplied by this benchmark definition." }: { children?: string }) {
  return <p className="rounded-md border border-dashed border-sec-line bg-slate-50 px-3 py-4 text-xs leading-5 text-sec-muted">{children}</p>;
}

export function ProcedureContent({ text, kind }: { text?: string | null; kind: ProcedureTab }) {
  if (!text) return <EmptySource />;
  const chunks = text.split(/(```[\s\S]*?```)/g).filter(Boolean);
  return <div className="space-y-2 text-xs leading-5 text-sec-text">{chunks.map((chunk, index) => {
    if (chunk.startsWith("```") && chunk.endsWith("```")) {
      const code = chunk.replace(/^```[\w-]*\s*/, "").replace(/```$/, "").trim();
      return <pre key={index} className="overflow-x-auto rounded-md bg-slate-950 p-3 font-mono text-[11px] leading-5 text-emerald-200"><code>{code}</code></pre>;
    }
    const lines = chunk.split(/\n/);
    return <div key={index} className={kind === "cli" ? "rounded-md bg-slate-50 p-3 font-mono text-[11px] leading-5" : "whitespace-pre-wrap"}>{lines.map((line, lineIndex) => <span key={lineIndex} className="block">{line.replace(/\*\*/g, "").replace(/`/g, "")}</span>)}</div>;
  })}</div>;
}

export function RemediationDrawer({ rule, mapping, onClose, onToggle, onViewFindings }: Props) {
  const { canExcludeRules } = useSecurityContext();
  const [tab, setTab] = useState<"overview" | ProcedureTab>("overview");
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLElement | null>(null);
  useEffect(() => { setTab("overview"); setCopied(false); }, [rule?.checkId, mapping?.mappingUid]);
  useEffect(() => {
    if (!rule) return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => { window.removeEventListener("keydown", handler); before?.focus(); };
  }, [rule, onClose]);

  const mappings = useMemo(() => rule?.mappings ?? [], [rule]);
  const frameworkBadges = useMemo(() => Array.from(new Set(mappings.map((item) => item.frameworkId))), [mappings]);
  if (!rule || !mapping) return null;

  const procedure = tab === "console" ? mapping.consoleRemediation : tab === "cli" ? mapping.cliRemediation : tab === "audit" ? mapping.auditProcedure : null;
  const copyValue = tab === "overview" ? rule.checkId : procedure ?? "";
  const copy = async () => {
    try { await navigator.clipboard.writeText(copyValue); setCopied(true); window.setTimeout(() => setCopied(false), 1200); }
    catch { setCopied(false); }
  };

  return <div className="fixed inset-0 z-[60] flex justify-end" role="presentation">
    <button type="button" aria-label="Close rule details backdrop" onClick={onClose} className="absolute inset-0 bg-slate-950/30" />
    <aside ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Rule details ${rule.checkId}`} className="relative flex h-full w-full max-w-[720px] flex-col border-l border-sec-line bg-sec-canvas shadow-2xl">
      <header className="border-b border-sec-line bg-white px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="rounded-md bg-sky-50 p-2 text-sec-blue"><BookOpenCheck size={17}/></span>
          <div className="min-w-0 flex-1"><div className="text-[10px] font-semibold uppercase tracking-wide text-sec-muted">Benchmark rule definition</div><h2 className="mt-1 break-words font-mono text-sm font-semibold text-sec-text">{rule.checkId}</h2><p className="mt-1 text-xs text-sec-muted">{mapping.requirementId} · {mapping.requirementDescription}</p></div>
          <button type="button" onClick={onClose} aria-label="Close rule detail drawer" className="icon-button"><X size={16}/></button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${rule.enabled ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{rule.enabled ? "Enabled for scan scope" : "Excluded from scan scope"}</span>
          {rule.isCrossFramework && <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-800"><GitBranch size={11}/>{rule.frameworkCount} frameworks · {rule.mappingCount} mappings</span>}
          <button type="button" onClick={() => onToggle(rule.checkId, !rule.enabled)} role="switch" aria-checked={rule.enabled} disabled={!canExcludeRules} title={!canExcludeRules ? "Action restricted: Requires SecurityEngineer or Admin permissions." : undefined} className={`ml-auto inline-flex items-center gap-2 rounded-md border px-3 py-2 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${rule.enabled ? "border-rose-200 bg-white text-rose-700 hover:bg-rose-50" : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}>{!canExcludeRules && <LockKeyhole size={11}/>}<span className={`h-2 w-2 rounded-full ${rule.enabled ? "bg-rose-500" : "bg-emerald-500"}`}/>{rule.enabled ? "Disable rule" : "Enable rule"}</button>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-sec-line bg-white px-5" role="tablist" aria-label="Rule detail sections">
        {[{ id: "overview", label: "Overview" }, { id: "console", label: "Console remediation" }, { id: "cli", label: "CLI remediation" }, { id: "audit", label: "Audit procedure" }].map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id as typeof tab)} className={`shrink-0 border-b-2 px-2 py-3 text-[11px] font-semibold ${tab === item.id ? "border-sec-blue text-sec-blue" : "border-transparent text-sec-muted hover:text-sec-text"}`}>{item.label}</button>)}
      </nav>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
        {tab === "overview" ? <>
          <section className="rounded-card border border-sec-line bg-white p-3">
            <h3 className="text-xs font-semibold text-sec-text">Check metadata</h3>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <div><dt className="text-[9px] font-semibold uppercase text-sec-muted">Framework</dt><dd className="mt-1 text-xs text-sec-text">{mapping.frameworkId} · v{mapping.frameworkVersion}</dd></div>
              <div><dt className="text-[9px] font-semibold uppercase text-sec-muted">Requirement</dt><dd className="mt-1 text-xs text-sec-text">{mapping.requirementId}</dd></div>
              <div><dt className="text-[9px] font-semibold uppercase text-sec-muted">Profile</dt><dd className="mt-1 text-xs text-sec-text">{mapping.profile ?? "Not specified in source"}</dd></div>
              <div><dt className="text-[9px] font-semibold uppercase text-sec-muted">Assessment status</dt><dd className="mt-1 text-xs text-sec-text">{mapping.assessmentStatus ?? "Not specified in source"}</dd></div>
              <div className="col-span-2"><dt className="text-[9px] font-semibold uppercase text-sec-muted">Category / section</dt><dd className="mt-1 text-xs text-sec-text">{mapping.sourceSection}</dd></div>
              {mapping.objectiveId && <div><dt className="text-[9px] font-semibold uppercase text-sec-muted">Objective ID</dt><dd className="mt-1 text-xs text-sec-text">{mapping.objectiveId}</dd></div>}
              {mapping.objectiveName && <div><dt className="text-[9px] font-semibold uppercase text-sec-muted">Objective name</dt><dd className="mt-1 text-xs text-sec-text">{mapping.objectiveName}</dd></div>}
            </dl>
          </section>
          <section className="rounded-card border border-sec-line bg-white p-3"><h3 className="text-xs font-semibold text-sec-text">Description</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-sec-muted">{mapping.description || "No check description was supplied for this mapping."}</p></section>
          <section className="rounded-card border border-sec-line bg-white p-3"><h3 className="text-xs font-semibold text-sec-text">Rationale</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-sec-muted">{mapping.rationaleStatement || "Rationale statement not supplied by this benchmark file."}</p></section>
          <section className="rounded-card border border-sec-line bg-white p-3"><h3 className="text-xs font-semibold text-sec-text">Impact</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-sec-muted">{mapping.impactStatement || "Impact statement not supplied by this benchmark file."}</p></section>
          <section className="rounded-card border border-sec-line bg-white p-3"><div className="flex items-center justify-between gap-2"><h3 className="text-xs font-semibold text-sec-text">Cross-framework mappings</h3><span className="rounded bg-slate-100 px-2 py-1 text-[10px] text-sec-muted">{mappings.length} mappings</span></div><div className="mt-2 flex flex-wrap gap-1.5">{frameworkBadges.map((fw) => <span key={fw} className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-800">{fw}</span>)}</div><div className="mt-3 divide-y divide-sec-line">{mappings.map((item) => <div key={item.mappingUid} className="py-2"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] font-semibold text-sec-blue">{item.frameworkId} · {item.requirementId}</span><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-sec-muted">{item.profile ?? "Profile n/a"}</span><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-sec-muted">{item.assessmentStatus ?? "Mode n/a"}</span></div><p className="mt-1 text-[11px] text-sec-text">{item.requirementDescription}</p></div>)}</div></section>
          {mapping.additionalInformation && <section className="rounded-card border border-sec-line bg-white p-3"><h3 className="text-xs font-semibold text-sec-text">Additional information</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-sec-muted">{mapping.additionalInformation}</p></section>}
          {mapping.references && <section className="rounded-card border border-sec-line bg-white p-3"><h3 className="text-xs font-semibold text-sec-text">References</h3><p className="mt-2 break-all whitespace-pre-wrap text-xs leading-5 text-sec-blue">{mapping.references}</p></section>}
        </> : <section className="rounded-card border border-sec-line bg-white p-3">
          <div className="mb-3 flex items-center gap-2"><span className="rounded-md bg-slate-100 p-1.5 text-sec-muted"><Terminal size={14}/></span><div><h3 className="text-xs font-semibold text-sec-text">{tab === "console" ? "Console remediation" : tab === "cli" ? "CLI remediation" : "Audit procedure"}</h3><p className="mt-0.5 text-[10px] text-sec-muted">Verbatim source instructions with code blocks highlighted.</p></div><button type="button" onClick={copy} className="ml-auto inline-flex items-center gap-1 rounded-md border border-sec-line px-2 py-1.5 text-[10px] font-semibold text-sec-muted hover:bg-slate-50"><Copy size={11}/>{copied ? "Copied" : "Copy"}</button></div>
          {tab === "console" && mapping.remediationMode === "general" && <div className="mb-3 rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-[10px] text-sky-900">The source does not separate Console and CLI sections; the full remediation procedure is shown here as general guidance.</div>}
          {tab === "console" && mapping.remediationSharedCheckCount >= 5 && <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-900"><strong>Shared source guidance:</strong> this exact remediation text is reused across {mapping.remediationSharedCheckCount} check IDs in {mapping.frameworkId}. The source text is preserved; confirm rule-specific applicability before using it as a runbook.</div>}
          {tab === "audit" && mapping.auditSharedCheckCount >= 5 && <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-900"><strong>Shared audit guidance:</strong> this exact audit text is reused across {mapping.auditSharedCheckCount} check IDs in {mapping.frameworkId}. Confirm the instructions actually validate this check.</div>}
          <ProcedureContent text={procedure} kind={tab}/>
        </section>}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-sec-line bg-white px-5 py-3"><div className="min-w-0"><div className="text-[9px] font-semibold uppercase text-sec-muted">Check ID</div><div className="mt-1 truncate font-mono text-[10px] text-sec-text">{rule.checkId}</div></div><div className="flex items-center gap-2"><button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-md border border-sec-line px-3 py-2 text-[10px] font-semibold text-sec-text hover:bg-slate-50"><Copy size={12}/>{copied ? <><Check size={12}/>Copied</> : "Copy"}</button>{onViewFindings && <button type="button" onClick={() => { onClose(); onViewFindings(mapping); }} className="inline-flex items-center gap-1.5 rounded-md bg-sec-blue px-3 py-2 text-[10px] font-semibold text-white hover:bg-sky-700">View findings <ExternalLink size={12}/></button>}</div></footer>
    </aside>
  </div>;
}
