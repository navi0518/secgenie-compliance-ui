import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity, AlertCircle, AlertTriangle, BarChart3, Bell, Boxes, CalendarClock,
  ChevronDown, ClipboardCheck, Database, FileSearch, GitBranch, Globe2,
  LayoutDashboard, ListChecks, Menu, Network, RefreshCw, Search, ShieldAlert,
  ShieldCheck, X, Layers3, FileCode2, Plus, Compass, ClipboardList,
} from "lucide-react";
import { useGetNormalizedDatasetQuery, useGetRuleCatalogQuery, useToggleRuleStatusMutation } from "../app/securityApi";
import { InvestigationDrawer, type DrawerSelection } from "../components/InvestigationDrawer";
import { FrameworkDonut } from "../components/option-b/DonutChart";
import { GroupedBarChart, type GroupedBarRow } from "../components/option-b/GroupedBarChart";
import { CorrelationMatrix } from "../components/option-b/CorrelationMatrix";
import { FindingsTable, type FindingQualityFilter, type FrameworkFilter, type StatusFilter } from "../components/FindingsTable";
import type { AssetEntity, ComplianceFinding, FrameworkId } from "../types";
import { buildDomainSummaries, getAssetCategory, getFrameworkShortName, type AssetCategory } from "../lib/assetCategories";
import { RuleManagement } from "../components/rules/RuleManagement";
import { ChecksCatalogueView } from "../components/checks/ChecksCatalogueView";
import { CorrelationWorkbenchLayout } from "../components/workbench/CorrelationWorkbenchLayout";
import type { WorkspaceTab } from "../components/workbench/WorkbenchTabBar";
import { useSecurityContext } from "../context/useSecurityContext";
import { OnboardingTour } from "../components/onboarding/OnboardingTour";
import { CloudAccountConnectionModal } from "../components/onboarding/CloudAccountConnectionModal";
import { ActivityLogDrawer } from "../components/security/ActivityLogDrawer";
import { DemoLiveModeSwitcher } from "../components/security/DemoLiveModeSwitcher";
import { RuleExclusionModal } from "../components/security/RuleExclusionModal";
import { SecurityGovernanceView } from "../components/governance/SecurityGovernanceView";
import { useGetChecksCatalogueQuery, useUpdateCheckMutation } from "../app/checksCatalogueApi";
import type { ChecksFilterState } from "../types/checksCatalogue";
import type { AccountConnectionPayload, RuleExclusionRecord } from "../types/security";

const FRAMEWORKS: FrameworkId[] = ["CIS-5.0", "CIS-8.1", "ISO27001-2013"];
const EMPTY_CHECK_FILTERS: ChecksFilterState = { query: "", services: [], severities: [], kind: "all", frameworks: [], active: "all", assessmentStatus: "all" };
const ONBOARDING_SUPPRESSION_KEY = "secgenie.onboarding.dont-show-again.v1";
const STATUS_SERIES = [
  { key: "FAIL", label: "Fail", color: "#EA6F6C" },
  { key: "PASS", label: "Pass", color: "#10B881" },
  { key: "MANUAL", label: "Manual", color: "#F49C0D" },
];
const NAV_ITEMS = [
  { label: "Dashboards", icon: LayoutDashboard }, { label: "Alerts", icon: Bell },
  { label: "Incidents", icon: ClipboardCheck }, { label: "Asset Map", icon: Network },
  { label: "Exposures", icon: ShieldAlert }, { label: "Vulnerabilities", icon: Activity },
  { label: "Compliances", icon: ShieldCheck }, { label: "Kanban", icon: ListChecks },
  { label: "Reports", icon: BarChart3 }, { label: "CMDBs", icon: Database },
  { label: "Scans", icon: FileSearch }, { label: "Configurations", icon: Boxes },
  { label: "Checks Catalogue", icon: FileCode2 },
];

