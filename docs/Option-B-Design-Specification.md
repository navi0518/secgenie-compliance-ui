# SecGenie.AI Compliance Correlation Workbench — Option B

## Design intent

Option B is a deliberately different analytical layout from Option A's executive KPI-first summary and simple tabbed exploration. Its central object is a **cross-domain asset-to-finding correlation matrix**, supported by framework-share and grouped-outcome visualizations. The Asset Map remains the inventory/graph destination; this page uses assets as the grouping dimension for findings, not as a redundant inventory browser.

The interface preserves the SecGenie.AI light application shell, 210 px navigation rail, white cards, #F8FAFC canvas, #35344E primary text, #64748E secondary text, #0284C7 primary accent, #6366F1 indigo, #EA6F6C coral, #F49C0D orange, #10B881 green, thin #E7EDF4 borders, 10 px card radius and compact 10–13 px data labels.

## Information architecture and top-to-bottom flow

1. **Persistent app shell** — existing module navigation, customer context, refresh and profile controls.
2. **Correlation workbench header** — purpose statement, global framework/outcome selectors, and a control/evidence/asset search.
3. **Source-alignment warning** — exposes discovery scan `AWS-001` versus findings scan `AWS-0002`; this prevents presenting a false claim that the exports are a single synchronized snapshot.
4. **Signal ribbon** — total assessment records, FAIL records, unique assets with linked failures, publicly exposed assets that are high/critical risk, and account-scoped + unresolved records.
5. **Framework composition + assessment outcome comparison** — a clickable donut gives each framework's share of all 2,200 finding records. A separate grouped bar chart compares PASS, FAIL and MANUAL result counts for each framework.
6. **Primary correlation matrix** — asset domain rows × framework columns, with asset counts, exposed asset counts, high/critical asset counts, and each domain/framework cell's linked FAIL count, linked result count and observed failure rate. Selecting a cell scopes the correlated findings table to that domain, framework and FAIL status.
7. **Asset-domain outcome chart + repeated failed controls** — grouped bars by domain for linked PASS/FAIL/MANUAL outcomes; a horizontal ranking of the most frequently failed source checks. Clicking a bar or control filters the record table.
8. **Correlated finding records** — compact rows with source requirement, framework, status, domain/scope, region and action to open the existing investigation drawer.
9. **Data integrity notes** — clear reminders about unavailable finding severity and history, account scope, unresolved records and relationship-based coverage.

## Chart specifications

### Framework-share donut
- One ring with 3 segments: CIS 5.0 (blue), CIS 8.1 (indigo), ISO 27001:2013 (pink).
- Segment size is `record count / 2,200`; center label is the total record count.
- Legend shows full framework name, record count and percent share.
- Select a segment/legend item to scope the whole workbench. Clicking the selected segment again clears the framework filter.
- Share represents assessment records; it is not a unique-defect count or a relative-risk score.

### Grouped framework-outcome bars
- Y-axis/category labels: framework.
- X-axis: number of assessment records.
- Series: FAIL (coral), PASS (green), MANUAL (orange), side-by-side/independent, never stacked.
- Numeric value labels are always visible. Clicking a bar sets framework + status filters.

### Asset-domain grouped outcome bars
- Y-axis/category labels: IAM & Identity, Storage & Data, Compute & Workloads, Network & Edge, Security & Observability and Other AWS Services.
- X-axis: count of *asset-linked* assessment records.
- Series: FAIL, PASS and MANUAL with the same status colors as the framework chart.
- Category labels also disclose inventory asset count and exposed asset count.
- Clicking a nonzero bar sets the domain and status filters for the table.

### Asset-domain × framework correlation matrix
- Rows use the six domain groupings above; columns include inventory assets, publicly exposed assets, high/critical assets, the three frameworks, and total linked FAIL records.
- Framework cells show `FAIL count`, `total linked records`, and `FAIL / (PASS + FAIL)` rate. MANUAL is reported in the source total but excluded from the rate.
- Cell background uses restrained green/amber/orange/rose tint, but explicit values and labels—not color alone—convey status.
- Clicking a cell opens linked FAIL records for that category/framework.
- Only findings with resolved `assetUid` contribute to the domain matrix. The 314 account-scope and 233 unresolved records are not assigned to a guessed domain.

