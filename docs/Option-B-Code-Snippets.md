# Option B core React snippets

The runnable implementation is in `src/pages/OptionBDashboard.tsx` and `src/components/option-b/`.

## Dashboard container

```tsx
const { data, isLoading } = useGetNormalizedDatasetQuery();
const [frameworkFilter, setFrameworkFilter] = useState<FrameworkFilter>("ALL");
const [statusFilter, setStatusFilter] = useState<StatusFilter>("FAIL");
const [selectedCategory, setSelectedCategory] = useState<AssetCategory | "ALL">("ALL");

const domainRows = useMemo(
  () => data ? buildDomainSummaries(data.assets, data.findings) : [],
  [data],
);

// Framework and status filters feed both charts and the table.
// Clicking a correlation cell scopes category + framework + FAIL.
<CorrelationMatrix
  rows={domainRows}
  selectedCategory={selectedCategory}
  selectedFramework={frameworkFilter}
  onSelect={(category, framework) => {
    setSelectedCategory(category);
    setFrameworkFilter(framework);
    setStatusFilter("FAIL");
  }}
  onSelectCategory={setSelectedCategory}
/>
```

## Grouped bars

`GroupedBarChart` accepts rows shaped as `{ label, values: { FAIL, PASS, MANUAL } }`, renders each series independently (not stacked), prints numeric labels, and exposes a click callback so chart selection filters the finding records.

## Framework donut

`FrameworkDonut` sums PASS + FAIL + MANUAL for each framework, maps share to SVG arc angle and allows click/keyboard selection on each segment and legend row.

No additional chart package is required. The existing Redux Toolkit Query normalized-dataset endpoint remains the source of truth for this demo.
