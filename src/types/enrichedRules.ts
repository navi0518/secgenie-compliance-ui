export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type FrameworkId = 'CIS-5.0' | 'CIS-8.0' | 'CIS-8.1' | 'ISO27001-2013';
export interface EnrichedCheck {
  check_id: string;
  name: string;
  description: string;
  service: string;
  resource_type: string;
  severity: Severity;
}
export interface FrameworkBenchmark {
  Framework: string;
  Name: string;
  Version: string;
  Provider: string;
  Description?: string;
  Requirements: FrameworkRequirement[];
}
export interface FrameworkRequirement {
  Id: string;
  Description: string;
  Name?: string;
  Checks: EnrichedCheck[];
  Attributes?: Array<Record<string, unknown>>;
}
export interface RuleFilterState {
  query: string;
  services: string[];
  resourceTypes: string[];
  severities: Severity[];
  frameworks: FrameworkId[];
  enabled: 'all' | 'enabled' | 'excluded';
}
export interface RuleExemptionPayload {
  checkId: string;
  enabled: false;
  scope: 'all-linked-frameworks' | FrameworkId;
  reason: 'Compensating Control' | 'Accepted Risk' | 'Not Applicable';
  justification: string;
  expiresAt: string;
  requestedAt: string;
}
export interface UnifiedRule {
  check: EnrichedCheck;
  frameworkCoverage: Array<{ frameworkId: FrameworkId; frameworkName: string; version: string; requirementId: string; requirementDescription: string; attributes: Record<string, unknown> }>;
  enabled: boolean;
  affectedFindingCount: number;
  affectedAssetCount: number;
  projectedScoreDelta?: number;
}
export interface AffectedAsset {
  id: string;
  name?: string;
  region?: string;
  status: string;
  tags?: Record<string, string>;
}
