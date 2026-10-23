import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowUpRight, BellOff, BookOpenCheck, Check, CheckCircle2, Copy, FileJson, GitBranch, Info, LockKeyhole, ShieldCheck, Terminal, X } from "lucide-react";
import type { AssetEntity, ComplianceFinding, NormalizedSecurityDataset } from "../types";
import { RiskBadge, StatusBadge } from "./StatusBadge";
import type { RuleCatalogDataset, RuleMapping, RuleDefinition } from "../types/rules";
import { ProcedureContent, type ProcedureTab } from "./rules/RemediationDrawer";
import { useSecurityContext } from "../context/useSecurityContext";

export type DrawerSelection =
  | { kind: "asset"; asset: AssetEntity }
  | { kind: "finding"; finding: ComplianceFinding }
  | null;

type DrawerTab = "overview" | "evidence" | "relationships" | "benchmark" | "raw";

interface Props {
  selection: DrawerSelection;
  dataset: NormalizedSecurityDataset;
  onClose: () => void;
  onOpenFinding: (finding: ComplianceFinding) => void;
  onOpenAsset: (asset: AssetEntity) => void;
  ruleCatalog?: RuleCatalogDataset;
  onToggleRule?: (checkId: string, enabled: boolean) => void;
}

const tabs: Array<{ id: DrawerTab; label: string; icon: typeof Info }> = [
  { id: "overview", label: "Overview", icon: Info },
  { id: "evidence", label: "Evidence", icon: FileJson },
  { id: "relationships", label: "Relationships", icon: GitBranch },
  { id: "benchmark", label: "Rule guidance", icon: BookOpenCheck },
  { id: "raw", label: "Raw JSON", icon: FileJson },
];

function EmptyValue({ children = "Not present in source export" }: { children?: string }) {
  return <span className="text-xs italic text-slate-400">{children}</span>;
}

function DetailField({ label, value, mono = false }: { label: string; value?: string | number | null; mono?: boolean }) {
  return <div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-wide text-sec-muted">{label}</div><div className={`mt-1 break-words text-xs text-sec-text ${mono ? "font-mono" : ""}`}>{value === null || value === undefined || value === "" ? <EmptyValue/> : value}</div></div>;
}

