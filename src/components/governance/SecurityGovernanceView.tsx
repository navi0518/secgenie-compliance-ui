import { useMemo, useState } from "react";
import {
  Activity, CheckCircle2, Clock3, KeyRound, Network, Plus, ShieldCheck, SlidersHorizontal, Users, Workflow,
} from "lucide-react";
import { useSecurityContext } from "../../context/useSecurityContext";
import { PERMISSION_CATALOG, useSecurityGovernance } from "../../context/useSecurityGovernance";
import type { PermissionKey } from "../../types/governance";
import { APIKeyManager } from "./APIKeyManager";
import { IPWhitelistManager } from "./IPWhitelistManager";
import { PasswordPolicyCard } from "./PasswordPolicyCard";
import { RBACMatrixTable } from "./RBACMatrixTable";

type StudioTab = "authentication" | "roles" | "network" | "credentials" | "approvals";
const TABS: Array<{ id: StudioTab; label: string; icon: typeof ShieldCheck; description: string }> = [
  { id: "authentication", label: "Authentication & Access", icon: ShieldCheck, description: "Password baseline and multi-factor authentication." },
  { id: "roles", label: "Roles & Permissions", icon: Users, description: "Fine-grained role and capability assignments." },
  { id: "network", label: "Network & Sessions", icon: Network, description: "Session hardening and IP/CIDR access fencing." },
  { id: "credentials", label: "API Credentials", icon: KeyRound, description: "Expiring service credentials and key rotation." },
  { id: "approvals", label: "Approval Rules", icon: Workflow, description: "Dual-custody and exemption governance." },
];
const MFA_LABELS = { optional: "Optional", "all-users": "All users", "privileged-roles": "Privileged roles", "hardware-key-only": "Hardware key only" } as const;

