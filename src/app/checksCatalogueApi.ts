import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type {
  CheckItem,
  CheckAuditEvent,
  CheckMutationPayload,
  CheckMutationResult,
  ChecksCatalogueResponse,
  ChecksFilterState,
  DeleteCustomCheckArgs,
  UpdateCheckArgs,
} from "../types/checksCatalogue";

const MOCK_STORAGE_KEY = "secgenie.checks-catalogue.demo.v1";
const MOCK_API = import.meta.env.VITE_USE_MOCK_CHECKS_API !== "false";

function readStoredCatalogue(): ChecksCatalogueResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MOCK_STORAGE_KEY);
    return raw ? JSON.parse(raw) as ChecksCatalogueResponse : null;
  } catch {
    return null;
  }
}
function persistCatalogue(catalogue: ChecksCatalogueResponse): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(catalogue));
}
function frameworkState(item: CheckItem, associations: CheckItem["frameworkAssociations"]): CheckItem {
  const frameworkIds = [...new Set(associations.map((association) => association.frameworkId))].sort();
  return { ...item, frameworkAssociations: associations, frameworkIds, frameworkCoverageCount: frameworkIds.length };
}
function calculateModified(item: CheckItem): boolean {
  if (item.isCustom || !item.baseline) return false;
  const fields = ["name", "description", "service", "resourceType", "severity", "rationaleStatement", "impactStatement", "assessmentStatus", "remediationProcedure", "consoleRemediation", "cliRemediation", "auditProcedure", "frameworkAssociations"] as const;
  return fields.some((field) => JSON.stringify(item[field]) !== JSON.stringify(item.baseline?.[field]));
}
type CatalogueLoadResult = { data: ChecksCatalogueResponse; error?: never } | { error: FetchBaseQueryError; data?: never };
type CatalogueFetchResult = { data?: unknown; error?: FetchBaseQueryError };
async function loadMockCatalogue<T extends CatalogueFetchResult>(fetchDefault: () => T | PromiseLike<T>): Promise<CatalogueLoadResult> {
  const stored = readStoredCatalogue();
  if (stored) { stored.auditLog ??= []; return { data: stored }; }
  const result = await fetchDefault();
  if (result.error) return { error: result.error };
  if (!result.data) return { error: requiredError("The checks catalogue fixture is empty or unavailable.") };
  const catalogue = result.data as ChecksCatalogueResponse;
  catalogue.auditLog ??= [];
  return { data: catalogue };
}
function appendAudit(catalogue: ChecksCatalogueResponse, event: Omit<CheckAuditEvent, "eventId" | "occurredAt" | "actor">): void {
  catalogue.auditLog ??= [];
  catalogue.auditLog.unshift({ ...event, eventId: `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`, occurredAt: new Date().toISOString(), actor: "Current user" });
}
function syncCatalogueMeta(catalogue: ChecksCatalogueResponse): void {
  const visible = catalogue.checks.filter((item) => !item.isArchived);
  catalogue.meta.checkCount = visible.length;
  catalogue.meta.standardCheckCount = visible.filter((item) => !item.isCustom).length;
  catalogue.meta.customCheckCount = visible.filter((item) => item.isCustom).length;
  catalogue.meta.mappingCount = visible.reduce((sum, item) => sum + item.frameworkAssociations.length, 0);
}
function requiredError(message: string): FetchBaseQueryError {
  return { status: "CUSTOM_ERROR", error: message };
}

/**
 * Demo mode persists catalogue edits locally. Set VITE_USE_MOCK_CHECKS_API=false
 * to use the secured REST contracts below. Backend authorization, validation,
 * tenant scoping, audit persistence and referential checks must be enforced server-side.
 */