function Sidebar({ activeTab, activeView, onOpenChecks, onOpenSecuritySettings, onOpenWorkbench }: { activeTab: WorkspaceTab; activeView: "workbench" | "security"; onOpenChecks: () => void; onOpenSecuritySettings: () => void; onOpenWorkbench: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [configExpanded, setConfigExpanded] = useState(activeView === "security");
  const closeMobile = () => setMobileOpen(false);
  return <>
    {mobileOpen && <button type="button" aria-label="Close navigation overlay" onClick={closeMobile} className="fixed inset-0 z-40 bg-slate-950/25 lg:hidden" />}
    <aside className={`app-sidebar ${mobileOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 flex w-[210px] shrink-0 flex-col border-r border-sec-line bg-white transition-transform lg:static lg:z-auto lg:translate-x-0`}>
      <div className="flex h-[70px] items-center gap-1 border-b border-sec-line px-4"><span className="text-[24px] font-extrabold italic tracking-tight text-orange-500">SecGenie</span><span className="-ml-1 -mt-3 text-[10px] font-bold text-sec-text">.AI</span><button type="button" onClick={closeMobile} className="ml-auto rounded p-1 text-sec-muted lg:hidden" aria-label="Close navigation"><X size={17} /></button></div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3" aria-label="Primary navigation">
        {NAV_ITEMS.map(({ label, icon: Icon }) => {
          const selected = label === "Checks Catalogue" ? activeView === "workbench" && activeTab === "checks" : label === "Compliances" ? activeView === "workbench" : label === "Configurations" && activeView === "security";
          const className = `rounded-md px-3 py-2.5 ${selected ? "bg-sky-100/80 text-sec-blue ring-1 ring-inset ring-sky-100" : "text-sec-text/90 hover:bg-slate-50"}`;
          if (label === "Checks Catalogue") return <button key={label} type="button" onClick={() => { onOpenChecks(); closeMobile(); }} aria-current={selected ? "page" : undefined} className={`block w-full text-left ${className}`}><span className={`flex items-center gap-2.5 text-xs ${selected ? "font-semibold" : "font-medium"}`}><Icon size={15} className={selected ? "" : "text-slate-500"}/>{label}</span></button>;
          if (label === "Compliances") return <button key={label} type="button" onClick={() => { onOpenWorkbench(); closeMobile(); }} aria-current={selected ? "page" : undefined} className={`block w-full text-left ${className}`}><span className={`flex items-center gap-2.5 text-xs ${selected ? "font-semibold" : "font-medium"}`}><Icon size={15} className={selected ? "" : "text-slate-500"}/>{label}</span></button>;
          if (label === "Configurations") return <div key={label} className="space-y-0.5"><button type="button" onClick={() => setConfigExpanded((value) => !value)} aria-expanded={configExpanded} className={`flex w-full items-center rounded-md text-left ${className}`}><span className={`flex min-w-0 flex-1 items-center gap-2.5 text-xs ${selected ? "font-semibold" : "font-medium"}`}><Icon size={15} className={selected ? "" : "text-slate-500"}/>{label}</span><ChevronDown size={13} className={`shrink-0 transition-transform ${configExpanded ? "rotate-180" : ""}`}/></button>{configExpanded && <button type="button" onClick={() => { onOpenSecuritySettings(); closeMobile(); }} aria-current={activeView === "security" ? "page" : undefined} className={`ml-5 flex w-[calc(100%-1.25rem)] items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] ${activeView === "security" ? "bg-sky-50 font-semibold text-sky-700" : "text-slate-600 hover:bg-slate-50"}`}><ShieldCheck size={13}/><span>Security Settings</span></button>}</div>;
          return <div key={label} className={`rounded-md px-3 py-2.5 ${className}`}><div className="flex items-center gap-2.5 text-xs font-medium"><Icon size={15} className="text-slate-500"/>{label}</div></div>;
        })}
      </nav>
      <div className="border-t border-sec-line p-3 text-[10px] text-sec-muted">Correlation workspace <span className="float-right">Option B</span></div>
    </aside>
    <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" className="fixed bottom-4 left-4 z-30 rounded-full bg-white p-3 text-sec-text shadow-md ring-1 ring-sec-line lg:hidden"><Menu size={18} /></button>
  </>;
}

function Panel({ title, subtitle, right, children, className = "" }: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`card-panel min-w-0 p-3.5 ${className}`}><div className="mb-3 flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-[13px] font-semibold text-sec-text">{title}</h2>{subtitle && <p className="mt-1 text-[10px] leading-4 text-sec-muted">{subtitle}</p>}</div>{right}</div>{children}</section>;
}

function Kpi({ label, value, detail, icon: Icon, tint = "blue", onClick }: { label: string; value: string | number; detail: string; icon: typeof Activity; tint?: "blue" | "red" | "amber" | "indigo"; onClick?: () => void }) {
  const iconColor = { blue: "text-sec-blue bg-sky-50", red: "text-rose-700 bg-rose-50", amber: "text-amber-700 bg-amber-50", indigo: "text-indigo-700 bg-indigo-50" }[tint];
  const content = <div className="flex items-center gap-3"><span className={`rounded-md p-2 ${iconColor}`}><Icon size={15} /></span><div className="min-w-0 flex-1"><div className="text-[9px] font-semibold uppercase tracking-wide text-sec-muted">{label}</div><div className="mt-1 text-[22px] font-bold leading-none tracking-tight text-sec-text tabular-nums">{value}</div><div className="mt-1 text-[9px] text-sec-muted">{detail}</div></div></div>;
  return onClick ? <button type="button" onClick={onClick} className="card-panel block w-full p-3 text-left transition hover:border-sky-200 hover:bg-sky-50/20">{content}</button> : <div className="card-panel p-3">{content}</div>;
}

