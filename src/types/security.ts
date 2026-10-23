export type UserRole = "Auditor" | "SecurityEngineer" | "Admin";
export type DataMode = "demo" | "live";
export type ExclusionReason = "Compensating Control" | "Accepted Business Risk" | "False Positive" | "Pending Remediation";
export type AccountProvider = "AWS";
export type AccountScanScope = "single-account" | "multi-account";

export interface RBACContext {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  canMutateChecks: boolean;
  canExcludeRules: boolean;
  canManageCheckDefinitions: boolean;
  canRemediateFindings: boolean;
  dataMode: DataMode;
  toggleDataMode: () => void;
  auditLog: AuditLogEntry[];
  pendingExclusions: RuleExclusionRecord[];
  mutedFindingIds: string[];
  verifiedFindingIds: string[];
  muteFinding: (findingId: string, reason: string, affectedFrameworkIds: string[]) => void;
  verifyFinding: (findingId: string, reason: string, affectedFrameworkIds: string[]) => void;
  recordAuditEvent: (event: NewAuditLogEntry) => void;
  submitExclusionRequest: (record: RuleExclusionRecord) => RuleExclusionRecord;
  resolveExclusionRequest: (requestId: string, status: "Approved" | "Rejected") => void;
}

export interface AccountConnectionPayload {
  provider: AccountProvider;
  scope: AccountScanScope;
  accountLabel: string;
  regions: string[];
  frameworks: string[];
  permissionMethod: "cloudformation" | "terraform";
}

export interface RuleExclusionRecord {
  checkId: string;
  reason: ExclusionReason;
  ticketId: string;
  expiryDate: string;
  justification?: string;
  affectedAssetCount: number | null;
  affectedFrameworkIds: string[];
  severity?: string;
  source?: "check-catalogue" | "framework-rules" | "investigation";
  requestId?: string;
  approvalStatus?: "Pending" | "Approved" | "Rejected";
  requestedBy?: string;
  requestedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  actionType: string;
  reason?: string;
  targetId?: string;
  affectedFrameworkIds: string[];
}

export type NewAuditLogEntry = Omit<AuditLogEntry, "id" | "timestamp" | "user"> & Partial<Pick<AuditLogEntry, "user" | "timestamp">>;
