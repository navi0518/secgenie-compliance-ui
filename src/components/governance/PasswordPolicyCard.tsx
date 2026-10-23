import { useMemo } from "react";
import { CheckCircle2, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import type { AuthenticationPolicy, PasswordExpiryDays } from "../../types/governance";

const MFA_OPTIONS: Array<{ value: AuthenticationPolicy["mfaEnforcement"]; title: string; detail: string }> = [
  { value: "optional", title: "Optional", detail: "Users can enroll; no platform mandate." },
  { value: "all-users", title: "All users", detail: "Require MFA for every interactive user." },
  { value: "privileged-roles", title: "Privileged roles", detail: "Require MFA for Admin and Security Engineer." },
  { value: "hardware-key-only", title: "Hardware key only", detail: "Require WebAuthn / FIDO2 security keys." },
];

export function PasswordPolicyCard({
  policy, onChange, onSave, canEdit, isDirty, enforcedAt,
}: {
  policy: AuthenticationPolicy;
  onChange: (patch: Partial<AuthenticationPolicy>) => void;
  onSave: () => void;
  canEdit: boolean;
  isDirty: boolean;
  enforcedAt: string | null;
}) {
  const enabledRequirements = useMemo(() => [policy.requireSpecialCharacters, policy.requireUppercase, policy.requireLowercase, policy.requireNumbers].filter(Boolean).length, [policy]);
  const expiryValue = policy.passwordExpiryDays === "never" ? "Never" : `${policy.passwordExpiryDays} days`;
  return <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.12fr_0.88fr]">
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3"><div className="flex items-start gap-2.5"><span className="rounded-lg bg-sky-50 p-2 text-sky-700"><KeyRound size={16}/></span><div><h2 className="text-[13px] font-semibold text-slate-900">Password hygiene</h2><p className="mt-0.5 text-xs text-slate-500">Configure the platform's baseline credential requirements.</p></div></div><span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500">Policy builder</span></div>
      <div className="space-y-4 pt-4">
        <div><div className="flex items-center justify-between gap-3"><label htmlFor="minimum-password-length" className="text-xs font-medium text-slate-700">Minimum password length</label><div className="flex items-center gap-1.5"><input id="minimum-password-length" type="number" min={8} max={64} value={policy.minimumPasswordLength} disabled={!canEdit} onChange={(event) => onChange({ minimumPasswordLength: Math.min(64, Math.max(8, Number(event.target.value) || 8)) })} className="h-8 w-16 rounded-md border border-slate-200 bg-white px-2 text-center text-xs font-semibold tabular-nums text-slate-800 disabled:bg-slate-50"/><span className="text-[11px] text-slate-400">chars</span></div></div><input aria-label="Minimum password length slider" type="range" min={8} max={64} step={1} value={policy.minimumPasswordLength} disabled={!canEdit} onChange={(event) => onChange({ minimumPasswordLength: Number(event.target.value) })} className="mt-2 h-1.5 w-full cursor-pointer accent-sky-600 disabled:cursor-not-allowed"/><div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>8 · basic</span><span>32 · strong</span><span>64 · max</span></div></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label htmlFor="password-expiry" className="mb-1.5 block text-xs font-medium text-slate-700">Password expiration</label><select id="password-expiry" value={String(policy.passwordExpiryDays)} disabled={!canEdit} onChange={(event) => onChange({ passwordExpiryDays: event.target.value === "never" ? "never" : Number(event.target.value) as PasswordExpiryDays })} className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 disabled:bg-slate-50"><option value="30">Every 30 days</option><option value="60">Every 60 days</option><option value="90">Every 90 days</option><option value="180">Every 180 days</option><option value="never">Never expires</option></select><p className="mt-1 text-[10px] text-slate-400">Current setting: {expiryValue}</p></div>
          <div><span className="mb-1.5 block text-xs font-medium text-slate-700">Password reuse restriction</span><div className="flex h-9 items-center justify-between rounded-md border border-slate-200 px-2"><span className="text-[11px] text-slate-500">Prevent reuse of</span><div className="flex items-center gap-2"><button type="button" disabled={!canEdit || policy.preventPasswordReuse <= 0} onClick={() => onChange({ preventPasswordReuse: Math.max(0, policy.preventPasswordReuse - 1) })} className="h-6 w-6 rounded border border-slate-200 text-slate-600 disabled:opacity-40" aria-label="Decrease password reuse count">−</button><span className="min-w-4 text-center text-xs font-semibold tabular-nums text-slate-900">{policy.preventPasswordReuse}</span><button type="button" disabled={!canEdit || policy.preventPasswordReuse >= 50} onClick={() => onChange({ preventPasswordReuse: Math.min(50, policy.preventPasswordReuse + 1) })} className="h-6 w-6 rounded border border-slate-200 text-slate-600 disabled:opacity-40" aria-label="Increase password reuse count">+</button></div></div><p className="mt-1 text-[10px] text-slate-400">Prior passwords blocked</p></div>
        </div>
        <div><div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium text-slate-700">Complexity requirements</span><span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">{enabledRequirements} of 4 enabled</span></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{([
          ["requireSpecialCharacters", "Special characters", "! @ # $ %"],
          ["requireUppercase", "Uppercase letters", "A–Z"],
          ["requireLowercase", "Lowercase letters", "a–z"],
          ["requireNumbers", "Numbers", "0–9"],
        ] as const).map(([key, label, hint]) => <label key={key} className={`flex min-h-10 items-center gap-2 rounded-md border px-2.5 py-2 ${policy[key] ? "border-sky-100 bg-sky-50/60" : "border-slate-200 bg-white"}`}><input type="checkbox" checked={policy[key]} disabled={!canEdit} onChange={(event) => onChange({ [key]: event.target.checked } as Partial<AuthenticationPolicy>)} className="h-3.5 w-3.5 accent-sky-600"/><span className="min-w-0 flex-1 text-[11px] font-medium text-slate-700">{label}</span><code className="text-[10px] text-slate-400">{hint}</code></label>)}</div></div>
      </div>
    </section>
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
      <div className="flex items-start gap-2.5 border-b border-slate-100 pb-3"><span className="rounded-lg bg-violet-50 p-2 text-violet-700"><ShieldCheck size={16}/></span><div><h2 className="text-[13px] font-semibold text-slate-900">MFA enforcement</h2><p className="mt-0.5 text-xs text-slate-500">Choose the minimum authentication standard.</p></div></div>
      <div className="space-y-2 pt-3">{MFA_OPTIONS.map((option) => <label key={option.value} className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition ${policy.mfaEnforcement === option.value ? "border-sky-300 bg-sky-50/60 ring-1 ring-sky-100" : "border-slate-200 bg-white hover:bg-slate-50"}`}><input type="radio" name="mfa-enforcement" value={option.value} checked={policy.mfaEnforcement === option.value} disabled={!canEdit} onChange={() => onChange({ mfaEnforcement: option.value })} className="mt-0.5 h-3.5 w-3.5 accent-sky-600"/><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-800">{option.title}</span><span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{option.detail}</span></span>{policy.mfaEnforcement === option.value && <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-sky-600"/>}</label>)}</div>
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="flex items-start gap-2"><LockKeyhole size={14} className="mt-0.5 text-slate-500"/><div><p className="text-xs font-semibold text-slate-800">Enforcement status</p><p className="mt-1 text-[11px] leading-4 text-slate-500">{!enforcedAt ? "Draft baseline · not yet enforced" : isDirty ? "Changes pending · last enforced baseline remains active" : `Baseline saved ${new Date(enforcedAt).toLocaleString()}`}</p></div></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium ${!enforcedAt ? "border-amber-200 bg-amber-50 text-amber-800" : isDirty ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}><span className={`h-1.5 w-1.5 rounded-full ${!enforcedAt || isDirty ? "bg-amber-500" : "bg-emerald-500"}`}/>{!enforcedAt ? "Not enforced" : isDirty ? "Draft modified" : "Baseline enforced"}</span><button type="button" onClick={onSave} disabled={!canEdit || !isDirty} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-sky-600 px-3 text-xs font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"><ShieldCheck size={12}/>Save &amp; Enforce Baseline</button></div></div>
      {!canEdit && <p className="mt-2 text-[10px] text-amber-700">Read-only preview. Admin permissions are required to change authentication policy.</p>}
    </section>
  </div>;
}
