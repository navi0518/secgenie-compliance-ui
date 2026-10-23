import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AuditLogEntry, DataMode, NewAuditLogEntry, RBACContext, RuleExclusionRecord, UserRole } from "../types/security";

const STORAGE = {
  role: "secgenie.security.role.v1",
  mode: "secgenie.security.mode.v1",
  audit: "secgenie.security.activity.v1",
  exclusions: "secgenie.security.exclusion-requests.v1",
  mutedFindings: "secgenie.security.muted-findings.v1",
  verifiedFindings: "secgenie.security.verified-findings.v1",
};
const ROLE_VALUES: UserRole[] = ["Auditor", "SecurityEngineer", "Admin"];
function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; }
  catch { return fallback; }
}
function safeWrite(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage can be disabled by browser policy */ }
}

const SecurityContext = createContext<RBACContext | null>(null);

export function SecurityContextProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => {
    const role = safeRead<string>(STORAGE.role, "Admin");
    return ROLE_VALUES.includes(role as UserRole) ? role as UserRole : "Admin";
  });
  const [dataMode, setDataMode] = useState<DataMode>(() => safeRead<DataMode>(STORAGE.mode, "demo"));
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(() => safeRead<AuditLogEntry[]>(STORAGE.audit, []));
  const [pendingExclusions, setPendingExclusions] = useState<RuleExclusionRecord[]>(() => safeRead<RuleExclusionRecord[]>(STORAGE.exclusions, []));
  const [mutedFindingIds, setMutedFindingIds] = useState<string[]>(() => safeRead<string[]>(STORAGE.mutedFindings, []));
  const [verifiedFindingIds, setVerifiedFindingIds] = useState<string[]>(() => safeRead<string[]>(STORAGE.verifiedFindings, []));

  useEffect(() => safeWrite(STORAGE.role, currentRole), [currentRole]);
  useEffect(() => safeWrite(STORAGE.mode, dataMode), [dataMode]);
  useEffect(() => safeWrite(STORAGE.audit, auditLog.slice(0, 200)), [auditLog]);
  useEffect(() => safeWrite(STORAGE.exclusions, pendingExclusions.slice(0, 200)), [pendingExclusions]);
  useEffect(() => safeWrite(STORAGE.mutedFindings, mutedFindingIds.slice(0, 2000)), [mutedFindingIds]);
  useEffect(() => safeWrite(STORAGE.verifiedFindings, verifiedFindingIds.slice(0, 2000)), [verifiedFindingIds]);

  const setCurrentRole = useCallback((role: UserRole) => setCurrentRoleState(role), []);
  const toggleDataMode = useCallback(() => setDataMode((value) => value === "demo" ? "live" : "demo"), []);
  const recordAuditEvent = useCallback((event: NewAuditLogEntry) => {
    const newEvent: AuditLogEntry = {
      ...event,
      id: `activity_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: event.timestamp ?? new Date().toISOString(),
      user: event.user ?? currentRole,
      affectedFrameworkIds: event.affectedFrameworkIds ?? [],
    };
    setAuditLog((previous) => [newEvent, ...previous].slice(0, 200));
  }, [currentRole]);
  const muteFinding = useCallback((findingId: string, reason: string, affectedFrameworkIds: string[]) => {
    if (currentRole !== "SecurityEngineer" && currentRole !== "Admin") return;
    setMutedFindingIds((previous) => previous.includes(findingId) ? previous : [findingId, ...previous].slice(0, 2000));
    recordAuditEvent({ action: `Muted finding ${findingId}`, actionType: "FINDING_MUTED", targetId: findingId, reason: reason.trim(), affectedFrameworkIds });
  }, [currentRole, recordAuditEvent]);
  const verifyFinding = useCallback((findingId: string, reason: string, affectedFrameworkIds: string[]) => {
    if (currentRole !== "SecurityEngineer" && currentRole !== "Admin") return;
    setVerifiedFindingIds((previous) => previous.includes(findingId) ? previous : [findingId, ...previous].slice(0, 2000));
    recordAuditEvent({ action: `Recorded fix verification for ${findingId}`, actionType: "FINDING_FIX_VERIFIED", targetId: findingId, reason: reason.trim(), affectedFrameworkIds });
  }, [currentRole, recordAuditEvent]);
  const submitExclusionRequest = useCallback((record: RuleExclusionRecord) => {
    const request: RuleExclusionRecord = {
      ...record,
      requestId: record.requestId ?? `exreq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      approvalStatus: "Pending",
      requestedBy: currentRole,
      requestedAt: new Date().toISOString(),
    };
    setPendingExclusions((previous) => [request, ...previous.filter((item) => item.requestId !== request.requestId)].slice(0, 200));
    recordAuditEvent({ action: `Requested exclusion for ${record.checkId}`, actionType: "RULE_EXCLUSION_REQUESTED", targetId: record.checkId, reason: `${record.reason}; ticket ${record.ticketId}; expiry ${record.expiryDate}; ${record.justification ?? ""}`, affectedFrameworkIds: record.affectedFrameworkIds });
    return request;
  }, [currentRole, recordAuditEvent]);
  const resolveExclusionRequest = useCallback((requestId: string, status: "Approved" | "Rejected") => {
    const resolvedAt = new Date().toISOString();
    setPendingExclusions((previous) => previous.map((item) => item.requestId === requestId ? { ...item, approvalStatus: status, resolvedBy: currentRole, resolvedAt } : item));
  }, [currentRole]);

  const value = useMemo<RBACContext>(() => ({
    currentRole,
    setCurrentRole,
    canMutateChecks: currentRole !== "Auditor",
    canExcludeRules: currentRole === "SecurityEngineer" || currentRole === "Admin",
    canManageCheckDefinitions: currentRole === "Admin",
    canRemediateFindings: currentRole === "SecurityEngineer" || currentRole === "Admin",
    dataMode,
    toggleDataMode,
    auditLog,
    pendingExclusions,
    mutedFindingIds,
    verifiedFindingIds,
    muteFinding,
    verifyFinding,
    recordAuditEvent,
    submitExclusionRequest,
    resolveExclusionRequest,
  }), [currentRole, setCurrentRole, dataMode, toggleDataMode, auditLog, pendingExclusions, mutedFindingIds, verifiedFindingIds, muteFinding, verifyFinding, recordAuditEvent, submitExclusionRequest, resolveExclusionRequest]);

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function useSecurityContext(): RBACContext {
  const context = useContext(SecurityContext);
  if (!context) throw new Error("useSecurityContext must be used within SecurityContextProvider");
  return context;
}
