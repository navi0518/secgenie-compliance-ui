import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Check, Plus, ShieldAlert, X } from "lucide-react";
import { useCreateCustomCheckMutation, useDeleteCustomCheckMutation, useGetChecksCatalogueQuery, useResetCheckToBaselineMutation, useUpdateCheckMutation } from "../../app/checksCatalogueApi";
import { useGetNormalizedDatasetQuery, useToggleRuleStatusMutation } from "../../app/securityApi";
import { CHECK_FRAMEWORKS, CHECK_SEVERITIES, type CheckFrameworkAssociation, type CheckFrameworkId, type CheckItem, type CheckMutationPayload, type CheckRequirementOption, type CheckSeverity, type ChecksFilterState } from "../../types/checksCatalogue";
import { CheckEditorDrawer } from "./CheckEditorDrawer";
import { RuleExclusionModal } from "../security/RuleExclusionModal";
import { useSecurityContext } from "../../context/useSecurityContext";
import type { RuleExclusionRecord } from "../../types/security";
import { CheckRunbookDrawer } from "./CheckRunbookDrawer";
import { ChecksFilterToolbar } from "./ChecksFilterToolbar";
import { ChecksHeaderAndMetrics } from "./ChecksHeaderAndMetrics";
import { ChecksRegistryTable } from "./ChecksRegistryTable";

