# Enriched Rule Workspace — Option B extension

## What is included

- `src/types/enrichedRules.ts`: typed benchmark, check, filter, exemption, unified-rule and affected-asset contracts.
- `src/components/rules/EnrichedRuleCatalogTable.tsx`: compact unified table, fuzzy search over enriched metadata and requirement context, severity/service/resource/framework facets, framework coverage badges, row expansion, bulk presets, scope selector, exclusion audit modal and optional projected-impact callback.
- `src/components/rules/ActionableRemediationDrawer.tsx`: investigation drawer with risk context, framework rationale/impact, Console/CLI/Audit runbook modes, copy/export actions, affected assets and footer actions.
- `scripts/build_enriched_rule_catalog.py`: deterministic catalog builder for the four enriched benchmark files.
- `public/mock/enriched-rule-catalog.json`: generated catalog containing 119 unique check IDs and 286 requirement-to-check mappings. Finding/asset counts remain zero until joined to scan data.
- `source-data/enriched/`: copies of the four user-supplied enriched benchmark definitions.

## Integrating into the existing Option B route

The current `RuleManagement` is still the legacy entry point. Replace it only after the backend adapters below are implemented; these new components are deliberately prop-driven so they can be wired to secured RTK Query endpoints without coupling UI state to mock data.

1. Fetch `/mock/enriched-rule-catalog.json` with an RTK Query query (production: replace with an authenticated API route).
2. Join check IDs to current findings using canonical `check_id` / finding `checkId`; derive unique affected asset IDs from the resulting finding set. Never estimate findings from benchmark mapping counts.
3. Convert each unique check to `UnifiedRule`. Preserve every framework requirement mapping in `frameworkCoverage`; do not collapse multiple requirements inside one framework.
4. Wire `onToggleRule` to the rule-state mutation. For `scope === 'all-linked-frameworks'`, update the canonical check state once; framework-scoped policy needs backend support for mapping-level state. A single global boolean cannot faithfully represent framework-specific state.
5. Wire `onExcludeRule` to a persisted exemption endpoint that stores reason, justification, expiry, actor, tenant/account scope, and audit timestamp. Do not treat local component state as an audit trail.
6. Wire drawer actions to false-positive workflow, verification/re-scan queue and asset query endpoints. Those operations are callbacks because this demo does not claim to execute live AWS changes.

## RTK Query contract recommendation

```ts
getEnrichedRuleCatalog: builder.query<EnrichedRuleCatalogResponse, void>({
  query: () => '/api/security/rules/enriched',
  providesTags: ['RuleCatalog'],
}),
createRuleExemption: builder.mutation<RuleExemption, RuleExemptionPayload>({
  query: body => ({ url: '/api/security/rule-exemptions', method: 'POST', body }),
  invalidatesTags: ['RuleCatalog'],
}),
triggerRuleRecheck: builder.mutation<{ jobId: string }, { checkId: string }>({
  query: body => ({ url: '/api/security/rechecks', method: 'POST', body }),
}),
```

Use tenant/account authorization and server-side validation. Expired exemptions should automatically return to active policy, and all exemption changes should be immutable audit events.

## Impact simulator safety

The component accepts `estimatedScoreImpact(rule, nextEnabledState)`. Only show a numeric projection when the backend supplies a defensible calculation based on the latest assessment denominator, severity/finding set and exemption semantics. A rule toggle changes future scan scope; it must not rewrite historical compliance results. Without current finding and score inputs, the component shows `Impact n/a` rather than fabricating a percentage.

## Design and interaction notes

- Compact table with expandable context, fixed header and bounded-height scrolling preserves Option B's low-scroll layout.
- Tailwind classes use light/dark variants and neutral surface tokens; severity colors are semantic, not decorative.
- Keyboard-operable native controls, accessible labels, dialog roles and Escape handling are included.
- Search is deterministic fuzzy token matching without an additional dependency. For very large catalogs, replace with a pre-indexed search worker or backend query and add row virtualization (e.g. TanStack Virtual) while preserving the same row contract.
- CLI commands are extracted from benchmark text and must be reviewed before execution. Export is a shell-script wrapper, not an assertion that the commands are complete or safe for every account.
