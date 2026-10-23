import { useMemo, useState } from "react";
import { BookOpenCheck, CheckCheck, CircleHelp, GitBranch, Layers3, LockKeyhole, Search, ShieldCheck, SlidersHorizontal, ToggleLeft } from "lucide-react";
import {
  useBatchUpdateFrameworkRulesMutation,
  useToggleRuleStatusMutation,
} from "../../app/securityApi";
import type { ComplianceFinding } from "../../types";
import type {
  BatchUpdateFrameworkRulesArgs,
  RuleCatalogDataset,
  RuleDefinition,
  RuleFrameworkId,
  RuleMapping,
} from "../../types/rules";
import { RemediationDrawer } from "./RemediationDrawer";
import { useSecurityContext } from "../../context/useSecurityContext";
import { RuleExclusionModal } from "../security/RuleExclusionModal";
import { useGetChecksCatalogueQuery, useUpdateCheckMutation } from "../../app/checksCatalogueApi";
import type { ChecksFilterState } from "../../types/checksCatalogue";
import type { RuleExclusionRecord } from "../../types/security";

const EMPTY_CHECK_FILTERS: ChecksFilterState = { query: "", services: [], severities: [], kind: "all", frameworks: [], active: "all", assessmentStatus: "all" };
const FRAMEWORK_OPTIONS: Array<{ id: RuleFrameworkId | "ALL"; label: string }> = [
  { id: "ALL", label: "All frameworks" },
  { id: "CIS-8.0", label: "CIS 8.0" },
  { id: "CIS-5.0", label: "CIS 5.0" },
  { id: "ISO27001-2013", label: "ISO 27001:2013" },
];
const FRAMEWORK_COLORS: Record<RuleFrameworkId, string> = {
  "CIS-8.0": "#0284C7",
  "CIS-5.0": "#6366F1",
  "ISO27001-2013": "#EB4899",
};
type EnabledFilter = "ALL" | "ENABLED" | "DISABLED";
type AssessmentFilter = "ALL" | "Automated" | "Manual" | "UNSPECIFIED";
type CatalogRow = { rule: RuleDefinition; mapping: RuleMapping };
type PendingBulkExclusion = {
  action: BatchUpdateFrameworkRulesArgs["action"];
  checkIds: string[];
  skipped: string[];
  frameworkIds: string[];
  affectedAssetCount: number;
  containsCritical: boolean;
  label: string;
  frameworkId: RuleFrameworkId | "ALL";
};

interface RuleCatalogTableProps {
  rows: CatalogRow[];
  onOpenRule: (rule: RuleDefinition, mapping: RuleMapping) => void;
  onToggle: (checkId: string, enabled: boolean) => void;
}

