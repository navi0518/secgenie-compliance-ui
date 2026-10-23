import { useCallback, useEffect, useState } from "react";
import type {
  APIKeyRecord, AuthenticationPolicy, CustomRole, IPWhitelistEntry, PermissionKey,
  PermissionMatrix, SecurityGovernanceState,
} from "../types/governance";

const STORAGE_KEY = "secgenie.security-governance.studio.v1";
const permissionKeys: PermissionKey[] = [
  "viewAssets", "triggerManualScan", "exportAssetMap", "manageCloudAccounts", "manageAssetTags",
  "viewFindings", "muteRemediateFinding", "toggleBenchmarkRules", "createCustomChecks", "editCustomChecks",
  "deleteCustomChecks", "editFrameworkBaselines", "runRemediation", "viewRuleImpact",
  "manageUsers", "editSecurityPolicies", "generateApiKeys", "revokeApiKeys", "manageRoles",
  "manageNetworkFence", "configureSessionPolicies", "manageApprovalRules",
];

const allPermissions = (value: boolean): PermissionMatrix => Object.fromEntries(permissionKeys.map((key) => [key, value])) as PermissionMatrix;
const now = () => new Date().toISOString();
const plusDays = (days: number) => { const value = new Date(); value.setDate(value.getDate() + days); return value.toISOString(); };

const defaultAuthenticationPolicy: AuthenticationPolicy = {
  minimumPasswordLength: 14,
  passwordExpiryDays: 90,
  requireSpecialCharacters: true,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  preventPasswordReuse: 24,
  mfaEnforcement: "privileged-roles",
};

const defaultState: SecurityGovernanceState = {
  authenticationPolicy: defaultAuthenticationPolicy,
  enforcedAuthenticationPolicy: null,
  policyEnforcedAt: null,
  roles: [
    { id: "role-admin", name: "Admin", description: "Full platform administration and governance ownership.", isBuiltIn: true, permissions: allPermissions(true), createdAt: now() },
    { id: "role-engineer", name: "Security Engineer", description: "Investigate findings, manage rules, and execute approved security operations.", isBuiltIn: true, permissions: { ...allPermissions(false), viewAssets: true, triggerManualScan: true, exportAssetMap: true, viewFindings: true, muteRemediateFinding: true, toggleBenchmarkRules: true, createCustomChecks: true, editCustomChecks: true, editFrameworkBaselines: true, runRemediation: true, viewRuleImpact: true }, createdAt: now() },
    { id: "role-auditor", name: "Auditor", description: "Read-only access to evidence, asset inventory, and governance records.", isBuiltIn: true, permissions: { ...allPermissions(false), viewAssets: true, exportAssetMap: true, viewFindings: true, viewRuleImpact: true }, createdAt: now() },
  ],
  selectedRoleId: "role-admin",
  idleTimeoutMinutes: 30,
  enforceSingleActiveSession: true,
  terminateSessionsOnPrivilegeChange: true,
  ipWhitelist: [
    { id: "ip-corporate-hq", label: "Corporate HQ", cidr: "203.0.113.0/24", enabled: true, addedAt: now(), addedBy: "Admin" },
    { id: "ip-vpn-egress", label: "Corporate VPN egress", cidr: "198.51.100.24/32", enabled: true, addedAt: now(), addedBy: "Admin" },
  ],
  ipEnforcementEnabled: false,
  apiKeys: [
    { id: "key-demo-ci", name: "CI Compliance Reporter", prefix: "sec_live_9a8f…", role: "Auditor", scope: "Read only", createdAt: plusDays(-12), expiresAt: plusDays(78), status: "Active", lastUsedAt: plusDays(-1) },
    { id: "key-demo-automation", name: "Security Automation", prefix: "sec_live_31cd…", role: "SecurityEngineer", scope: "Security operations", createdAt: plusDays(-80), expiresAt: plusDays(10), status: "Active", lastUsedAt: plusDays(-2) },
    { id: "key-demo-old", name: "Legacy Export Integration", prefix: "sec_live_5b77…", role: "Auditor", scope: "Read only", createdAt: plusDays(-400), expiresAt: plusDays(-35), status: "Expired" },
  ],
  approvalThresholds: { requireDualAdminCriticalExclusions: true, requirePeerReviewScanSchedules: true, requireTicketForAllExemptions: true },
};

