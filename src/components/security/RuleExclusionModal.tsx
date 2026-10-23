import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, LockKeyhole, ShieldAlert, X } from "lucide-react";
import type { CheckSeverity } from "../../types/checksCatalogue";
import type { ExclusionReason, RuleExclusionRecord } from "../../types/security";

const REASONS: ExclusionReason[] = ["Compensating Control", "Accepted Business Risk", "False Positive", "Pending Remediation"];
interface Props {
  open: boolean;
  checkId: string;
  checkName: string;
  severity?: CheckSeverity | string;
  affectedAssetCount?: number | null;
  frameworkIds: string[];
  onClose: () => void;
  onConfirm: (record: RuleExclusionRecord) => void;
  busy?: boolean;
}
export function RuleExclusionModal({ open, checkId, checkName, severity, affectedAssetCount, frameworkIds, onClose, onConfirm, busy = false }: Props) {
  const [reason, setReason] = useState<ExclusionReason | "">("");
  const [ticketId, setTicketId] = useState("");
  const [expiryDate, setExpiryDate] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 90); return date.toISOString().slice(0, 10); });
  const [justification, setJustification] = useState("");
  const [typedConfirmation, setTypedConfirmation] = useState("");
  useEffect(() => {
    if (!open) return;
    const nextExpiry = new Date();
    nextExpiry.setDate(nextExpiry.getDate() + 90);
    setReason("");
    setTicketId("");
    setExpiryDate(nextExpiry.toISOString().slice(0, 10));
    setJustification("");
    setTypedConfirmation("");
  }, [open, checkId]);
  const critical = String(severity).toLowerCase() === "critical";
  const minimumDate = new Date().toISOString().slice(0, 10);
  const validTicket = ticketId.trim().length >= 3;
  const ready = Boolean(reason && validTicket && expiryDate >= minimumDate && justification.trim() && (!critical || typedConfirmation === "EXCLUDE") && !busy);
  const frameworks = useMemo(() => [...new Set(frameworkIds)], [frameworkIds]);
  if (!open) return null;
  const confirm = () => {
    if (!ready || !reason) return;
    onConfirm({ checkId, reason, ticketId: ticketId.trim(), expiryDate, justification: justification.trim(), affectedAssetCount: affectedAssetCount ?? null, affectedFrameworkIds: frameworks, severity, requestedAt: new Date().toISOString() });
  };
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 p-3" role="presentation"><button type="button" aria-label="Close exclusion dialog" className="absolute inset-0" onClick={onClose}/><section role="dialog" aria-modal="true" aria-labelledby="rule-exclusion-title" className="relative max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
    <header className="flex items-start gap-3 border-b border-slate-200 px-4 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><ShieldAlert size={17}/></span><div className="min-w-0 flex-1"><h2 id="rule-exclusion-title" className="text-sm font-semibold text-slate-900">Confirm rule exclusion</h2><p className="mt-0.5 break-all font-mono text-[10px] text-slate-500">{checkId}</p></div><button type="button" onClick={onClose} className="icon-button" aria-label="Close"><X size={14}/></button></header>
    <div className="space-y-3 p-4"><div><p className="text-xs font-semibold text-slate-900">{checkName}</p><div className="mt-1 flex flex-wrap items-center gap-1.5"><span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${critical ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{severity ?? "Severity unknown"}</span>{frameworks.map((framework) => <span key={framework} className="rounded border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 text-[9px] font-medium text-indigo-800">{framework}</span>)}</div></div>
      <div className="grid grid-cols-2 gap-2"><div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3"><p className="text-[9px] font-semibold uppercase tracking-wide text-amber-800">Assets affected</p><p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{affectedAssetCount == null ? "—" : affectedAssetCount.toLocaleString()}</p><p className="text-[9px] text-amber-900/70">{affectedAssetCount == null ? "Asset count unavailable" : "Current linked asset scope"}</p></div><div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Frameworks impacted</p><p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{frameworks.length}</p><p className="text-[9px] text-slate-500">Mapped framework links</p></div></div>
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-900"><AlertTriangle size={12} className="mr-1 inline"/>Disabling this check will exempt {affectedAssetCount == null ? "an unverified number of" : affectedAssetCount.toLocaleString()} assets and affect {frameworks.length} mapped compliance framework{frameworks.length === 1 ? "" : "s"}. Existing findings are not deleted by this action.</div>
      <label className="block"><span className="mb-1 block text-[10px] font-semibold text-slate-700">Reason for exclusion <span className="text-rose-600">*</span></span><select value={reason} onChange={(event) => setReason(event.target.value as ExclusionReason | "")} className="control-input h-9 w-full"><option value="">Choose an audited reason…</option>{REASONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1 block text-[10px] font-semibold text-slate-700">Ticket / change request ID *</span><input value={ticketId} onChange={(event) => setTicketId(event.target.value)} className="control-input h-9 w-full font-mono" placeholder="SEC-1042"/></label><label className="block"><span className="mb-1 block text-[10px] font-semibold text-slate-700"><CalendarClock size={11} className="mr-1 inline"/>Exemption expiry *</span><input type="date" min={minimumDate} value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} className="control-input h-9 w-full"/></label></div>
      <label className="block"><span className="mb-1 block text-[10px] font-semibold text-slate-700">Justification / compensating control *</span><textarea rows={2} value={justification} onChange={(event) => setJustification(event.target.value)} className="control-input w-full py-2" placeholder="Describe the scope, rationale, and review owner."/></label>
      {critical && <label className="block rounded-md border border-rose-200 bg-rose-50/60 p-3"><span className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-800"><LockKeyhole size={12}/>Critical rule confirmation required</span><span className="mt-1 block text-[10px] text-rose-700">Type <code className="rounded bg-white px-1 font-mono font-bold">EXCLUDE</code> to continue.</span><input value={typedConfirmation} onChange={(event) => setTypedConfirmation(event.target.value)} className="control-input mt-2 h-9 w-full border-rose-200 font-mono" placeholder="EXCLUDE"/></label>}
      <p className="text-[9px] leading-4 text-slate-400">This modal records an auditable request in the demo. In production, approval or maker-checker separation, expiry enforcement, and server-side RBAC must be enforced by the backend.</p>
    </div>
    <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-4 py-3"><button type="button" onClick={onClose} className="h-8 rounded-md border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-600">Cancel</button><button type="button" disabled={!ready} onClick={confirm} className="h-8 rounded-md bg-rose-700 px-3 text-[11px] font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40">Confirm exclusion</button></footer>
  </section></div>;
}