export function RuleCatalogTable({ rows, onOpenRule, onToggle }: RuleCatalogTableProps) {
  const { canExcludeRules } = useSecurityContext();
  const groups = useMemo(() => {
    const result = new Map<string, CatalogRow[]>();
    for (const row of rows) {
      const key = row.mapping.canonicalCategory || row.mapping.sourceSection || "Other Controls";
      if (!result.has(key)) result.set(key, []);
      result.get(key)!.push(row);
    }
    return [...result.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);
  return <div className="max-h-[min(58vh,620px)] overflow-auto rounded-lg border border-sec-line bg-white">
    <table className="w-full min-w-[1040px] border-collapse text-left">
      <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] font-semibold uppercase tracking-wide text-sec-muted"><tr className="border-b border-sec-line"><th className="px-3 py-2.5">Requirement / check</th><th className="px-3 py-2.5">Framework mappings</th><th className="px-3 py-2.5">Profile</th><th className="px-3 py-2.5">Assessment</th><th className="px-3 py-2.5">Rule state</th><th className="px-3 py-2.5 text-right">Action</th></tr></thead>
      {groups.map(([category, groupRows]) => <tbody key={category}>
        <tr className="sticky top-[33px] z-[5] border-y border-sec-line bg-sky-50/80"><th colSpan={6} className="px-3 py-2 text-left text-[10px] font-semibold text-sec-text"><span className="inline-flex items-center gap-2"><Layers3 size={12} className="text-sec-blue"/>{category}</span><span className="ml-2 font-normal text-sec-muted">{groupRows.length} requirement-check mappings</span></th></tr>
        {groupRows.map(({ rule, mapping }) => <tr key={mapping.mappingUid} className="border-b border-sec-line last:border-b-0 hover:bg-slate-50/70">
          <td className="max-w-[440px] px-3 py-2.5"><div className="flex items-start gap-2"><button type="button" onClick={() => onOpenRule(rule, mapping)} className="min-w-0 text-left"><span className="block text-[10px] font-semibold text-sec-blue hover:underline">{mapping.requirementId} · {mapping.requirementDescription}</span><span className="mt-0.5 block truncate text-[9px] text-sec-muted">{mapping.sourceSection}</span><span className="mt-1 block break-all font-mono text-[10px] text-sec-text">{mapping.checkId}</span></button>{rule.isCrossFramework && <span title={`Mapped to ${rule.frameworkCount} frameworks`} className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded bg-indigo-50 px-1.5 py-1 text-[9px] font-semibold text-indigo-800"><GitBranch size={10}/>{rule.frameworkCount}×</span>}</div></td>
          <td className="px-3 py-2.5"><div className="flex max-w-[280px] flex-wrap gap-1">{rule.frameworkIds.map((fw) => <span key={fw} style={{ borderColor: `${FRAMEWORK_COLORS[fw]}35`, color: FRAMEWORK_COLORS[fw], backgroundColor: `${FRAMEWORK_COLORS[fw]}0D` }} className="rounded border px-1.5 py-1 text-[9px] font-semibold">{fw === "ISO27001-2013" ? "ISO 27001" : fw}</span>)}</div></td>
          <td className="px-3 py-2.5"><span className="rounded bg-slate-100 px-1.5 py-1 text-[9px] text-sec-text">{mapping.profile ?? "Not specified"}</span></td>
          <td className="px-3 py-2.5"><span className={`rounded px-1.5 py-1 text-[9px] font-medium ${mapping.assessmentStatus === "Automated" ? "bg-sky-50 text-sky-800" : mapping.assessmentStatus === "Manual" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{mapping.assessmentStatus ?? "Not specified"}</span></td>
          <td className="px-3 py-2.5"><button type="button" role="switch" aria-checked={rule.enabled} aria-label={`${rule.enabled ? "Disable" : "Enable"} ${rule.checkId}`} disabled={!canExcludeRules} title={!canExcludeRules ? "Action restricted: Requires SecurityEngineer or Admin permissions." : undefined} onClick={() => onToggle(rule.checkId, !rule.enabled)} className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${rule.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>{!canExcludeRules && <LockKeyhole size={10}/>}<span className={`h-1.5 w-1.5 rounded-full ${rule.enabled ? "bg-emerald-500" : "bg-slate-400"}`}/>{rule.enabled ? "Enabled" : "Excluded"}</button></td>
          <td className="px-3 py-2.5 text-right"><button type="button" onClick={() => onOpenRule(rule, mapping)} className="rounded-md border border-sec-line px-2 py-1.5 text-[10px] font-semibold text-sec-muted hover:border-sky-200 hover:text-sec-blue">Details</button></td>
        </tr>)}
      </tbody>)}
      {rows.length === 0 && <tbody><tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-sec-muted">No catalog mappings match the selected filters.</td></tr></tbody>}
    </table>
  </div>;
}

function ActiveRuleDistribution({ catalog }: { catalog: RuleCatalogDataset }) {
  const stats = useMemo(() => FRAMEWORK_OPTIONS.filter((fw) => fw.id !== "ALL").map(({ id, label }) => {
    const rules = catalog.rules.filter((rule) => rule.frameworkIds.includes(id as RuleFrameworkId));
    const enabledRules = rules.filter((rule) => rule.enabled).length;
    const mappings = catalog.rules.flatMap((rule) => rule.enabled ? rule.mappings.filter((mapping) => mapping.frameworkId === id) : []);
    const totalMappings = catalog.rules.reduce((sum, rule) => sum + rule.mappings.filter((mapping) => mapping.frameworkId === id).length, 0);
    return { id: id as RuleFrameworkId, label, rules: rules.length, enabledRules, activeMappings: mappings.length, totalMappings, coverage: rules.length ? enabledRules / rules.length * 100 : 0 };
  }), [catalog]);
  const totalActiveMappings = stats.reduce((sum, item) => sum + item.activeMappings, 0);
  const totalMappings = stats.reduce((sum, item) => sum + item.totalMappings, 0);
  let startDeg = 0;
  const segments = stats.map((item) => {
    const endDeg = startDeg + (totalActiveMappings ? item.activeMappings / totalActiveMappings * 360 : 0);
    const segment = `${FRAMEWORK_COLORS[item.id]} ${startDeg}deg ${endDeg}deg`;
    startDeg = endDeg;
    return segment;
  });
  const enabled = catalog.rules.filter((rule) => rule.enabled).length;
  const excluded = catalog.rules.length - enabled;
  const scopeCoverage = catalog.rules.length ? enabled / catalog.rules.length * 100 : 0;
  return <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(210px,0.8fr)_minmax(0,1.5fr)]">
    <section className="rounded-card border border-sec-line bg-white p-3"><div className="flex items-center justify-between gap-2"><h3 className="text-xs font-semibold text-sec-text">Active rule share</h3><span className="text-[9px] text-sec-muted">By mapping</span></div><div className="mt-3 flex items-center gap-4"><div aria-label="Active framework mapping share" role="img" className="relative h-[112px] w-[112px] shrink-0 rounded-full" style={{ background: totalActiveMappings ? `conic-gradient(${segments.join(", ")})` : "#e2e8f0" }}><div className="absolute inset-[21px] flex flex-col items-center justify-center rounded-full bg-white"><span className="text-xl font-bold tabular-nums text-sec-text">{totalActiveMappings}</span><span className="text-[9px] text-sec-muted">active maps</span></div></div><div className="min-w-0 space-y-2">{stats.map((item) => <div key={item.id} className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: FRAMEWORK_COLORS[item.id] }}/><span className="min-w-0 flex-1 text-[10px] text-sec-text">{item.label}</span><span className="text-[10px] font-semibold tabular-nums text-sec-text">{item.activeMappings}</span></div>)}</div></div><p className="mt-3 text-[9px] leading-4 text-sec-muted">{totalMappings} benchmark requirement-check mappings in total; toggles update this active-scope distribution immediately.</p></section>
    <section className="rounded-card border border-sec-line bg-white p-3"><div className="flex items-center justify-between gap-2"><h3 className="text-xs font-semibold text-sec-text">Live scan-scope impact</h3><span className="rounded bg-sky-50 px-2 py-1 text-[9px] font-semibold text-sky-800">Preview</span></div><div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-md bg-slate-50 p-2"><div className="text-[9px] font-semibold uppercase text-sec-muted">Enabled checks</div><div className="mt-1 text-xl font-bold tabular-nums text-emerald-700">{enabled}</div><div className="text-[9px] text-sec-muted">of {catalog.rules.length} unique</div></div><div className="rounded-md bg-slate-50 p-2"><div className="text-[9px] font-semibold uppercase text-sec-muted">Excluded checks</div><div className="mt-1 text-xl font-bold tabular-nums text-slate-700">{excluded}</div><div className="text-[9px] text-sec-muted">global check IDs</div></div><div className="rounded-md bg-slate-50 p-2"><div className="text-[9px] font-semibold uppercase text-sec-muted">Rule coverage</div><div className="mt-1 text-xl font-bold tabular-nums text-sec-text">{scopeCoverage.toFixed(1)}%</div><div className="text-[9px] text-sec-muted">enabled / catalog</div></div></div><div className="mt-3 space-y-2">{stats.map((item) => <div key={item.id}><div className="mb-1 flex justify-between gap-3 text-[10px]"><span className="font-medium text-sec-text">{item.label}</span><span className="tabular-nums text-sec-muted">{item.enabledRules}/{item.rules} checks · {item.coverage.toFixed(0)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all" style={{ width: `${item.coverage}%`, backgroundColor: FRAMEWORK_COLORS[item.id] }}/></div></div>)}</div></section>
  </div>;
}

interface Props {
  catalog: RuleCatalogDataset;
  findings?: ComplianceFinding[];
  onOpenMatchingFindings?: (mapping: RuleMapping) => void;
}

export function RuleManagement({ catalog, findings = [], onOpenMatchingFindings }: Props) {
  const security = useSecurityContext();
  const { data: checkDefinitions } = useGetChecksCatalogueQuery(EMPTY_CHECK_FILTERS);
  const [selectedFramework, setSelectedFramework] = useState<RuleFrameworkId | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [enabledFilter, setEnabledFilter] = useState<EnabledFilter>("ALL");
  const [assessmentFilter, setAssessmentFilter] = useState<AssessmentFilter>("ALL");
  const [selected, setSelected] = useState<{ rule: RuleDefinition; mapping: RuleMapping } | null>(null);
  const [notice, setNotice] = useState("");
  const [pendingExclusionId, setPendingExclusionId] = useState<string | null>(null);
  const [pendingBulkExclusion, setPendingBulkExclusion] = useState<PendingBulkExclusion | null>(null);
  const [toggleRule] = useToggleRuleStatusMutation();
  const [updateCheck] = useUpdateCheckMutation();
  const [batchUpdate, batchState] = useBatchUpdateFrameworkRulesMutation();

  const allMappings = useMemo(() => catalog.rules.flatMap((rule) => rule.mappings.map((mapping) => ({ rule, mapping }))), [catalog]);
  const categories = useMemo(() => [...new Set(allMappings.map(({ mapping }) => mapping.canonicalCategory))].sort(), [allMappings]);
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allMappings.filter(({ rule, mapping }) => {
      if (selectedFramework !== "ALL" && mapping.frameworkId !== selectedFramework) return false;
      if (categoryFilter !== "ALL" && mapping.canonicalCategory !== categoryFilter) return false;
      if (enabledFilter === "ENABLED" && !rule.enabled) return false;
      if (enabledFilter === "DISABLED" && rule.enabled) return false;
      if (assessmentFilter !== "ALL") {
        if (assessmentFilter === "UNSPECIFIED" && mapping.assessmentStatus) return false;
        if (assessmentFilter !== "UNSPECIFIED" && mapping.assessmentStatus !== assessmentFilter) return false;
      }
      if (!term) return true;
      return [mapping.checkId, mapping.requirementId, mapping.requirementDescription, mapping.sourceSection, mapping.canonicalCategory, mapping.profile, mapping.assessmentStatus, ...rule.frameworkIds].some((value) => String(value ?? "").toLowerCase().includes(term));
    }).sort((a, b) => a.mapping.canonicalCategory.localeCompare(b.mapping.canonicalCategory) || a.mapping.requirementId.localeCompare(b.mapping.requirementId, undefined, { numeric: true }) || a.mapping.checkId.localeCompare(b.mapping.checkId));
  }, [allMappings, selectedFramework, categoryFilter, enabledFilter, assessmentFilter, search]);

  const executeBatch = async (pending: PendingBulkExclusion, auditReason?: string) => {
    if (!security.canManageCheckDefinitions) { setNotice("Action restricted: Requires Admin permissions."); return; }
    const enabled = pending.action.startsWith("enable");
    try {
      const result = await batchUpdate({ checkIds: pending.checkIds, enabled, frameworkId: pending.frameworkId, action: pending.action, skippedSharedAutomated: pending.skipped }).unwrap();
      const reason = auditReason ?? `Bulk action ${pending.action} applied in ${pending.frameworkId} scope`;
      security.recordAuditEvent({
        action: `${enabled ? "Enabled" : "Excluded"} ${result.updatedCheckIds.length} checks (${pending.action})`,
        actionType: enabled ? "BULK_RULES_ENABLED" : "BULK_RULES_EXCLUDED",
        targetId: result.updatedCheckIds.join(","),
        reason,
        affectedFrameworkIds: pending.frameworkIds,
      });
      if (!enabled) {
        const exclusionReason = auditReason ?? "Bulk exclusion";
        await Promise.all(pending.checkIds.map(async (checkId) => {
          const definition = checkDefinitions?.checks.find((item) => item.checkId === checkId);
          if (definition) await updateCheck({ checkId, patch: { isActive: false, auditReason: exclusionReason } }).unwrap();
        }));
      }
      setNotice(`${result.updatedCheckIds.length} unique check(s) ${enabled ? "enabled" : "excluded"}.${result.skippedSharedAutomated?.length ? ` ${result.skippedSharedAutomated.length} shared automated check(s) were preserved.` : ""} Shared check IDs can affect multiple framework mappings.`);
      setPendingBulkExclusion(null);
    } catch {
      setNotice("The batch rule update failed or partially applied. Review the current rule state and retry if required.");
    }
  };

  const runBatch = async (action: BatchUpdateFrameworkRulesArgs["action"]) => {
    if (!security.canManageCheckDefinitions) { setNotice("Action restricted: Requires Admin permissions."); return; }
    const mappedForScope = (rule: RuleDefinition) => rule.mappings.filter((m) => selectedFramework === "ALL" || m.frameworkId === selectedFramework);
    const scopedRules = catalog.rules.filter((rule) => mappedForScope(rule).length > 0);
    let targets: RuleDefinition[] = [];
    let skipped: string[] = [];
    let enabled = true;
    if (action === "enable-level-1") {
      targets = scopedRules.filter((rule) => !rule.enabled && mappedForScope(rule).some((mapping) => mapping.profile === "Level 1"));
      enabled = true;
    } else if (action === "disable-manual") {
      const manualCandidates = scopedRules.filter((rule) => rule.enabled && mappedForScope(rule).some((mapping) => mapping.assessmentStatus === "Manual"));
      targets = manualCandidates.filter((rule) => !rule.mappings.some((mapping) => mapping.assessmentStatus === "Automated"));
      skipped = manualCandidates.filter((rule) => rule.mappings.some((mapping) => mapping.assessmentStatus === "Automated")).map((rule) => rule.checkId);
      enabled = false;
    } else if (action === "enable-all") {
      targets = scopedRules.filter((rule) => !rule.enabled);
      enabled = true;
    } else {
      targets = scopedRules.filter((rule) => rule.enabled);
      enabled = false;
    }
    const checkIds = [...new Set(targets.map((rule) => rule.checkId))];
    if (!checkIds.length) {
      setNotice(action === "disable-manual" ? `No manual-only checks changed.${skipped.length ? ` ${skipped.length} shared check(s) were preserved because another mapping declares them Automated.` : ""}` : "No rules required an update for this action.");
      return;
    }
    if (!enabled) {
      const targetSet = new Set(checkIds);
      setPendingBulkExclusion({
        action, checkIds, skipped, frameworkId: selectedFramework,
        frameworkIds: [...new Set(targets.flatMap((rule) => rule.frameworkIds))],
        affectedAssetCount: new Set(findings.filter((finding) => targetSet.has(finding.checkId) && finding.assetUid).map((finding) => finding.assetUid)).size,
        containsCritical: targets.some((rule) => checkDefinitions?.checks.some((item) => item.checkId === rule.checkId && item.severity === "Critical")),
        label: action === "disable-manual" ? "Disable manual-only checks" : "Disable all checks in the selected scope",
      });
      return;
    }
    await executeBatch({ action, checkIds, skipped, frameworkId: selectedFramework, frameworkIds: [...new Set(targets.flatMap((rule) => rule.frameworkIds))], affectedAssetCount: 0, containsCritical: false, label: action });
  };

  const applyToggle = async (checkId: string, enabled: boolean, reason?: string) => {
    if (!security.canExcludeRules) { setNotice("Action restricted: Requires SecurityEngineer or Admin permissions."); return; }
    try {
      const definition = checkDefinitions?.checks.find((item) => item.checkId === checkId);
      if (!enabled && definition) {
        await updateCheck({ checkId, patch: { isActive: false, auditReason: reason ?? "Audited exclusion from Frameworks & Rule Catalog" } }).unwrap();
      } else if (enabled && definition && !definition.isActive) {
        await updateCheck({ checkId, patch: { isActive: true, auditReason: "Re-enabled from Frameworks & Rule Catalog" } }).unwrap();
      }
      await toggleRule({ checkId, enabled }).unwrap();
      const rule = catalog.rules.find((item) => item.checkId === checkId);
      security.recordAuditEvent({ action: `${enabled ? "Enabled" : "Excluded"} check ${checkId}`, actionType: enabled ? "RULE_ENABLED" : "RULE_EXCLUDED", targetId: checkId, reason: reason ?? (enabled ? "Rule enabled from Frameworks & Rule Catalog" : "Rule excluded from Frameworks & Rule Catalog"), affectedFrameworkIds: rule?.frameworkIds ?? [] });
      setNotice(`${checkId} ${enabled ? "enabled" : "excluded"}. All ${rule?.mappingCount ?? 1} catalog mapping(s) sharing this check use the same state.`);
    } catch { setNotice(`Could not update ${checkId}. The catalogue may require refresh to reconcile partial state.`); }
  };
  const handleToggle = async (checkId: string, enabled: boolean) => {
    if (!security.canExcludeRules) { setNotice("Action restricted: Requires SecurityEngineer or Admin permissions."); return; }
    if (!enabled) { setPendingExclusionId(checkId); return; }
    await applyToggle(checkId, true);
  };
  const confirmExclusion = async (record: RuleExclusionRecord) => {
    if (!security.canExcludeRules) return;
    const reason = `${record.reason}; ticket ${record.ticketId}; expires ${record.expiryDate}; ${record.justification ?? ""}`;
    if (security.currentRole === "SecurityEngineer") {
      security.submitExclusionRequest({ ...record, source: "framework-rules" });
      setNotice(`Exclusion request for ${record.checkId} submitted for Admin approval. Rule state is unchanged until approval.`);
      setPendingExclusionId(null);
      return;
    }
    await applyToggle(record.checkId, false, reason);
    setPendingExclusionId(null);
  };
  const confirmBulkExclusion = async (record: RuleExclusionRecord) => {
    if (!pendingBulkExclusion || !security.canManageCheckDefinitions) return;
    const reason = `${record.reason}; ticket ${record.ticketId}; expires ${record.expiryDate}; ${record.justification ?? ""}`;
    await executeBatch(pendingBulkExclusion, reason);
  };
  const pendingRule = pendingExclusionId ? catalog.rules.find((rule) => rule.checkId === pendingExclusionId) : null;
  const pendingCheck = pendingExclusionId ? checkDefinitions?.checks.find((check) => check.checkId === pendingExclusionId) : undefined;
  const affectedAssets = pendingExclusionId ? new Set(findings.filter((finding) => finding.checkId === pendingExclusionId && finding.assetUid).map((finding) => finding.assetUid)).size : null;

  const disabledCheckIds = useMemo(() => new Set(catalog.rules.filter((rule) => !rule.enabled).map((rule) => rule.checkId)), [catalog.rules]);
  const affectedRecords = useMemo(() => findings.filter((finding) => disabledCheckIds.has(finding.checkId)).length, [findings, disabledCheckIds]);
  const uniqueVisibleRules = useMemo(() => new Set(filteredRows.map((row) => row.rule.checkId)).size, [filteredRows]);

  return <div className="space-y-3">
    <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between"><div><div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-sec-muted"><BookOpenCheck size={12}/> Benchmark definition catalog</div><h2 className="mt-1 text-sm font-semibold text-sec-text">Frameworks & Rule Catalog</h2><p className="mt-0.5 max-w-3xl text-[10px] leading-4 text-sec-muted">Browse requirements and checks from the three source benchmarks. Rule enablement is global per unique check ID; cross-framework mappings share one execution state.</p></div><span className="inline-flex items-center gap-1 self-start rounded-md border border-sec-line bg-white px-2 py-1.5 text-[10px] text-sec-muted"><ShieldCheck size={12}/>{catalog.meta.ruleCount} unique checks · {catalog.meta.mappingCount} mappings</span></div>

    <ActiveRuleDistribution catalog={catalog}/>

    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2.5"><CircleHelp size={14} className="mt-0.5 shrink-0 text-amber-800"/><div className="text-[10px] leading-4 text-amber-900"><strong>Posture metric integrity:</strong> rule toggles immediately update the active-rule donut, rule coverage bars and excluded-check counts. Existing PASS/FAIL findings and measured compliance rates remain historical and do not change until a new scan produces results. <span className="font-semibold">{affectedRecords.toLocaleString()}</span> current records reference checks currently excluded from the next scan scope.</div></div>

    <section className="card-panel p-3">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between"><div className="flex items-center gap-2"><SlidersHorizontal size={14} className="text-sec-muted"/><h3 className="text-xs font-semibold text-sec-text">Find and manage checks</h3><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-sec-muted">{uniqueVisibleRules} unique · {filteredRows.length} mappings</span></div><div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void runBatch("enable-level-1")} disabled={batchState.isLoading || !security.canManageCheckDefinitions} title={!security.canManageCheckDefinitions ? "Action restricted: Requires Admin permissions." : undefined} className="inline-flex items-center gap-1.5 rounded-md border border-sec-line bg-white px-2.5 py-2 text-[10px] font-semibold text-sec-text hover:border-sky-200 hover:text-sec-blue disabled:opacity-50"><CheckCheck size={12}/>Enable Level 1</button>
        <button type="button" onClick={() => void runBatch("disable-manual")} disabled={batchState.isLoading || !security.canManageCheckDefinitions} title={!security.canManageCheckDefinitions ? "Action restricted: Requires Admin permissions." : undefined} className="inline-flex items-center gap-1.5 rounded-md border border-sec-line bg-white px-2.5 py-2 text-[10px] font-semibold text-sec-text hover:border-amber-200 hover:text-amber-800 disabled:opacity-50"><ToggleLeft size={12}/>Disable manual-only</button>
        <button type="button" onClick={() => void runBatch("enable-all")} disabled={batchState.isLoading || !security.canManageCheckDefinitions} title={!security.canManageCheckDefinitions ? "Action restricted: Requires Admin permissions." : undefined} className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50">Enable all in scope</button>
        <button type="button" onClick={() => void runBatch("disable-all")} disabled={batchState.isLoading || !security.canManageCheckDefinitions} title={!security.canManageCheckDefinitions ? "Action restricted: Requires Admin permissions." : undefined} className="rounded-md border border-rose-200 bg-white px-2.5 py-2 text-[10px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Disable all in scope</button>
      </div></div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <label className="relative"><span className="sr-only">Search rule catalog</span><Search size={13} className="absolute left-2.5 top-2.5 text-sec-muted"/><input value={search} onChange={(event) => setSearch(event.target.value)} className="control-input h-8 w-full pl-8" placeholder="Search requirement or check ID"/></label>
        <label><span className="sr-only">Filter framework</span><select value={selectedFramework} onChange={(event) => setSelectedFramework(event.target.value as RuleFrameworkId | "ALL")} className="control-input h-8 w-full">{FRAMEWORK_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
        <label><span className="sr-only">Filter category</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="control-input h-8 w-full"><option value="ALL">All categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
        <label><span className="sr-only">Filter assessment mode</span><select value={assessmentFilter} onChange={(event) => setAssessmentFilter(event.target.value as AssessmentFilter)} className="control-input h-8 w-full"><option value="ALL">All assessment modes</option><option value="Automated">Automated</option><option value="Manual">Manual</option><option value="UNSPECIFIED">Not specified</option></select></label>
        <label><span className="sr-only">Filter enabled status</span><select value={enabledFilter} onChange={(event) => setEnabledFilter(event.target.value as EnabledFilter)} className="control-input h-8 w-full"><option value="ALL">All rule states</option><option value="ENABLED">Enabled only</option><option value="DISABLED">Excluded only</option></select></label>
      </div>
      {notice && <div role="status" className="mt-3 flex items-start gap-2 rounded-md border border-sky-100 bg-sky-50/70 px-3 py-2 text-[10px] leading-4 text-sky-900"><ShieldCheck size={13} className="mt-0.5 shrink-0"/><span className="flex-1">{notice}</span><button type="button" aria-label="Dismiss status message" onClick={() => setNotice("")} className="text-sky-800">×</button></div>}
    </section>

    <RuleCatalogTable rows={filteredRows} onOpenRule={(rule, mapping) => setSelected({ rule, mapping })} onToggle={(checkId, enabled) => void handleToggle(checkId, enabled)}/>
    <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] text-sec-muted"><span>Source catalogs do not define an active/enabled state. The local demo initializes checks as enabled and stores edits in this browser.</span><span className="inline-flex items-center gap-1"><GitBranch size={11}/>{catalog.meta.crossFrameworkRuleCount} checks map to multiple frameworks</span></div>

    <RemediationDrawer rule={selected ? catalog.rules.find((rule) => rule.checkId === selected.rule.checkId) ?? selected.rule : null} mapping={selected?.mapping ?? null} onClose={() => setSelected(null)} onToggle={(checkId, enabled) => void handleToggle(checkId, enabled)} onViewFindings={onOpenMatchingFindings}/>
    {pendingExclusionId && pendingRule && <RuleExclusionModal open checkId={pendingExclusionId} checkName={pendingCheck?.name ?? pendingExclusionId} severity={pendingCheck?.severity} affectedAssetCount={affectedAssets} frameworkIds={pendingCheck?.frameworkIds ?? pendingRule.frameworkIds} onClose={() => setPendingExclusionId(null)} onConfirm={(record) => void confirmExclusion(record)} />}
    {pendingBulkExclusion && <RuleExclusionModal open checkId={`bulk:${pendingBulkExclusion.action}`} checkName={pendingBulkExclusion.label} severity={pendingBulkExclusion.containsCritical ? "Critical" : "High"} affectedAssetCount={pendingBulkExclusion.affectedAssetCount} frameworkIds={pendingBulkExclusion.frameworkIds} onClose={() => setPendingBulkExclusion(null)} onConfirm={(record) => void confirmBulkExclusion(record)} />}
  </div>;
}