export const checksCatalogueApi = createApi({
  reducerPath: "checksCatalogueApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/" }),
  tagTypes: ["Check", "ChecksCatalogue"],
  endpoints: (builder) => ({
    getChecksCatalogue: builder.query<ChecksCatalogueResponse, ChecksFilterState>({
      async queryFn(filters, _api, _extraOptions, baseQuery) {
        if (!MOCK_API) {
          return await baseQuery({ url: "/api/checks/catalogue", method: "GET", params: filters }) as { data: ChecksCatalogueResponse } | { error: FetchBaseQueryError };
        }
        // The complete catalogue is returned so KPI counts stay global; view filters are applied client-side.
        void filters;
        return await loadMockCatalogue(() => baseQuery("mock/checks-catalogue.json"));
      },
      providesTags: (result) => result
        ? [{ type: "ChecksCatalogue", id: "LIST" }, ...result.checks.map((item) => ({ type: "Check" as const, id: item.checkId }))]
        : [{ type: "ChecksCatalogue", id: "LIST" }],
    }),
    updateCheck: builder.mutation<CheckMutationResult, UpdateCheckArgs>({
      async queryFn({ checkId, patch }, _api, _extraOptions, baseQuery) {
        if (!MOCK_API) return await baseQuery({ url: `/api/checks/${encodeURIComponent(checkId)}`, method: "PATCH", body: patch }) as { data: CheckMutationResult } | { error: FetchBaseQueryError };
        const loaded = await loadMockCatalogue(() => baseQuery("mock/checks-catalogue.json"));
        if (loaded.error || !loaded.data) return { error: loaded.error ?? requiredError("Unable to load the checks catalogue.") };
        const catalogue = loaded.data;
        const index = catalogue.checks.findIndex((item) => item.checkId === checkId);
        if (index < 0) return { error: requiredError(`Check ${checkId} was not found.`) };
        const previous = catalogue.checks[index];
        const next = { ...previous, ...patch, checkId: previous.checkId, updatedAt: new Date().toISOString() } as CheckItem;
        if (patch.frameworkAssociations) Object.assign(next, frameworkState(next, patch.frameworkAssociations));
        next.isModified = calculateModified(next);
        catalogue.checks[index] = next;
        const action: CheckAuditEvent["action"] = patch.isActive === false ? "CHECK_DISABLED" : patch.isActive === true ? "CHECK_ENABLED" : "CHECK_UPDATED";
        appendAudit(catalogue, { checkId, action, reason: patch.auditReason?.trim() || (action === "CHECK_UPDATED" ? "Definition updated in Check Studio" : "State changed in Check Catalogue"), before: previous, after: next });
        syncCatalogueMeta(catalogue);
        persistCatalogue(catalogue);
        return { data: { check: next } };
      },
      invalidatesTags: (_result, _error, arg) => [{ type: "Check", id: arg.checkId }, { type: "ChecksCatalogue", id: "LIST" }],
    }),
    createCustomCheck: builder.mutation<CheckMutationResult, CheckMutationPayload>({
      async queryFn(payload, _api, _extraOptions, baseQuery) {
        if (!MOCK_API) return await baseQuery({ url: "/api/checks", method: "POST", body: payload }) as { data: CheckMutationResult } | { error: FetchBaseQueryError };
        const loaded = await loadMockCatalogue(() => baseQuery("mock/checks-catalogue.json"));
        if (loaded.error || !loaded.data) return { error: loaded.error ?? requiredError("Unable to load the checks catalogue.") };
        const catalogue = loaded.data;
        const checkId = (payload.checkId ?? "").trim();
        if (!/^[a-z][a-z0-9_]{2,99}$/.test(checkId)) return { error: requiredError("Use a lowercase identifier with letters, numbers and underscores (3–100 characters).") };
        if (catalogue.checks.some((item) => item.checkId.toLowerCase() === checkId.toLowerCase())) return { error: requiredError("That check ID already exists.") };
        const associations = payload.frameworkAssociations ?? [];
        const check: CheckItem = {
          checkId,
          name: payload.name?.trim() ?? "Untitled custom check",
          description: payload.description?.trim() ?? "",
          service: payload.service?.trim() ?? "",
          resourceType: payload.resourceType?.trim() ?? "",
          severity: payload.severity ?? "Medium",
          rationaleStatement: payload.rationaleStatement ?? "",
          impactStatement: payload.impactStatement ?? "",
          assessmentStatus: payload.assessmentStatus ?? "Automated",
          remediationProcedure: payload.remediationProcedure ?? "",
          consoleRemediation: payload.consoleRemediation ?? payload.remediationProcedure ?? "",
          cliRemediation: payload.cliRemediation ?? "",
          auditProcedure: payload.auditProcedure ?? "",
          frameworkAssociations: associations,
          frameworkIds: [...new Set(associations.map((item) => item.frameworkId))].sort(),
          frameworkCoverageCount: new Set(associations.map((item) => item.frameworkId)).size,
          isCustom: true,
          isModified: false,
          isActive: true,
          isArchived: false,
          updatedAt: new Date().toISOString(),
          customMetadata: { createdAt: new Date().toISOString(), owner: "Current user" },
        };
        catalogue.checks.unshift(check);
        appendAudit(catalogue, { checkId, action: "CUSTOM_CHECK_CREATED", reason: "Custom check created from Check Studio wizard", after: check });
        syncCatalogueMeta(catalogue);
        persistCatalogue(catalogue);
        return { data: { check } };
      },
      invalidatesTags: [{ type: "ChecksCatalogue", id: "LIST" }],
    }),
    deleteCustomCheck: builder.mutation<CheckMutationResult, DeleteCustomCheckArgs>({
      async queryFn({ checkId, mode, auditReason }, _api, _extraOptions, baseQuery) {
        if (!MOCK_API) return await baseQuery({ url: `/api/checks/${encodeURIComponent(checkId)}`, method: "DELETE", params: { mode, auditReason } }) as { data: CheckMutationResult } | { error: FetchBaseQueryError };
        const loaded = await loadMockCatalogue(() => baseQuery("mock/checks-catalogue.json"));
        if (loaded.error || !loaded.data) return { error: loaded.error ?? requiredError("Unable to load the checks catalogue.") };
        const catalogue = loaded.data;
        const item = catalogue.checks.find((candidate) => candidate.checkId === checkId);
        if (!item) return { error: requiredError(`Check ${checkId} was not found.`) };
        if (!item.isCustom) return { error: requiredError("Standard benchmark checks cannot be deleted. Use an audited deactivation/exemption instead.") };
        if (!auditReason.trim()) return { error: requiredError("An audit reason is required.") };
        if (mode === "hard-delete") {
          appendAudit(catalogue, { checkId, action: "CUSTOM_CHECK_HARD_DELETED", reason: auditReason.trim(), before: item });
          catalogue.checks = catalogue.checks.filter((candidate) => candidate.checkId !== checkId);
        } else {
          const before = { ...item };
          item.isArchived = true;
          item.isActive = false;
          item.auditReason = auditReason.trim();
          item.updatedAt = new Date().toISOString();
          appendAudit(catalogue, { checkId, action: "CUSTOM_CHECK_ARCHIVED", reason: auditReason.trim(), before, after: item });
        }
        syncCatalogueMeta(catalogue);
        persistCatalogue(catalogue);
        return { data: { check: item, message: mode === "hard-delete" ? "Custom check permanently deleted." : "Custom check archived." } };
      },
      invalidatesTags: (_result, _error, arg) => [{ type: "Check", id: arg.checkId }, { type: "ChecksCatalogue", id: "LIST" }],
    }),
    resetCheckToBaseline: builder.mutation<CheckMutationResult, string>({
      async queryFn(checkId, _api, _extraOptions, baseQuery) {
        if (!MOCK_API) return await baseQuery({ url: `/api/checks/${encodeURIComponent(checkId)}/reset`, method: "POST" }) as { data: CheckMutationResult } | { error: FetchBaseQueryError };
        const loaded = await loadMockCatalogue(() => baseQuery("mock/checks-catalogue.json"));
        if (loaded.error || !loaded.data) return { error: loaded.error ?? requiredError("Unable to load the checks catalogue.") };
        const catalogue = loaded.data;
        const index = catalogue.checks.findIndex((item) => item.checkId === checkId);
        if (index < 0) return { error: requiredError(`Check ${checkId} was not found.`) };
        const current = catalogue.checks[index];
        if (current.isCustom || !current.baseline) return { error: requiredError("Only standard checks with a baseline can be reset.") };
        const restored = { ...current, ...current.baseline, checkId: current.checkId, isModified: false, updatedAt: new Date().toISOString() } as CheckItem;
        const next: CheckItem = frameworkState(restored, current.baseline.frameworkAssociations);
        catalogue.checks[index] = next;
        appendAudit(catalogue, { checkId, action: "CHECK_RESET_TO_BASELINE", reason: "Operator reset this standard check to its baseline", before: current, after: next });
        syncCatalogueMeta(catalogue);
        persistCatalogue(catalogue);
        return { data: { check: next, message: "The check was reset to its baseline definition." } };
      },
      invalidatesTags: (_result, _error, checkId) => [{ type: "Check", id: checkId }, { type: "ChecksCatalogue", id: "LIST" }],
    }),
  }),
});

export const {
  useGetChecksCatalogueQuery,
  useUpdateCheckMutation,
  useCreateCustomCheckMutation,
  useDeleteCustomCheckMutation,
  useResetCheckToBaselineMutation,
} = checksCatalogueApi;
