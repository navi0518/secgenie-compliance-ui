import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Compass, Filter, GitBranch, ShieldCheck, X } from "lucide-react";

const STEPS = [
  { title: "Navigate the workbench", eyebrow: "Step 1 of 4", body: "Move between Overview & Correlation, By Asset Type, Framework Breakdown, Frameworks & Rule Catalog, and Checks Catalogue & Studio. The workbench shell stays in place while the active view changes.", icon: Compass, tip: "Use the five compact tabs below the source-alignment banner." },
  { title: "Filter with precision", eyebrow: "Step 2 of 4", body: "Search check names, IDs, descriptions, and resource types. Combine AWS service and framework facets with severity chips to reduce the registry to the specific controls you need.", icon: Filter, tip: "Filters are local view state; clearing them does not change rule configuration." },
  { title: "Read cross-framework coverage", eyebrow: "Step 3 of 4", body: "Framework badges show requirements linked to a check. A shared check ID can satisfy mappings in several frameworks, so rule-state changes can affect multiple mapped controls.", icon: GitBranch, tip: "Projected impact is a preview. Existing PASS/FAIL records remain historical until a new scan." },
  { title: "Open a full audit runbook", eyebrow: "Step 4 of 4", body: "Expand a check for a short risk summary, then select View Full Runbook to inspect Console guidance, AWS CLI commands, and audit/verification steps in the slide-out drawer.", icon: ShieldCheck, tip: "Commands are documentation, not executed by this interface. Verify account, region, and permissions before running them." },
];

interface Props {
  open: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

export function OnboardingTour({ open, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  useEffect(() => { if (open) { setStep(0); setDontShowAgain(false); } }, [open]);
  if (!open) return null;
  const current = STEPS[step];
  const Icon = current.icon;
  const close = () => onClose(dontShowAgain);
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/25 p-3" role="presentation">
    <button type="button" onClick={close} aria-label="Dismiss product tour" className="absolute inset-0" />
    <section role="dialog" aria-modal="true" aria-labelledby="onboarding-tour-title" className="relative w-full max-w-[540px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
      <header className="flex items-start gap-3 border-b border-slate-200 px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700"><Icon size={17}/></span>
        <div className="min-w-0 flex-1"><div className="text-[9px] font-semibold uppercase tracking-wider text-sky-700">SecGenie.AI product tour · {current.eyebrow}</div><h2 id="onboarding-tour-title" className="mt-1 text-sm font-semibold text-slate-900">{current.title}</h2></div>
        <button type="button" onClick={close} className="icon-button" aria-label="Close tour"><X size={14}/></button>
      </header>
      <div className="px-4 py-4"><div className="mb-4 grid grid-cols-4 gap-1.5">{STEPS.map((item, index) => <div key={item.title} className={`h-1 rounded-full ${index <= step ? "bg-sky-600" : "bg-slate-200"}`} />)}</div><p className="text-xs leading-5 text-slate-600">{current.body}</p><div className="mt-3 rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2 text-[11px] leading-4 text-sky-900">{current.tip}</div></div>
      <footer className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50/70 px-4 py-3"><label className="mr-auto flex items-center gap-2 text-[11px] text-slate-600"><input type="checkbox" checked={dontShowAgain} onChange={(event) => setDontShowAgain(event.target.checked)} className="accent-sky-600"/>Don't show again</label><button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-600 disabled:opacity-40"><ArrowLeft size={12}/>Back</button>{step < STEPS.length - 1 ? <button type="button" onClick={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))} className="inline-flex h-8 items-center gap-1 rounded-md bg-sky-600 px-3 text-[11px] font-semibold text-white hover:bg-sky-700">Next<ArrowRight size={12}/></button> : <button type="button" onClick={close} className="inline-flex h-8 items-center rounded-md bg-sky-600 px-3 text-[11px] font-semibold text-white hover:bg-sky-700">Finish tour</button>}</footer>
    </section>
  </div>;
}
