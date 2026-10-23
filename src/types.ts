export type FrameworkId = "CIS-5.0" | "CIS-8.1" | "ISO27001-2013";
export type AssessmentStatus = "PASS" | "FAIL" | "MANUAL";
export type Scope = "resource" | "account" | "unknown";

export interface FrameworkCounts {
  pass: number;
  fail: number;
  manual: number;
}

export interface AssetEntity {
  uid: string;
  assetId: string;
  arn?: string | null;
  resourceId: string;
  accountId?: string | null;
  region: string;
  resourceType: string;
  resourceTypeName: string;
  name: string;
  assetName?: string | null;
  assetDisplayName?: string | null;
  description?: string | null;
  active: boolean;
  status?: string | null;
  assetCriticality?: string | null;
  businessCriticality?: string | null;
  riskLevel?: string | null;
  riskScore?: number | string | null;
  exposureLevel?: string | null;
  isExposedPublicly?: boolean | null;
  attackPathCount: number;
  environment?: string | null;
  owner?: string | null;
  createdDate?: string | null;
  discoveredAt?: string | null;
  firstSeen?: string | null;
  lastSeen?: string | null;
  stale: boolean;
  tags: Record<string, string>;
  additionalAttributes: Record<string, unknown>;
  derivedFindingsCount: number;
  complianceByFramework: Partial<Record<FrameworkId, FrameworkCounts>>;
}

export interface FindingEvidence {
  statusExtended?: string | null;
  rationale?: string | null;
  impact?: string | null;
  remediation?: string | null;
  additionalInformation?: string | null;
  references?: string | null;
}

export interface ComplianceFinding {
  uid: string;
  sourceFindingId?: string | null;
  sourceRecordId: string;
  framework: FrameworkId;
  sourceScanId: string;
  sourceAssetId: string;
  assetUid: string | null;
  scopeEntityUid?: string | null;
  scope: Scope;
  identityResolution: { method: string; confidence: "high" | "medium" | "unresolved" };
  checkId: string;
  requirementId: string;
  requirementDescription: string;
  status: AssessmentStatus;
  severity?: string | null;
  region?: string | null;
  evidence: FindingEvidence;
  findingSignature: string;
  duplicateCandidate: boolean;
  raw: Record<string, unknown>;
}

export interface FrameworkSummary {
  framework: FrameworkId;
  pass: number;
  fail: number;
  manual: number;
  evaluated: number;
  observedPassRate: number | null;
  distinctChecks: number;
  distinctRequirements: number;
}

export interface AssetRelationship {
  uid: string;
  sourceAssetUid: string;
  targetAssetUid: string;
  relationshipType: string;
  sourceField: string;
  inferred: boolean;
  confidence: "high" | "medium" | "low";
}

export interface TopFailedCheck {
  framework: FrameworkId;
  checkId: string;
  failCount: number;
  requirementDescriptions: string[];
  requirementIds: string[];
}

export interface NormalizedSecurityDataset {
  meta: {
    accountIds: string[];
    sourceScanIds: { discovery: string; compliance: Record<FrameworkId, string> };
    generatedAt: string;
    historicalSnapshotsAvailable: boolean;
    scanAlignmentWarning: string;
    diagnostics: Record<string, number>;
  };
  accounts: Array<{ uid: string; accountId: string; label: string; kind: "account" }>;
  assets: AssetEntity[];
  findings: ComplianceFinding[];
  relationships: AssetRelationship[];
  frameworkSummaries: FrameworkSummary[];
  topFailedChecks: TopFailedCheck[];
}

export type AppView = "overview" | "insights" | "findings";
