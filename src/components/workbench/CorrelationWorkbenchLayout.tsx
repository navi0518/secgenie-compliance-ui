import type { ReactNode } from "react";
import { AlertTriangle, SlidersHorizontal, Table2, Workflow } from "lucide-react";
import type { FrameworkFilter, StatusFilter } from "../FindingsTable";
import { WorkbenchTabBar, type WorkspaceTab } from "./WorkbenchTabBar";

const FRAMEWORKS = ["CIS-5.0", "CIS-8.1", "ISO27001-2013"] as const;

interface CorrelationWorkbenchLayoutProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  findingCount: number;
  discoveryId: string;
  complianceId: string;
  frameworkFilter: FrameworkFilter;
  onFrameworkFilterChange: (value: FrameworkFilter) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  onOpenFilters: () => void;
  onExploreFindings: () => void;
  children: ReactNode;
}

/** Shared parent shell; all five tab views render inside this stable workbench frame. */
export function CorrelationWorkbenchLayout({
  activeTab,
  onTabChange,
  findingCount,
  discoveryId,
  complianceId,
  frameworkFilter,
  onFrameworkFilterChange,
  statusFilter,
  onStatusFilterChange,
  onOpenFilters,
  onExploreFindings,
  children,
}: CorrelationWorkbenchLayoutProps) {
  return (
    <main className="min-w-0 flex-1">
      <div className="app-toolbar flex min-h-[42px] items-center border-b border-sec-line bg-white px-4 sm:px-5">
        <span className="text-xs font-semibold text-sec-text">Compliances</span>
        <span className="mx-3 h-4 w-px bg-sec-line" aria-hidden="true" />
        <span className="text-xs text-sec-muted">Correlation workbench</span>
        <button
          type="button"
          onClick={onExploreFindings}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-sec-blue px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          <Table2 size={13} aria-hidden="true" />
          Explore findings
          <span className="rounded bg-white/20 px-1.5 py-0.5 tabular-nums">{findingCount.toLocaleString()}</span>
        </button>
      </div>

      <div className="workbench-content space-y-3 p-3 sm:p-4">
        <header className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="workbench-heading min-w-0">
            <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-sec-muted">
              <Workflow size={12} aria-hidden="true" />
              Exposure-to-control intelligence
            </div>
            <h1 className="mt-1 text-lg font-semibold tracking-tight text-sec-text">Asset–Finding Correlation Workbench</h1>
            <p className="mt-0.5 text-[10px] text-sec-muted">A compact analytical view of where framework failures concentrate across asset domains.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="framework-scope" className="sr-only">Framework scope</label>
            <select
              id="framework-scope"
              value={frameworkFilter}
              onChange={(event) => onFrameworkFilterChange(event.target.value as FrameworkFilter)}
              className="control-input h-8 min-w-[145px]"
            >
              <option value="ALL">All frameworks</option>
              {FRAMEWORKS.map((framework) => (
                <option key={framework} value={framework}>{framework === "ISO27001-2013" ? "ISO 27001:2013" : framework}</option>
              ))}
            </select>
            <label htmlFor="status-scope" className="sr-only">Outcome scope</label>
            <select
              id="status-scope"
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value as StatusFilter)}
              className="control-input h-8 min-w-[120px]"
            >
              <option value="ALL">All outcomes</option>
              <option value="FAIL">Failed only</option>
              <option value="PASS">Passed only</option>
              <option value="MANUAL">Manual only</option>
            </select>
            <button type="button" className="icon-button" aria-label="Open filters and findings" onClick={onOpenFilters}>
              <SlidersHorizontal size={14} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2">
          <AlertTriangle size={14} className="shrink-0 text-amber-800" aria-hidden="true" />
          <p className="text-[10px] leading-4 text-amber-900">
            <strong>Source alignment warning:</strong> inventory scan <code>{discoveryId}</code> differs from framework scan <code>{complianceId}</code>. Correlation uses resource identity; the files are not proven to represent the same scan run.
          </p>
        </div>

        <WorkbenchTabBar activeTab={activeTab} onChange={onTabChange} />
        <div className="min-w-0 space-y-3">{children}</div>
      </div>
    </main>
  );
}
