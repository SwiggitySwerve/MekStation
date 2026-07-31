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

```ts
declare const systemEffectPrincipalBrand: unique symbol;

interface ISystemEffectPrincipal {
  readonly kind: "system-effect";
  readonly [systemEffectPrincipalBrand]: true;
  readonly effectId: string;
  readonly effectType: string;
  readonly effectVersion: number;
  readonly sourceStreamType: string;
  readonly sourceStreamId: string;
  readonly sourceBranchId: string;
  readonly sourceEventId: string;
  readonly sourceEffectiveGeneration: number;
  readonly deliveryAdmissionToken: string;
  readonly targetCampaignId: string;
  readonly bindingRevision: number;
  readonly canonicalizerVersion: number;
  readonly commandSchemaVersion: number;
  readonly semanticCommandDigest: string;
}
```

The source match transaction writes `CombatOutcomeFinalized` and an outbox record. The outbox persists a server-derived effect ID/type/version, immutable canonical semantic-command UTF-8 bytes, command-schema and canonicalizer versions, their digest, source match/branch/event/effective-generation, and target campaign plus binding revision derived from the authoritative match-to-campaign binding; no client-supplied effect or target scope is trusted. A worker loads those durable bytes after restart rather than regenerating the command from mutable projections, and delivers them under the narrow non-human system-effect principal defined and minted in this wave, which binds the complete effect identity, both versions, and digest. Before append, campaign ingestion re-resolves the source binding and current active target branch, validates the stored command schema, re-canonicalizes the delivered command, verifies target campaign, source generation/admission, binding revision, versions, bytes, and digest, and rejects any mismatch. The outbox and principal do not accept a caller-selected target branch; the receipt records the server-resolved target branch and resulting event range.

`ISystemEffectPrincipal` is a server-internal nominal capability, not a wire or persistence DTO. Only the lease-to-admitted transition may mint it from the committed admission row. It cannot be constructed from client claims or a lease, converted into an authorized viewer, attached to a socket, used to read/render history or private audit, perform branch operations, or submit another command. Revoking every human membership does not invalidate a previously committed valid admission; any identity, target, generation, token, binding, version, or digest mismatch does.

`(effectType, effectId, effectVersion)` is the stable server-derived domain effect identity; for `CombatOutcomeFinalized`, `effectType` is `combat-outcome`, `effectId` is the authoritative `outcomeId`, and `effectVersion` is the authoritative `outcomeVersion`. The campaign receipt identity is `(targetCampaignId, effectType, effectId, effectVersion)`. After admission, binding, identity, and digest verification, ingestion looks up that receipt before enforcing the current target-head precondition so a lost acknowledgement remains retryable after unrelated target progress. A matching receipt returns unchanged. Reusing the identity with a different source identity, command versions, canonical bytes, or semantic-command digest is a typed integrity conflict, never a duplicate success. For a new identity, the campaign transaction inserts the inbox receipt, server-resolved target branch, and resulting campaign event batch together using the normal expected-head compare-and-append.

`EffectCommandCanonicalizer` v1 is a shared source/target routine. It applies RFC 8785 JSON canonicalization to UTF-8 bytes containing `canonicalizerVersion`, effect ID/type/version, source stream/ID/branch/event/effective-generation, target campaign and binding revision, command schema version, and the complete server-derived semantic command. It preserves command array order, performs no Unicode normalization, rejects non-finite or unsupported values, and encodes SHA-256 as lowercase hexadecimal. The canonical bytes and both versions are persisted with the source outbox; effect ID, both versions, and the digest are bound through admission and target receipt. Later canonicalizer or command-schema versions never reinterpret prior rows. Unsupported stored versions move the effect to typed `blocked` state without target mutation rather than falling back or regenerating content. Command bytes and their digest are server-internal integrity data and are not serialized into viewer timelines or exports.

### D2 — Use causation links, not duplicated events

The campaign receives a distinct `BattleOutcomeReconciled` fact causally linked to the match outcome. Cross-entity history joins source, delivery attempts, target receipt, and target event range. It does not copy the combat event into the campaign stream.

### D3 — Dispatch is outside replay

Projectors never call the worker or external services. Outbox rows use `pending`, `leased`, `admitted`, `delivered`, `superseded`, or `blocked` state and record the source effective generation. Only a committed pending row for the current unfenced generation may acquire a lease. Before target mutation, the worker must atomically promote that lease to durable `admitted` state while the generation is still unfenced; this transition is the only factory for the one-effect system principal. Target ingestion accepts only the capability backed by that durable admission token, never client data or a lease token.

The storage contract exposes a source-generation fence for the later branch/correction wave. Fence installation and delivery admission serialize in the source store: once a generation is fenced, it can issue no new lease or admission, while an admission committed first remains durable until its idempotent target receipt is known. This wave owns that generic admission invariant and linear effect delivery; it does not own branch activation, candidate-branch lifecycle, or higher-version correction behavior. Notifications or future external effects use the same admission and receipt discipline.

### D4 — No workflow engine yet

The current effect is a short database-backed handoff with no long timers. DBOS or Temporal becomes appropriate only if multi-day timers, complex compensations, or external activity orchestration dominate; the domain journal remains authoritative.

## Risks / Trade-offs

- [Poison effect retries forever] → Persist typed failure state, attempt count, next attempt, and an operator-visible blocked condition.
- [Target commit succeeds but acknowledgement is lost] → Source retries; target inbox returns the prior receipt.
- [Worker changes effect content under a stable identity] → Bind a canonical semantic-command digest through outbox, admission, and receipt; reject any collision.
- [Source and target canonicalize differently] → Use one versioned routine and fixed cross-adapter byte/digest fixtures.
- [Restart or upgrade changes a pending command] → Deliver only the immutable outbox bytes under their stored versions; block unsupported versions without target mutation.
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