export function InvestigationDrawer({ selection, dataset, ruleCatalog, onToggleRule, onClose, onOpenFinding, onOpenAsset }: Props) {
  const { canExcludeRules, canRemediateFindings, mutedFindingIds, verifiedFindingIds, muteFinding, verifyFinding } = useSecurityContext();
  const [tab, setTab] = useState<DrawerTab>("overview");
  const [copied, setCopied] = useState(false);
  const [procedureTab, setProcedureTab] = useState<ProcedureTab>("console");
  const [triageReason, setTriageReason] = useState("");
  const dialogRef = useRef<HTMLElement | null>(null);
  useEffect(() => { setTab("overview"); setProcedureTab("console"); setCopied(false); setTriageReason(""); }, [selection?.kind, selection?.kind === "asset" ? selection.asset.uid : selection?.kind === "finding" ? selection.finding.uid : null]);
  useEffect(() => {
    if (!selection) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const getFocusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? []);
    getFocusable()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      previouslyFocused?.focus();
    };
  }, [selection, onClose]);

  const asset = selection?.kind === "asset" ? selection.asset : selection?.kind === "finding" && selection.finding.assetUid ? dataset.assets.find((a) => a.uid === selection.finding.assetUid) ?? null : null;
  const finding = selection?.kind === "finding" ? selection.finding : null;
  const assetFindings = useMemo(() => asset ? dataset.findings.filter((f) => f.assetUid === asset.uid) : [], [asset, dataset.findings]);
  const relevantRelationships = useMemo(() => asset ? dataset.relationships.filter((r) => r.sourceAssetUid === asset.uid || r.targetAssetUid === asset.uid) : [], [asset, dataset.relationships]);
  const rawObject = selection?.kind === "asset" ? asset : finding?.raw ?? null;
  const benchmarkMatch = useMemo((): { rule: RuleDefinition; mapping: RuleMapping; matchLabel: string } | null => {
    if (!finding || !ruleCatalog) return null;
    const rule = ruleCatalog.rules.find((candidate) => candidate.checkId === finding.checkId);
    if (!rule) return null;
    const exact = rule.mappings.find((mapping) => mapping.frameworkId === finding.framework && mapping.requirementId === finding.requirementId);
    if (exact) return { rule, mapping: exact, matchLabel: "Exact framework + requirement match" };
    const sameFramework = rule.mappings.find((mapping) => mapping.frameworkId === finding.framework);
    if (sameFramework) return { rule, mapping: sameFramework, matchLabel: "Check ID match; requirement differs" };
    if (finding.framework === "CIS-8.1") {
      const cis8 = rule.mappings.find((mapping) => mapping.frameworkId === "CIS-8.0");
      if (cis8) return { rule, mapping: cis8, matchLabel: "Related CIS 8.0 catalog definition matched by check ID; not an assertion that CIS 8.0 and CIS 8.1 are equivalent" };
    }
    return { rule, mapping: rule.mappings[0], matchLabel: "Cross-framework check-ID match; validate applicability before acting" };
  }, [finding, ruleCatalog]);
  if (!selection) return null;

  const heading = selection.kind === "asset" ? selection.asset.name : selection.finding.requirementDescription;
  const copyText = selection.kind === "asset" ? selection.asset.arn || selection.asset.assetId : selection.finding.sourceFindingId || selection.finding.sourceRecordId || selection.finding.uid;
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button type="button" aria-label="Close investigation panel" className="absolute inset-0 cursor-default bg-slate-950/25" onClick={onClose}/>
      <aside ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Investigation details: ${heading}`} className="relative flex h-full w-full max-w-[620px] flex-col border-l border-sec-line bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-sec-line px-5 py-4">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-sec-muted"><ShieldCheck size={13}/> Investigation details</div>
            <h2 className="line-clamp-2 text-base font-semibold leading-6 text-sec-text">{heading}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {finding && <><StatusBadge status={finding.status}/><span className="rounded-md border border-sec-line px-2 py-1 text-[10px] font-medium text-sec-muted">{finding.framework}</span></>}
              {asset && <RiskBadge value={asset.riskLevel}/>} 
              {finding && <span className="text-[10px] text-sec-muted">{finding.scope} scope</span>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="icon-button shrink-0" aria-label="Close drawer"><X size={17}/></button>
        </div>

        <div className="flex gap-4 overflow-x-auto border-b border-sec-line px-5 pt-1" role="tablist" aria-label="Investigation sections">
          {tabs.filter((item) => item.id !== "benchmark" || Boolean(finding)).map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-1.5 border-b-2 px-1 py-3 text-xs font-medium transition ${tab === id ? "border-sec-blue text-sec-blue" : "border-transparent text-sec-muted hover:text-sec-text"}`}>
              <Icon size={14}/>{label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {tab === "overview" && (
            <div className="space-y-4">
              {finding ? (
                <>
                  <section className="rounded-card border border-sec-line p-3">
                    <h3 className="text-xs font-semibold text-sec-text">Assessment details</h3>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">
                      <DetailField label="Requirement ID" value={finding.requirementId}/><DetailField label="Check ID" value={finding.checkId} mono/>
                      <DetailField label="Region" value={finding.region}/><DetailField label="Severity" value={finding.severity}/>
                      <DetailField label="Source scan ID" value={finding.sourceScanId}/><DetailField label="Resolution method" value={`${finding.identityResolution.method} · ${finding.identityResolution.confidence}`}/>
                      <DetailField label="Source finding ID" value={finding.sourceFindingId} mono/><DetailField label="Source record ID" value={finding.sourceRecordId} mono/>
                    </div>
                  </section>
                  <section className="rounded-card border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-xs font-semibold text-slate-900">Finding triage</h3><p className="mt-1 text-[10px] leading-4 text-slate-500">Local demo workflow; actions are recorded in this browser and do not alter the source scan result.</p></div><div className="flex flex-wrap gap-1">{mutedFindingIds.includes(finding.uid) && <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">Muted · local</span>}{verifiedFindingIds.includes(finding.uid) && <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800">Verification noted</span>}</div></div>
                    <label className="mt-3 block"><span className="mb-1 block text-[10px] font-semibold text-slate-600">Triage reason *</span><input value={triageReason} onChange={(event) => setTriageReason(event.target.value)} className="control-input h-8 w-full text-[11px]" placeholder="Ticket, evidence, or remediation note" /></label>
                    <div className="mt-2 flex flex-wrap items-center gap-2"><button type="button" disabled={!canRemediateFindings || !triageReason.trim() || mutedFindingIds.includes(finding.uid)} title={!canRemediateFindings ? "Action restricted: Requires SecurityEngineer or Admin permissions." : "Record an audited mute in the local demo."} onClick={() => muteFinding(finding.uid, triageReason.trim(), [finding.framework])} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-amber-200 bg-white px-2.5 text-[10px] font-semibold text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-45">{!canRemediateFindings ? <LockKeyhole size={11}/> : <BellOff size={11}/>}Mute finding</button><button type="button" disabled={!canRemediateFindings || !triageReason.trim() || verifiedFindingIds.includes(finding.uid)} title={!canRemediateFindings ? "Action restricted: Requires SecurityEngineer or Admin permissions." : "Record that an operator checked the fix; this does not run a new scan."} onClick={() => verifyFinding(finding.uid, triageReason.trim(), [finding.framework])} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"><CheckCircle2 size={11}/>Record verification</button></div>
                  </section>
                  {benchmarkMatch && <section className="rounded-card border border-sky-100 bg-sky-50/60 p-3"><div className="flex items-start gap-2"><BookOpenCheck size={15} className="mt-0.5 text-sec-blue"/><div className="min-w-0 flex-1"><h3 className="text-xs font-semibold text-sec-text">Benchmark definition available</h3><p className="mt-1 text-[10px] leading-4 text-sec-muted">{benchmarkMatch.matchLabel}</p><button type="button" onClick={() => setTab("benchmark")} className="mt-2 text-[10px] font-semibold text-sec-blue hover:underline">Open rule metadata and remediation →</button></div></div></section>}
                  {asset ? (
                    <section className="rounded-card border border-sec-line p-3">
                      <div className="flex items-start justify-between gap-2"><h3 className="text-xs font-semibold text-sec-text">Linked asset</h3><button onClick={() => onOpenAsset(asset)} type="button" className="inline-flex items-center gap-1 text-[11px] font-semibold text-sec-blue hover:underline">Open asset <ArrowUpRight size={12}/></button></div>
                      <div className="mt-3 grid grid-cols-2 gap-4"><DetailField label="Asset" value={asset.name}/><DetailField label="Resource type" value={asset.resourceTypeName}/><DetailField label="Region" value={asset.region}/><DetailField label="Asset risk score" value={asset.riskScore}/></div>
                      <div className="mt-3 rounded-md bg-slate-50 p-2 font-mono text-[10px] text-sec-muted break-all">{asset.arn || asset.assetId}</div>
                    </section>
                  ) : (
                    <section className="rounded-card border border-amber-200 bg-amber-50/70 p-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-900"><Info size={14}/> No inventory asset linked</div>
                      <p className="mt-1 text-xs leading-5 text-amber-900/80">This assessment is {finding.scope === "account" ? "account-scoped" : "not resolved to a discovered asset"}. The source identifiers are preserved; it has not been attached to an arbitrary resource.</p>
                      <div className="mt-2 break-all font-mono text-[10px] text-amber-900/80">{finding.sourceAssetId}</div>
                    </section>
                  )}
                  <section className="rounded-card border border-sec-line p-3">
                    <h3 className="text-xs font-semibold text-sec-text">Source evidence</h3>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-sec-muted">{finding.evidence.statusExtended || "The source export contains no extended status text for this record."}</p>
                  </section>
                  <section className="rounded-card border border-sec-line p-3">
                    <h3 className="text-xs font-semibold text-sec-text">Remediation guidance</h3>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-sec-muted">{finding.evidence.remediation || "Remediation guidance was not included in this source export."}</p>
                    {finding.framework === "CIS-8.1" && <p className="mt-2 text-[10px] text-amber-800">Source note: CIS 8.1 remediation text is generic framework guidance and may not be specific to this check.</p>}
                  </section>
                </>
              ) : asset ? (
                <>
                  <section className="rounded-card border border-sec-line p-3">
                    <h3 className="text-xs font-semibold text-sec-text">Asset overview</h3>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">
                      <DetailField label="Asset ID" value={asset.assetId} mono/><DetailField label="ARN" value={asset.arn} mono/>
                      <DetailField label="Resource ID" value={asset.resourceId} mono/><DetailField label="Account" value={asset.accountId}/>
                      <DetailField label="Resource type" value={asset.resourceTypeName}/><DetailField label="Region" value={asset.region}/>
                      <DetailField label="Environment" value={asset.environment}/><DetailField label="Criticality" value={asset.assetCriticality}/>
                      <DetailField label="Risk level" value={asset.riskLevel}/><DetailField label="Risk score" value={asset.riskScore}/>
                      <DetailField label="Exposure" value={asset.isExposedPublicly == null ? "Unknown" : asset.isExposedPublicly ? "Public" : "Not public"}/><DetailField label="Attack-path count" value={asset.attackPathCount}/>
                    </div>
                  </section>
                  <section className="rounded-card border border-sec-line p-3">
                    <div className="flex items-center justify-between gap-2"><h3 className="text-xs font-semibold text-sec-text">Linked assessment records</h3><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] text-sec-muted">{assetFindings.length}</span></div>
                    <div className="mt-2 divide-y divide-sec-line">
                      {assetFindings.slice(0, 8).map((f) => <button key={f.uid} onClick={() => onOpenFinding(f)} type="button" className="flex w-full items-center justify-between gap-3 py-2 text-left hover:bg-slate-50"><span className="min-w-0"><span className="block truncate text-xs font-medium text-sec-blue">{f.requirementDescription}</span><span className="mt-1 block text-[10px] text-sec-muted">{f.framework} · {f.requirementId}</span></span><StatusBadge status={f.status}/></button>)}
                      {assetFindings.length === 0 && <p className="py-3 text-xs text-sec-muted">No framework findings resolved to this asset in the supplied files.</p>}
                    </div>
                    {assetFindings.length > 8 && <p className="mt-2 text-[10px] text-sec-muted">Showing 8 of {assetFindings.length} assessment records.</p>}
                  </section>
                </>
              ) : null}
            </div>
          )}

          {tab === "evidence" && finding && (
            <div className="space-y-3">
              <section className="rounded-card border border-sec-line p-3"><h3 className="text-xs font-semibold text-sec-text">Extended status</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-sec-muted">{finding.evidence.statusExtended || "No extended status was provided."}</p></section>
              <section className="rounded-card border border-sec-line p-3"><h3 className="text-xs font-semibold text-sec-text">Rationale</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-sec-muted">{finding.evidence.rationale || "Rationale was not included in this source export."}</p></section>
              <section className="rounded-card border border-sec-line p-3"><h3 className="text-xs font-semibold text-sec-text">Impact</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-sec-muted">{finding.evidence.impact || "Impact information was not included in this source export."}</p></section>
              <section className="rounded-card border border-sec-line p-3"><h3 className="text-xs font-semibold text-sec-text">Additional information</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-sec-muted">{finding.evidence.additionalInformation || "No additional information was provided."}</p></section>
              <section className="rounded-card border border-sec-line p-3"><h3 className="text-xs font-semibold text-sec-text">References</h3><p className="mt-2 break-all whitespace-pre-wrap text-xs leading-5 text-sec-blue">{finding.evidence.references || "No references were provided."}</p></section>
              {finding.duplicateCandidate && <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">This source record matches a repeated assessment signature. It remains visible so regional and framework-specific records are not silently discarded.</p>}
            </div>
          )}
          {tab === "evidence" && !finding && asset && (
            <div className="rounded-card border border-sec-line p-3"><h3 className="text-xs font-semibold">Discovery metadata</h3><div className="mt-3 grid grid-cols-2 gap-4"><DetailField label="Discovery timestamp" value={asset.discoveredAt}/><DetailField label="First seen" value={asset.firstSeen}/><DetailField label="Last seen" value={asset.lastSeen}/><DetailField label="Stale" value={String(asset.stale)}/></div><p className="mt-3 text-xs leading-5 text-sec-muted">Additional resource-specific attributes are available in the Raw JSON tab.</p></div>
          )}

          {tab === "relationships" && (
            <div className="space-y-3">
              {asset ? <section className="rounded-card border border-sec-line p-3"><div className="flex items-center gap-2"><Activity size={15} className="text-sec-blue"/><h3 className="text-xs font-semibold text-sec-text">Resolved relationships</h3></div><p className="mt-1 text-[10px] text-sec-muted">Only edges resolved from explicit discovery references are shown.</p><div className="mt-3 divide-y divide-sec-line">{relevantRelationships.map((edge) => { const isSource = edge.sourceAssetUid === asset.uid; const otherUid = isSource ? edge.targetAssetUid : edge.sourceAssetUid; const other = dataset.assets.find((a) => a.uid === otherUid); return <button type="button" key={edge.uid} onClick={() => other && onOpenAsset(other)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-slate-50"><span className="rounded-md bg-sky-50 p-2 text-sec-blue"><GitBranch size={15}/></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-sec-text">{other?.name ?? otherUid}</span><span className="mt-1 block text-[10px] text-sec-muted">{edge.relationshipType} · {edge.sourceField}</span></span><ArrowUpRight size={14} className="text-sec-muted"/></button>; })}{relevantRelationships.length === 0 && <p className="py-4 text-xs text-sec-muted">No resolvable relationships were found for this asset in the supplied discovery references.</p>}</div></section> : finding ? <section className="rounded-card border border-sec-line p-3"><h3 className="text-xs font-semibold text-sec-text">Finding relationship context</h3><p className="mt-2 text-xs leading-5 text-sec-muted">This finding has no resolved asset context, so no asset-to-asset edge is inferred from it.</p><DetailField label="Source asset identifier" value={finding.sourceAssetId} mono /></section> : null}
            </div>
          )}

          {tab === "benchmark" && finding && (
            <div className="space-y-3">
              {!benchmarkMatch ? <section className="rounded-card border border-dashed border-sec-line bg-slate-50 p-4"><h3 className="text-xs font-semibold text-sec-text">No matching benchmark definition</h3><p className="mt-2 text-xs leading-5 text-sec-muted">No supplied benchmark catalog contains a check ID matching <code>{finding.checkId}</code>. The assessment result remains available in the Overview and Evidence tabs.</p></section> : <>
                <section className="rounded-card border border-sec-line bg-white p-3"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xs font-semibold text-sec-text">Benchmark metadata</h3><p className="mt-1 font-mono text-[10px] text-sec-blue">{benchmarkMatch.mapping.checkId}</p></div><button type="button" role="switch" aria-checked={benchmarkMatch.rule.enabled} disabled={!canExcludeRules} title={!canExcludeRules ? "Action restricted: Requires SecurityEngineer or Admin permissions." : undefined} onClick={() => onToggleRule?.(benchmarkMatch.rule.checkId, !benchmarkMatch.rule.enabled)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-2 text-[10px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${benchmarkMatch.rule.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-100 text-slate-600"}`}>{!canExcludeRules && <span className="mr-1 inline-flex"><ShieldCheck size={10}/></span>}<span className={`h-1.5 w-1.5 rounded-full ${benchmarkMatch.rule.enabled ? "bg-emerald-500" : "bg-slate-400"}`}/>{benchmarkMatch.rule.enabled ? "Rule enabled" : "Rule excluded"}</button></div><p className="mt-2 text-[10px] leading-4 text-sec-muted">{benchmarkMatch.matchLabel}</p><div className="mt-3 grid grid-cols-2 gap-3"><DetailField label="Catalog framework" value={`${benchmarkMatch.mapping.frameworkId} · v${benchmarkMatch.mapping.frameworkVersion}`}/><DetailField label="Requirement" value={`${benchmarkMatch.mapping.requirementId} · ${benchmarkMatch.mapping.requirementDescription}`}/><DetailField label="Profile" value={benchmarkMatch.mapping.profile}/><DetailField label="Assessment mode" value={benchmarkMatch.mapping.assessmentStatus}/><DetailField label="Source section" value={benchmarkMatch.mapping.sourceSection}/><DetailField label="Category" value={benchmarkMatch.mapping.canonicalCategory}/></div><div className="mt-3 flex flex-wrap gap-1">{benchmarkMatch.rule.frameworkIds.map((framework) => <span key={framework} className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 text-[9px] font-semibold text-indigo-800">{framework}</span>)}</div><p className="mt-2 text-[9px] leading-4 text-sec-muted">Changing this rule is global per check ID. Other framework mappings listed above will use the same enabled state.</p></section>
                <section className="rounded-card border border-sec-line bg-white p-3"><h3 className="text-xs font-semibold text-sec-text">Rationale</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-sec-muted">{benchmarkMatch.mapping.rationaleStatement || "Rationale statement not supplied by this benchmark file."}</p></section>
                <section className="rounded-card border border-sec-line bg-white p-3"><h3 className="text-xs font-semibold text-sec-text">Impact</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-sec-muted">{benchmarkMatch.mapping.impactStatement || "Impact statement not supplied by this benchmark file."}</p></section>
                <section className="rounded-card border border-sec-line bg-white p-3"><div className="flex flex-wrap gap-1 border-b border-sec-line pb-2" role="tablist" aria-label="Remediation procedure type">{([{id:"console",label:"Console remediation"},{id:"cli",label:"CLI remediation"},{id:"audit",label:"Audit procedure"}] as Array<{id:ProcedureTab;label:string}>).map((item) => <button key={item.id} type="button" role="tab" aria-selected={procedureTab === item.id} onClick={() => setProcedureTab(item.id)} className={`rounded-md px-2 py-1.5 text-[10px] font-semibold ${procedureTab === item.id ? "bg-sky-50 text-sec-blue" : "text-sec-muted hover:bg-slate-50"}`}>{item.label}</button>)}</div><div className="mb-3 mt-3 flex items-center gap-2"><Terminal size={13} className="text-sec-muted"/><h3 className="text-xs font-semibold text-sec-text">{procedureTab === "console" ? "Console remediation" : procedureTab === "cli" ? "CLI remediation" : "Audit procedure"}</h3></div>{procedureTab === "console" && benchmarkMatch.mapping.remediationSharedCheckCount >= 5 && <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-[10px] leading-4 text-amber-900">This exact remediation text is reused across {benchmarkMatch.mapping.remediationSharedCheckCount} check IDs in {benchmarkMatch.mapping.frameworkId}. Verify it is applicable to this check before using it as a runbook.</p>}{procedureTab === "audit" && benchmarkMatch.mapping.auditSharedCheckCount >= 5 && <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-[10px] leading-4 text-amber-900">This audit procedure is reused across {benchmarkMatch.mapping.auditSharedCheckCount} check IDs in {benchmarkMatch.mapping.frameworkId}. Verify it actually tests this check.</p>}<ProcedureContent text={procedureTab === "console" ? benchmarkMatch.mapping.consoleRemediation : procedureTab === "cli" ? benchmarkMatch.mapping.cliRemediation : benchmarkMatch.mapping.auditProcedure} kind={procedureTab}/>{benchmarkMatch.mapping.remediationMode === "general" && procedureTab === "console" && <p className="mt-2 text-[10px] text-sec-blue">The source has no separate Console/CLI sections; this tab presents its full remediation procedure as general guidance.</p>}</section>
                {benchmarkMatch.mapping.additionalInformation && <section className="rounded-card border border-sec-line bg-white p-3"><h3 className="text-xs font-semibold text-sec-text">Additional information</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-sec-muted">{benchmarkMatch.mapping.additionalInformation}</p></section>}
                {benchmarkMatch.mapping.references && <section className="rounded-card border border-sec-line bg-white p-3"><h3 className="text-xs font-semibold text-sec-text">References</h3><p className="mt-2 break-all whitespace-pre-wrap text-xs leading-5 text-sec-blue">{benchmarkMatch.mapping.references}</p></section>}
              </>}
            </div>
          )}
          {tab === "raw" && (
            <div className="overflow-hidden rounded-card border border-sec-line">
              <div className="flex items-center justify-between bg-slate-50 px-3 py-2"><span className="flex items-center gap-2 text-[11px] font-semibold text-sec-muted"><FileJson size={14}/> Normalized source record</span><button type="button" onClick={onCopy} className="inline-flex items-center gap-1.5 rounded-md border border-sec-line bg-white px-2 py-1.5 text-[10px] font-medium text-sec-text hover:bg-slate-50"><Copy size={12}/>{copied ? "Copied" : "Copy ID"}</button></div>
              <pre className="max-h-[60vh] overflow-auto p-3 text-[10px] leading-5 text-slate-700">{JSON.stringify(rawObject, null, 2)}</pre>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-sec-line bg-white px-5 py-3">
          <div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-wide text-sec-muted">Source identifier</div><div className="mt-1 truncate font-mono text-[10px] text-sec-text">{selection.kind === "asset" ? selection.asset.assetId : selection.finding.sourceFindingId ?? selection.finding.sourceRecordId}</div></div>
          <button type="button" onClick={onCopy} className="inline-flex shrink-0 items-center gap-2 rounded-md border border-sec-line px-3 py-2 text-xs font-semibold text-sec-text hover:bg-slate-50"><Copy size={13}/>{copied ? <><Check size={13}/>Copied</> : "Copy"}</button>
        </div>
      </aside>
    </div>
  );
}
