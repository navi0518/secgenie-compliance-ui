import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  caption: string;
  icon: LucideIcon;
  iconClass?: string;
  valueClass?: string;
  onClick?: () => void;
}

export function MetricCard({ label, value, caption, icon: Icon, iconClass = "text-sec-blue", valueClass = "text-sec-text", onClick }: MetricCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-sec-muted">{label}</span>
        <span className={`rounded-md bg-slate-50 p-2 ${iconClass}`}><Icon size={17} aria-hidden="true" /></span>
      </div>
      <div className={`mt-3 text-[29px] font-bold leading-none tracking-tight ${valueClass}`}>{value}</div>
      <div className="mt-2 text-xs text-sec-muted">{caption}</div>
    </>
  );
  if (onClick) return <button type="button" onClick={onClick} className="card-panel group w-full p-4 text-left transition hover:border-sky-200 hover:shadow-card focus-visible:outline-sec-blue">{content}<span className="mt-3 block text-[11px] font-semibold text-sec-blue opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">View details →</span></button>;
  return <section className="card-panel p-4">{content}</section>;
}
