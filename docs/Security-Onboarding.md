# Security & Onboarding Workflows

## Included workflows

- **Product tour:** `src/components/onboarding/OnboardingTour.tsx` presents four steps for navigation, filters, framework mappings, and the remediation runbook. A topbar trigger can reopen the tour; “Don't show again” uses a versioned browser-local preference.
- **Connect account:** `src/components/onboarding/CloudAccountConnectionModal.tsx` collects AWS single-/multi-account scope, selected Regions and framework baselines, and offers CloudFormation-console launch and a copyable Terraform role example.
- **Data mode:** `src/components/security/DemoLiveModeSwitcher.tsx` switches a persistent interface indicator between Interactive Demo Mode and a labelled live account. A real connector is not implemented by the mode switch.
- **RBAC display:** `src/context/useSecurityContext.tsx` exposes `UserRole`, role capability booleans, and audited demo actions. Auditor is read-only, SecurityEngineer may triage and request exclusions, and Admin can manage definitions and approve a request from a different demo role.
- **Exclusions:** `src/components/security/RuleExclusionModal.tsx` requires a reason, change ticket, future expiry, justification, and typed `EXCLUDE` for Critical checks. SecurityEngineer requests remain pending; a different Admin can approve or reject them in the Activity Log drawer. The demo applies an approved request to check and framework-rule state.
- **Audit drawer:** `src/components/security/ActivityLogDrawer.tsx` lists the local event journal and pending approvals. Events are persisted in browser local storage for the demo only.
- **Finding triage:** Investigation and findings views record a local mute or verification note for SecurityEngineer/Admin. This is not a real scan, remediation action, or change to source PASS/FAIL/MANUAL data.
- **Security & Governance Studio:** see `docs/Security-Governance-Studio.md` for the authentication policy builder, 22-capability role matrix, session/network fence, API key manager, and dual-custody approval policy.

## Production requirements / explicit boundaries

The delivered role selector is a demo control, not identity management. **Never use client-side RBAC as authorization.** In production derive the user, tenant, role, and capabilities from authenticated server-side identity and validate every mutation at the API layer.

1. **Maker-checker:** persist exclusion requests in an API, enforce separation of duties and approvals transactionally on the server, and record immutable audit events. Client local storage is only the demo cache.
2. **Expiry:** the API must enforce expiration (including automatically restoring evaluation where appropriate), not just store the date in the modal. Expiry policy, alerting, and rollback behavior require product/security approval.
3. **AWS connection:** the modal records a request locally. The CloudFormation button is only an entry point into the AWS console until a reviewed, versioned stack template and tenant-specific role trust parameters are supplied. Never launch an unreviewed template. For Terraform, provision the trusted SecGenie AWS account and a unique external ID from a secure backend; do not ship production trust IDs or external IDs in the front end. Verify the least-privilege policy, external ID, CloudTrail audit, and account ownership before live scans.
4. **Live mode:** the switch changes a label/preference only. A production connection should be shown as Live only after server-side verification of connection status and successful credentials validation.
5. **Remediation:** local “mute” and “verify” actions only update demo state. Actual AWS changes or scans require authenticated backend workflows, explicit operator authorization, execution logs, and post-action verification.
6. **Audit data:** the demo keeps a bounded local event list for convenience. Production audit records need server-side durability, tamper resistance, retention policy, tenant scoping, and appropriate export/access controls.

## Run and validate

```powershell
npm install
npm run validate:data
npm run validate:rules
npm run validate:checks-catalogue
npm run build
```

A successful type-check and Vite build must be confirmed after dependencies are installed in the target environment.
