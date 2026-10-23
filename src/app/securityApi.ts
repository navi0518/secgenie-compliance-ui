import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  AssetEntity,
  ComplianceFinding,
  FrameworkId,
  FrameworkSummary,
  NormalizedSecurityDataset,
} from "../types";
import type {
  BatchUpdateFrameworkRulesArgs,
  RuleCatalogDataset,
  RuleMutationResult,
  ToggleRuleStatusArgs,
} from "../types/rules";

export interface FindingQueryArgs {
  framework?: FrameworkId | "ALL";
  status?: "ALL" | "PASS" | "FAIL" | "MANUAL";
  search?: string;
}

export interface AssetDetail {
  asset: AssetEntity | null;
  findings: ComplianceFinding[];
}

const MOCK_DATASET_PATH = "mock/normalized-dataset.json";
const MOCK_RULE_CATALOG_PATH = "mock/rule-catalog.json";
const RULE_OVERRIDES_KEY = "secgenie.rule-catalog.enabled.v1";

type RuleOverrideMap = Record<string, boolean>;

function readRuleOverrides(): RuleOverrideMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(RULE_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) as RuleOverrideMap : {};
  } catch {
    return {};
  }
}

function writeRuleOverrides(next: RuleOverrideMap): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(RULE_OVERRIDES_KEY, JSON.stringify(next)); } catch { /* storage may be disabled */ }
}

function persistRuleOverrides(checkIds: string[], enabled: boolean): void {
  const overrides = readRuleOverrides();
  for (const checkId of checkIds) overrides[checkId] = enabled;
  writeRuleOverrides(overrides);
}

/**
 * The default implementation reads the normalized demo export from /public.
 * For production, replace MOCK_DATASET_PATH with the matching secured API route
 * and enforce tenant/account authorization on the server.
 */
export const securityApi = createApi({
  reducerPath: "securityApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/" }),
  tagTypes: ["Dataset", "Asset", "Finding", "RuleCatalog"],
  endpoints: (builder) => ({
    getNormalizedDataset: builder.query<NormalizedSecurityDataset, void>({
      query: () => MOCK_DATASET_PATH,
      providesTags: ["Dataset"],
    }),
    getFrameworkSummaries: builder.query<FrameworkSummary[], void>({
      query: () => MOCK_DATASET_PATH,
      transformResponse: (dataset: NormalizedSecurityDataset) => dataset.frameworkSummaries,
      providesTags: ["Dataset"],
    }),
    getFilteredFindings: builder.query<ComplianceFinding[], FindingQueryArgs>({
      query: () => MOCK_DATASET_PATH,
      transformResponse: (dataset: NormalizedSecurityDataset, _meta, args) => {
        const term = (args.search ?? "").trim().toLowerCase();
        return dataset.findings.filter((finding) => {
          const frameworkMatch = !args.framework || args.framework === "ALL" || finding.framework === args.framework;
          const statusMatch = !args.status || args.status === "ALL" || finding.status === args.status;
          const searchable = [
            finding.checkId,
            finding.requirementId,
            finding.requirementDescription,
            finding.sourceFindingId,
            finding.sourceAssetId,
            finding.evidence.statusExtended,
          ].join(" ").toLowerCase();
          return frameworkMatch && statusMatch && (!term || searchable.includes(term));
        });
      },
      providesTags: ["Finding"],
    }),
    getAssetDetail: builder.query<AssetDetail, string>({
      query: () => MOCK_DATASET_PATH,
      transformResponse: (dataset: NormalizedSecurityDataset, _meta, uid) => ({
        asset: dataset.assets.find((asset) => asset.uid === uid) ?? null,
        findings: dataset.findings.filter((finding) => finding.assetUid === uid),
      }),
      providesTags: (_result, _error, uid) => [{ type: "Asset", id: uid }],
    }),
    getRuleCatalog: builder.query<RuleCatalogDataset, void>({
      query: () => MOCK_RULE_CATALOG_PATH,
      transformResponse: (catalog: RuleCatalogDataset) => {
        const overrides = readRuleOverrides();
        return {
          ...catalog,
          rules: catalog.rules.map((rule) => ({
            ...rule,
            enabled: Object.prototype.hasOwnProperty.call(overrides, rule.checkId)
              ? overrides[rule.checkId]
              : rule.enabled,
          })),
        };
      },
      providesTags: ["RuleCatalog"],
    }),
    toggleRuleStatus: builder.mutation<RuleMutationResult, ToggleRuleStatusArgs>({
      queryFn: async ({ checkId, enabled }) => {
        persistRuleOverrides([checkId], enabled);
        return { data: { updatedCheckIds: [checkId], enabled } };
      },
      async onQueryStarted({ checkId, enabled }, { dispatch, queryFulfilled }) {
        const patch = dispatch(securityApi.util.updateQueryData("getRuleCatalog", undefined, (draft) => {
          const rule = draft.rules.find((item) => item.checkId === checkId);
          if (rule) rule.enabled = enabled;
        }));
        try { await queryFulfilled; } catch { patch.undo(); }
      },
    }),
    batchUpdateFrameworkRules: builder.mutation<RuleMutationResult, BatchUpdateFrameworkRulesArgs & { skippedSharedAutomated?: string[] }>({
      queryFn: async ({ checkIds, enabled, frameworkId, action, skippedSharedAutomated }) => {
        persistRuleOverrides(checkIds, enabled);
        return { data: { updatedCheckIds: checkIds, enabled, frameworkId, action, skippedSharedAutomated } };
      },
      async onQueryStarted({ checkIds, enabled }, { dispatch, queryFulfilled }) {
        const patch = dispatch(securityApi.util.updateQueryData("getRuleCatalog", undefined, (draft) => {
          const target = new Set(checkIds);
          for (const rule of draft.rules) if (target.has(rule.checkId)) rule.enabled = enabled;
        }));
        try { await queryFulfilled; } catch { patch.undo(); }
      },
    }),
  }),
});

export const {
  useGetNormalizedDatasetQuery,
  useGetFrameworkSummariesQuery,
  useGetFilteredFindingsQuery,
  useGetAssetDetailQuery,
  useGetRuleCatalogQuery,
  useToggleRuleStatusMutation,
  useBatchUpdateFrameworkRulesMutation,
} = securityApi;
