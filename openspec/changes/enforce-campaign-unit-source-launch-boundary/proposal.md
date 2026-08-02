## Why

Campaign co-op participation must not turn a persisted custom source reference into a combat unit. CAMP-01D makes the canonical-only launch boundary explicit after participation is authorized.

## What Changes

- Require an authoritative, revision-bound canonical catalog snapshot before launch.
- Reuse one source/reference guard in fast-forward, dashboard readiness, and co-op launch.
- Preserve custom rows as visible blocked entries while rejecting them before encounter lookup, reuse, creation, session launch, or mutation.
- Keep canonical mixed-roster selection launchable when every selected reference resolves exactly.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mission-contracts`: Enforce source identity and canonical catalog authority at every campaign launch boundary.

## Non-goals

- Adapting custom units for combat, changing canonical catalogs, or changing participation authorization.

## Impact

- Affected contracts: fast-forward, campaign dashboard readiness, co-op launch, and canonical encounter admission.
- Delivery remains one later product PR capped at 12 files and 450 changed lines; this specification PR changes no runtime behavior.
