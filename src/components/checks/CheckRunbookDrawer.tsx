import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Clipboard, Download, FileCheck2, ShieldAlert, Terminal, X } from "lucide-react";
import { CHECK_FRAMEWORKS, type CheckItem } from "../../types/checksCatalogue";

type RunbookTab = "console" | "cli" | "audit";
interface Props { check: CheckItem | null; onClose: () => void; }

function extractCli(check: CheckItem): string {
  const explicit = check.cliRemediation?.trim() ?? "";
  const source = check.remediationProcedure || check.consoleRemediation || "";
  // Some catalog generations populate cliRemediation with the full console text. Treat that as a
  // fallback only when it differs from the general procedure and looks like a dedicated command.
  if (explicit && explicit !== source && explicit !== check.consoleRemediation?.trim() && /\baws\s+[a-z0-9-]+/i.test(explicit)) return explicit;
  const snippets = [...source.matchAll(/```(?:bash|shell|sh|console|aws)?\s*([\s\S]*?)```/gi)]
    .map((match) => match[1].trim())
    .filter((value) => /\baws\s+[a-z0-9-]+/i.test(value));
  if (snippets.length) return snippets.join("\n\n");
  const inlineCommands = [...source.matchAll(/`([^`]*\baws\s+[a-z0-9-]+[^`]*)`/gi)].map((match) => match[1].trim()).filter(Boolean);
  if (inlineCommands.length) return [...new Set(inlineCommands)].join("\n\n");
  const commandLines = source.split(/\r?\n/).filter((line) => /^\s*aws\s+[a-z0-9-]+/i.test(line));
  return commandLines.join("\n");
}

function cleanInstructions(value: string): string {
  return value
    .replace(/```(?:bash|shell|sh|console|aws)?\s*([\s\S]*?)```/gi, (_match, code: string) => /\baws\s+[a-z0-9-]+/i.test(code) ? "\n[Command available in the AWS CLI tab]\n" : `\n${code.trim()}\n`)
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1 ($2)")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function highlightShellLine(line: string) {
  const tokenPattern = /(\baws\b|--[a-zA-Z0-9-]+|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\$\{?[A-Za-z_][A-Za-z0-9_]*\}?)/g;
  return line.split(tokenPattern).map((token, index) => {
    const tone = token === "aws" ? "text-sky-300 font-semibold" : token.startsWith("--") ? "text-violet-300" : token.startsWith("\"") || token.startsWith("'") ? "text-amber-200" : token.startsWith("$") ? "text-cyan-300" : "text-emerald-200";
    return <span key={`${index}-${token}`} className={tone}>{token || "\u00a0"}</span>;
  });
}


