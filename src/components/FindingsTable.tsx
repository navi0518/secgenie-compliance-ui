import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowUpRight, SearchX, MoreVertical } from "lucide-react";
import type { AssetEntity, ComplianceFinding, FrameworkId } from "../types";
import { StatusBadge } from "./StatusBadge";
import { useSecurityContext } from "../context/useSecurityContext";

export type StatusFilter = "ALL" | "PASS" | "FAIL" | "MANUAL";
export type FrameworkFilter = FrameworkId | "ALL";
export type FindingQualityFilter =
  | "ALL"
  | "LINKED"
  | "ACCOUNT"
  | "UNRESOLVED"
  | "DUPLICATE"
  | "MISSING_EVIDENCE";

interface Props {
  findings: ComplianceFinding[];
  assets: AssetEntity[];
  frameworkFilter: FrameworkFilter;
  statusFilter: StatusFilter;
  qualityFilter: FindingQualityFilter;
  search: string;
  onOpenFinding: (finding: ComplianceFinding) => void;
  onStatusFilterChange: (status: StatusFilter) => void;
  onQualityFilterChange: (filter: FindingQualityFilter) => void;
}

const PAGE_SIZE = 25;
const frameworkLabel = (framework: string) => framework === "ISO27001-2013" ? "ISO 27001:2013" : framework;

function includesTerm(values: unknown[], term: string) {
  return values.some((value) => String(value ?? "").toLowerCase().includes(term));
}

function qualityLabel(finding: ComplianceFinding) {
  if (finding.duplicateCandidate) return "Repeated signature";
  if (finding.scope === "account") return "Account scope";
  if (!finding.assetUid) return "Unresolved";
  if (!finding.evidence.statusExtended) return "Evidence gap";
  return "Linked";
}

