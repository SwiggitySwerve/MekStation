## Why

A reloaded P2P guest can recover a stored prefix and append the host's full replay onto it. Twelve held events plus twenty replayed events produce thirty-two entries. `GameCreated` does not reset every derived-state field, and duplicate entries also corrupt timeline and persistence consumers.

## What Changes

- Persist full reconnect baselines and rebuild/adopt the session through the existing divergence recovery path, including matching prefixes.
- Make the gameplay `appendEvent` boundary idempotent for identical event ids and reject conflicting identities or non-monotonic new sequences with named errors.
- Add focused characterization, reconnect, append-boundary and reducer evidence. Preserve committed replay digests and fixtures.

## Impact

- Affected capability: [multiplayer-sync](../../specs/multiplayer-sync/spec.md).
- Affected code: P2P reconnect orchestration and the shared gameplay event mutation boundary.
- No protocol shape change, build, server, browser run, publication or merge. Existing append callers must be audited before acceptance.