export function CheckRunbookDrawer({ check, onClose }: Props) {
  const [tab, setTab] = useState<RunbookTab>("console");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  useEffect(() => {
    setTab("console"); setCopied(false); setCopyError("");
    if (!check) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [check?.checkId, onClose]);

  const cli = useMemo(() => check ? extractCli(check) : "", [check]);
  if (!check) return null;
  const sourceContent = tab === "console" ? (check.consoleRemediation || check.remediationProcedure || "") : tab === "cli" ? cli : (check.auditProcedure || "");
  const content = tab === "cli" ? sourceContent : cleanInstructions(sourceContent);
  const tabLabel = tab === "console" ? "Console guide" : tab === "cli" ? "AWS CLI" : "Audit steps";
  const copyText = async () => {
    if (!content.trim()) return;
    try { await navigator.clipboard.writeText(content); setCopied(true); setCopyError(""); window.setTimeout(() => setCopied(false), 1400); }
    catch { setCopyError("Clipboard access is blocked. Select the text below and copy it manually."); }
  };
  const exportScript = () => {
    const script = `#!/usr/bin/env bash\nset -euo pipefail\n\n# ${check.name}\n# Check ID: ${check.checkId}\n# Review AWS account, region, permissions, and command effects before execution.\n\n${cli || "# No AWS CLI command was provided for this check."}\n`;
    const blob = new Blob([script], { type: "text/x-shellscript;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${check.checkId}-runbook.sh`; anchor.click(); URL.revokeObjectURL(url);
  };

  return <div className="fixed inset-0 z-[90] flex justify-end" role="presentation">
    <button type="button" aria-label="Close remediation drawer" onClick={onClose} className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]" />
    <aside role="dialog" aria-modal="true" aria-label={`Remediation runbook for ${check.name}`} className="relative flex h-full w-full max-w-[720px] flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
      <header className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex items-start gap-3"><span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><BookOpen size={17} /></span><div className="min-w-0 flex-1"><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">Remediation workspace · {check.service || "AWS"}</p><h2 className="mt-1 text-[15px] font-semibold leading-5 text-slate-900">{check.name}</h2><code className="mt-1 block truncate font-mono text-[10px] text-slate-500">{check.checkId}</code></div><button type="button" onClick={onClose} aria-label="Close drawer" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"><X size={14} /></button></div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5"><span className={`rounded-md border px-2 py-1 text-[9px] font-semibold ${check.severity === "Critical" ? "border-rose-200 bg-rose-50 text-rose-800" : check.severity === "High" ? "border-orange-200 bg-orange-50 text-orange-800" : check.severity === "Medium" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-100 text-slate-700"}`}>{check.severity}</span><span className="max-w-full truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[9px] text-slate-600" title={check.resourceType}>{check.resourceType}</span>{check.frameworkIds.map((id) => <span key={id} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-medium text-slate-600">{CHECK_FRAMEWORKS.find((framework) => framework.id === id)?.label ?? id}</span>)}</div>
      </header>

      <section className="border-b border-slate-200 bg-white px-5 py-3"><p className="text-[10px] font-semibold text-slate-700">Risk summary</p><p className="mt-1 line-clamp-3 text-[11px] leading-5 text-slate-600">{check.description || "No risk description was provided."}</p>{check.rationaleStatement && <p className="mt-2 text-[10px] leading-4 text-slate-500"><span className="font-semibold text-slate-600">Rationale:</span> {check.rationaleStatement}</p>}</section>

      <nav className="flex shrink-0 gap-1 border-b border-slate-200 bg-white px-4" role="tablist" aria-label="Runbook sections">
        {(["console", "cli", "audit"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => { setTab(item); setCopied(false); setCopyError(""); }} className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-[10px] font-semibold transition ${tab === item ? "border-sky-600 text-sky-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{item === "console" ? <BookOpen size={12} /> : item === "cli" ? <Terminal size={12} /> : <FileCheck2 size={12} />}{item === "console" ? "Console Guide" : item === "cli" ? "AWS CLI" : "Audit Steps"}</button>)}
      </nav>

      <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2"><div className="min-w-0"><h3 className="text-[12px] font-semibold text-slate-900">{tabLabel}</h3><p className="mt-0.5 text-[9px] text-slate-500">Source benchmark procedure · review account and region scope before making changes.</p></div><div className="ml-auto flex gap-1.5"><button type="button" onClick={() => void copyText()} disabled={!content.trim()} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40">{copied ? <Check size={12} /> : <Clipboard size={12} />}{copied ? "Copied" : tab === "cli" ? "Copy command" : "Copy text"}</button>{tab === "cli" && <button type="button" onClick={exportScript} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 text-[10px] font-semibold text-white transition hover:bg-slate-800"><Download size={12} />Export .sh</button>}</div></div>
        {content.trim() ? tab === "cli" ? <pre className="overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] leading-5"><code>{content.split("\n").map((line, index) => <div key={`${index}-${line}`}><span className="mr-3 inline-block w-5 select-none text-right text-slate-600">{index + 1}</span>{highlightShellLine(line)}</div>)}</code></pre> : <pre className="overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white p-4 text-[11px] leading-5 text-slate-700"><code>{content}</code></pre> : <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center"><p className="text-[11px] font-semibold text-slate-700">No {tab === "cli" ? "AWS CLI command" : tab === "audit" ? "audit procedure" : "Console procedure"} available</p><p className="mt-1 text-[10px] text-slate-500">Edit the check definition to add the missing runbook content.</p></div>}
        {copyError && <p role="status" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-800">{copyError}</p>}
        {tab === "cli" && <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] leading-4 text-amber-900"><ShieldAlert size={13} className="mt-0.5 shrink-0" />Commands are documented, not executed by this interface. Review command syntax, IAM permissions, AWS account, and region before running them.</p>}
        {tab === "audit" && check.impactStatement && <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3"><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Potential impact</p><p className="mt-1 text-[10px] leading-4 text-slate-600">{check.impactStatement}</p></div>}
      </main>
      <footer className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-3"><span className="text-[9px] text-slate-400">Scan results change only after a verified re-check.</span><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">Close runbook</button></footer>
    </aside>
  </div>;
}