export function SecurityGovernanceView() {
  const security = useSecurityContext();
  const studio = useSecurityGovernance();
  const [activeTab, setActiveTab] = useState<StudioTab>("authentication");
  const [policyNotice, setPolicyNotice] = useState("");
  const canAdminister = security.currentRole === "Admin";
  const state = studio.state;
  const enforced = state.enforcedAuthenticationPolicy;
  const policyDirty = !enforced || JSON.stringify(enforced) !== JSON.stringify(state.authenticationPolicy);
  const pendingApprovals = security.pendingExclusions.filter((record) => record.approvalStatus === "Pending").length;
  const activeKeys = state.apiKeys.filter((key) => key.status !== "Revoked" && new Date(key.expiresAt).getTime() > Date.now()).length;
  const activeNetworks = state.ipWhitelist.filter((entry) => entry.enabled).length;
  const grantedPermissions = useMemo(() => {
    const selected = state.roles.find((role) => role.id === state.selectedRoleId);
    return selected ? Object.values(selected.permissions).filter(Boolean).length : 0;
  }, [state.roles, state.selectedRoleId]);

  const savePolicy = () => {
    if (!canAdminister) return;
    studio.enforceAuthenticationPolicy();
    security.recordAuditEvent({ action: "Saved and enforced authentication baseline", actionType: "AUTHENTICATION_POLICY_ENFORCED", reason: `Password length ${state.authenticationPolicy.minimumPasswordLength}; expiry ${state.authenticationPolicy.passwordExpiryDays}; MFA ${state.authenticationPolicy.mfaEnforcement}`, affectedFrameworkIds: ["CIS-5.0", "CIS-8.0", "CIS-8.1", "ISO27001-2013"] });
    setPolicyNotice("Authentication baseline saved in this browser demo. Production enforcement requires the identity provider integration.");
  };

  const createRole = (name: string, description: string) => {
    if (!canAdminister) return;
    studio.createRole(name, description);
    security.recordAuditEvent({ action: `Created custom role ${name}`, actionType: "CUSTOM_ROLE_CREATED", targetId: name, reason: description || "Custom role created in Security & Governance Studio", affectedFrameworkIds: [] });
  };
  const setRolePermission = (roleId: string, permission: PermissionKey, granted: boolean) => {
    if (!canAdminister) return;
    studio.setRolePermission(roleId, permission, granted);
    const role = state.roles.find((item) => item.id === roleId);
    security.recordAuditEvent({ action: `${granted ? "Granted" : "Revoked"} ${permission} permission`, actionType: "ROLE_PERMISSION_UPDATED", targetId: role?.name ?? roleId, reason: `${permission} set to ${granted ? "allowed" : "denied"}`, affectedFrameworkIds: [] });
  };

  const addIP = (entry: Parameters<typeof studio.addIP>[0]) => {
    if (!canAdminister) return;
    studio.addIP(entry);
    security.recordAuditEvent({ action: `Added allowed network ${entry.cidr}`, actionType: "NETWORK_ALLOWLIST_UPDATED", targetId: entry.cidr, reason: entry.label, affectedFrameworkIds: [] });
  };
  const removeIP = (id: string) => {
    if (!canAdminister) return;
    const entry = state.ipWhitelist.find((item) => item.id === id);
    studio.removeIP(id);
    security.recordAuditEvent({ action: `Removed allowed network ${entry?.cidr ?? id}`, actionType: "NETWORK_ALLOWLIST_UPDATED", targetId: entry?.cidr ?? id, reason: "Network entry removed", affectedFrameworkIds: [] });
  };
  const updateIP = (id: string, patch: { enabled?: boolean }) => {
    if (!canAdminister) return;
    studio.updateIP(id, patch);
    const entry = state.ipWhitelist.find((item) => item.id === id);
    security.recordAuditEvent({ action: `${patch.enabled ? "Enabled" : "Disabled"} network range ${entry?.cidr ?? id}`, actionType: "NETWORK_ALLOWLIST_UPDATED", targetId: entry?.cidr ?? id, reason: "Entry state changed", affectedFrameworkIds: [] });
  };
  const setIPEnforcement = (enabled: boolean) => {
    if (!canAdminister) return;
    studio.setIPEnforcement(enabled);
    security.recordAuditEvent({ action: `${enabled ? "Enabled" : "Disabled"} IP allowlist enforcement`, actionType: "NETWORK_FENCE_TOGGLED", reason: enabled ? `${activeNetworks} allowed ranges will be evaluated by configured gateway` : "Network allowlist enforcement set to monitor-only", affectedFrameworkIds: [] });
  };

  const createAPIKey = (record: Parameters<typeof studio.addAPIKey>[0]) => {
    if (!canAdminister) return;
    studio.addAPIKey(record);
    security.recordAuditEvent({ action: `Generated API key ${record.name}`, actionType: "API_KEY_CREATED", targetId: record.prefix, reason: `${record.role} · ${record.scope} · expires ${record.expiresAt}`, affectedFrameworkIds: [] });
  };
  const revokeAPIKey = (id: string) => {
    if (!canAdminister) return;
    const key = state.apiKeys.find((item) => item.id === id);
    studio.revokeAPIKey(id);
    security.recordAuditEvent({ action: `Revoked API key ${key?.name ?? id}`, actionType: "API_KEY_REVOKED", targetId: key?.prefix ?? id, reason: "Credential revoked from Security & Governance Studio", affectedFrameworkIds: [] });
  };
  const rotateAPIKey = (id: string, replacement: Parameters<typeof studio.rotateAPIKey>[1]) => {
    if (!canAdminister) return;
    const previous = state.apiKeys.find((item) => item.id === id);
    const next = studio.rotateAPIKey(id, replacement);
    security.recordAuditEvent({ action: `Rotated API key ${previous?.name ?? id}`, actionType: "API_KEY_ROTATED", targetId: next.prefix, reason: `Old prefix ${previous?.prefix ?? id} revoked; replacement expires ${next.expiresAt}`, affectedFrameworkIds: [] });
  };

  const updateThreshold = (key: keyof typeof state.approvalThresholds, value: boolean) => {
    if (!canAdminister) return;
    studio.updateApprovalThresholds({ [key]: value });
    security.recordAuditEvent({ action: `Updated approval threshold: ${key}`, actionType: "APPROVAL_THRESHOLD_UPDATED", reason: `${key} set to ${value ? "enabled" : "disabled"}`, affectedFrameworkIds: [] });
  };

  const statusBadge = <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${canAdminister ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><span className={`h-1.5 w-1.5 rounded-full ${canAdminister ? "bg-emerald-500" : "bg-amber-500"}`}/>{canAdminister ? "Admin controls enabled" : `${security.currentRole} · read-only`}</span>;

  return <main className="min-w-0 flex-1 space-y-3 p-3 sm:p-4">
    <header className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500"><SlidersHorizontal size={12}/>Configuration · Security settings</div><h1 className="mt-1 text-base font-semibold tracking-tight text-slate-900">Security &amp; Governance Studio</h1><p className="mt-0.5 text-xs text-slate-500">Configure authentication posture, role capabilities, network boundaries, API credentials and dual-custody policies.</p><div className="mt-2 flex flex-wrap items-center gap-2">{statusBadge}<span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-500">Local demo configuration</span></div></div><button type="button" onClick={() => { setPolicyNotice(""); setActiveTab("authentication"); }} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"><Activity size={12}/>Overview</button></header>

    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      <Metric icon={ShieldCheck} label="MFA policy" value={MFA_LABELS[state.authenticationPolicy.mfaEnforcement]} detail={`Password length ${state.authenticationPolicy.minimumPasswordLength} characters`} tone="sky"/>
      <Metric icon={Users} label="Role capabilities" value={`${grantedPermissions}/22`} detail={`${state.roles.length} roles configured`} tone="violet"/>
      <Metric icon={Network} label="Allowed networks" value={`${activeNetworks}`} detail={state.ipEnforcementEnabled ? "Enforcement enabled" : "Monitor-only mode"} tone="emerald"/>
      <Metric icon={KeyRound} label="Active API keys" value={activeKeys} detail="Non-revoked, unexpired credentials" tone="amber"/>
    </div>

    <nav className="flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1" role="tablist" aria-label="Security governance modules">{TABS.map(({ id, label, icon: Icon }) => <button key={id} id={`security-tab-${id}`} type="button" role="tab" aria-selected={activeTab === id} aria-controls={`security-panel-${id}`} onClick={() => setActiveTab(id)} className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition ${activeTab === id ? "border border-sky-100 bg-sky-50 text-sky-700 shadow-sm" : "border border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}><Icon size={14}/>{label}{id === "approvals" && pendingApprovals > 0 && <span className="ml-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">{pendingApprovals}</span>}</button>)}</nav>

    {policyNotice && <div role="status" className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] leading-4 text-emerald-800"><CheckCircle2 size={13} className="mt-0.5 shrink-0"/><p className="flex-1">{policyNotice}</p><button type="button" onClick={() => setPolicyNotice("")} aria-label="Dismiss notification" className="font-semibold">×</button></div>}
    {!canAdminister && <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-900"><ShieldCheck size={13} className="mt-0.5 shrink-0"/><p><strong>Read-only preview.</strong> Changes are disabled for {security.currentRole}. Switch to the Admin demo role in the top bar to demonstrate configuration interactions.</p></div>}

    {activeTab === "authentication" && <section id="security-panel-authentication" role="tabpanel" aria-labelledby="security-tab-authentication" className="space-y-3"><PasswordPolicyCard policy={state.authenticationPolicy} onChange={studio.updateAuthenticationPolicy} onSave={savePolicy} canEdit={canAdminister} isDirty={policyDirty} enforcedAt={state.policyEnforcedAt}/><div className="rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2.5 text-[11px] leading-4 text-sky-900"><strong>Governance note:</strong> this configurable password/MFA baseline is a platform policy preview inspired by IAM control objectives. Actual password and MFA enforcement must be applied through your identity provider.</div></section>}

    {activeTab === "roles" && <section id="security-panel-roles" role="tabpanel" aria-labelledby="security-tab-roles" className="space-y-3"><RBACMatrixTable roles={state.roles} selectedRoleId={state.selectedRoleId} onSelectRole={studio.selectRole} onCreateRole={createRole} onSetPermission={setRolePermission} onDeleteRole={(roleId) => { const role = state.roles.find((item) => item.id === roleId); if (!canAdminister) return; studio.deleteRole(roleId); security.recordAuditEvent({ action: `Deleted custom role ${role?.name ?? roleId}`, actionType: "CUSTOM_ROLE_DELETED", targetId: roleId, reason: "Custom role removed in Governance Studio", affectedFrameworkIds: [] }); }} canEdit={canAdminister}/><div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-500">Permission changes update the local demo matrix immediately. In production, resolve effective permissions from server-issued identity claims and enforce each capability at the API boundary.</div></section>}

    {activeTab === "network" && <section id="security-panel-network" role="tabpanel" aria-labelledby="security-tab-network" className="space-y-3"><section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)]"><div className="flex items-start gap-2.5 border-b border-slate-100 pb-3"><span className="rounded-lg bg-violet-50 p-2 text-violet-700"><Clock3 size={16}/></span><div><h2 className="text-[13px] font-semibold text-slate-900">Session hardening</h2><p className="mt-0.5 text-xs text-slate-500">Shorten unattended sessions and reduce concurrent credential exposure.</p></div></div><div className="grid grid-cols-1 gap-4 pt-4 lg:grid-cols-[0.8fr_1.2fr]"><div><div className="flex items-center justify-between"><label htmlFor="idle-timeout" className="text-xs font-medium text-slate-700">Idle session timeout</label><span className="rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold tabular-nums text-sky-800">{state.idleTimeoutMinutes < 60 ? `${state.idleTimeoutMinutes} min` : state.idleTimeoutMinutes % 60 === 0 ? `${state.idleTimeoutMinutes / 60} hr` : `${Math.floor(state.idleTimeoutMinutes / 60)}h ${state.idleTimeoutMinutes % 60}m`}</span></div><input id="idle-timeout" type="range" min={5} max={480} step={5} value={state.idleTimeoutMinutes} disabled={!canAdminister} onChange={(event) => studio.updateSessionSettings({ idleTimeoutMinutes: Number(event.target.value) })} className="mt-3 w-full accent-sky-600 disabled:opacity-50"/><div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>5 min</span><span>2 hr</span><span>8 hr</span></div></div><div className="space-y-2"><SettingToggle title="Enforce single active session" description="When a user signs in elsewhere, invalidate their other sessions." checked={state.enforceSingleActiveSession} disabled={!canAdminister} onChange={(checked) => { studio.updateSessionSettings({ enforceSingleActiveSession: checked }); security.recordAuditEvent({ action: `Single active session ${checked ? "enabled" : "disabled"}`, actionType: "SESSION_POLICY_UPDATED", reason: "Session concurrency policy changed", affectedFrameworkIds: [] }); }}/><SettingToggle title="Terminate sessions on privilege change" description="Revoke active sessions when a user's role or privilege assignment changes." checked={state.terminateSessionsOnPrivilegeChange} disabled={!canAdminister} onChange={(checked) => { studio.updateSessionSettings({ terminateSessionsOnPrivilegeChange: checked }); security.recordAuditEvent({ action: `Session termination on privilege change ${checked ? "enabled" : "disabled"}`, actionType: "SESSION_POLICY_UPDATED", reason: "Privilege-change session policy updated", affectedFrameworkIds: [] }); }}/></div></div><p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-500">Session settings persist locally for the demo; production enforcement must be configured in the authentication/session service.</p></section><IPWhitelistManager entries={state.ipWhitelist} enforcementEnabled={state.ipEnforcementEnabled} canEdit={canAdminister} onAdd={addIP} onRemove={removeIP} onUpdate={updateIP} onSetEnforcement={setIPEnforcement}/></section>}

    {activeTab === "credentials" && <section id="security-panel-credentials" role="tabpanel" aria-labelledby="security-tab-credentials" className="space-y-3"><APIKeyManager keys={state.apiKeys} canEdit={canAdminister} onCreate={createAPIKey} onRevoke={revokeAPIKey} onRotate={rotateAPIKey}/><div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-900">Demo safety: raw token values are shown once in temporary component memory and are never stored in local storage. Production API keys must be generated, hashed, scoped and revoked by a backend credential service.</div></section>}

    {activeTab === "approvals" && <section id="security-panel-approvals" role="tabpanel" aria-labelledby="security-tab-approvals" className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_300px]"><section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)]"><div className="flex items-start gap-2.5 border-b border-slate-100 pb-3"><span className="rounded-lg bg-amber-50 p-2 text-amber-700"><Workflow size={16}/></span><div><h2 className="text-[13px] font-semibold text-slate-900">Dual-custody approval thresholds</h2><p className="mt-0.5 text-xs text-slate-500">Prevent a single operator from making high-impact governance changes without review.</p></div></div><div className="divide-y divide-slate-100"> <SettingToggle title="Dual-admin approval for Critical check exclusions" description="A second distinct Admin must approve the exclusion before it takes effect." checked={state.approvalThresholds.requireDualAdminCriticalExclusions} disabled={!canAdminister} onChange={(checked) => updateThreshold("requireDualAdminCriticalExclusions", checked)}/><SettingToggle title="Peer review for production scan schedules" description="Require another authorized reviewer to approve changes to production scan cadence." checked={state.approvalThresholds.requirePeerReviewScanSchedules} disabled={!canAdminister} onChange={(checked) => updateThreshold("requirePeerReviewScanSchedules", checked)}/><SettingToggle title="Ticket ID on all compliance exemptions" description="Require an associated Jira / ServiceNow ticket ID and expiry date for every rule exemption." checked={state.approvalThresholds.requireTicketForAllExemptions} disabled={!canAdminister} onChange={(checked) => updateThreshold("requireTicketForAllExemptions", checked)}/></div><div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"><div><p className="text-xs font-semibold text-slate-800">Approval policy state</p><p className="mt-0.5 text-[10px] text-slate-500">Changes are saved automatically in local demo state and logged in Activity Log.</p></div><span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800"><CheckCircle2 size={11}/>Saved locally</span></div></section><aside className="space-y-3"><section className="rounded-xl border border-amber-200 bg-amber-50/70 p-4"><div className="flex items-center justify-between gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-800"><Workflow size={16}/></span><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-900">{pendingApprovals} pending</span></div><h3 className="mt-3 text-sm font-semibold text-amber-950">Pending approvals queue</h3><p className="mt-1 text-[11px] leading-4 text-amber-900">Exclusion requests awaiting a second administrator's decision.</p><button type="button" onClick={() => { setPolicyNotice("Use Activity Log in the top toolbar to review and approve or reject pending maker-checker requests."); }} className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-900 hover:bg-amber-50">Review queue <Plus size={12}/></button></section><section className="rounded-xl border border-slate-200 bg-white p-3"><h3 className="text-xs font-semibold text-slate-900">Effective safeguards</h3><ul className="mt-2 space-y-2">{[{label:"Critical exclusion requires two Admins",checked:state.approvalThresholds.requireDualAdminCriticalExclusions},{label:"Scan schedule changes require peer review",checked:state.approvalThresholds.requirePeerReviewScanSchedules},{label:"Exemptions require ticket + expiry",checked:state.approvalThresholds.requireTicketForAllExemptions}].map((item) => <li key={item.label} className="flex items-start gap-2 text-[10px] leading-4"><span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.checked ? "bg-emerald-500" : "bg-slate-300"}`}/><span className={item.checked ? "text-slate-700" : "text-slate-400"}>{item.label}</span></li>)}</ul></section><p className="text-[10px] leading-4 text-slate-400">Maker-checker settings are demo-only until each destructive API verifies requester/reviewer identities and applies an atomic approval decision.</p></aside></section>}

    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2 text-[10px] text-slate-400"><span>Security &amp; Governance Studio · configuration snapshot</span><span>Permission catalogue: {PERMISSION_CATALOG.length} capabilities · pending approvals: {pendingApprovals}</span></footer>
  </main>;
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: typeof ShieldCheck; label: string; value: string | number; detail: string; tone: "sky" | "violet" | "emerald" | "amber" }) {
  const styles = { sky: "bg-sky-50 text-sky-700", violet: "bg-violet-50 text-violet-700", emerald: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700" }[tone];
  return <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.035)]"><div className="flex items-start gap-2.5"><span className={`rounded-lg p-2 ${styles}`}><Icon size={15}/></span><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 truncate text-base font-bold leading-5 text-slate-900">{value}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">{detail}</p></div></div></div>;
}
function SettingToggle({ title, description, checked, disabled, onChange }: { title: string; description: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  return <div className="flex items-start gap-3 py-3"><span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${checked ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}><CheckCircle2 size={13}/></span><div className="min-w-0 flex-1"><p className="text-xs font-medium text-slate-800">{title}</p><p className="mt-0.5 text-[11px] leading-4 text-slate-500">{description}</p></div><button type="button" role="switch" aria-checked={checked} aria-label={title} disabled={disabled} onClick={() => onChange(!checked)} className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-45 ${checked ? "bg-emerald-500" : "bg-slate-300"}`}><span className={`h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-[18px]" : "translate-x-1"}`}/></button></div>;
}
