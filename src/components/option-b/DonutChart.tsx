import type { FrameworkSummary } from "../../types";
import type { FrameworkFilter } from "../FindingsTable";

const COLORS: Record<FrameworkSummary["framework"], string> = {
  "CIS-5.0": "#0284C7",
  "CIS-8.1": "#6366F1",
  "ISO27001-2013": "#EB4899",
};
const LABELS: Record<FrameworkSummary["framework"], string> = {
  "CIS-5.0": "CIS AWS Foundations 5.0",
  "CIS-8.1": "CIS Controls 8.1",
  "ISO27001-2013": "ISO 27001:2013",
};

function polar(cx: number, cy: number, radius: number, degrees: number) {
  const radians = (degrees - 90) * Math.PI / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}
function arcPath(start: number, end: number) {
  const outerStart = polar(100, 100, 76, start);
  const outerEnd = polar(100, 100, 76, end);
  const innerEnd = polar(100, 100, 48, end);
  const innerStart = polar(100, 100, 48, start);
  const large = end - start > 180 ? 1 : 0;
  return `M ${outerStart.x} ${outerStart.y} A 76 76 0 ${large} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A 48 48 0 ${large} 0 ${innerStart.x} ${innerStart.y} Z`;
}

interface Props {
  summaries: FrameworkSummary[];
  selectedFramework: FrameworkFilter;
  onSelectFramework: (framework: FrameworkFilter) => void;
}

export function FrameworkDonut({ summaries, selectedFramework, onSelectFramework }: Props) {
  const segments = summaries.map((summary) => ({ ...summary, total: summary.pass + summary.fail + summary.manual })).sort((a, b) => a.framework.localeCompare(b.framework));
  const total = segments.reduce((sum, item) => sum + item.total, 0);
  let angle = 0;
  const paths = segments.map((item) => {
    const start = angle;
    const sweep = total ? item.total / total * 360 : 0;
    angle += sweep;
    return { ...item, start, end: angle, share: total ? item.total / total * 100 : 0 };
  });

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="mx-auto shrink-0" aria-label={`Donut chart: ${total.toLocaleString()} total assessment records across frameworks`}>
        <svg viewBox="0 0 200 200" className="h-[152px] w-[152px]" role="img" aria-labelledby="framework-donut-title framework-donut-desc">
          <title id="framework-donut-title">Share of assessment records by framework</title>
          <desc id="framework-donut-desc">CIS 5.0, CIS 8.1 and ISO 27001 assessment record counts. Click a segment or legend item to filter the workspace.</desc>
          <circle cx="100" cy="100" r="76" fill="none" stroke="#E7EDF4" strokeWidth="1"/>
          {paths.map((item) => {
            const isSelected = selectedFramework === "ALL" || selectedFramework === item.framework;
            return <path key={item.framework} d={arcPath(item.start, item.end)} fill={COLORS[item.framework]} opacity={isSelected ? 1 : 0.28} stroke="#FFFFFF" strokeWidth="2" role="button" tabIndex={0} aria-label={`${LABELS[item.framework]}: ${item.total} records, ${item.share.toFixed(1)} percent`} onClick={() => onSelectFramework(selectedFramework === item.framework ? "ALL" : item.framework)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectFramework(selectedFramework === item.framework ? "ALL" : item.framework); } }} className="cursor-pointer transition-opacity focus:outline-none"/>;
          })}
          <text x="100" y="96" textAnchor="middle" className="fill-sec-text" fontSize="22" fontWeight="700">{total.toLocaleString()}</text>
          <text x="100" y="114" textAnchor="middle" className="fill-sec-muted" fontSize="9">ASSESSMENTS</text>
        </svg>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {paths.map((item) => <button key={item.framework} type="button" onClick={() => onSelectFramework(selectedFramework === item.framework ? "ALL" : item.framework)} aria-pressed={selectedFramework === item.framework} className={`flex w-full items-center gap-2 rounded-md p-2 text-left transition hover:bg-slate-50 ${selectedFramework === item.framework ? "bg-sky-50 ring-1 ring-sky-100" : ""}`}>
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: COLORS[item.framework] }}/>
          <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-sec-text">{LABELS[item.framework]}</span><span className="text-[10px] text-sec-muted">{item.total.toLocaleString()} records</span></span>
          <span className="text-sm font-semibold tabular-nums text-sec-text">{item.share.toFixed(1)}%</span>
        </button>)}
        <p className="px-2 text-[10px] leading-4 text-sec-muted">Share of all assessment records, not unique vulnerabilities or distinct assets.</p>
      </div>
    </div>
  );
}
