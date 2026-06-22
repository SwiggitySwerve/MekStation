## Context

`InterventionLedger` already provides domain registration, GM cascade preview, approved intervention append, replay application, and public/private projections for GM intervention records. The missing core is a shared action ledger stream that can preserve normal player actions beside GM-specific corrections without teaching every domain reducer about GM metadata.

Later waves need one stable view of "what happened" across normal combat actions, GM overrides, economy reversals, and time cascades. That view must be append-only, causality-aware, and safe to project to players.

## Goals / Non-Goals

**Goals:**

- Provide a generic `ActionLedger` for normal, GM intervention, and system records.
- Keep normal action records and GM-specific intervention records in one ordered append-only stream.
- Allow GM cascade approval to append a generic action ledger record after the domain intervention record is accepted.
- Provide player and GM projections with private GM metadata redacted from player output.
- Keep the action ledger independent from domain state reducers so it can be adopted incrementally.

**Non-Goals:**

- Replacing combat/session event streams or campaign event stores.
- Implementing post-combat, economy, repair, salvage, or time-cascade domain mutation.
- Adding persistence or a UI timeline in this slice.

## Decisions

### Decision: Add a Generic Action Ledger Beside InterventionLedger

`InterventionLedger` remains the domain-specific GM intervention engine. A new `ActionLedger` stores reviewable action records for normal actions and GM intervention actions. This avoids forcing normal player actions to carry GM-only preview/apply methods.

Alternative considered: Rename and broaden `InterventionLedger`. Rejected because existing domain implementers and tests already use it specifically for GM interventions; widening it would blur responsibilities and increase migration risk.

### Decision: GM Approval Appends to Action Ledger Only After Domain Approval

`approveGmCascadePreview` accepts an optional action ledger. It appends to that ledger only after the preview is ready, an intervention record is appended, and domain application succeeds.

Alternative considered: Append a pending action record during preview. Rejected because the player-visible history would then need cancellation/retraction semantics before any domain effect exists.

### Decision: Player Projection Is Public-Effect Only

Normal actions project their public summary and changed state. GM intervention records project only their public net effect. GM projections include private metadata, default outcome, hidden notes, and manual takeover notes when present.

Alternative considered: Use one projection with caller-side filtering. Rejected because redaction must be a central contract, not a UI convention.

## Risks / Trade-offs

- [Risk] A second ledger-like surface may look redundant next to event stores. → Mitigation: keep this as a small projection/review ledger, not a domain event reducer.
- [Risk] Later persistence needs may require schema changes. → Mitigation: keep record fields serializable and explicitly versionless for now.
- [Risk] Appending to the action ledger after intervention append but before state application could expose failed effects. → Mitigation: append only after `ledger.apply` returns `applied`.

## Migration Plan

1. Add action ledger types and implementation.
2. Wire optional action ledger append into GM cascade approval.
3. Prove normal action and GM action ordering/redaction in focused tests.
4. Leave existing callers unchanged until later waves pass an action ledger.

Rollback is deleting the optional action-ledger integration and the new standalone ledger files; existing intervention behavior remains intact.

## Open Questions

- Which persistent store should own the action ledger once campaign/session persistence is wired?
- Should later UI timelines merge this action ledger with existing game event visibility streams or read from the action ledger directly?
