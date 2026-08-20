## Why

Campaign co-op can register a revision-bound snapshot, but participation must not trust a browser-authored player, role, match, or force. CAMP-01C closes the server admission seam before any choice enters the authoritative campaign session.

## What Changes

- Derive player, role, campaign, match, and revision from the verified connection and CAMP-01B registry snapshot.
- Accept only one player-scoped `{ missionId, forceId, choice }` participation payload and validate it against current authority.
- Treat an identical retry as idempotent, while rejecting conflicting repeats, full-force, forged-identity, foreign-force, stale-revision, and malformed choices before mutation or launch.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `multiplayer-sync`: Authorize campaign co-op participation from server-owned identity and the revision-bound force projection.

## Non-goals

- Changing snapshot construction, guest hydration, combat adaptation, or mission launch.
- Accepting client-authored player, role, campaign, match, revision, or full-force state.

## Impact

- Affected contracts: multiplayer protocol, connection binding, co-op runtime session, and participation receipts.
- Delivery remains one later product PR capped at 12 files and 450 changed lines; this specification PR changes no runtime behavior.