function readState(): SecurityGovernanceState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const saved = JSON.parse(raw) as Partial<SecurityGovernanceState>;
    return {
      ...defaultState,
      ...saved,
      authenticationPolicy: { ...defaultState.authenticationPolicy, ...saved.authenticationPolicy },
      enforcedAuthenticationPolicy: saved.enforcedAuthenticationPolicy ?? null,
      roles: Array.isArray(saved.roles) && saved.roles.length ? saved.roles : defaultState.roles,
      ipWhitelist: Array.isArray(saved.ipWhitelist) ? saved.ipWhitelist : defaultState.ipWhitelist,
      apiKeys: Array.isArray(saved.apiKeys) ? saved.apiKeys : defaultState.apiKeys,
      approvalThresholds: { ...defaultState.approvalThresholds, ...saved.approvalThresholds },
    };
  } catch { return defaultState; }
}

function id(prefix: string) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }

export function useSecurityGovernance() {
  const [state, setState] = useState<SecurityGovernanceState>(readState);
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage may be unavailable in restricted browser contexts */ }
  }, [state]);

  const updateAuthenticationPolicy = useCallback((patch: Partial<AuthenticationPolicy>) => {
    setState((previous) => ({ ...previous, authenticationPolicy: { ...previous.authenticationPolicy, ...patch } }));
  }, []);
  const enforceAuthenticationPolicy = useCallback(() => setState((previous) => ({
    ...previous,
    enforcedAuthenticationPolicy: { ...previous.authenticationPolicy },
    policyEnforcedAt: now(),
  })), []);

  const createRole = useCallback((name: string, description: string) => {
    const role: CustomRole = { id: id("role"), name: name.trim(), description: description.trim(), isBuiltIn: false, permissions: allPermissions(false), createdAt: now() };
    setState((previous) => ({ ...previous, roles: [...previous.roles, role], selectedRoleId: role.id }));
    return role;
  }, []);
  const updateRole = useCallback((roleId: string, patch: Partial<Pick<CustomRole, "name" | "description">>) => {
    setState((previous) => ({ ...previous, roles: previous.roles.map((role) => role.id === roleId && !role.isBuiltIn ? { ...role, ...patch, updatedAt: now() } : role) }));
  }, []);
  const setRolePermission = useCallback((roleId: string, permission: PermissionKey, granted: boolean) => {
    setState((previous) => ({ ...previous, roles: previous.roles.map((role) => role.id === roleId ? { ...role, permissions: { ...role.permissions, [permission]: granted }, updatedAt: now() } : role) }));
  }, []);
  const deleteRole = useCallback((roleId: string) => setState((previous) => {
    if (previous.roles.find((role) => role.id === roleId)?.isBuiltIn) return previous;
    const roles = previous.roles.filter((role) => role.id !== roleId);
    return { ...previous, roles, selectedRoleId: previous.selectedRoleId === roleId ? (roles[0]?.id ?? "role-admin") : previous.selectedRoleId };
  }), []);
  const selectRole = useCallback((roleId: string) => setState((previous) => ({ ...previous, selectedRoleId: roleId })), []);

  const updateSessionSettings = useCallback((patch: Partial<Pick<SecurityGovernanceState, "idleTimeoutMinutes" | "enforceSingleActiveSession" | "terminateSessionsOnPrivilegeChange">>) => setState((previous) => ({ ...previous, ...patch })), []);
  const addIP = useCallback((entry: Omit<IPWhitelistEntry, "id" | "addedAt" | "addedBy">) => {
    const item: IPWhitelistEntry = { ...entry, id: id("ip"), addedAt: now(), addedBy: "Admin" };
    setState((previous) => ({ ...previous, ipWhitelist: [item, ...previous.ipWhitelist] }));
    return item;
  }, []);
  const removeIP = useCallback((entryId: string) => setState((previous) => ({ ...previous, ipWhitelist: previous.ipWhitelist.filter((entry) => entry.id !== entryId) })), []);
  const updateIP = useCallback((entryId: string, patch: Partial<Pick<IPWhitelistEntry, "enabled" | "label" | "cidr">>) => setState((previous) => ({ ...previous, ipWhitelist: previous.ipWhitelist.map((entry) => entry.id === entryId ? { ...entry, ...patch } : entry) })), []);
  const setIPEnforcement = useCallback((enabled: boolean) => setState((previous) => ({ ...previous, ipEnforcementEnabled: enabled })), []);

  const addAPIKey = useCallback((record: Omit<APIKeyRecord, "id">) => {
    const key: APIKeyRecord = { ...record, id: id("key") };
    setState((previous) => ({ ...previous, apiKeys: [key, ...previous.apiKeys] }));
    return key;
  }, []);
  const revokeAPIKey = useCallback((keyId: string) => setState((previous) => ({ ...previous, apiKeys: previous.apiKeys.map((key) => key.id === keyId ? { ...key, status: "Revoked" } : key) })), []);
  const rotateAPIKey = useCallback((keyId: string, replacement: Omit<APIKeyRecord, "id">) => {
    const key: APIKeyRecord = { ...replacement, id: id("key") };
    setState((previous) => ({ ...previous, apiKeys: [key, ...previous.apiKeys.map((item) => item.id === keyId ? { ...item, status: "Revoked" as const } : item)] }));
    return key;
  }, []);
  const updateApprovalThresholds = useCallback((patch: Partial<SecurityGovernanceState["approvalThresholds"]>) => setState((previous) => ({ ...previous, approvalThresholds: { ...previous.approvalThresholds, ...patch } })), []);

  return {
    state, setState, updateAuthenticationPolicy, enforceAuthenticationPolicy,
    createRole, updateRole, setRolePermission, deleteRole, selectRole,
    updateSessionSettings, addIP, removeIP, updateIP, setIPEnforcement,
    addAPIKey, revokeAPIKey, rotateAPIKey, updateApprovalThresholds,
  };
}

