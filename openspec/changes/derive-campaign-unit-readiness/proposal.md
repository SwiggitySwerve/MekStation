## Why

Campaign launch and unit badges trust a roster readiness cache that repairs do
not refresh. A repaired unit can remain damaged or blocked, and co-op launch
checks differ from single-player checks.

## What Changes

- Consolidate per-unit readiness in a pure selector, then derive condition from
  current campaign facts, with conservative reconciliation of old saves.
- Reuse the repair-ticket lifecycle and pilot deployability owners.
- Read journal authority through the existing per-campaign authority resolver;
  expose optional read-only authority data on the launch-head response.
- Use the same selector for campaign UI, materialization, owned forces,
  fast-forward admission, and server co-op admission.
- Preserve persisted schemas and combat event payloads.

## Capabilities

### New Capabilities

- `campaign-unit-readiness`: derived condition, deployment reasons, authority
  precedence, and compatibility behavior.

### Modified Capabilities

- None. The new capability composes the existing combat-state, repair,
  personnel, and journal-authority contracts.

## Impact

Campaign readiness and launch adapters only. Standalone force setup and combat
execution stay under their existing contracts. No construction, BV, data,
refit lifecycle, or campaign bay action changes. One draft PR, with a
behavior-preserving consolidation commit before the behavior commit.
