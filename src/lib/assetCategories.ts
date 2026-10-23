import type { AssetEntity, ComplianceFinding, FrameworkId } from "../types";

export const ASSET_CATEGORIES = [
  "IAM & Identity",
  "Storage & Data",
  "Compute & Workloads",
  "Network & Edge",
  "Security & Observability",
  "Other AWS Services",
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

/**
 * Stable, reviewable domain grouping based on the normalized resourceTypeName.
 * This is a presentation taxonomy, not an AWS-native classification.
 */
export function getAssetCategory(assetOrName: AssetEntity | string): AssetCategory {
  const name = (typeof assetOrName === "string" ? assetOrName : assetOrName.resourceTypeName).toLowerCase();

  if (/iam (role|policy|user|group)|key pair|access key/.test(name)) return "IAM & Identity";
  if (/dynamodb|s3 bucket|ebs volume|ebs snapshot|sqs queue|sns topic/.test(name)) return "Storage & Data";
  if (/lambda function|ec2 instance|ecr repository|bedrock foundation model/.test(name)) return "Compute & Workloads";
  if (/vpc|subnet|security group|route table|network acl|internet gateway|network interface|elastic ip|cloudfront|route 53|api gateway/.test(name)) return "Network & Edge";
  if (/cloudwatch|cloudtrail|kms key|secrets manager/.test(name)) return "Security & Observability";
  return "Other AWS Services";
}

export interface DomainFrameworkCell {
  pass: number;
  fail: number;
  manual: number;
  total: number;
  failRate: number | null;
}

export interface DomainSummary {
  category: AssetCategory;
  assets: number;
  exposedAssets: number;
  highCriticalAssets: number;
  assetsWithAttackPaths: number;
  totalAttackPaths: number;
  linkedFindings: number;
  linkedFails: number;
  linkedPasses: number;
  linkedManual: number;
  byFramework: Record<FrameworkId, DomainFrameworkCell>;
}

const FRAMEWORKS: FrameworkId[] = ["CIS-5.0", "CIS-8.1", "ISO27001-2013"];

export function buildDomainSummaries(assets: AssetEntity[], findings: ComplianceFinding[]): DomainSummary[] {
  const rows = new Map<AssetCategory, DomainSummary>();
  for (const category of ASSET_CATEGORIES) {
    rows.set(category, {
      category, assets: 0, exposedAssets: 0, highCriticalAssets: 0,
      assetsWithAttackPaths: 0, totalAttackPaths: 0, linkedFindings: 0,
      linkedFails: 0, linkedPasses: 0, linkedManual: 0,
      byFramework: Object.fromEntries(FRAMEWORKS.map((framework) => [framework, { pass: 0, fail: 0, manual: 0, total: 0, failRate: null }])) as Record<FrameworkId, DomainFrameworkCell>,
    });
  }

  const assetCategoryByUid = new Map<string, AssetCategory>();
  for (const asset of assets) {
    const category = getAssetCategory(asset);
    assetCategoryByUid.set(asset.uid, category);
    const row = rows.get(category)!;
    row.assets += 1;
    if (asset.isExposedPublicly === true) row.exposedAssets += 1;
    if (["high", "critical"].includes(String(asset.riskLevel ?? "").toLowerCase())) row.highCriticalAssets += 1;
    if ((asset.attackPathCount ?? 0) > 0) row.assetsWithAttackPaths += 1;
    row.totalAttackPaths += asset.attackPathCount ?? 0;
  }

  for (const finding of findings) {
    if (!finding.assetUid) continue; // Scope/unresolved results stay in data-quality KPIs, not guessed into an asset domain.
    const category = assetCategoryByUid.get(finding.assetUid);
    if (!category) continue;
    const row = rows.get(category)!;
    row.linkedFindings += 1;
    const cell = row.byFramework[finding.framework];
    cell.total += 1;
    if (finding.status === "FAIL") { cell.fail += 1; row.linkedFails += 1; }
    else if (finding.status === "PASS") { cell.pass += 1; row.linkedPasses += 1; }
    else { cell.manual += 1; row.linkedManual += 1; }
  }

  for (const row of rows.values()) {
    for (const framework of FRAMEWORKS) {
      const cell = row.byFramework[framework];
      const evaluated = cell.pass + cell.fail;
      cell.failRate = evaluated ? (cell.fail / evaluated) * 100 : null;
    }
  }
  return [...rows.values()].sort((a, b) => b.linkedFails - a.linkedFails || b.exposedAssets - a.exposedAssets);
}

export function getFrameworkShortName(framework: FrameworkId): string {
  return framework === "ISO27001-2013" ? "ISO 27001" : framework;
}