### Most-failed-controls chart
- Horizontal single-series bars, sorted descending by source FAIL record frequency.
- Labels: humanized check ID, framework and requirement count. Values are source record counts.
- Clicking a bar filters to that framework/check and FAIL.
- A note explains that repeated regional records and framework requirement mappings mean this is a prioritization signal, not necessarily a distinct-defect total.

## Asset-domain taxonomy

The view uses a UI grouping based on `resourceTypeName`, not a replacement AWS taxonomy:
- IAM & Identity: IAM Role/Policy/User/Group and key-pair types.
- Storage & Data: DynamoDB, S3, EBS and SQS/SNS types.
- Compute & Workloads: Lambda, EC2 instances, ECR repositories and Bedrock foundation models.
- Network & Edge: VPC/subnet, security groups, route tables, ACLs, gateways, network interfaces, Elastic IP, CloudFront, Route 53 and API Gateway types.
- Security & Observability: CloudWatch, CloudTrail, KMS and Secrets Manager.
- Other AWS Services: any unclassified resource type, retained rather than dropped.

Review this taxonomy with SecGenie domain owners before making it a permanent product taxonomy.

## Wireframe component tree

```text
OptionBDashboard
├── AppShell
│   ├── Sidebar
│   └── TopBar
└── Main
    ├── CorrelationHeader + GlobalFilters
    ├── SourceWarning
    ├── SignalRibbon
    │   └── Kpi × 5
    ├── Grid 2 columns
    │   ├── FrameworkDonut
    │   └── GroupedBarChart (framework outcome)
    ├── CorrelationMatrix
    ├── Grid 2 columns
    │   ├── GroupedBarChart (asset domain outcome)
    │   └── FailedControlRanking
    ├── CorrelatedFindingsTable
    ├── DataIntegrityNotes
    └── InvestigationDrawer
```

Suggested Tailwind layout:

```tsx
<div className="space-y-4 p-3 sm:p-5">
  <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">{/* signal ribbon */}</div>
  <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(340px,0.78fr)_minmax(580px,1.22fr)]">
    <FrameworkDonutPanel />
    <FrameworkOutcomeBarsPanel />
  </div>
  <CorrelationMatrixPanel />
  <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
    <DomainOutcomeBarsPanel />
    <FailedControlsPanel />
  </div>
  <CorrelatedFindingsPanel />
</div>
```

## React/TypeScript integration notes

- Uses `useGetNormalizedDatasetQuery` from Redux Toolkit Query and existing `NormalizedSecurityDataset`, `AssetEntity`, `ComplianceFinding`, and `FrameworkSummary` types.
- Charts are implemented in inline SVG/CSS bars, avoiding a new chart dependency and preserving the established color tokens.
- `src/lib/assetCategories.ts` performs the resource-type grouping and builds domain/framework summaries. Rows only use findings with resolved `assetUid`.
- `src/components/option-b/DonutChart.tsx` creates an accessible clickable donut using SVG arc paths.
- `src/components/option-b/GroupedBarChart.tsx` provides reusable grouped horizontal bars with explicit values and clickable series.
- `src/components/option-b/CorrelationMatrix.tsx` defines the principal correlation interaction.
- `src/pages/OptionBDashboard.tsx` is the entry view wired into `src/main.tsx`; Option A's `ComplianceDashboard.tsx` is retained in the codebase for side-by-side comparison.
- `src/components/InvestigationDrawer.tsx` is reused for source evidence, remediation and raw JSON context.

## Metrics and limitations

- Source finding-level `severity` is null for all 2,200 records; therefore severity distribution bars are intentionally not fabricated. Outcome distribution (PASS/FAIL/MANUAL) is used instead.
- Discovery uses `AWS-001`; compliance exports use `AWS-0002`. The UI calls out this mismatch and doesn't assert a common scan timestamp.
- The source is a single dataset snapshot; a historical time series cannot be calculated.
- `findingId` by itself is not assumed unique. Existing source-record identifiers and duplicate-candidate diagnostics should be retained.
- All UI-domain failure rates are record-level observations, not coverage-adjusted framework scores or exploit probability.
