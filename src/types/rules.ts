export type RuleFrameworkId = "CIS-5.0" | "CIS-8.0" | "ISO27001-2013";
export type RuleProfile = "Level 1" | "Level 2" | string;
export type RuleAssessmentStatus = "Automated" | "Manual" | string;

export interface RuleFrameworkMetadata {
  id: RuleFrameworkId;
  name: string;
  version: string;
  provider: string;
  description: string;
  sourceFile: string;
  requirementsCount: number;
}

export interface RuleMapping {
  mappingUid: string;
  frameworkId: RuleFrameworkId;
  frameworkName: string;
  frameworkVersion: string;
  requirementId: string;
  requirementDescription: string;
  requirementName?: string | null;
  sourceSection: string;
  canonicalCategory: string;
  checkId: string;
  profile?: RuleProfile | null;
  assessmentStatus?: RuleAssessmentStatus | null;
  description?: string | null;
  rationaleStatement?: string | null;
  impactStatement?: string | null;
  rawRemediationProcedure?: string | null;
  consoleRemediation?: string | null;
  cliRemediation?: string | null;
  remediationMode: "split" | "general" | "missing";
  remediationSharedCheckCount: number;
  auditSharedCheckCount: number;
  auditProcedure?: string | null;
  additionalInformation?: string | null;
  references?: string | null;
  defaultValue?: string | null;
  objectiveId?: string | null;
  objectiveName?: string | null;
  sourceAttributes: Record<string, unknown>;
}

export interface RuleDefinition {
  checkId: string;
  enabled: boolean;
  frameworkIds: RuleFrameworkId[];
  isCrossFramework: boolean;
  frameworkCount: number;
  mappingCount: number;
  profiles: RuleProfile[];
  assessmentStatuses: RuleAssessmentStatus[];
  assessmentMode?: RuleAssessmentStatus | "Mixed" | null;
  mappings: RuleMapping[];
}

export interface RuleCatalogDataset {
  meta: {
    generatedFrom: string[];
    ruleCount: number;
    mappingCount: number;
    requirementCount: number;
    crossFrameworkRuleCount: number;
    mappingCountByFramework: Record<RuleFrameworkId, number>;
    catalogNote: string;
    sourceCatalogsHaveExecutionState: boolean;
  };
  frameworks: RuleFrameworkMetadata[];
  rules: RuleDefinition[];
}

export interface ToggleRuleStatusArgs {
  checkId: string;
  enabled: boolean;
}

export interface BatchUpdateFrameworkRulesArgs {
  checkIds: string[];
  enabled: boolean;
  frameworkId: RuleFrameworkId | "ALL";
  action: "enable-level-1" | "disable-manual" | "enable-all" | "disable-all";
}

export interface RuleMutationResult {
  updatedCheckIds: string[];
  enabled: boolean;
  frameworkId?: RuleFrameworkId | "ALL";
  action?: BatchUpdateFrameworkRulesArgs["action"];
  skippedSharedAutomated?: string[];
}
