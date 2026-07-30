## Context

Combat and campaign are separate authority streams. A terminal match outcome must update campaign state despite retries and process failures, but replay must never repeat the effect. This wave implements the `event-store`, `campaign-combat-loop`, and `audit-timeline` deltas after both streams are journal-backed.

## Goals / Non-Goals

**Goals:**

- At-least-once delivery with exactly-once effect application.
- Durable causal provenance from source fact to target event range.
- Side-effect-free replay.
- Scenario readiness based on the accepted active outcome receipt.

**Non-Goals:**

- Distributed transactions, exactly-once transport, a broker, workflow engine, or branches.

## Decisions

### D1 — Transactional outbox and idempotent inbox

The source match transaction writes `CombatOutcomeFinalized` and an outbox record. A worker delivers a semantic campaign command. The campaign transaction inserts a unique `(effectType, sourceEventId, effectVersion)` inbox receipt and its resulting campaign event batch. Duplicate delivery returns the original receipt.

### D2 — Use causation links, not duplicated events

The campaign receives a distinct `BattleOutcomeReconciled` fact causally linked to the match outcome. Cross-entity history joins source, delivery attempts, target receipt, and target event range. It does not copy the combat event into the campaign stream.

### D3 — Dispatch is outside replay

Projectors never call the worker or external services. Only committed pending outbox rows are dispatchable. Delivery attempts have leases/backoff and terminal operator-visible states; notifications or future external effects also require receipts.

### D4 — No workflow engine yet

The current effect is a short database-backed handoff with no long timers. DBOS or Temporal becomes appropriate only if multi-day timers, complex compensations, or external activity orchestration dominate; the domain journal remains authoritative.

## Risks / Trade-offs

- [Poison effect retries forever] → Persist typed failure state, attempt count, next attempt, and an operator-visible blocked condition.
- [Target commit succeeds but acknowledgement is lost] → Source retries; target inbox returns the prior receipt.
- [Cross-stream query leaks private facts] → Apply viewer authorization to each owned event before composing the timeline.
- [Scenario advances before reconciliation] → Gate on the active versioned receipt and campaign projection digest.

## Migration Plan

1. Add outbox/inbox tables and failure-injection tests.
2. Write the source outbox atomically but keep legacy reconciliation authoritative in shadow mode.
3. Compare legacy and receipt-backed campaign consequence digests.
4. Enable receipt-backed reconciliation for new outcomes.
5. Remove the legacy write path after exact-main restart/retry proof.

Rollback disables new dispatch, preserves pending/processed rows, and uses a compatible worker after repair. It never deletes a source fact or target receipt.

## Open Questions

None for combat-to-campaign delivery; adoption of an orchestration framework requires a separate measured proposal.
