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

The source match transaction writes `CombatOutcomeFinalized` and an outbox record. The outbox binds source match/branch/event/effective-generation, a canonical semantic-command digest, and target campaign plus binding revision derived from the authoritative match-to-campaign binding; no client-supplied target scope is trusted. A worker delivers that semantic campaign command under the narrow non-human system-effect principal defined by the privacy/admission wave, which also binds the digest. Before append, campaign ingestion re-resolves the source binding, verifies target campaign, source generation/admission, binding revision, and digest, and rejects any mismatch.

The campaign receipt identity is `(targetCampaignId, effectType, sourceStreamId, sourceBranchId, sourceEventId, effectVersion)`. After admission, binding, identity, and digest verification, ingestion looks up that receipt before enforcing the current target-head precondition so a lost acknowledgement remains retryable after unrelated target progress. A matching receipt returns unchanged. Reusing the identity with a different semantic-command digest is a typed integrity conflict, never a duplicate success. For a new identity, the campaign transaction inserts the inbox receipt and resulting campaign event batch together using the normal expected-head compare-and-append.

`EffectCommandCanonicalizer` v1 is a shared source/target routine. It applies RFC 8785 JSON canonicalization to UTF-8 bytes containing `canonicalizerVersion`, effect type/version, source stream/ID/branch/event/effective-generation, target campaign and binding revision, command schema version, and the complete server-derived semantic command. It preserves command array order, performs no Unicode normalization, rejects non-finite or unsupported values, and encodes SHA-256 as lowercase hexadecimal. The version is persisted in the outbox, admission, and receipt; later canonicalizer versions never reinterpret prior receipts. Its digest is server-internal integrity metadata and is not serialized into viewer timelines or exports.

### D2 — Use causation links, not duplicated events

The campaign receives a distinct `BattleOutcomeReconciled` fact causally linked to the match outcome. Cross-entity history joins source, delivery attempts, target receipt, and target event range. It does not copy the combat event into the campaign stream.

### D3 — Dispatch is outside replay

Projectors never call the worker or external services. Outbox rows use `pending`, `leased`, `admitted`, `delivered`, `superseded`, or `blocked` state and record the source effective generation. Only a committed pending row for the current unfenced generation may acquire a lease. Before target mutation, the worker must atomically promote that lease to durable `admitted` state while the generation is still unfenced; this transition mints the one-effect system principal. Target ingestion accepts only that durable admission token, never a lease token.

The storage contract exposes a source-generation fence for the later branch/correction wave. Fence installation and delivery admission serialize in the source store: once a generation is fenced, it can issue no new lease or admission, while an admission committed first remains durable until its idempotent target receipt is known. This wave owns that generic admission invariant and linear effect delivery; it does not own branch activation, candidate-branch lifecycle, or higher-version correction behavior. Notifications or future external effects use the same admission and receipt discipline.

### D4 — No workflow engine yet

The current effect is a short database-backed handoff with no long timers. DBOS or Temporal becomes appropriate only if multi-day timers, complex compensations, or external activity orchestration dominate; the domain journal remains authoritative.

## Risks / Trade-offs

- [Poison effect retries forever] → Persist typed failure state, attempt count, next attempt, and an operator-visible blocked condition.
- [Target commit succeeds but acknowledgement is lost] → Source retries; target inbox returns the prior receipt.
- [Worker changes effect content under a stable identity] → Bind a canonical semantic-command digest through outbox, admission, and receipt; reject any collision.
- [Source and target canonicalize differently] → Use one versioned routine and fixed cross-adapter byte/digest fixtures.
- [Stale source generation attempts delivery] → Check the unfenced generation during lease-to-admission; the later branch/correction wave owns fence invocation and activation policy.
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