function FindingListDrawer({ open, count, search, setSearch, onClose, children }: { open: boolean; count: number; search: string; setSearch: (value: string) => void; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-40 flex justify-end" role="presentation"><button type="button" aria-label="Close findings panel" className="absolute inset-0 bg-slate-950/25" onClick={onClose} /><aside role="dialog" aria-modal="true" aria-label="Correlated findings" className="relative flex h-full w-full max-w-[1100px] flex-col border-l border-sec-line bg-sec-canvas shadow-2xl"><header className="flex flex-col gap-3 border-b border-sec-line bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><div className="text-[10px] font-semibold uppercase tracking-wide text-sec-muted">Investigation queue</div><h2 className="mt-1 text-sm font-semibold text-sec-text">Correlated findings <span className="ml-1 text-sec-muted">({count.toLocaleString()})</span></h2></div><div className="flex items-center gap-2"><label className="relative flex min-w-0 flex-1 items-center sm:w-[290px]"><Search size={14} className="absolute left-3 text-sec-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="control-input h-9 w-full pl-8" placeholder="Search findings, IDs, evidence…" aria-label="Search findings" /></label><button type="button" onClick={onClose} className="icon-button" aria-label="Close findings"><X size={16} /></button></div></header><div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">{children}</div></aside></div>;
}

export function OptionBDashboard() {
  const security = useSecurityContext();
  const { data, isLoading, isError, refetch } = useGetNormalizedDatasetQuery();
  const { data: checkDefinitions } = useGetChecksCatalogueQuery(EMPTY_CHECK_FILTERS);
  const [tourOpen, setTourOpen] = useState(() => typeof window !== "undefined" && window.localStorage.getItem(ONBOARDING_SUPPRESSION_KEY) !== "true");
  const [connectAccountOpen, setConnectAccountOpen] = useState(false);
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [pendingGlobalExclusionId, setPendingGlobalExclusionId] = useState<string | null>(null);
  const [securityNotice, setSecurityNotice] = useState("");
  const { data: ruleCatalog, isLoading: rulesLoading } = useGetRuleCatalogQuery();
  const [toggleRuleStatus] = useToggleRuleStatusMutation();
  const [updateCheck] = useUpdateCheckMutation();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("correlation");
  const [activeView, setActiveView] = useState<"workbench" | "security">("workbench");
  const [frameworkFilter, setFrameworkFilter] = useState<FrameworkFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("FAIL");
  const [qualityFilter, setQualityFilter] = useState<FindingQualityFilter>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [findingsDrawerOpen, setFindingsDrawerOpen] = useState(false);
  const [selection, setSelection] = useState<DrawerSelection>(null);

  const domainRows = useMemo(() => data ? buildDomainSummaries(data.assets, data.findings) : [], [data]);
  const assetsByUid = useMemo(() => new Map<string, AssetEntity>( (data?.assets ?? []).map((asset): [string, AssetEntity] => [asset.uid, asset]) ), [data]);
  const diagnostics = data?.meta.diagnostics;
  const highCriticalExposed = useMemo(() => (data?.assets ?? []).filter((asset) => asset.isExposedPublicly === true && ["high", "critical"].includes(String(asset.riskLevel ?? "").toLowerCase())).length, [data]);
  const assetsWithFailingFindings = useMemo(() => new Set((data?.findings ?? []).filter((finding) => finding.status === "FAIL" && finding.assetUid).map((finding) => finding.assetUid)).size, [data]);
  const statusCounts = useMemo(() => {
    const counts = { PASS: 0, FAIL: 0, MANUAL: 0 };
    for (const finding of data?.findings ?? []) counts[finding.status] += 1;
    return counts;
  }, [data]);

  const frameworkBarRows: GroupedBarRow[] = useMemo(() => (data?.frameworkSummaries ?? []).map((summary) => ({
    label: getFrameworkShortName(summary.framework),
    description: `${(summary.pass + summary.fail + summary.manual).toLocaleString()} records`,
    values: { FAIL: summary.fail, PASS: summary.pass, MANUAL: summary.manual },
  })), [data]);
  const domainBarRows: GroupedBarRow[] = useMemo(() => domainRows.filter((row) => row.linkedFindings > 0).map((row) => ({
    label: row.category,
    description: `${row.assets.toLocaleString()} assets · ${row.exposedAssets} public`,
    values: { FAIL: row.linkedFails, PASS: row.linkedPasses, MANUAL: row.linkedManual },
  })), [domainRows]);

  const filteredFindings = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.findings ?? []).filter((finding) => {
      if (frameworkFilter !== "ALL" && finding.framework !== frameworkFilter) return false;
      if (statusFilter !== "ALL" && finding.status !== statusFilter) return false;
      if (selectedCategory !== "ALL") {
        if (!finding.assetUid) return false;
        const asset = assetsByUid.get(finding.assetUid);
        if (!asset || getAssetCategory(asset) !== selectedCategory) return false;
      }
      const searchMatch = !term || [finding.checkId, finding.requirementId, finding.requirementDescription, finding.sourceFindingId, finding.sourceAssetId, finding.region, finding.evidence.statusExtended, finding.scope, finding.identityResolution.method, finding.identityResolution.confidence, finding.assetUid ? assetsByUid.get(finding.assetUid)?.name : ""]
        .some((value) => String(value ?? "").toLowerCase().includes(term));
      let qualityMatch = true;
      if (qualityFilter === "LINKED") qualityMatch = Boolean(finding.assetUid);
      else if (qualityFilter === "ACCOUNT") qualityMatch = finding.scope === "account";
      else if (qualityFilter === "UNRESOLVED") qualityMatch = !finding.assetUid && finding.scope !== "account";
      else if (qualityFilter === "DUPLICATE") qualityMatch = finding.duplicateCandidate;
      else if (qualityFilter === "MISSING_EVIDENCE") qualityMatch = !finding.evidence.statusExtended;
      return searchMatch && qualityMatch;
    }).sort((a, b) => ({ FAIL: 0, MANUAL: 1, PASS: 2 })[a.status] - ({ FAIL: 0, MANUAL: 1, PASS: 2 })[b.status]);
  }, [data, frameworkFilter, statusFilter, selectedCategory, search, qualityFilter, assetsByUid]);

  const topControls = useMemo(() => (data?.topFailedChecks ?? []).filter((check) => frameworkFilter === "ALL" || check.framework === frameworkFilter).slice().sort((a, b) => b.failCount - a.failCount).slice(0, 5), [data, frameworkFilter]);
  const openFindings = (overrides?: { framework?: FrameworkFilter; status?: StatusFilter; category?: AssetCategory | "ALL"; search?: string; quality?: FindingQualityFilter }) => {
    if (overrides?.framework !== undefined) setFrameworkFilter(overrides.framework);
    if (overrides?.status !== undefined) setStatusFilter(overrides.status);
    if (overrides?.category !== undefined) setSelectedCategory(overrides.category);
    if (overrides?.search !== undefined) setSearch(overrides.search);
    if (overrides?.quality !== undefined) setQualityFilter(overrides.quality);
    setFindingsDrawerOpen(true);
  };
  const openFinding = (finding: ComplianceFinding) => { setFindingsDrawerOpen(false); setSelection({ kind: "finding", finding }); };
  const openAsset = (asset: AssetEntity) => { setFindingsDrawerOpen(false); setSelection({ kind: "asset", asset }); };
  const ruleCheck = (checkId: string) => ruleCatalog?.rules.find((rule) => rule.checkId === checkId);
  const checkDefinition = (checkId: string) => checkDefinitions?.checks.find((check) => check.checkId === checkId);
  const toggleRuleFromInvestigation = async (checkId: string, enabled: boolean) => {
    if (!security.canExcludeRules) return;
    if (!enabled) { setPendingGlobalExclusionId(checkId); return; }
    try {
      const check = checkDefinition(checkId); const rule = ruleCheck(checkId);
      if (check && !check.isActive) await updateCheck({ checkId, patch: { isActive: true, auditReason: "Re-enabled from investigation drawer" } }).unwrap();
      await toggleRuleStatus({ checkId, enabled: true }).unwrap();
      security.recordAuditEvent({ action: `Enabled check ${checkId}`, actionType: "RULE_ENABLED", targetId: checkId, reason: "Rule enabled from the investigation drawer", affectedFrameworkIds: check?.frameworkIds ?? rule?.frameworkIds ?? [] });
      setSecurityNotice(`${checkId} enabled for the current rule scope.`);
    } catch (error) { setSecurityNotice(error instanceof Error ? error.message : `Could not enable ${checkId}.`); }
  };
  const confirmGlobalExclusion = async (record: RuleExclusionRecord) => {
    if (!security.canExcludeRules) return;
    if (security.currentRole === "SecurityEngineer") {
      security.submitExclusionRequest({ ...record, source: "investigation" });
      setSecurityNotice(`Exclusion request for ${record.checkId} is pending Admin approval. The current rule remains enabled.`);
      setPendingGlobalExclusionId(null);
      return;
    }
    if (security.currentRole !== "Admin") return;
    const reason = `${record.reason}; ticket ${record.ticketId}; expires ${record.expiryDate}; ${record.justification ?? ""}`;
    try {
      const definition = checkDefinition(record.checkId);
      const rule = ruleCheck(record.checkId);
      if (!definition && !rule) throw new Error("No matching check or framework rule was found.");
      if (definition) await updateCheck({ checkId: record.checkId, patch: { isActive: false, auditReason: reason } }).unwrap();
      if (rule) await toggleRuleStatus({ checkId: record.checkId, enabled: false }).unwrap();
      security.recordAuditEvent({ action: `Excluded check ${record.checkId}`, actionType: "RULE_EXCLUDED", targetId: record.checkId, reason, affectedFrameworkIds: record.affectedFrameworkIds });
      setPendingGlobalExclusionId(null);
      setSecurityNotice(`${record.checkId} excluded for future scope until ${record.expiryDate}. Existing findings remain historical.`);
    } catch (error) {
      setSecurityNotice(error instanceof Error ? error.message : `Could not exclude ${record.checkId}. No approval was recorded.`);
    }
  };
  const approveExclusionRequest = async (record: RuleExclusionRecord) => {
    if (security.currentRole !== "Admin" || record.requestedBy === security.currentRole || !record.requestId) return;
    const reason = `Admin approved request: ${record.reason}; ticket ${record.ticketId}; expires ${record.expiryDate}; ${record.justification ?? ""}`;
    try {
      const definition = checkDefinition(record.checkId);
      const rule = ruleCheck(record.checkId);
      if (!definition && !rule) throw new Error("No matching check or framework rule was found; request remains pending.");
      if (definition) await updateCheck({ checkId: record.checkId, patch: { isActive: false, auditReason: reason } }).unwrap();
      if (rule) await toggleRuleStatus({ checkId: record.checkId, enabled: false }).unwrap();
      security.resolveExclusionRequest(record.requestId, "Approved");
      security.recordAuditEvent({ action: `Approved and applied exclusion for ${record.checkId}`, actionType: "RULE_EXCLUSION_APPROVED", targetId: record.checkId, reason, affectedFrameworkIds: record.affectedFrameworkIds });
      setSecurityNotice(`Approved and applied exclusion for ${record.checkId}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Approval failed; the request remains pending.";
      setSecurityNotice(message);
      security.recordAuditEvent({ action: `Failed to apply exclusion approval for ${record.checkId}`, actionType: "RULE_EXCLUSION_APPROVAL_FAILED", targetId: record.checkId, reason: message, affectedFrameworkIds: record.affectedFrameworkIds });
    }
  };
  const rejectExclusionRequest = (record: RuleExclusionRecord) => {
    if (security.currentRole !== "Admin" || record.requestedBy === security.currentRole || !record.requestId) return;
    security.resolveExclusionRequest(record.requestId, "Rejected");
    security.recordAuditEvent({ action: `Rejected exclusion request for ${record.checkId}`, actionType: "RULE_EXCLUSION_REJECTED", targetId: record.checkId, reason: `Admin rejected request associated with ticket ${record.ticketId}: ${record.reason}`, affectedFrameworkIds: record.affectedFrameworkIds });
    setSecurityNotice(`Exclusion request for ${record.checkId} rejected. Rule state is unchanged.`);
  };
  const onAccountConnectionRequest = (payload: AccountConnectionPayload) => {
    security.recordAuditEvent({ action: `Cloud account connection requested: ${payload.accountLabel}`, actionType: "CLOUD_ACCOUNT_SETUP_REQUESTED", targetId: payload.accountLabel, reason: `${payload.provider} · ${payload.scope} · Regions: ${payload.regions.join(", ")} · Permission method: ${payload.permissionMethod} · Baselines: ${payload.frameworks.join(", ")}`, affectedFrameworkIds: payload.frameworks });
    setConnectAccountOpen(false);
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-sec-canvas"><div className="rounded-card border border-sec-line bg-white px-6 py-5 text-sm text-sec-muted">Loading correlation dataset…</div></div>;
  if (isError || !data) return <div className="flex min-h-screen items-center justify-center bg-sec-canvas p-6"><div className="max-w-md rounded-card border border-rose-200 bg-white p-6"><AlertCircle className="text-rose-600" /><h1 className="mt-3 text-base font-semibold">Unable to load the dataset</h1><p className="mt-2 text-sm text-sec-muted">Check that public/mock/normalized-dataset.json exists, then retry.</p><button type="button" onClick={() => refetch()} className="mt-4 rounded-md bg-sec-blue px-3 py-2 text-xs font-semibold text-white">Retry</button></div></div>;

  return <div className="app-shell min-h-screen bg-sec-canvas text-sec-text"><div className="flex min-h-screen"><Sidebar activeTab={activeTab} activeView={activeView} onOpenChecks={() => { setActiveView("workbench"); setActiveTab("checks"); }} onOpenSecuritySettings={() => setActiveView("security")} onOpenWorkbench={() => { setActiveView("workbench"); setActiveTab("correlation"); }} /><div className="app-content flex min-w-0 flex-1 flex-col">
    <header className="app-topbar sticky top-0 z-30 flex min-h-[50px] flex-wrap items-center justify-between gap-2 border-b border-sec-line bg-white/95 px-3 py-2 backdrop-blur sm:px-4">
      <div className="flex min-w-0 items-center gap-3"><div className="hidden min-w-[155px] items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 md:flex"><span className="text-xs text-sec-text">All Customers</span><ChevronDown size={13} className="text-sec-muted" /></div><div className="text-xs font-medium text-sec-muted">Compliance intelligence</div></div>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <DemoLiveModeSwitcher />
        <button type="button" onClick={() => setActivityLogOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50" title="Review recent configuration activity"><ClipboardList size={12}/><span className="hidden xl:inline">Activity Log</span><span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] tabular-nums">{security.auditLog.length}</span></button>
        <button type="button" onClick={() => setTourOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50" title="Restart the guided tour"><Compass size={12}/><span className="hidden xl:inline">Tour</span></button>
        <button type="button" onClick={() => setConnectAccountOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-sky-600 px-2.5 text-[10px] font-semibold text-white hover:bg-sky-700"><Plus size={12}/><span>Connect Account</span></button>
        <label className="hidden items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 md:flex" title="Demo role selector; production role is supplied by identity management"><span className="text-[9px] font-semibold uppercase text-slate-400">Role</span><select aria-label="Current user role" value={security.currentRole} onChange={(event) => security.setCurrentRole(event.target.value as typeof security.currentRole)} className="max-w-[118px] bg-transparent text-[10px] font-medium text-slate-700 outline-none"><option value="Auditor">Auditor</option><option value="SecurityEngineer">Security Engineer</option><option value="Admin">Admin</option></select></label>
        <button type="button" onClick={() => refetch()} className="icon-button" aria-label="Refresh compliance data" title="Refresh compliance data"><RefreshCw size={13}/></button><span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-700">SG</span>
      </div>
    </header>
    {securityNotice && <div role="status" className="mx-3 mt-2 flex items-start gap-2 rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-[10px] leading-4 text-sky-900 sm:mx-4"><ShieldCheck size={12} className="mt-0.5 shrink-0"/><span className="flex-1">{securityNotice}</span><button type="button" onClick={() => setSecurityNotice("")} aria-label="Dismiss security status" className="font-semibold">×</button></div>}
    {activeView === "security" ? <SecurityGovernanceView /> : <CorrelationWorkbenchLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      findingCount={data.findings.length}
      discoveryId={data.meta.sourceScanIds.discovery}
      complianceId={data.meta.sourceScanIds.compliance["CIS-5.0"]}
      frameworkFilter={frameworkFilter}
      onFrameworkFilterChange={setFrameworkFilter}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      onOpenFilters={() => openFindings()}
      onExploreFindings={() => openFindings({ framework: "ALL", status: "ALL", category: "ALL", search: "", quality: "ALL" })}
    >
        {activeTab === "correlation" && <section id="panel-correlation" role="tabpanel" aria-labelledby="tab-correlation" className="space-y-3">
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4"><Kpi label="Assessment records" value={data.findings.length.toLocaleString()} detail="Across 3 frameworks" icon={ClipboardCheck} tint="blue" /><Kpi label="Failed assessments" value={statusCounts.FAIL.toLocaleString()} detail="Source FAIL records" icon={AlertTriangle} tint="red" onClick={() => openFindings({ status: "FAIL" })} /><Kpi label="Assets with linked failures" value={assetsWithFailingFindings.toLocaleString()} detail="Unique linked assets" icon={GitBranch} tint="indigo" onClick={() => openFindings({ status: "FAIL", quality: "LINKED" })} /><Kpi label="Public + high/critical risk" value={highCriticalExposed.toLocaleString()} detail="Independent asset risk signal" icon={Globe2} tint="amber" onClick={() => setActiveTab("assetType")} /></div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2"><Panel title="Framework share" subtitle="Share of all source assessment records." right={<span className="text-[9px] text-sec-muted">Donut</span>}><FrameworkDonut summaries={data.frameworkSummaries} selectedFramework={frameworkFilter} onSelectFramework={(value) => setFrameworkFilter(value)} /></Panel><Panel title="Assessment outcomes" subtitle="Compare PASS, FAIL and MANUAL counts by framework." right={<span className="text-[9px] text-sec-muted">Grouped bars</span>}><GroupedBarChart rows={frameworkBarRows} series={STATUS_SERIES} onSelect={(row, key) => { const framework = FRAMEWORKS.find((item) => getFrameworkShortName(item) === row.label); if (framework) openFindings({ framework, status: key as StatusFilter }); }} /></Panel></div>
          <Panel title="Correlation density by asset domain" subtitle="Select a domain to continue analysis. Bars represent linked findings only; account-scoped and unresolved records are excluded." right={<button type="button" onClick={() => setActiveTab("assetType")} className="text-[10px] font-semibold text-sec-blue hover:underline">Open detailed matrix →</button>}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">{domainRows.map((row) => { const failRate = row.linkedPasses + row.linkedFails > 0 ? row.linkedFails / (row.linkedPasses + row.linkedFails) * 100 : 0; return <button type="button" key={row.category} onClick={() => { setSelectedCategory(row.category); setActiveTab("assetType"); }} className={`rounded-md border p-3 text-left transition hover:border-sky-200 hover:bg-sky-50/30 ${selectedCategory === row.category ? "border-sky-300 bg-sky-50/50" : "border-sec-line bg-white"}`}><div className="flex items-start justify-between gap-2"><span className="text-[11px] font-semibold text-sec-text">{row.category}</span><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-sec-muted">{row.assets} assets</span></div><div className="mt-2 flex items-baseline gap-2"><span className="text-xl font-bold tabular-nums text-sec-text">{row.linkedFails.toLocaleString()}</span><span className="text-[9px] text-sec-muted">linked FAIL</span><span className="ml-auto text-[10px] font-semibold text-rose-700">{failRate.toFixed(0)}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-rose-400" style={{ width: `${Math.min(100, failRate)}%` }} /></div><div className="mt-2 flex justify-between text-[9px] text-sec-muted"><span>{row.exposedAssets} public</span><span>{row.highCriticalAssets} high/critical</span><span>{row.assetsWithAttackPaths} in paths</span></div></button>; })}</div>
          </Panel>
        </section>}

        {activeTab === "assetType" && <section id="panel-assetType" role="tabpanel" aria-labelledby="tab-assetType" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-semibold">Asset-type exposure and control density</h2><p className="mt-1 text-[10px] text-sec-muted">Compare risk population and linked compliance outcomes by resource domain.</p></div><button type="button" onClick={() => openFindings({ category: selectedCategory })} className="rounded-md bg-sec-blue px-3 py-2 text-[10px] font-semibold text-white">Open findings for selection</button></div>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4"><Kpi label="Asset domains" value={domainRows.length} detail="Normalized resource groups" icon={Layers3} tint="blue" /><Kpi label="Linked findings" value={diagnostics?.assetLinkedFindings?.toLocaleString() ?? "—"} detail="Resolved to inventory assets" icon={GitBranch} tint="indigo" /><Kpi label="Public assets" value={data.assets.filter((asset) => asset.isExposedPublicly === true).length.toLocaleString()} detail="Inventory exposure flag" icon={Globe2} tint="amber" /><Kpi label="High / critical assets" value={data.assets.filter((asset) => ["high", "critical"].includes(String(asset.riskLevel ?? "").toLowerCase())).length.toLocaleString()} detail="Asset risk, not finding severity" icon={AlertTriangle} tint="red" /></div>
          <Panel title="Asset domain × framework matrix" subtitle="Click a cell to inspect the failed records linked to that domain and framework." right={<span className="text-[9px] text-sec-muted">Linked records only</span>}><CorrelationMatrix rows={domainRows} selectedCategory={selectedCategory} selectedFramework={frameworkFilter} onSelect={(category, framework) => openFindings({ category, framework, status: "FAIL" })} onSelectCategory={setSelectedCategory} /><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-sec-line pt-2 text-[9px] text-sec-muted"><span>Red/orange cells indicate higher failed share.</span><span>Unresolved/account-scoped records remain outside the matrix.</span><span>Finding severity is not inferred.</span></div></Panel>
          <Panel title="Grouped outcomes by asset domain" subtitle="Side-by-side outcome counts. Choose a bar to open its supporting findings." right={<span className="text-[9px] text-sec-muted">Grouped bars</span>}><GroupedBarChart rows={domainBarRows} series={STATUS_SERIES} onSelect={(row, key) => openFindings({ category: row.label as AssetCategory, status: key as StatusFilter })} /></Panel>
        </section>}

        {activeTab === "frameworks" && <section id="panel-frameworks" role="tabpanel" aria-labelledby="tab-frameworks" className="space-y-3">
          <div><h2 className="text-sm font-semibold">Framework assessment breakdown</h2><p className="mt-1 text-[10px] text-sec-muted">Compare record volume, outcomes and the checks contributing most failed records.</p></div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2"><Panel title="Share of assessment records" subtitle="Record share by framework—not unique defects." right={<span className="text-[9px] text-sec-muted">2,200 total</span>}><FrameworkDonut summaries={data.frameworkSummaries} selectedFramework={frameworkFilter} onSelectFramework={(value) => setFrameworkFilter(value)} /></Panel><Panel title="Outcome volume by framework" subtitle="Absolute PASS, FAIL and MANUAL counts." right={<span className="text-[9px] text-sec-muted">Grouped bars</span>}><GroupedBarChart rows={frameworkBarRows} series={STATUS_SERIES} onSelect={(row, key) => { const framework = FRAMEWORKS.find((item) => getFrameworkShortName(item) === row.label); if (framework) openFindings({ framework, status: key as StatusFilter }); }} /></Panel></div>
          <Panel title="Most frequently failed checks" subtitle="Sorted by raw source FAIL-record frequency; repeated records and multi-requirement mappings may affect counts." right={<span className="text-[9px] text-sec-muted">Top 5</span>}><div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">{topControls.map((check) => <button type="button" key={`${check.framework}-${check.checkId}`} onClick={() => openFindings({ framework: check.framework, status: "FAIL", search: check.checkId })} className="rounded-md border border-sec-line bg-white p-3 text-left transition hover:border-sky-200 hover:bg-sky-50/30"><div className="flex items-start justify-between gap-2"><span className="line-clamp-2 text-[11px] font-semibold text-sec-text">{check.requirementDescriptions[0] || check.checkId}</span><span className="shrink-0 rounded-md bg-rose-50 px-2 py-1 text-xs font-bold tabular-nums text-rose-700">{check.failCount}</span></div><div className="mt-2 truncate font-mono text-[9px] text-sec-muted">{check.checkId}</div><div className="mt-1 text-[9px] text-sec-muted">{getFrameworkShortName(check.framework)} · failed records</div></button>)}</div></Panel>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3"><div className="rounded-md border border-sec-line bg-white p-3"><div className="text-[9px] font-semibold uppercase text-sec-muted">PASS</div><div className="mt-1 text-lg font-bold text-emerald-700">{statusCounts.PASS.toLocaleString()}</div></div><div className="rounded-md border border-sec-line bg-white p-3"><div className="text-[9px] font-semibold uppercase text-sec-muted">FAIL</div><div className="mt-1 text-lg font-bold text-rose-700">{statusCounts.FAIL.toLocaleString()}</div></div><div className="rounded-md border border-sec-line bg-white p-3"><div className="text-[9px] font-semibold uppercase text-sec-muted">MANUAL</div><div className="mt-1 text-lg font-bold text-amber-700">{statusCounts.MANUAL.toLocaleString()}</div></div></div>
        </section>}


        {activeTab === "rules" && <section id="panel-rules" role="tabpanel" aria-labelledby="tab-rules" className="space-y-3">
          {rulesLoading || !ruleCatalog ? <div className="card-panel p-6 text-xs text-sec-muted">Loading benchmark definitions…</div> : <RuleManagement catalog={ruleCatalog} findings={data.findings} onOpenMatchingFindings={(mapping) => openFindings({ framework: "ALL", status: "ALL", category: "ALL", search: mapping.checkId, quality: "ALL" })} />}
        </section>}
        {activeTab === "checks" && <section id="panel-checks" role="tabpanel" aria-labelledby="tab-checks"><ChecksCatalogueView /></section>}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-sec-line pt-2 text-[9px] text-sec-muted"><span><CalendarClock size={11} className="mr-1 inline" />Single snapshot · historical trends disabled until comparable scans are retained.</span><span>{diagnostics?.accountScopedFindings ?? 0} account-scoped · {diagnostics?.unresolvedFindings ?? 0} unresolved · {diagnostics?.duplicateCandidateCount ?? 0} duplicate candidates</span></div>
    </CorrelationWorkbenchLayout>}
  </div></div>

  <FindingListDrawer open={findingsDrawerOpen} count={filteredFindings.length} search={search} setSearch={setSearch} onClose={() => setFindingsDrawerOpen(false)}><FindingsTable findings={filteredFindings} assets={data.assets} frameworkFilter={frameworkFilter} statusFilter={statusFilter} qualityFilter={qualityFilter} search={""} onOpenFinding={openFinding} onStatusFilterChange={setStatusFilter} onQualityFilterChange={setQualityFilter} /></FindingListDrawer>
  <InvestigationDrawer selection={selection} dataset={data} ruleCatalog={ruleCatalog} onToggleRule={(checkId, enabled) => { void toggleRuleFromInvestigation(checkId, enabled); }} onClose={() => setSelection(null)} onOpenFinding={openFinding} onOpenAsset={openAsset} />
    <OnboardingTour
  open={tourOpen}
  onClose={(dontShowAgain) => {
    if (
      dontShowAgain &&
      typeof window !== "undefined"
    ) {
      window.localStorage.setItem(
        ONBOARDING_SUPPRESSION_KEY,
        "true"
      );
    }

    setTourOpen(false);
  }}
/>
    <CloudAccountConnectionModal open={connectAccountOpen} onClose={() => setConnectAccountOpen(false)} onSubmit={onAccountConnectionRequest} />
    <ActivityLogDrawer open={activityLogOpen} onClose={() => setActivityLogOpen(false)} onApproveExclusion={(record) => void approveExclusionRequest(record)} onRejectExclusion={rejectExclusionRequest} />
    {pendingGlobalExclusionId && <RuleExclusionModal open checkId={pendingGlobalExclusionId} checkName={checkDefinition(pendingGlobalExclusionId)?.name ?? pendingGlobalExclusionId} severity={checkDefinition(pendingGlobalExclusionId)?.severity} affectedAssetCount={new Set((data.findings ?? []).filter((finding) => finding.checkId === pendingGlobalExclusionId && finding.assetUid).map((finding) => finding.assetUid)).size} frameworkIds={checkDefinition(pendingGlobalExclusionId)?.frameworkIds ?? ruleCheck(pendingGlobalExclusionId)?.frameworkIds ?? []} onClose={() => setPendingGlobalExclusionId(null)} onConfirm={(record) => void confirmGlobalExclusion(record)} />}
  </div>;
}
