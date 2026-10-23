export type PasswordExpiryDays = 30 | 60 | 90 | 180 | "never";
export type MfaEnforcementMode = "optional" | "all-users" | "privileged-roles" | "hardware-key-only";

export interface AuthenticationPolicy {
  minimumPasswordLength: number;
  passwordExpiryDays: PasswordExpiryDays;
  requireSpecialCharacters: boolean;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  preventPasswordReuse: number;
  mfaEnforcement: MfaEnforcementMode;
}

export type PermissionKey =
  | "viewAssets" | "triggerManualScan" | "exportAssetMap" | "manageCloudAccounts" | "manageAssetTags"
  | "viewFindings" | "muteRemediateFinding" | "toggleBenchmarkRules" | "createCustomChecks" | "editCustomChecks"
  | "deleteCustomChecks" | "editFrameworkBaselines" | "runRemediation" | "viewRuleImpact"
  | "manageUsers" | "editSecurityPolicies" | "generateApiKeys" | "revokeApiKeys" | "manageRoles"
  | "manageNetworkFence" | "configureSessionPolicies" | "manageApprovalRules";

export type PermissionMatrix = Record<PermissionKey, boolean>;

export interface CustomRole {
  id: string;
  name: string;
  description: string;
  isBuiltIn: boolean;
  permissions: PermissionMatrix;
  createdAt: string;
  updatedAt?: string;
}

export interface IPWhitelistEntry {
  id: string;
  label: string;
  cidr: string;
  enabled: boolean;
  addedAt: string;
  addedBy: string;
}

export type APIKeyStatus = "Active" | "Expired" | "Revoked";
export type APIKeyScope = "Read only" | "Security operations" | "Administrator";
export interface APIKeyRecord {
  id: string;
  name: string;
  prefix: string;
  role: "Auditor" | "SecurityEngineer" | "Admin";
  scope: APIKeyScope;
  createdAt: string;
  expiresAt: string;
  status: APIKeyStatus;
  lastUsedAt?: string;
}

export interface ApprovalThresholdConfig {
  requireDualAdminCriticalExclusions: boolean;
  requirePeerReviewScanSchedules: boolean;
  requireTicketForAllExemptions: boolean;
}

export interface SecurityGovernanceState {
  authenticationPolicy: AuthenticationPolicy;
  enforcedAuthenticationPolicy: AuthenticationPolicy | null;
  policyEnforcedAt: string | null;
  roles: CustomRole[];
  selectedRoleId: string;
  idleTimeoutMinutes: number;
  enforceSingleActiveSession: boolean;
  terminateSessionsOnPrivilegeChange: boolean;
  ipWhitelist: IPWhitelistEntry[];
  ipEnforcementEnabled: boolean;
  apiKeys: APIKeyRecord[];
  approvalThresholds: ApprovalThresholdConfig;
}
