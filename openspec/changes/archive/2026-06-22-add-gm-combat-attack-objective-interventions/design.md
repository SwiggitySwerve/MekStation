## Context

The combat-domain GM intervention implementer currently previews and applies corrections for reposition/facing, damage/critical state, heat/ammo, turn order, and lifecycle state. Wave 5 needs the same ledger-backed flow for attack-resolution corrections and scenario objective state so a GM can fix common tactical adjudication problems without resetting the encounter.

Existing anchors:
- `IGmCombatInterventionState` already extends derived `IGameState` and keeps `gmInterventionEvents` for replayable projected effects.
- Attack declarations/resolutions are represented by event payload shapes such as `IAttackResolvedPayload`.
- Scenario objectives live on `IGameState.objectives` as `Record<HexKey, IObjectiveMarker>`.
- Player redaction already flows through `buildGmInterventionRedactionEnvelope` and `projectInterventionRecordForPlayer`.

## Goals / Non-Goals

**Goals:**
- Add typed GM combat corrections for attack-resolution and objective-state outcomes.
- Preview the full before/after state references before approval.
- Apply approved corrections through projected effects that can be replayed from intervention records.
- Keep player-visible output limited to the approved net effect.

**Non-Goals:**
- Rewrite historical attack or objective events.
- Re-run combat dice, hit-location, damage, or objective-control engines.
- Add UI workflows or forms for authoring these commands.
- Model every possible future scenario scoring system; use flexible marker patches for the current objective marker model.

## Decisions

### Decision: Store attack corrections as GM override state

Attack-resolution corrections will create an `attackResolutionCorrections` map on `IGmCombatInterventionState`, keyed by a GM-provided `attackId`. Each entry records the corrected attacker, target, weapon, roll, to-hit number, hit/miss, location, damage, and related event references.

Rationale: Existing attack results are event-sourced, but this slice must not rewrite historical logs. A typed override map gives UI/replay consumers a clear source for "GM-corrected attack result" while preserving the original event stream for audit.

Alternative rejected: mutate `turnEvents` or append synthetic `AttackResolved` events. That would blur GM adjudication with engine-produced events and risks replay disagreement.

### Decision: Patch objective markers directly by objective id or hex key

Objective corrections will patch `state.objectives` by locating an existing marker by `objectiveId` or `hexKey`, or by adding a full replacement marker when the encounter loaded a missing/corrupt marker.

Rationale: Current objective state is a map of markers keyed by hex. A patch-oriented correction lets the GM fix control side, hold progress, hold requirement, or marker placement while preserving the current objective model.

Alternative rejected: create a separate objective-correction ledger domain now. Combat-first interventions need to be usable inside the tactical encounter and should share the combat projection/replay path until campaign/base objectives require their own domain.

### Decision: Keep public summaries explicit

The implementer will keep using the existing redaction envelope. The public effect exposes family, summary, changed state refs, and optional visibility, while GM-private reason/default outcome/hidden notes remain private.

Rationale: This matches wave 4 ledger behavior and the player log requirement.

## Risks / Trade-offs

- Attack override state must be consumed by future UI surfaces to visually replace original results -> Mitigation: expose changed refs and replayable projected effects now, then wire UI readers in a later UI-focused wave.
- Objective patches can represent impossible states if a GM enters conflicting values -> Mitigation: validate existence/addition rules and keep every correction traceable as GM-authored.
- The correction families are intentionally tactical and not campaign-economic -> Mitigation: keep these in `gm-combat-interventions` and leave post-combat/economy/time cascades for later waves.

## Migration Plan

- Add the new correction types and projected effect variants.
- Extend preview validation and projection reducers.
- Add focused tests for preview/apply/replay/redaction.
- Archive the OpenSpec delta after validation and PR merge.

## Open Questions

- None for this slice.