export const PERMISSION_CATALOG: Array<{ key: PermissionKey; label: string; description: string; group: "Asset Inventory" | "Compliance & Rules" | "System Administration" }> = [
  { key: "viewAssets", label: "View asset inventory", description: "Inspect discovered resources and ownership.", group: "Asset Inventory" },
  { key: "triggerManualScan", label: "Trigger manual scan", description: "Request a scan for an authorized account.", group: "Asset Inventory" },
  { key: "exportAssetMap", label: "Export asset map", description: "Download inventory and relationships.", group: "Asset Inventory" },
  { key: "manageCloudAccounts", label: "Manage cloud accounts", description: "Connect or update account scopes.", group: "Asset Inventory" },
  { key: "manageAssetTags", label: "Manage asset tags", description: "Edit inventory ownership metadata.", group: "Asset Inventory" },
  { key: "viewFindings", label: "View compliance findings", description: "Read failures, evidence and assessments.", group: "Compliance & Rules" },
  { key: "muteRemediateFinding", label: "Mute / remediate findings", description: "Triage findings and record remediation.", group: "Compliance & Rules" },
  { key: "toggleBenchmarkRules", label: "Toggle benchmark rules", description: "Enable or exclude rule execution.", group: "Compliance & Rules" },
  { key: "createCustomChecks", label: "Create custom checks", description: "Author organization-specific controls.", group: "Compliance & Rules" },
  { key: "editCustomChecks", label: "Edit custom checks", description: "Modify reusable custom definitions.", group: "Compliance & Rules" },
  { key: "deleteCustomChecks", label: "Delete custom checks", description: "Archive or remove custom definitions.", group: "Compliance & Rules" },
  { key: "editFrameworkBaselines", label: "Edit framework baselines", description: "Configure mapped benchmark requirements.", group: "Compliance & Rules" },
  { key: "runRemediation", label: "Run remediation actions", description: "Execute an approved remediation workflow.", group: "Compliance & Rules" },
  { key: "viewRuleImpact", label: "View rule impact simulator", description: "Preview affected resources and posture delta.", group: "Compliance & Rules" },
  { key: "manageUsers", label: "Manage users", description: "Invite, deactivate and manage memberships.", group: "System Administration" },
  { key: "editSecurityPolicies", label: "Edit security policies", description: "Configure authentication and session controls.", group: "System Administration" },
  { key: "generateApiKeys", label: "Generate API keys", description: "Issue service credentials and scopes.", group: "System Administration" },
  { key: "revokeApiKeys", label: "Rotate / revoke API keys", description: "Disable existing credentials immediately.", group: "System Administration" },
  { key: "manageRoles", label: "Manage roles", description: "Create roles and assign permissions.", group: "System Administration" },
  { key: "manageNetworkFence", label: "Manage IP allowlist", description: "Set approved networks and enforcement.", group: "System Administration" },
  { key: "configureSessionPolicies", label: "Configure session policies", description: "Set idle timeout and session concurrency.", group: "System Administration" },
  { key: "manageApprovalRules", label: "Manage approval thresholds", description: "Set dual-custody and ticket requirements.", group: "System Administration" },
];
