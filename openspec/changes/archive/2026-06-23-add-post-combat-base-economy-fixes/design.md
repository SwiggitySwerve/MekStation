## Context

Wave 4 established an append-only `InterventionLedger`, authority/redaction helpers, and a cascade preview/approval pipeline. Wave 5 registered combat and unit-reload implementers, while `gm-campaign-intervention-boundaries` deliberately kept post-combat, economy, repair, salvage, and time domains deferred.

The campaign economic loop now has durable state roots for the next intervention layer: `ICampaign.finances`, `repairQueue`, `salvageAllocations`, `partsInventory`, `unitCombatStates`, and `unitConfigurations`. Wave 8 should correct those roots through the existing ledger instead of adding a parallel campaign override store.

## Goals / Non-Goals

**Goals:**

- Register campaign intervention implementers for `post-combat`, `economy`, `repair`, and `salvage`.
- Reuse the existing preview-before-approval pipeline, action ledger append, authority guard, and redaction envelope.
- Support targeted corrections for salvage allocation, repair ticket, funds transaction, inventory lot, and base unit state/configuration roots.
- Return `requires-manual-takeover` when a command explicitly declares unresolved cascading conflicts.
- Keep `time` deferred for the later accumulated time-cascade wave.

**Non-Goals:**

- No new economy processor, repair processor, salvage processor, or market behavior.
- No UI implementation beyond exportable service contracts/tests.
- No automatic long-range time cascade resolution.
- No hidden mutation of campaign state outside approved intervention records.

## Decisions

1. **Use one shared campaign implementer factory registered per domain.**
   The supported campaign domains mutate the same `ICampaign` roots and use the same preview/apply/projection behavior. A factory keeps validation and replay consistent while still preserving domain-specific command keys (`post-combat`, `economy`, `repair`, `salvage`). Rejected alternative: four separate implementers, which would duplicate redaction, conflict, and replay code with little domain benefit in this slice.

2. **Persist projected effects in the intervention record.**
   The preview stores a typed `projectedEffects` array in `domainPayload`, and apply replays those effects. This mirrors combat interventions and keeps approval deterministic even if the source command shape evolves. Rejected alternative: re-evaluate the raw command at approval time, which can drift if campaign state changed between preview and approval.

3. **Treat broad or conflicting cascades as manual takeover.**
   Commands can include conflict metadata when the GM or future UI detects that a correction spans ambiguous side effects. The implementer returns a ready preview with conflicts flagged for manual takeover; the cascade pipeline normalizes it to `requires-manual-takeover` and refuses approval. Rejected alternative: allow auto-approval with warnings, which would hide exactly the class of high-risk campaign cascade the user wants surfaced.

4. **Player visibility remains net-effect only.**
   Campaign corrections use `buildGmInterventionRedactionEnvelope`; public projection includes summary, family, changed refs, and optional visible player IDs. Private metadata retains the GM reason, default outcome, hidden notes, and manual takeover notes. Rejected alternative: put all context in event payloads, which would leak hidden GM rationale into player-facing logs.

## Risks / Trade-offs

- **Risk: Patch-based roots can accept an invalid domain object.** -> Mitigation: validate identity fields for targeted roots and keep tests focused on known `ICampaign` shapes. Rich domain validation remains owned by the existing processors/UI.
- **Risk: Manual takeover command support could become a bypass.** -> Mitigation: manual takeover previews are not approvable through `approveGmCascadePreview`; tests lock that blocked behavior.
- **Risk: Existing deferred-boundary tests become misleading.** -> Mitigation: update them to assert only `time` remains deferred and campaign domains no longer defer when registered.
- **Risk: No UI yet means discoverability is service-level only.** -> Mitigation: expose the implementer and projection helpers through the intervention barrel so future UI can consume the same tested API.
