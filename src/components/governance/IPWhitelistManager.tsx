import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Globe, Plus, Shield, Trash2 } from "lucide-react";
import type { IPWhitelistEntry } from "../../types/governance";

function validIPv4Cidr(value: string) {
  const [address, prefix, extra] = value.trim().split("/");
  if (extra !== undefined || !address) return false;
  const octets = address.split(".");
  if (octets.length !== 4 || octets.some((octet) => !/^\d{1,3}$/.test(octet) || Number(octet) < 0 || Number(octet) > 255)) return false;
  if (prefix === undefined) return true;
  return /^\d{1,2}$/.test(prefix) && Number(prefix) >= 0 && Number(prefix) <= 32;
}

export function IPWhitelistManager({ entries, enforcementEnabled, canEdit, onAdd, onRemove, onUpdate, onSetEnforcement }: {
  entries: IPWhitelistEntry[]; enforcementEnabled: boolean; canEdit: boolean;
  onAdd: (entry: Omit<IPWhitelistEntry, "id" | "addedAt" | "addedBy">) => void;
  onRemove: (id: string) => void; onUpdate: (id: string, patch: Partial<Pick<IPWhitelistEntry, "enabled">>) => void; onSetEnforcement: (enabled: boolean) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [cidr, setCidr] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState("");
  const enabledCount = useMemo(() => entries.filter((entry) => entry.enabled).length, [entries]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = cidr.trim();
    if (!label.trim()) { setError("Enter a descriptive network label."); return; }
    if (!validIPv4Cidr(normalized)) { setError("Enter a valid IPv4 address or CIDR range, for example 203.0.113.0/24."); return; }
    if (entries.some((entry) => entry.cidr.toLowerCase() === normalized.toLowerCase())) { setError("That address or CIDR range already exists."); return; }
    onAdd({ label: label.trim(), cidr: normalized.includes("/") ? normalized : `${normalized}/32`, enabled });
    setLabel(""); setCidr(""); setEnabled(true); setError(""); setModalOpen(false);
  };
  const toggleEnforcement = () => {
    if (!enforcementEnabled) {
      if (enabledCount === 0) { setError("Enable at least one network entry before enforcing the allowlist."); return; }
      const accepted = window.confirm("Enable IP whitelist enforcement? Users outside the enabled CIDR ranges may be locked out of SecGenie.AI. Confirm that at least one current admin egress IP is allowlisted.");
      if (!accepted) return;
    } else {
      const accepted = window.confirm("Disable IP whitelist enforcement? Requests will no longer be restricted by this network fence.");
      if (!accepted) return;
    }
    setError(""); onSetEnforcement(!enforcementEnabled);
  };
  return <section className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4"><div className="flex items-start gap-2.5"><span className="rounded-lg bg-sky-50 p-2 text-sky-700"><Globe size={16}/></span><div><h2 className="text-[13px] font-semibold text-slate-900">IP whitelist / network fence</h2><p className="mt-0.5 text-xs text-slate-500">Allow requests from approved corporate and VPN egress ranges.</p></div></div><div className="flex items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${enforcementEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{enforcementEnabled ? "Enforcement ON" : "Monitor only"}</span><button type="button" disabled={!canEdit} onClick={toggleEnforcement} className={`relative inline-flex h-6 w-11 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${enforcementEnabled ? "bg-emerald-500" : "bg-slate-300"}`} role="switch" aria-checked={enforcementEnabled} aria-label="Toggle IP whitelist enforcement"><span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${enforcementEnabled ? "translate-x-6" : "translate-x-1"}`}/></button><button type="button" disabled={!canEdit} onClick={() => { setError(""); setModalOpen(true); }} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-sky-600 px-2.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"><Plus size={12}/>Add allowed IP</button></div></div>
    <div className="px-4 pt-3">{enforcementEnabled && <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-900"><AlertTriangle size={13} className="mt-0.5 shrink-0"/><p><strong>Enforcement is active.</strong> Network ranges are demo configuration only until connected to the server gateway. Confirm admin access from an allowed CIDR before applying equivalent production settings.</p></div>}{error && !modalOpen && <p role="alert" className="mb-3 text-[11px] text-rose-700">{error}</p>}</div>
    <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-2.5">Network / owner</th><th className="px-3 py-2.5">CIDR range</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{entries.map((entry) => <tr key={entry.id} className="hover:bg-slate-50/80"><td className="px-4 py-3"><div className="flex items-center gap-2"><span className="rounded-md bg-slate-100 p-1.5 text-slate-500"><Shield size={13}/></span><div><p className="text-xs font-medium text-slate-800">{entry.label}</p><p className="mt-0.5 text-[10px] text-slate-400">Added by {entry.addedBy} · {new Date(entry.addedAt).toLocaleDateString()}</p></div></div></td><td className="px-3 py-3"><code className="font-mono text-xs text-slate-700">{entry.cidr}</code></td><td className="px-3 py-3"><button type="button" disabled={!canEdit} onClick={() => onUpdate(entry.id, { enabled: !entry.enabled })} role="switch" aria-checked={entry.enabled} className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-medium disabled:cursor-not-allowed disabled:opacity-50 ${entry.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-500"}`}><span className={`h-1.5 w-1.5 rounded-full ${entry.enabled ? "bg-emerald-500" : "bg-slate-400"}`}/>{entry.enabled ? "Allowed" : "Disabled"}</button></td><td className="px-3 py-3 text-right"><button type="button" disabled={!canEdit} onClick={() => { if (window.confirm(`Remove ${entry.label} (${entry.cidr}) from the allowlist?`)) onRemove(entry.id); }} className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 px-2 text-[10px] font-medium text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"><Trash2 size={11}/>Remove</button></td></tr>)}</tbody></table></div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5"><span className="flex items-center gap-1.5 text-[10px] text-slate-500"><CheckCircle2 size={12} className="text-emerald-600"/>{enabledCount} enabled ranges · {entries.length} total entries</span><span className="text-[10px] text-slate-400">IPv4 and CIDR validation enabled</span></div>
    {modalOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/25 p-4"><form onSubmit={submit} className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-2xl"><div className="flex items-start justify-between"><div><h3 className="text-sm font-semibold text-slate-900">Add allowed IP</h3><p className="mt-1 text-[11px] text-slate-500">Add a single IPv4 address or CIDR network range.</p></div><button type="button" onClick={() => setModalOpen(false)} aria-label="Close add network modal" className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100">×</button></div><label className="mt-4 block"><span className="mb-1 block text-[11px] font-medium text-slate-700">Network label *</span><input required maxLength={60} value={label} onChange={(event) => setLabel(event.target.value)} className="h-9 w-full rounded-md border border-slate-200 px-3 text-xs" placeholder="Corporate HQ / VPN egress"/></label><label className="mt-3 block"><span className="mb-1 block text-[11px] font-medium text-slate-700">IPv4 / CIDR *</span><input required value={cidr} onChange={(event) => { setCidr(event.target.value); setError(""); }} className="h-9 w-full rounded-md border border-slate-200 px-3 font-mono text-xs" placeholder="203.0.113.0/24"/><span className="mt-1 block text-[10px] text-slate-400">Single host addresses are stored as /32.</span></label><label className="mt-3 flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="accent-sky-600"/>Enable this range immediately</label>{error && <p role="alert" className="mt-3 rounded-md bg-rose-50 px-2.5 py-2 text-[11px] text-rose-700">{error}</p>}<div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setModalOpen(false)} className="h-8 rounded-md border border-slate-200 px-3 text-xs">Cancel</button><button type="submit" className="h-8 rounded-md bg-sky-600 px-3 text-xs font-semibold text-white hover:bg-sky-700">Add range</button></div></form></div>}
  </section>;
}
