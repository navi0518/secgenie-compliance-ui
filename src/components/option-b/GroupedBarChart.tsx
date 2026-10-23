export interface BarSeries {
  key: string;
  label: string;
  color: string;
}
export interface GroupedBarRow {
  label: string;
  values: Record<string, number>;
  description?: string;
}
interface Props {
  titleId?: string;
  rows: GroupedBarRow[];
  series: BarSeries[];
  maxValue?: number;
  onSelect?: (row: GroupedBarRow, seriesKey: string) => void;
  emptyMessage?: string;
}

export function GroupedBarChart({ titleId, rows, series, maxValue: maxValueProp, onSelect, emptyMessage = "No records in this scope." }: Props) {
  const maxValue = maxValueProp ?? Math.max(1, ...rows.flatMap((row) => series.map((item) => row.values[item.key] ?? 0)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.round(maxValue * fraction));
  return (
    <div aria-labelledby={titleId}>
      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1">{series.map((item) => <span key={item.key} className="inline-flex items-center gap-1.5 text-[10px] text-sec-muted"><span className="h-2 w-2 rounded-sm" style={{ background: item.color }}/>{item.label}</span>)}</div>
      {rows.length === 0 ? <p className="rounded-md border border-dashed border-sec-line py-8 text-center text-xs text-sec-muted">{emptyMessage}</p> : <div className="space-y-3">
        {rows.map((row) => <div key={row.label} className="grid grid-cols-[112px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
          <div className="pt-0.5"><div className="truncate text-[11px] font-semibold text-sec-text" title={row.label}>{row.label}</div>{row.description && <div className="mt-0.5 truncate text-[9px] text-sec-muted" title={row.description}>{row.description}</div>}</div>
          <div className="space-y-1.5">
            {series.map((item) => {
              const value = row.values[item.key] ?? 0;
              return <button type="button" key={item.key} disabled={!onSelect || value === 0} onClick={() => onSelect?.(row, item.key)} aria-label={`${row.label}: ${item.label} ${value}`} className="group flex w-full items-center gap-2 disabled:cursor-default">
                <span className="relative block h-[13px] min-w-0 flex-1 overflow-hidden rounded-sm bg-slate-100"><span className="absolute inset-y-0 left-0 rounded-sm transition-[width,opacity] group-hover:opacity-80" style={{ width: `${value / maxValue * 100}%`, background: item.color }}/></span>
                <span className="w-9 text-right text-[10px] font-semibold tabular-nums text-sec-text">{value.toLocaleString()}</span>
              </button>;
            })}
          </div>
        </div>)}
        <div className="ml-[124px] flex justify-between border-t border-sec-line pt-1.5 text-[9px] tabular-nums text-sec-muted sm:ml-[162px]">{ticks.map((tick, index) => <span key={`${tick}-${index}`}>{tick.toLocaleString()}</span>)}</div>
        <p className="text-right text-[9px] text-sec-muted">X-axis: assessment record count</p>
      </div>}
    </div>
  );
}
