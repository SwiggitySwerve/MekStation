## Why

Some committed facts must cause work in another authoritative stream, especially a terminal combat outcome updating its campaign. Replaying or retrying those transitions must not duplicate salvage, damage, finances, notifications, or other side effects.

## What Changes

- Add a durable outbox row in the source-stream transaction and an idempotent inbox receipt in the target-stream transaction, bound by one versioned canonical semantic-command digest.
- Link source fact, effect delivery, target command, and target event range through correlation and causation identities.
- Require replay and projection paths to remain side-effect free.
- Add an authorized cross-entity timeline that joins linked events without duplicating their authoritative records.
- Make scenario progression wait for the active combat-outcome receipt and resulting campaign projection.

## Non-goals

- Distributed two-phase commit across match and campaign streams.
- Exactly-once network transport; delivery may retry while effects apply once.
- Kafka, Redpanda, Temporal, DBOS, or a separate broker/service.
- Branching or post-receipt rewind in this wave.

## Dependencies

- This change is the cross-stream-effect implementation slice of `harden-gm-two-player-campaign-sessions`.
- It depends on journal-backed combat and campaign authority plus the membership/projection/private-audit gates.
- It MUST merge before `add-authoritative-history-branches`; before archive/sync, overlapping umbrella deltas SHALL be reconciled through the program wave map.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `event-store`: Add durable outbox/inbox records and causal cross-stream query semantics.
- `campaign-combat-loop`: Require terminal combat outcome delivery and campaign application through versioned idempotent receipts.
- `audit-timeline`: Trace a source event through effect delivery, target receipt, and resulting target event range without duplicating authority.

## Impact

- Combat terminal commit, campaign outcome reconciliation, outbox worker, receipt tables, scenario readiness, and audit projections.
- Failure-injection tests for crash-before-send, crash-after-send, duplicate delivery, restart, and replay.
- No new runtime dependency; promote to a workflow engine only if durable timers and external orchestration become a measured requirement.
