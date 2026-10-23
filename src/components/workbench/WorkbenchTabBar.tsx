import { BookOpenCheck, FileCode2, Layers3, PieChart, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type WorkspaceTab = "correlation" | "assetType" | "frameworks" | "rules" | "checks";

const TABS: Array<{ id: WorkspaceTab; label: string; icon: LucideIcon }> = [
  { id: "correlation", label: "Overview & Correlation", icon: Workflow },
  { id: "assetType", label: "By Asset Type", icon: Layers3 },
  { id: "frameworks", label: "Framework Breakdown", icon: PieChart },
  { id: "rules", label: "Frameworks & Rule Catalog", icon: BookOpenCheck },
  { id: "checks", label: "Checks Catalogue & Studio", icon: FileCode2 },
];

interface WorkbenchTabBarProps {
  activeTab: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
}

/** One source of truth for tab typography, spacing, and selected state across every view. */
export function WorkbenchTabBar({ activeTab, onChange }: WorkbenchTabBarProps) {
  return (
    <nav
      className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-lg border border-sec-line bg-white p-1"
      role="tablist"
      aria-label="Correlation analysis views"
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const selected = activeTab === id;
        return (
          <button
            key={id}
            id={`tab-${id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`panel-${id}`}
            onClick={() => onChange(id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 ${
              selected
                ? "border-sky-100 bg-sky-50 text-sec-blue"
                : "border-transparent text-sec-muted hover:bg-slate-50 hover:text-sec-text"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
