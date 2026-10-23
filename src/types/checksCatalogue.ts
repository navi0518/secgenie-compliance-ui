export type CheckSeverity = "Critical" | "High" | "Medium" | "Low";
export type CheckAssessmentStatus = "Automated" | "Manual" | "Mixed" | "Unspecified";
export type CheckKind = "all" | "standard" | "custom";
export type CheckActiveFilter = "all" | "active" | "inactive" | "archived";
export type CheckFrameworkId = "CIS-5.0" | "CIS-8.0" | "CIS-8.1" | "ISO27001-2013";

export interface CheckFrameworkAssociation {
  frameworkId: CheckFrameworkId;
  frameworkName: string;
  frameworkVersion: string;
  requirementId: string;
  requirementDescription: string;
  requirementName?: string;
  category?: string;
  profile?: string;
  assessmentStatus?: string;
  description?: string;
  rationaleStatement?: string;
  impactStatement?: string;
  remediationProcedure?: string;
  auditProcedure?: string;
  references?: string;
  sourceAttributes?: Record<string, unknown>;
}

export interface CheckBaselineFields {
  name: string;
  description: string;
  service: string;
  resourceType: string;
  severity: CheckSeverity;
  rationaleStatement: string;
  impactStatement: string;
  assessmentStatus: CheckAssessmentStatus;
  remediationProcedure: string;
  consoleRemediation: string;
  cliRemediation: string;
  auditProcedure: string;
  frameworkAssociations: CheckFrameworkAssociation[];
}

export interface CheckItem extends CheckBaselineFields {
  checkId: string;
  isCustom: boolean;
  isModified: boolean;
  isActive: boolean;
  isArchived: boolean;
  frameworkIds: CheckFrameworkId[];
  frameworkCoverageCount: number;
  affectedAssetCount?: number;
  historicalFindingCount?: number;
  currentFindingCount?: number;
  updatedAt?: string;
  updatedBy?: string;
  auditReason?: string;
  baseline?: CheckBaselineFields;
  customMetadata?: {
    owner?: string;
    createdAt?: string;
    createdBy?: string;
  };
}

export interface ChecksCatalogueFramework {
  id: CheckFrameworkId;
  name: string;
  version: string;
  framework: string;
  provider: string;
  requirementsCount: number;
}

export interface CheckRequirementOption {
  frameworkId: CheckFrameworkId;
  frameworkName: string;
  frameworkVersion: string;
  requirementId: string;
  requirementDescription: string;
  requirementName?: string;
  category?: string;
  profile?: string;
  assessmentStatus?: string;
  attributes: Record<string, unknown>;
  hasMappedChecks: boolean;
}

export interface CheckAuditEvent {
  eventId: string;
  checkId: string;
  action: "CHECK_UPDATED" | "CHECK_ENABLED" | "CHECK_DISABLED" | "CUSTOM_CHECK_CREATED" | "CUSTOM_CHECK_ARCHIVED" | "CUSTOM_CHECK_HARD_DELETED" | "CHECK_RESET_TO_BASELINE";
  reason: string;
  actor: string;
  occurredAt: string;
  before?: Partial<CheckItem>;
  after?: Partial<CheckItem>;
}

export interface ChecksCatalogueResponse {
  meta: {
    generatedFrom: string[];
    generatedAt: string;
    checkCount: number;
    mappingCount: number;
    standardCheckCount: number;
    customCheckCount: number;
    note: string;
  };
  frameworks: ChecksCatalogueFramework[];
  requirements: CheckRequirementOption[];
  checks: CheckItem[];
  auditLog: CheckAuditEvent[];
}

export interface CheckMutationPayload extends Partial<CheckBaselineFields> {
  checkId?: string;
  isCustom?: boolean;
  isActive?: boolean;
  frameworkAssociations?: CheckFrameworkAssociation[];
  auditReason?: string;
}

export interface ChecksFilterState {
  query: string;
  services: string[];
  severities: CheckSeverity[];
  kind: CheckKind;
  frameworks: CheckFrameworkId[];
  active: CheckActiveFilter;
  assessmentStatus: "all" | CheckAssessmentStatus;
}

export interface UpdateCheckArgs {
  checkId: string;
  patch: CheckMutationPayload;
}

export interface DeleteCustomCheckArgs {
  checkId: string;
  mode: "archive" | "hard-delete";
  auditReason: string;
}

export interface CheckMutationResult {
  check: CheckItem;
  message?: string;
}

export const CHECK_FRAMEWORKS: Array<{ id: CheckFrameworkId; label: string; color: string }> = [
  { id: "CIS-5.0", label: "CIS 5.0", color: "indigo" },
  { id: "CIS-8.0", label: "CIS 8.0", color: "sky" },
  { id: "CIS-8.1", label: "CIS 8.1", color: "cyan" },
  { id: "ISO27001-2013", label: "ISO 27001", color: "fuchsia" },
];
export const CHECK_SEVERITIES: CheckSeverity[] = ["Critical", "High", "Medium", "Low"];