const DEFAULT_FILTERS: ChecksFilterState = { query: "", services: [], severities: [], kind: "all", frameworks: [], active: "all", assessmentStatus: "all" };
const cn = (...values: Array<string | false | undefined>) => values.filter(Boolean).join(" ");
const norm = (value: unknown) => String(value ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
function fuzzyScore(haystack: string, query: string) { const h = norm(haystack), q = norm(query); if (!q) return 1; if (h.includes(q)) return 100 - Math.min(40, h.indexOf(q)); let score = 0; for (const token of q.split(" ").filter(Boolean)) { if (h.includes(token)) score += 8; else if (h.split(" ").some((part) => part.startsWith(token))) score += 3; else return 0; } return score; }
const severityTone: Record<CheckSeverity, string> = { Critical: "bg-rose-100 text-rose-800 ring-rose-200", High: "bg-orange-100 text-orange-800 ring-orange-200", Medium: "bg-amber-100 text-amber-800 ring-amber-200", Low: "bg-slate-100 text-slate-700 ring-slate-200" };
const initialCheck = (): CheckMutationPayload => ({ checkId: "", name: "", description: "", service: "", resourceType: "", severity: "Medium", rationaleStatement: "", impactStatement: "", assessmentStatus: "Automated", remediationProcedure: "", consoleRemediation: "", cliRemediation: "", auditProcedure: "", frameworkAssociations: [], isCustom: true, isActive: true });

export function ChecksCatalogueView() {
  const [filters, setFilters] = useState<ChecksFilterState>(DEFAULT_FILTERS);
  const { data, isLoading, isError, refetch } = useGetChecksCatalogueQuery(DEFAULT_FILTERS);
  const { data: scanDataset } = useGetNormalizedDatasetQuery();
  const [updateCheck, updateState] = useUpdateCheckMutation();
  const [createCheck, createState] = useCreateCustomCheckMutation();
  const [deleteCheck, deleteState] = useDeleteCustomCheckMutation();
  const [resetCheck] = useResetCheckToBaselineMutation();
  const [toggleRuleStatus] = useToggleRuleStatusMutation();
  const [editorCheck, setEditorCheck] = useState<CheckItem | null>(null);
  const [runbookCheck, setRunbookCheck] = useState<CheckItem | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ check: CheckItem; kind: "delete" } | null>(null);
  const [exclusionCheck, setExclusionCheck] = useState<CheckItem | null>(null);
  const { currentRole, canExcludeRules, canManageCheckDefinitions, recordAuditEvent, submitExclusionRequest } = useSecurityContext();
  const [actionReason, setActionReason] = useState("");
  const [actionJustification, setActionJustification] = useState("");
  const [deleteMode, setDeleteMode] = useState<"archive" | "hard-delete">("archive");
  const [hardDeleteConfirmed, setHardDeleteConfirmed] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const busy = updateState.isLoading || createState.isLoading || deleteState.isLoading;
  const allChecks = data?.checks ?? [];
  const services = useMemo(() => [...new Set(allChecks.filter((item) => !item.isArchived).map((item) => item.service))].sort(), [allChecks]);
  const liveChecks = useMemo(() => allChecks.filter((item) => !item.isArchived), [allChecks]);
  const metrics = useMemo(() => ({
    total: liveChecks.length,
    automated: liveChecks.filter((item) => item.assessmentStatus === "Automated").length,
    manual: liveChecks.filter((item) => item.assessmentStatus === "Manual").length,
    custom: liveChecks.filter((item) => item.isCustom).length,
    covered: liveChecks.filter((item) => item.frameworkAssociations.length > 0).length,
    severity: Object.fromEntries(CHECK_SEVERITIES.map((s) => [s, liveChecks.filter((item) => item.severity === s).length])) as Record<CheckSeverity, number>,
    byService: Object.fromEntries(services.map((service) => [service, liveChecks.filter((item) => item.service === service).length])),
    byFramework: Object.fromEntries(CHECK_FRAMEWORKS.map((framework) => [framework.id, liveChecks.filter((item) => item.frameworkIds.includes(framework.id)).length])) as Record<CheckFrameworkId, number>,
  }), [liveChecks, services]);
  const checksForFilter = filters.active === "archived" ? allChecks.filter((item) => item.isArchived) : liveChecks;
  const filteredChecks = useMemo(() => checksForFilter.map((check) => ({ check, score: fuzzyScore([check.checkId, check.name, check.description, check.resourceType, check.service, check.rationaleStatement, ...check.frameworkAssociations.flatMap((association) => [association.requirementId, association.requirementDescription])].join(" "), filters.query) })).filter(({ check, score }) => score > 0 && (!filters.services.length || filters.services.includes(check.service)) && (!filters.severities.length || filters.severities.includes(check.severity)) && (filters.kind === "all" || (filters.kind === "custom" ? check.isCustom : !check.isCustom)) && (!filters.frameworks.length || filters.frameworks.some((framework) => check.frameworkIds.includes(framework))) && (filters.active === "all" || (filters.active === "active" ? check.isActive : filters.active === "inactive" ? !check.isActive : check.isArchived)) && (filters.assessmentStatus === "all" || check.assessmentStatus === filters.assessmentStatus)).sort((a, b) => b.score - a.score || a.check.name.localeCompare(b.check.name)).map(({ check }) => check), [checksForFilter, filters]);
  const tableChecks = useMemo(() => filteredChecks.map((check) => {
    const failed = (scanDataset?.findings ?? []).filter((finding) => finding.checkId === check.checkId && finding.status === "FAIL");
    return { ...check, currentFindingCount: failed.length, affectedAssetCount: new Set(failed.map((finding) => finding.assetUid).filter((uid): uid is string => Boolean(uid))).size };
  }), [filteredChecks, scanDataset]);
  const patchFilters = (patch: Partial<ChecksFilterState>) => setFilters((current) => ({ ...current, ...patch }));
  const toggleValue = <T extends string,>(values: T[], value: T) => values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

  const saveEdit = async (checkId: string, patch: CheckMutationPayload) => { if (!canManageCheckDefinitions) { setNotice({ tone: "error", text: "Action restricted: Requires Admin permissions." }); return; } const result = await updateCheck({ checkId, patch }).unwrap(); recordAuditEvent({ action: `Updated check ${result.check.checkId}`, actionType: "CHECK_UPDATED", targetId: result.check.checkId, reason: "Check definition changed in Checks Studio", affectedFrameworkIds: result.check.frameworkIds }); setEditorCheck(null); setNotice({ tone: "success", text: `${result.check.name} saved${result.check.isModified ? " · customized from baseline" : ""}.` }); };
  const saveNew = async (payload: CheckMutationPayload) => { if (!canManageCheckDefinitions) { setNotice({ tone: "error", text: "Action restricted: Requires Admin permissions." }); return; } const result = await createCheck(payload).unwrap(); recordAuditEvent({ action: `Created custom check ${result.check.checkId}`, actionType: "CUSTOM_CHECK_CREATED", targetId: result.check.checkId, reason: "Custom check created from the four-step wizard", affectedFrameworkIds: result.check.frameworkIds }); setWizardOpen(false); setNotice({ tone: "success", text: `Custom check “${result.check.name}” created.` }); patchFilters({ query: "", kind: "all", active: "all" }); };
  const resetBaseline = async (checkId: string) => { if (!canManageCheckDefinitions) { setNotice({ tone: "error", text: "Action restricted: Requires Admin permissions." }); return; } const result = await resetCheck(checkId).unwrap(); recordAuditEvent({ action: `Reset check ${checkId} to baseline`, actionType: "CHECK_RESET_TO_BASELINE", targetId: checkId, reason: "Operator reset standard definition to baseline", affectedFrameworkIds: result.check.frameworkIds }); setEditorCheck(null); setNotice({ tone: "success", text: `${result.check.name} reset to its baseline definition.` }); };
  const activate = async (check: CheckItem, active: boolean) => {
    if (!canExcludeRules) { setNotice({ tone: "error", text: "Action restricted: Requires SecurityEngineer or Admin permissions." }); return; }
    if (!active) { setExclusionCheck(check); return; }
    try {
      const result = await updateCheck({ checkId: check.checkId, patch: { isActive: true, auditReason: "Re-enabled by operator" } }).unwrap();
      if (check.frameworkIds.length) await toggleRuleStatus({ checkId: check.checkId, enabled: true }).unwrap();
      recordAuditEvent({ action: `Re-enabled check ${check.checkId}`, actionType: "CHECK_ENABLED", targetId: check.checkId, reason: "Operator re-enabled check", affectedFrameworkIds: check.frameworkIds });
      setNotice({ tone: "success", text: `${result.check.name} is active.` });
    } catch (e) { setNotice({ tone: "error", text: errorMessage(e) }); }
  };
  const confirmExclusion = async (record: RuleExclusionRecord) => {
    if (!exclusionCheck || !canExcludeRules) return;
    const check = exclusionCheck;
    if (currentRole === "SecurityEngineer") {
      submitExclusionRequest({ ...record, source: "check-catalogue", requestedBy: currentRole });
      setNotice({ tone: "info", text: `Exclusion request for ${check.checkId} submitted for Admin approval. The check remains active until approval.` });
      setExclusionCheck(null);
      return;
    }
    const auditReason = `${record.reason}; ticket ${record.ticketId}; expiry ${record.expiryDate}; ${record.justification ?? ""}`;
    try {
      const result = await updateCheck({ checkId: check.checkId, patch: { isActive: false, auditReason } }).unwrap();
      if (check.frameworkIds.length) await toggleRuleStatus({ checkId: check.checkId, enabled: false }).unwrap();
      recordAuditEvent({ action: `Excluded check ${check.checkId}`, actionType: "RULE_EXCLUDED", targetId: check.checkId, reason: auditReason, affectedFrameworkIds: record.affectedFrameworkIds });
      setNotice({ tone: "success", text: `${result.check.name} excluded until ${record.expiryDate}. Existing findings remain historical.` });
      setExclusionCheck(null);
    } catch (e) { setNotice({ tone: "error", text: errorMessage(e) }); }
  };
  const confirmPending = async () => {
    if (!pendingAction || !actionReason.trim() || !actionJustification.trim() || !canManageCheckDefinitions) return;
    const { check } = pendingAction;
    if (!check.isCustom) return;
    try {
      const auditReason = `${actionReason.trim()}: ${actionJustification.trim()}`;
      const result = await deleteCheck({ checkId: check.checkId, mode: deleteMode, auditReason }).unwrap();
      recordAuditEvent({ action: `${deleteMode === "archive" ? "Archived" : "Hard-deleted"} custom check ${check.checkId}`, actionType: deleteMode === "archive" ? "CUSTOM_CHECK_ARCHIVED" : "CUSTOM_CHECK_HARD_DELETED", targetId: check.checkId, reason: auditReason, affectedFrameworkIds: check.frameworkIds });
      setNotice({ tone: "success", text: result.message ?? "Custom check removed." });
      setPendingAction(null); setActionReason(""); setActionJustification(""); setHardDeleteConfirmed(false);
    } catch (e) { setNotice({ tone: "error", text: errorMessage(e) }); }
  };
  const duplicateCheck = async (check: CheckItem) => {
    if (!canManageCheckDefinitions) { setNotice({ tone: "error", text: "Action restricted: Requires Admin permissions." }); return; }
    const stem = norm(check.name).replace(/\s+/g, "_").slice(0, 28).replace(/^_+|_+$/g, "") || "check";
    const id = `custom_${stem}_${Math.random().toString(36).slice(2, 6)}`;
    try { const { check: result } = await createCheck({ ...check, checkId: id, name: `${check.name} (Copy)`, isCustom: true, isActive: true, isModified: false, baseline: undefined, customMetadata: undefined, auditReason: undefined, frameworkAssociations: check.frameworkAssociations.map((item) => ({ ...item })) } as CheckMutationPayload & { baseline?: undefined }).unwrap(); setNotice({ tone: "success", text: `Duplicated as ${result.checkId}.` }); } catch (e) { setNotice({ tone: "error", text: errorMessage(e) }); }
  };

  return <section className="min-w-0 space-y-3 text-slate-800">
    <ChecksHeaderAndMetrics
      metrics={{
        total: metrics.total,
        automated: metrics.automated,
        manual: metrics.manual + liveChecks.filter((item) => item.assessmentStatus === "Mixed" || item.assessmentStatus === "Unspecified").length,
        custom: metrics.custom,
        coveragePercent: metrics.total ? Math.round(metrics.covered / metrics.total * 100) : 0,
        mapped: metrics.covered,
      }}
      onRefresh={() => { patchFilters(DEFAULT_FILTERS); void refetch(); }}
      onCreateCustomCheck={() => canManageCheckDefinitions && setWizardOpen(true)}
      canCreateCustomCheck={canManageCheckDefinitions}
      refreshing={isLoading}
    />

    {notice && <div role="status" className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px]", notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : notice.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-sky-200 bg-sky-50 text-sky-800")}><Check size={13}/><span className="flex-1">{notice.text}</span><button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification" className="rounded p-0.5 hover:bg-black/5"><X size={12}/></button></div>}

    <ChecksFilterToolbar
      filters={filters}
      services={services}
      serviceCounts={metrics.byService}
      severityCounts={metrics.severity}
      frameworkCounts={metrics.byFramework}
      resultCount={filteredChecks.length}
      totalCount={liveChecks.length}
      onChange={patchFilters}
      onClear={() => setFilters(DEFAULT_FILTERS)}
    />

    <ChecksRegistryTable
      checks={tableChecks}
      loading={isLoading}
      error={isError}
      mappingCount={data?.meta.mappingCount ?? 0}
      selectedFrameworks={filters.frameworks}
      onRetry={() => void refetch()}
      onFrameworkClick={(id) => patchFilters({ frameworks: toggleValue(filters.frameworks, id) })}
      onToggleActive={(check, active) => void activate(check, active)}
      onEdit={(check) => setEditorCheck(check)}
      onDuplicate={(check) => void duplicateCheck(check)}
      onDeleteOrDeactivate={(check) => { if (!canManageCheckDefinitions) return; if (check.isCustom) { setActionReason(""); setActionJustification(""); setDeleteMode("archive"); setPendingAction({ check, kind: "delete" }); } else if (canExcludeRules) { setExclusionCheck(check); } }}
      onReset={(check) => void resetBaseline(check.checkId)}
      onViewRunbook={(check) => setRunbookCheck(check)}
      accountIds={scanDataset?.meta.accountIds ?? []}
    />

    <CheckEditorDrawer check={canManageCheckDefinitions ? editorCheck : null} requirements={data?.requirements ?? []} frameworks={data?.frameworks ?? []} onClose={() => setEditorCheck(null)} onSave={saveEdit} onReset={resetBaseline} saving={updateState.isLoading}/>
    {wizardOpen && canManageCheckDefinitions && <CreateCheckWizard requirements={data?.requirements ?? []} onClose={() => setWizardOpen(false)} onCreate={saveNew} saving={createState.isLoading}/>}
    {pendingAction && canManageCheckDefinitions && <SafetyDialog check={pendingAction.check} kind={pendingAction.kind} reason={actionReason} setReason={setActionReason} justification={actionJustification} setJustification={setActionJustification} deleteMode={deleteMode} setDeleteMode={setDeleteMode} hardDeleteConfirmed={hardDeleteConfirmed} setHardDeleteConfirmed={setHardDeleteConfirmed} busy={busy} onClose={() => setPendingAction(null)} onConfirm={() => void confirmPending()}/>}
    <CheckRunbookDrawer check={runbookCheck} onClose={() => setRunbookCheck(null)} />
    {exclusionCheck && <RuleExclusionModal open={Boolean(exclusionCheck)} checkId={exclusionCheck.checkId} checkName={exclusionCheck.name} severity={exclusionCheck.severity} affectedAssetCount={exclusionCheck.affectedAssetCount} frameworkIds={exclusionCheck.frameworkIds} onClose={() => setExclusionCheck(null)} onConfirm={(record) => void confirmExclusion(record)} busy={updateState.isLoading} />}
  </section>;
}

