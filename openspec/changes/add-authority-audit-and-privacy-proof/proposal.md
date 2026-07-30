## Why

A durable journal increases the blast radius of an admission or projection mistake. Existing sockets can attach before active membership is resolved, raw history APIs have no viewer context, and the first event-history wave set did not independently preserve rejected-action provenance or raw-to-rendered privacy proof. Those controls must exist before combat or campaign journal authority can cut over.

## What Changes

- Require durable active-membership resolution before human socket, replay, history, command, or publication surfaces, while giving internal effect ingestion a separate one-effect system principal.
- Derive actor, authority, campaign, match, role, and owned scope on the server; client role and authority fields remain untrusted command input.
- Keep raw journal reads server-internal and expose history only through authorization plus pre-serialization viewer projection.
- Record accepted, rejected, vetoed, timed-out, and published action lifecycle provenance without turning rejections into gameplay events.
- Store GM-private audit detail separately from player-safe authority facts with independent authorization, retention, erasure/redaction, and export policy.
- Prove equivalent privacy across projection objects, live/replay/recovery frames, snapshots, timeline/export, browser state, and rendered DOM.

## Non-goals

- Replacing authentication, membership, fog, or viewer-projector implementations wholesale.
- Hashing private payload content into player-visible chains.
- Treating action-audit rows as gameplay authority, replay input, or side-effect triggers.
- Solving organization-wide legal retention policy beyond explicit storage classes and enforceable lifecycle hooks.

## Dependencies

- This change is an implementation slice of `harden-gm-two-player-campaign-sessions` and preserves its `Action Provenance`, `Viewer Projection Occurs Before Serialization`, `GM Drafts Stay in Separate Private Records`, and `Privacy Proof Covers Raw and Rendered Surfaces` requirements.
- It depends on `establish-entity-event-journal-contract` and `add-replay-schema-and-checkpoint-safety`.
- Its membership, projection, and private-audit gates MUST merge before `adopt-combat-event-journal-authority` or `adopt-campaign-event-journal-authority` enables journal authority.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `multiplayer-server`: Require active durable membership and server-derived authority scope before human attachment, replay, command handling, or publication; require a narrow server-minted principal for internal effect ingestion.
- `gm-authority-redaction`: Require pre-serialization viewer projection, gapless viewer delivery identity, separate private-record lifecycle, and cross-surface negative privacy proof.
- `audit-timeline`: Add idempotent lifecycle provenance for accepted, rejected, vetoed, timed-out, and published actions plus audited private-record access.

## Impact

- Multiplayer/campaign admission, membership services, projection boundaries, action-audit/private-audit storage, timeline/export services, and three-context evidence.
- Additive SQLite records and focused authorization, privacy, lifecycle, retention, and browser tests.
- No new runtime dependency.
