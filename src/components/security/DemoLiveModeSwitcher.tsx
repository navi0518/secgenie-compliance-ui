import { Cloud, FlaskConical } from "lucide-react";
import { useSecurityContext } from "../../context/useSecurityContext";

export function DemoLiveModeSwitcher() {
  const { dataMode, toggleDataMode } = useSecurityContext();
  const demo = dataMode === "demo";
  return <button type="button" onClick={toggleDataMode} aria-pressed={!demo} title="Display preference only until the live account connector is configured" className={`inline-flex h-8 max-w-[205px] items-center gap-1.5 rounded-md border px-2.5 text-[10px] font-semibold transition ${demo ? "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100" : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${demo ? "bg-violet-500" : "bg-emerald-500"}`}/>{demo ? <FlaskConical size={12}/> : <Cloud size={12}/>}<span className="truncate">{demo ? "Interactive Demo Mode" : "Live Account: aws-prod-01"}</span></button>;
}
