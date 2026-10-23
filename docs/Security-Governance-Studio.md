# Security & Governance Studio

The Security Settings view is accessible from **Configurations → Security Settings** in the sidebar. It contains five compact sub-views:

1. Authentication & Access — password hygiene and MFA policy builder.
2. Roles & Permissions — 22-capability role matrix with create/delete for custom roles.
3. Network & Sessions — idle timeout, concurrent-session controls, and IPv4/CIDR allowlist.
4. API Credentials — scoped API key inventory, generation, one-time secret reveal, rotation, and revocation.
5. Approval Rules — dual-admin / peer-review / ticket requirements and a pending approval count sourced from the demo exclusion queue.

## State and persistence

`useSecurityGovernance` persists configurable settings to `localStorage` under `secgenie.security-governance.studio.v1`. API key metadata (prefix, scope, role, creation and expiry dates) is saved, but the raw generated secret is never written to storage and is only held temporarily in the API key component until the banner is dismissed or the page is refreshed.

## Theme and density

All components use the existing light enterprise palette: white cards, slate-50 secondary surfaces, slate-200 dividers, slate-900 heading text, and compact `text-xs` / `text-[11px]` control labels.

## Production requirements

This is an interactive in-browser demo implementation, not an enforcement boundary. Before production use:

- Enforce access policy and effective RBAC permissions on the backend; never trust the demo role selector or the UI's disabled state.
- Store password/MFA policy in the identity provider / authentication service and apply changes server-side.
- Apply IP allowlists at a trusted gateway or service edge with break-glass recovery protections.
- Generate API keys in a credential service, store only server-side hashes, apply scopes and expiry at authorization time, and revoke keys at the service boundary.
- Persist all governance and approval changes in an authenticated immutable audit stream. Require a second, independently authenticated administrator for dual-custody controls.
- The current IP and session controls are local simulation; they do not alter browser sessions or network reachability.
