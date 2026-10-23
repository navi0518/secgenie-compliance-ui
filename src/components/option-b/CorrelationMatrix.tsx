import type { FrameworkId } from "../../types";
import type { AssetCategory, DomainSummary } from "../../lib/assetCategories";
import { getFrameworkShortName } from "../../lib/assetCategories";
import type { FrameworkFilter } from "../FindingsTable";

interface Props {
  rows: DomainSummary[];
  selectedCategory: AssetCategory | "ALL";
  selectedFramework: FrameworkFilter;
  onSelect: (category: AssetCategory, framework: FrameworkId) => void;
  onSelectCategory: (category: AssetCategory | "ALL") => void;
}

function cellTone(rate: number | null) {
  if (rate === null) return "bg-slate-50 border-slate-100 text-slate-500";
  if (rate >= 60) return "bg-rose-100 border-rose-200 text-rose-900";
  if (rate >= 30) return "bg-orange-50 border-orange-200 text-orange-900";
  if (rate > 0) return "bg-amber-50 border-amber-100 text-amber-900";
  return "bg-emerald-50 border-emerald-100 text-emerald-900";
}

export function CorrelationMatrix({ rows, selectedCategory, selectedFramework, onSelect, onSelectCategory }: Props) {
  const frameworks: FrameworkId[] = ["CIS-5.0", "CIS-8.1", "ISO27001-2013"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-separate border-spacing-y-1 text-left">
        <thead>
          <tr className="text-[10px] font-semibold uppercase tracking-wide text-sec-muted">
            <th className="px-3 py-2">Asset domain</th>
            <th className="px-2 py-2 text-right">Assets</th>
            <th className="px-2 py-2 text-right">Public</th>
            <th className="px-2 py-2 text-right">High / critical</th>
            {frameworks.map((framework) => <th key={framework} className="px-2 py-2 text-center">{getFrameworkShortName(framework)}</th>)}
            <th className="px-2 py-2 text-right">Linked FAIL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => <tr key={row.category} className={`group ${selectedCategory === row.category ? "bg-sky-50/70" : "hover:bg-slate-50"}`}>
            <td className="rounded-l-md border-y border-l border-sec-line px-3 py-2.5">
              <button type="button" onClick={() => onSelectCategory(selectedCategory === row.category ? "ALL" : row.category)} aria-pressed={selectedCategory === row.category} className="text-left">
                <span className={`block text-xs font-semibold ${selectedCategory === row.category ? "text-sec-blue" : "text-sec-text"}`}>{row.category}</span>
                <span className="mt-0.5 block text-[10px] text-sec-muted">{row.linkedFindings.toLocaleString()} linked assessments</span>
              </button>
            </td>
            <td className="border-y border-sec-line px-2 py-2.5 text-right text-xs tabular-nums">{row.assets.toLocaleString()}</td>
            <td className="border-y border-sec-line px-2 py-2.5 text-right text-xs tabular-nums">{row.exposedAssets.toLocaleString()}</td>
            <td className="border-y border-sec-line px-2 py-2.5 text-right text-xs tabular-nums">{row.highCriticalAssets.toLocaleString()}</td>
            {frameworks.map((framework) => {
              const cell = row.byFramework[framework];
              const selected = selectedCategory === row.category && selectedFramework === framework;
              return <td key={framework} className="border-y border-sec-line px-1.5 py-1.5">
                <button type="button" disabled={cell.total === 0} onClick={() => onSelect(row.category, framework)} aria-pressed={selected} aria-label={`${row.category}, ${framework}: ${cell.fail} failed of ${cell.total} linked assessments; filter failed findings`} title={`${cell.fail} FAIL / ${cell.total} linked assessments; click to inspect failed records`} className={`mx-auto block min-w-[94px] rounded-md border px-2 py-2 text-center transition disabled:cursor-default disabled:opacity-45 ${cellTone(cell.failRate)} ${selected ? "ring-2 ring-sec-blue ring-offset-1" : "hover:ring-1 hover:ring-slate-300"}`}>
                  <span className="block text-sm font-bold tabular-nums">{cell.fail.toLocaleString()} <span className="text-[9px] font-normal">FAIL</span></span>
                  <span className="mt-0.5 block text-[9px] tabular-nums">{cell.total.toLocaleString()} total</span>
                  <span className="mt-0.5 block text-[9px] font-semibold">{cell.failRate === null ? "No linked results" : `${cell.failRate.toFixed(0)}% of PASS + FAIL`}</span>
                </button>
              </td>;
            })}
            <td className="rounded-r-md border-y border-r border-sec-line px-3 py-2.5 text-right text-sm font-bold tabular-nums text-rose-700">{row.linkedFails.toLocaleString()}</td>
          </tr>)}
        </tbody>
        <tfoot>
          <tr className="text-[10px] text-sec-muted"><td colSpan={7} className="px-3 pt-2">Cells include only findings linked to discovered assets in that domain. Account-scoped and unresolved findings are intentionally excluded from matrix cells.</td></tr>
        </tfoot>
      </table>
    </div>
  );
}
