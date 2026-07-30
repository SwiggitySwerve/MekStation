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

The source match transaction writes `CombatOutcomeFinalized` and an outbox record. The outbox binds source match/branch/event/effective-generation and target campaign identity derived from the authoritative match-to-campaign binding; no client-supplied target scope is trusted. A worker delivers a semantic campaign command under the narrow non-human system-effect principal defined by the privacy/admission wave. Before append, campaign ingestion re-resolves the source binding, verifies target campaign, source generation/lease, and expected target branch/revision, and rejects any scope mismatch. The campaign transaction inserts a unique `(targetCampaignId, effectType, sourceEventId, effectVersion)` inbox receipt and its resulting campaign event batch. Duplicate delivery returns the original receipt.

### D2 — Use causation links, not duplicated events

The campaign receives a distinct `BattleOutcomeReconciled` fact causally linked to the match outcome. Cross-entity history joins source, delivery attempts, target receipt, and target event range. It does not copy the combat event into the campaign stream.

### D3 — Dispatch is outside replay

Projectors never call the worker or external services. Outbox rows use `pending`, `leased`, `admitted`, `delivered`, `superseded`, or `blocked` state and record the source effective generation. Only a committed pending row for the current unfenced generation may acquire a lease. Before target mutation, the worker must atomically promote that lease to durable `admitted` state while the generation is still unfenced; this transition mints the one-effect system principal. Target ingestion accepts only that durable admission token, never a lease token.

Branch activation first installs a source-local fence for the old effective generation. Fence installation and delivery admission serialize in the source store: if admission commits first, the admitted effect must reach its idempotent target receipt and higher-version correction; if the fence commits first, no leased row may become admitted and it expires to `superseded`. While a lease or admitted effect is unresolved, the candidate stays non-effective in `waiting-effects` and the prior branch remains effective. An admitted token is not revoked or expired before its target receipt, avoiding a check-then-commit race across authority stores. If receipt status cannot be verified, activation stays blocked rather than racing the target. Notifications or future external effects use the same admission, receipt, and fence discipline.

### D4 — No workflow engine yet

The current effect is a short database-backed handoff with no long timers. DBOS or Temporal becomes appropriate only if multi-day timers, complex compensations, or external activity orchestration dominate; the domain journal remains authoritative.

## Risks / Trade-offs

- Activation racing a leased old-branch effect is prevented by serializing generation fencing against delivery admission and keeping the old branch effective until any winning admission has a receipt and correction.

- [Poison effect retries forever] → Persist typed failure state, attempt count, next attempt, and an operator-visible blocked condition.
- [Target commit succeeds but acknowledgement is lost] → Source retries; target inbox returns the prior receipt.
- [Cross-stream query leaks private facts] → Apply viewer authorization to each owned event before composing the timeline.
- [Misrouted effect applies to another campaign] → Bind source and target scopes in the outbox and receipt, then re-resolve the authoritative match binding at ingestion.
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