function SafetyDialog({ check, kind, reason, setReason, justification, setJustification, deleteMode, setDeleteMode, hardDeleteConfirmed, setHardDeleteConfirmed, busy, onClose, onConfirm }: { check: CheckItem; kind: "deactivate" | "delete"; reason: string; setReason: (v: string) => void; justification: string; setJustification: (v: string) => void; deleteMode: "archive" | "hard-delete"; setDeleteMode: (v: "archive" | "hard-delete") => void; hardDeleteConfirmed: boolean; setHardDeleteConfirmed: (v: boolean) => void; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  const deleting = kind === "delete";
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-3" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="safety-title" className="w-full max-w-[520px] rounded-xl border border-sec-line bg-white p-4 shadow-2xl dark:bg-slate-900"><div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200"><ShieldAlert size={17}/></div><div className="min-w-0 flex-1"><h3 id="safety-title" className="text-sm font-semibold">{deleting ? "Delete or archive custom check" : "Mute / exempt check with audit record"}</h3><p className="mt-1 text-[10px] leading-4 text-sec-muted">{check.name}<code className="ml-1 break-all">({check.checkId})</code></p></div><button onClick={onClose} className="icon-button" aria-label="Close safety dialog"><X size={14}/></button></div>
    <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-md border border-sec-line bg-slate-50 p-3 dark:bg-slate-950"><div className="text-[9px] font-semibold uppercase tracking-wide text-sec-muted">Affected assets</div><div className="mt-1 text-xl font-bold tabular-nums">{check.affectedAssetCount?.toLocaleString() ?? "—"}</div><div className="text-[9px] text-sec-muted">{check.affectedAssetCount == null ? "Not hydrated in demo" : "Current linked population"}</div></div><div className="rounded-md border border-sec-line bg-slate-50 p-3 dark:bg-slate-950"><div className="text-[9px] font-semibold uppercase tracking-wide text-sec-muted">Historical findings</div><div className="mt-1 text-xl font-bold tabular-nums">{check.historicalFindingCount?.toLocaleString() ?? "—"}</div><div className="text-[9px] text-sec-muted">{check.historicalFindingCount == null ? "Historical scans unavailable" : "Retained records"}</div><div className="mt-1 text-[9px] text-sec-muted">Current loaded FAIL records: {check.currentFindingCount?.toLocaleString() ?? "—"}</div></div></div>
    {deleting && <div className="mt-4 space-y-2"><label className="flex cursor-pointer items-start gap-2 rounded-md border border-sec-line p-2.5"><input type="radio" checked={deleteMode === "archive"} onChange={() => setDeleteMode("archive")} className="mt-0.5 accent-sky-600"/><span><span className="block text-[10px] font-semibold">Archive / soft-delete (recommended)</span><span className="mt-0.5 block text-[9px] text-sec-muted">Preserve references and audit history; hide from active catalogue.</span></span></label><label className="flex cursor-pointer items-start gap-2 rounded-md border border-rose-200 p-2.5 dark:border-rose-900"><input type="radio" checked={deleteMode === "hard-delete"} onChange={() => setDeleteMode("hard-delete")} className="mt-0.5 accent-rose-600"/><span><span className="block text-[10px] font-semibold text-rose-700 dark:text-rose-300">Hard-delete permanently</span><span className="mt-0.5 block text-[9px] text-sec-muted">Removes the custom definition from this demo store. Production must check references before deletion.</span></span></label>{deleteMode === "hard-delete" && <label className="flex items-start gap-2 text-[10px] font-semibold text-rose-700 dark:text-rose-300"><input type="checkbox" checked={hardDeleteConfirmed} onChange={(e) => setHardDeleteConfirmed(e.target.checked)} className="mt-0.5 accent-rose-600"/>I understand this permanently removes the custom check.</label>}</div>}
    {!check.isCustom && deleting && <div className="mt-3 rounded-md bg-amber-50 p-2 text-[10px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Standard framework checks cannot be deleted. Deactivate or use the framework exemption workflow.</div>}
    <label className="mt-4 block"><span className="mb-1 block text-[10px] font-semibold">Audit reason <span className="text-rose-600">*</span></span><select value={reason} onChange={(e) => setReason(e.target.value)} className="control-input h-9 w-full"><option value="">Choose a reason…</option><option>Compensating control in place</option><option>Accepted risk - security exception approved</option><option>Not applicable to this environment</option><option>Duplicate or superseded definition</option><option>False positive / rule defect investigation</option><option>Other - see justification</option></select></label>
    <label className="mt-3 block"><span className="mb-1 block text-[10px] font-semibold">Justification / ticket / approver reference</span><textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={2} className="control-input w-full py-2" placeholder="Describe the security rationale, ticket, approver, and expiry if applicable."/></label>
    <div className="mt-4 flex justify-end gap-2"><button onClick={onClose} className="rounded-md border border-sec-line px-3 py-2 text-[10px] font-semibold text-sec-muted">Cancel</button><button disabled={busy || !reason.trim() || !justification.trim() || (deleting && !check.isCustom) || (deleting && deleteMode === "hard-delete" && !hardDeleteConfirmed)} onClick={onConfirm} className="rounded-md bg-rose-700 px-3.5 py-2 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Applying…" : deleting ? (deleteMode === "archive" ? "Archive check" : "Permanently delete") : "Mute / Exempt check"}</button></div>
  </section></div>;
}
function errorMessage(error: unknown): string { if (typeof error === "object" && error && "data" in error) { const data = (error as { data?: unknown }).data; if (typeof data === "string") return data; if (data && typeof data === "object" && "message" in data) return String((data as { message: unknown }).message); if (data && typeof data === "object" && "error" in data) return String((data as { error: unknown }).error); } return error instanceof Error ? error.message : "The operation failed. Please retry."; }

function CreateCheckWizard({ requirements, onClose, onCreate, saving }: { requirements: CheckRequirementOption[]; onClose: () => void; onCreate: (payload: CheckMutationPayload) => Promise<void>; saving: boolean }) {
  const [step, setStep] = useState(1); const [draft, setDraft] = useState<CheckMutationPayload>(initialCheck()); const [requirementQuery, setRequirementQuery] = useState(""); const [frameworkFilter, setFrameworkFilter] = useState<CheckFrameworkId | "ALL">("ALL"); const [error, setError] = useState("");
  const update = (patch: Partial<CheckMutationPayload>) => setDraft((current) => ({ ...current, ...patch }));
  const toggleRequirement = (option: CheckRequirementOption) => { const current = draft.frameworkAssociations ?? []; const exists = current.some((a) => a.frameworkId === option.frameworkId && a.requirementId === option.requirementId); const next = exists ? current.filter((a) => !(a.frameworkId === option.frameworkId && a.requirementId === option.requirementId)) : [...current, requirementAssociation(option)]; update({ frameworkAssociations: next }); };
  const filteredRequirements = requirements.filter((r) => (frameworkFilter === "ALL" || r.frameworkId === frameworkFilter) && (!requirementQuery.trim() || `${r.requirementId} ${r.requirementDescription} ${r.category ?? ""}`.toLowerCase().includes(requirementQuery.toLowerCase().trim())));
  const validateStep = () => { if (step === 1) { if (!draft.checkId || !/^[a-z][a-z0-9_]{2,99}$/.test(draft.checkId)) { setError("Check ID must be lowercase and contain only letters, numbers, and underscores (3–100 characters)."); return false; } if (!draft.name?.trim() || !draft.description?.trim() || !draft.service?.trim() || !draft.resourceType?.trim()) { setError("Complete title, description, service, and resource type."); return false; } } if (step === 3 && (!draft.auditProcedure?.trim() || (!draft.consoleRemediation?.trim() && !draft.cliRemediation?.trim()))) { setError("Provide an audit procedure and at least one Console or CLI remediation path."); return false; } setError(""); return true; };
  const next = () => { if (validateStep()) setStep((s) => Math.min(4, s + 1)); };
  const create = async () => { if (!validateStep()) return; try { await onCreate({ ...draft, isCustom: true, isActive: true }); } catch (e) { setError(errorMessage(e)); } };
  const steps = ["Identifier & basic info", "Severity & risk", "Audit & remediation", "Framework mapping"];
  return <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/45 p-3" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="create-check-title" className="flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-xl border border-sec-line bg-white shadow-2xl dark:bg-slate-900">
    <header className="flex items-start gap-3 border-b border-sec-line px-4 py-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sec-blue dark:bg-sky-950 dark:text-sky-200"><Plus size={17}/></div><div className="min-w-0 flex-1"><h2 id="create-check-title" className="text-sm font-semibold">Create custom check</h2><p className="mt-0.5 text-[10px] text-sec-muted">Step {step} of 4 · {steps[step - 1]}</p></div><button onClick={onClose} className="icon-button" aria-label="Close wizard"><X size={14}/></button></header>
    <div className="grid grid-cols-4 gap-1.5 px-4 pt-3">{steps.map((label, index) => <div key={label}><div className={cn("h-1 rounded-full", index + 1 <= step ? "bg-sec-blue" : "bg-slate-200 dark:bg-slate-700")}/><div className={cn("mt-1.5 truncate text-[8px] font-semibold", index + 1 === step ? "text-sec-blue" : "text-sec-muted")}>{label}</div></div>)}</div>
    <div className="min-h-0 flex-1 overflow-y-auto p-4">{error && <div role="alert" className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}
      {step === 1 && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label><FieldLabel>Identifier (custom_check_id)</FieldLabel><input value={String(draft.checkId ?? "")} onChange={(e) => update({ checkId: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} placeholder="custom_s3_tls_policy" className="control-input h-9 w-full font-mono"/></label><label><FieldLabel>Display title</FieldLabel><input value={String(draft.name ?? "")} onChange={(e) => update({ name: e.target.value })} className="control-input h-9 w-full" placeholder="Require secure TLS for S3 endpoints"/></label><label><FieldLabel>AWS service / category</FieldLabel><input value={String(draft.service ?? "")} onChange={(e) => update({ service: e.target.value })} className="control-input h-9 w-full" placeholder="Amazon S3"/></label><label><FieldLabel>CloudFormation resource type</FieldLabel><input value={String(draft.resourceType ?? "")} onChange={(e) => update({ resourceType: e.target.value })} className="control-input h-9 w-full" placeholder="AWS::S3::Bucket"/></label><label className="sm:col-span-2"><FieldLabel>Plain-English description</FieldLabel><textarea value={String(draft.description ?? "")} onChange={(e) => update({ description: e.target.value })} rows={4} className="control-input w-full py-2" placeholder="Explain the risky condition and why it matters."/></label></div>}
      {step === 2 && <div className="space-y-3"><label className="block"><FieldLabel>Severity</FieldLabel><div className="mt-1.5 flex flex-wrap gap-2">{CHECK_SEVERITIES.map((severity) => <button key={severity} onClick={() => update({ severity })} className={cn("rounded-md px-3 py-2 text-[10px] font-semibold ring-1 ring-inset", severityTone[severity], draft.severity === severity ? "ring-2 ring-sky-500" : "ring-transparent opacity-80")}>{severity}</button>)}</div></label><label className="block"><FieldLabel>Assessment status</FieldLabel><select value={String(draft.assessmentStatus ?? "Automated")} onChange={(e) => update({ assessmentStatus: e.target.value as CheckItem["assessmentStatus"] })} className="control-input h-9 w-full"><option>Automated</option><option>Manual</option></select></label><label className="block"><FieldLabel>Rationale statement</FieldLabel><textarea value={String(draft.rationaleStatement ?? "")} onChange={(e) => update({ rationaleStatement: e.target.value })} rows={4} className="control-input w-full py-2" placeholder="Why should the control exist?"/></label><label className="block"><FieldLabel>Impact / risk profile</FieldLabel><textarea value={String(draft.impactStatement ?? "")} onChange={(e) => update({ impactStatement: e.target.value })} rows={4} className="control-input w-full py-2" placeholder="Potential business or technical impact when violated."/></label></div>}
      {step === 3 && <div className="space-y-3"><label className="block"><FieldLabel>Console remediation / step-by-step instructions</FieldLabel><textarea value={String(draft.consoleRemediation ?? "")} onChange={(e) => update({ consoleRemediation: e.target.value, remediationProcedure: e.target.value })} rows={5} className="control-input w-full py-2" placeholder="1. Open the AWS console…"/></label><label className="block"><FieldLabel>AWS CLI / shell snippet</FieldLabel><textarea value={String(draft.cliRemediation ?? "")} onChange={(e) => update({ cliRemediation: e.target.value })} rows={4} className="control-input w-full py-2 font-mono text-[10px]" placeholder="aws s3api …"/></label><label className="block"><FieldLabel>Audit / verification procedure</FieldLabel><textarea value={String(draft.auditProcedure ?? "")} onChange={(e) => update({ auditProcedure: e.target.value })} rows={4} className="control-input w-full py-2" placeholder="How should an engineer verify the setting?"/></label><p className="text-[9px] text-sec-muted">Commands are stored as documentation and are not executed by this interface.</p></div>}
      {step === 4 && <div><div className="mb-3 rounded-md bg-sky-50 px-3 py-2 text-[10px] leading-4 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">Framework mapping is optional. A custom check linked to a requirement is a mapped safeguard, not proof that the whole framework requirement is satisfied.</div><div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[180px_minmax(0,1fr)]"><select value={frameworkFilter} onChange={(e) => setFrameworkFilter(e.target.value as CheckFrameworkId | "ALL")} className="control-input h-9"><option value="ALL">All frameworks</option>{CHECK_FRAMEWORKS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select><input value={requirementQuery} onChange={(e) => setRequirementQuery(e.target.value)} placeholder="Find requirement…" className="control-input h-9 w-full"/></div><div className="max-h-[42vh] space-y-1 overflow-y-auto">{filteredRequirements.map((option) => { const selected = (draft.frameworkAssociations ?? []).some((a) => a.frameworkId === option.frameworkId && a.requirementId === option.requirementId); return <label key={`${option.frameworkId}:${option.requirementId}`} className={cn("flex cursor-pointer items-start gap-2 rounded-md border px-2 py-2", selected ? "border-sky-300 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/40" : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800")}><input type="checkbox" checked={selected} onChange={() => toggleRequirement(option)} className="mt-0.5 accent-sky-600"/><span className="min-w-0"><code className="text-[9px] font-semibold text-sec-blue">{option.frameworkId} · {option.requirementId}</code><span className="mt-0.5 block text-[10px] text-sec-text dark:text-slate-200">{option.requirementDescription}</span></span></label>; })}</div><div className="mt-3 text-[9px] text-sec-muted">{(draft.frameworkAssociations ?? []).length} requirement mapping(s) selected.</div></div>}
    </div>
    <footer className="flex items-center justify-between border-t border-sec-line px-4 py-3"><button onClick={() => step === 1 ? onClose() : setStep((s) => Math.max(1, s - 1))} className="rounded-md border border-sec-line px-3 py-2 text-[10px] font-semibold text-sec-muted">{step === 1 ? "Cancel" : "Back"}</button>{step < 4 ? <button onClick={next} className="rounded-md bg-sec-blue px-4 py-2 text-[10px] font-semibold text-white">Continue →</button> : <button onClick={() => void create()} disabled={saving} className="rounded-md bg-sec-blue px-4 py-2 text-[10px] font-semibold text-white disabled:opacity-60">{saving ? "Creating…" : "Create check"}</button>}</footer>
  </section></div>;
}
function FieldLabel({ children }: { children: ReactNode }) { return <span className="mb-1 block text-[10px] font-semibold text-sec-muted">{children}</span>; }
function requirementAssociation(option: CheckRequirementOption): CheckFrameworkAssociation { const attrs = option.attributes ?? {}; const val = (key: string) => typeof attrs[key] === "string" ? String(attrs[key]) : ""; return { frameworkId: option.frameworkId, frameworkName: option.frameworkName, frameworkVersion: option.frameworkVersion, requirementId: option.requirementId, requirementDescription: option.requirementDescription, requirementName: option.requirementName, category: option.category, profile: option.profile, assessmentStatus: option.assessmentStatus, description: val("Description"), rationaleStatement: val("RationaleStatement"), impactStatement: val("ImpactStatement"), remediationProcedure: val("RemediationProcedure"), auditProcedure: val("AuditProcedure"), references: val("References"), sourceAttributes: attrs }; }
