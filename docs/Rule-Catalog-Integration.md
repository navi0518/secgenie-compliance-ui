# Framework Rule Catalog Integration

## Included benchmark definitions

The rule catalog is generated from these supplied source files without replacing their source terminology:

- `source-data/cis_5.0_aws.json`
- `source-data/cis_8.0_aws.json`
- `source-data/iso27001_2013_aws.json`

The generated `public/mock/rule-catalog.json` has **153 requirements**, **119 unique check IDs**, **222 requirement-to-check mappings**, and **45 unique check IDs mapped to more than one framework**. Mappings by framework are CIS 5.0: 73, CIS 8.0: 59, and ISO 27001:2013: 90. Counts refer to requirement/check mapping records; they are not counts of live AWS resources or assessment results.

`cloudtrail_multi_region_enabled` is mapped across CIS 5.0, CIS 8.0, and ISO 27001:2013 in five requirement mappings. `iam_root_mfa_enabled` is mapped across all three frameworks in four requirement mappings.

## Data contract

- `RuleDefinition` is the unique executable/check-level rule state keyed by `checkId`.
- `RuleMapping` is one framework requirement's mapping for that check. It carries source section/category, profile, assessment mode, description, rationale, impact, remediation, audit procedure, references, objective metadata, and raw source attributes.
- `RuleDefinition.enabled` is global for the unique `checkId`. If a check maps to multiple requirements or frameworks, toggling it updates all those mappings. This is deliberate so a single executable check cannot appear enabled in one compliance mapping and disabled in another.
- `canonicalCategory` is a UI grouping label. `sourceSection` (CIS) or `sourceAttributes.Category` (ISO) is retained so the grouping does not erase the original taxonomy.
- Blank/missing source values normalize to `null`; the detail drawer displays “not supplied by this benchmark file” instead of inventing profile, rationale, impact, or procedure values.
- Source `RemediationProcedure` is preserved verbatim as `rawRemediationProcedure`. `consoleRemediation` and `cliRemediation` are best-effort excerpts only when labelled Console / Command Line sections exist. `remediationMode` identifies split, general, or missing guidance. The normalizer also counts how many unique check IDs reuse the exact same remediation/audit text; the drawer warns when a procedure is reused across five or more checks. This is particularly important for generic boilerplate in the CIS 8.0 file.

## Rule enablement and batch operations

The provided benchmark JSON definitions contain no Active/Enabled property. The demo initializes all unique check IDs as enabled and saves edits to `localStorage` under `secgenie.rule-catalog.enabled.v1`. This is a frontend prototype, not a durable scan policy store. The backend must own authoritative scope configuration before these controls can affect actual scans.

- **Enable Level 1** enables checks with a Level 1 mapping in the selected framework scope (or in any catalog framework when scope is All).
- **Disable manual-only** disables checks with Manual mapping(s) and no mapping explicitly marked Automated elsewhere. Shared rules that another mapping marks Automated are preserved and counted as skipped, because the execution state is global by check ID.
- **Enable all / Disable all in scope** changes unique checks referenced by the selected framework scope. Shared check IDs affect all their framework mappings; the UI explains this before/after the operation.
- Individual row switches and the remediation drawer call the same `toggleRuleStatus` mutation.
- `batchUpdateFrameworkRules` applies the selected unique check IDs in one cache update and writes them to the local demo's persisted override map.

## Live posture integrity

Rule toggles immediately update:

- enabled and excluded unique-check counts;
- overall active rule coverage (enabled unique checks / all unique checks);
- active mapping donut shares by framework;
- enabled-check coverage bars by framework;
- count of existing finding records whose `checkId` belongs to an excluded rule.

These are scan-scope previews. **Existing PASS/FAIL/MANUAL findings and measured compliance pass rates do not change when a rule is toggled.** Those records describe the previous assessment. A new scan is required before changing the measured compliance score; otherwise disabling a failing check could incorrectly make the score look better without any remediation.

## Investigation drawer enrichment

When an assessment is opened, the drawer matches its `checkId` to the benchmark catalog and then prefers an exact framework + requirement match. If no exact mapping exists, it labels a same-framework check-ID match or cross-framework mapping explicitly. The CIS 8.1 findings can use the CIS 8.0 catalog only as a related check-ID reference; the UI states this is not proof that CIS v8.0 and CIS v8.1 are equivalent.

Procedure panels keep source content intact and split labelled console and command-line sections when possible. Code fences are shown in a monospace, dark code surface. ISO 27001 entries in these specific files do not provide Profile, AssessmentStatus, rationale, impact, remediation, or audit procedure fields; the UI surfaces those gaps rather than filling them with generic instructions.

## Validation

Run:

```bash
npm run normalize:rules
npm run validate:rules
```

`validate:rules` checks every source requirement/check pair appears in the normalized catalog, verifies cross-framework example rules, and checks catalog counts.

## Production backend contract recommendation

Replace the local `queryFn` mutations in `src/app/securityApi.ts` with authenticated API requests, for example:

- `GET /api/frameworks/rules?provider=aws`
- `PATCH /api/frameworks/rules/:checkId` with `{ "enabled": true | false }`
- `POST /api/frameworks/rules/batch` with `{ "frameworkId": "CIS-5.0" | "CIS-8.0" | "ISO27001-2013" | "ALL", "checkIds": [], "enabled": true | false }`
- `POST /api/scans` with the saved active rule-set version.

The server should persist a versioned rule-set per tenant/account, validate authorization, record who changed the scan scope, and associate each scan with the rule-set version. When a scan completes, invalidate/refetch normalized assessment summaries so the measured posture changes only based on fresh results.
