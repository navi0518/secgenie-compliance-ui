import type { AssessmentStatus } from "../types";

const STATUS_STYLES: Record<AssessmentStatus, string> = {
  PASS: "border-emerald-200 bg-emerald-50 text-emerald-800",
  FAIL: "border-rose-200 bg-rose-50 text-rose-800",
  MANUAL: "border-amber-200 bg-amber-50 text-amber-900",
};

export function StatusBadge({ status }: { status: AssessmentStatus }) {
  const icon = status === "PASS" ? "✓" : status === "FAIL" ? "!" : "◷";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold tracking-wide ${STATUS_STYLES[status]}`}>
      <span aria-hidden="true" className="text-xs leading-none">{icon}</span>
      {status}
    </span>
  );
}

export function RiskBadge({ value }: { value?: string | null }) {
  const label = value ? value[0].toUpperCase() + value.slice(1).toLowerCase() : "Unknown";
  const styles: Record<string, string> = {
    critical: "border-rose-200 bg-rose-50 text-rose-800",
    high: "border-orange-200 bg-orange-50 text-orange-800",
    medium: "border-sky-200 bg-sky-50 text-sky-800",
    low: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };
  return <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-semibold ${styles[(value ?? "").toLowerCase()] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>{label}</span>;
}
