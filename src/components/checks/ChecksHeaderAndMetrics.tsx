import type { ReactNode } from "react";
import { Activity, GitBranch, LockKeyhole, Plus, RefreshCw, ShieldCheck, UserRoundCog, Zap } from "lucide-react";

export interface ChecksCatalogueMetrics {
  total: number;
  automated: number;
  manual: number;
  custom: number;
  coveragePercent: number;
  mapped: number;
}

interface Props {
  metrics: ChecksCatalogueMetrics;
  onRefresh: () => void;
  onCreateCustomCheck: () => void;
  refreshing?: boolean;
  canCreateCustomCheck?: boolean;
}

const metricCards: Array<{
  key: keyof ChecksCatalogueMetrics;
  label: string;
  detail: string;
  icon: ReactNode;
  value: (metrics: ChecksCatalogueMetrics) => string | number;
  tone: string;
}> = [
  { key: "total", label: "Total checks", detail: "Available definitions", icon: <ShieldCheck size={16} />, value: (m) => m.total, tone: "bg-sky-50 text-sky-700" },
  { key: "automated", label: "Automated", detail: "Machine-assessable", icon: <Zap size={16} />, value: (m) => m.automated, tone: "bg-emerald-50 text-emerald-700" },
  { key: "manual", label: "Manual / mixed", detail: "Human verification", icon: <Activity size={16} />, value: (m) => m.manual, tone: "bg-amber-50 text-amber-700" },
  { key: "custom", label: "Custom checks", detail: "Organization-owned", icon: <UserRoundCog size={16} />, value: (m) => m.custom, tone: "bg-violet-50 text-violet-700" },
  { key: "coveragePercent", label: "Framework coverage", detail: "Checks linked to requirements", icon: <GitBranch size={16} />, value: (m) => `${m.coveragePercent}%`, tone: "bg-indigo-50 text-indigo-700" },
];

export function ChecksHeaderAndMetrics({ metrics, onRefresh, onCreateCustomCheck, refreshing = false, canCreateCustomCheck = true }: Props) {
  return (
    <section aria-label="Checks catalogue summary" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-slate-900">Checks Catalogue</h1>
          <p className="mt-0.5 text-xs text-slate-500">Manage reusable security checks, benchmark mappings, and operator runbooks.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onRefresh} disabled={refreshing} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60">
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh
          </button>
          <button type="button" onClick={onCreateCustomCheck} disabled={!canCreateCustomCheck} title={!canCreateCustomCheck ? "Action restricted: Requires Admin permissions." : "Create a custom security check"} className="inline-flex h-9 items-center gap-2 rounded-lg bg-sky-600 px-3.5 text-xs font-medium text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55">
            {canCreateCustomCheck ? <Plus size={14} /> : <LockKeyhole size={13} />} Create Custom Check{!canCreateCustomCheck && <span className="rounded bg-white/20 px-1 py-0.5 text-[9px]">Admin</span>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {metricCards.map((metric) => (
          <article key={metric.key} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-start gap-2.5">
              <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${metric.tone}`}>{metric.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium text-slate-500">{metric.label}</p>
                <p className="mt-1 text-2xl font-bold leading-none tabular-nums text-slate-900">{metric.value(metrics)}</p>
                <p className="mt-1.5 truncate text-xs font-medium text-slate-500" title={metric.key === "coveragePercent" ? `${metrics.mapped} checks have at least one framework mapping` : metric.detail}>
                  {metric.key === "coveragePercent" ? `${metrics.mapped.toLocaleString()} checks mapped` : metric.detail}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