export function FindingsTable({
  findings,
  assets,
  frameworkFilter,
  statusFilter,
  qualityFilter,
  search,
  onOpenFinding,
  onStatusFilterChange,
  onQualityFilterChange,
}: Props) {
  const [page, setPage] = useState(1);
  const { mutedFindingIds, verifiedFindingIds } = useSecurityContext();
  useEffect(() => setPage(1), [frameworkFilter, statusFilter, qualityFilter, search]);
  const term = search.trim().toLowerCase();
  const assetByUid = useMemo(() => new Map(assets.map((asset) => [asset.uid, asset])), [assets]);
  const assetNameByUid = useMemo(() => new Map(assets.map((asset) => [asset.uid, asset.name])), [assets]);

  const rows = useMemo(() => findings.filter((finding) => {
    const frameworkMatch = frameworkFilter === "ALL" || finding.framework === frameworkFilter;
    const statusMatch = statusFilter === "ALL" || finding.status === statusFilter;
    const searchMatch = !term || includesTerm([
      finding.checkId,
      finding.requirementId,
      finding.requirementDescription,
      finding.sourceFindingId,
      finding.sourceAssetId,
      finding.region,
      finding.evidence.statusExtended,
      finding.framework,
      finding.scope,
      finding.identityResolution.method,
      finding.identityResolution.confidence,
      finding.assetUid ? assetNameByUid.get(finding.assetUid) : "",
    ], term);

    let qualityMatch = true;
    switch (qualityFilter) {
      case "LINKED": qualityMatch = Boolean(finding.assetUid); break;
      case "ACCOUNT": qualityMatch = finding.scope === "account"; break;
      case "UNRESOLVED": qualityMatch = !finding.assetUid && finding.scope !== "account"; break;
      case "DUPLICATE": qualityMatch = finding.duplicateCandidate; break;
      case "MISSING_EVIDENCE": qualityMatch = !finding.evidence.statusExtended; break;
      default: qualityMatch = true;
    }
    return frameworkMatch && statusMatch && searchMatch && qualityMatch;
  }).sort((a, b) => {
    const statusRank = { FAIL: 0, MANUAL: 1, PASS: 2 };
    return statusRank[a.status] - statusRank[b.status]
      || a.framework.localeCompare(b.framework)
      || a.requirementId.localeCompare(b.requirementId);
  }), [findings, frameworkFilter, statusFilter, qualityFilter, term, assetNameByUid]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <section className="card-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sec-line px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-sec-text">Compliance findings</h2>
          <p className="mt-1 text-[11px] text-sec-muted">{rows.length.toLocaleString()} assessment records match the current filters</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="status-filter">Filter by assessment status</label>
          <select id="status-filter" value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)} className="control-input h-9 min-w-32">
            <option value="ALL">All statuses</option>
            <option value="FAIL">Fail</option>
            <option value="MANUAL">Manual review</option>
            <option value="PASS">Pass</option>
          </select>
          <label className="sr-only" htmlFor="quality-filter">Filter by record quality and scope</label>
          <select id="quality-filter" value={qualityFilter} onChange={(e) => onQualityFilterChange(e.target.value as FindingQualityFilter)} className="control-input h-9 min-w-40">
            <option value="ALL">All record types</option>
            <option value="LINKED">Linked to asset</option>
            <option value="ACCOUNT">Account-scoped</option>
            <option value="UNRESOLVED">Unresolved resource</option>
            <option value="DUPLICATE">Repeated signature</option>
            <option value="MISSING_EVIDENCE">Missing extended evidence</option>
          </select>
          <span title="Additional column preferences can be connected to the platform table settings" className="icon-button cursor-default text-slate-400"><MoreVertical size={17}/></span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-left">
          <thead className="bg-slate-50/90">
            <tr className="border-b border-sec-line text-[11px] font-semibold text-sec-muted">
              <th scope="col" className="px-4 py-3">Control / evidence</th>
              <th scope="col" className="px-3 py-3">Framework</th>
              <th scope="col" className="px-3 py-3">Requirement / region</th>
              <th scope="col" className="px-3 py-3">Status</th>
              <th scope="col" className="px-3 py-3">Resource / scope</th>
              <th scope="col" className="px-3 py-3">Data quality</th>
              <th scope="col" className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sec-line">
            {visibleRows.map((finding) => {
              const resolvedAsset = finding.assetUid ? assetByUid.get(finding.assetUid) : undefined;
              const resourceName = resolvedAsset?.name ?? null;
              const resourceValue = resourceName ?? (finding.scope === "account" ? `Account scope · ${finding.scopeEntityUid ?? "account unresolved"}` : `Unresolved · ${finding.sourceAssetId || "unknown"}`);
              const primaryQuality = qualityLabel(finding);
              const qualityClass = primaryQuality === "Linked"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : primaryQuality === "Repeated signature" || primaryQuality === "Evidence gap"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-slate-200 bg-slate-50 text-slate-700";
              return (
                <tr key={finding.uid} className="transition hover:bg-sky-50/40">
                  <td className="max-w-[320px] px-4 py-3">
                    <button type="button" onClick={() => onOpenFinding(finding)} className="group text-left">
                      <span className="block truncate text-xs font-semibold text-sec-blue group-hover:underline">{finding.requirementDescription || "Unnamed assessment requirement"}</span>
                      <span className="mt-1 block truncate font-mono text-[10px] text-sec-muted">{finding.checkId || "Check ID unavailable"}</span>
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs">{frameworkLabel(finding.framework)}</td>
                  <td className="px-3 py-3"><span className="block text-xs font-medium">{finding.requirementId || "—"}</span><span className="mt-1 block text-[10px] text-sec-muted">{finding.region ?? "Region unavailable"}</span></td>
                  <td className="px-3 py-3"><div className="flex flex-col items-start gap-1"><StatusBadge status={finding.status}/>{mutedFindingIds.includes(finding.uid) && <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-800">Muted · local</span>}{verifiedFindingIds.includes(finding.uid) && <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-800">Verification noted</span>}</div></td>
                  <td className="max-w-[230px] px-3 py-3">
                    <span className="block truncate text-[11px] text-sec-text">{resourceValue}</span>
                    <span className="mt-1 block truncate text-[10px] text-sec-muted">{finding.scope} scope · {finding.identityResolution.method} match</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-medium ${qualityClass}`}>{primaryQuality}</span>
                    {finding.duplicateCandidate && primaryQuality !== "Repeated signature" && <span className="mt-1 block text-[10px] text-amber-800">Duplicate candidate</span>}
                    {!finding.evidence.statusExtended && primaryQuality !== "Evidence gap" && <span className="mt-1 block text-[10px] text-amber-800">No extended evidence</span>}
                  </td>
                  <td className="px-3 py-3"><div className="flex justify-end"><button type="button" onClick={() => onOpenFinding(finding)} className="icon-button" aria-label={`Investigate ${finding.requirementDescription}`}><ArrowUpRight size={16}/></button></div></td>
                </tr>
              );
            })}
            {visibleRows.length === 0 && <tr><td colSpan={7} className="px-4 py-14 text-center"><SearchX className="mx-auto text-slate-400" size={24}/><p className="mt-2 text-sm font-medium text-sec-text">No findings match these filters</p><p className="mt-1 text-xs text-sec-muted">Try clearing a filter or using a broader search term.</p></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sec-line bg-white px-4 py-3 text-[11px] text-sec-muted">
        <span>Showing {rows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, rows.length)} of {rows.length.toLocaleString()}</span>
        <div className="flex items-center gap-3">
          <span>Rows per page: {PAGE_SIZE}</span>
          <button type="button" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="icon-button h-8 w-8 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Previous page"><ChevronLeft size={16}/></button>
          <span>{currentPage} / {totalPages}</span>
          <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="icon-button h-8 w-8 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Next page"><ChevronRight size={16}/></button>
        </div>
      </div>
    </section>
  );
}
