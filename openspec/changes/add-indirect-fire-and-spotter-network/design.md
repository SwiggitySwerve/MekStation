# Design: Add Indirect Fire and Spotter Network

## Reference Material

- MegaMek `ComputeToHit.java:340-440` — canonical spotter election + indirect-mode flag detection
- MegaMek `ComputeAttackerToHitMods.java:172-177` — +1 spotter-fire penalty (added to the spotter's OWN attacks)
- MegaMek `ArtilleryWeaponIndirectFireHandler.java` — artillery (OUT of scope this change; informs Arrow IV follow-up)
- MegaMek `OptionsConstants.java:209` + `PilotOptions.java:98` — `MISC_FORWARD_OBSERVER` ability
- MegaMek `LRMHandler.java` — generic LRM resolution; no indirect-specific branching, lives in the to-hit calculator
- Local helper `src/utils/gameplay/indirectFire.ts` (374 LOC) — orphan today, becomes the engine-helper layer

## Architecture Decisions

### Decision A: Resolver invokes the helper, not the to-hit calculator

**Choice**: `InteractiveSession.computeIndirectFireContext` is the **only** caller of the existing `evaluateIndirectFire` helper. The to-hit calculator (`toHit/calculate.ts`) consumes the resolution result as plain data.

**Rationale**: keeps the helper pure (no dependency on engine types) and keeps the to-hit calculator pure (no dependency on the spotter election algorithm). The engine layer owns the "what is the world today" question; the helper answers "given this world snapshot, is this attack permitted and what's the penalty?"; the to-hit calculator answers "add this penalty to the to-hit number". Three layers, three responsibilities.

**Alternatives considered**:
- *Inline the helper into the to-hit calculator*: rejected — the to-hit calculator already has 14 modifier sources; folding spotter election inside it makes the calculator a god-function.
- *Have the helper read `gameState` directly*: rejected — couples the helper to the engine type tree, breaks the existing 594 LOC of unit tests that pass in synthetic `ISpotterCandidate[]`.

### Decision B: Spotter election is deterministic

**Choice**: `(lowest movement penalty → closest to target → lowest entityId)` tiebreak. Same shape as MegaMek's `findSpotter` but explicitly enumerated in the spec so a test can lock the order.

**Rationale**: replays must be deterministic (project memory: `project_replay_viewer_bundle`, `project_replay_library`). If two equally-eligible spotters could be elected and the choice were non-deterministic, two replays of the same JSONL event log could diverge on which spotter was "selected" (cosmetic event field) even though hit/miss outcomes match.

**Alternatives considered**:
- *Pick whichever spotter the player explicitly designates via UI*: rejected for v1 — that's a player-affordance feature, lives in a separate "indirect-fire-UI" follow-up change. Deterministic auto-pick is the engine baseline.
- *Random tiebreak*: rejected — non-deterministic by design.

### Decision C: Liveness check at resolution, not at to-hit

**Choice**: spotter election happens at to-hit. Spotter destruction during the same attack window (e.g., the spotter is killed by a higher-initiative attack between the to-hit roll and damage resolution) invalidates the indirect attack — auto-miss, ammo and heat still consumed, typed event `IndirectFireSpotterLost`.

**Rationale**: matches MegaMek behavior (the `Compute.findSpotter` call runs again at resolution time and bails). Auto-miss-with-cost is intuitive — the missiles fly into the sky with no terminal guidance.

**Alternatives considered**:
- *Re-elect a new spotter on the fly*: rejected — too generous to LRM boats; lets them benefit from cheap-tactic "fire-then-have-spotter-die-but-still-hit" cheese.
- *Auto-hit without spotter penalty*: rejected — nonsensical; the missiles need terminal guidance.

### Decision D: FORWARD_OBSERVER cancels the spotter-walked penalty only

**Choice**: the FO SPA removes the +1 spotter-walked penalty when the spotter walked, but the +1 base indirect-fire penalty still applies.

**Rationale**: matches MegaMek `GUNNERY_OBLIQUE_ATTACKER` and `MISC_FORWARD_OBSERVER` semantics — the SPA represents training to keep one eye on the target while moving, not magic terminal guidance.

**Alternatives considered**:
- *FO cancels both penalties*: rejected — too strong; would make FO mandatory on every LRM boat's spotter.
- *FO is a tag bonus (cancels minimum range)*: rejected — that's a separate SPA in MegaMek (`GUNNERY_OBLIQUE_ATTACKER` gives +1 base when LOS is clear; out of scope here).

### Decision E: NARC / iNarc enable indirect without LOS spotter

**Choice**: a target marked with friendly NARC or iNarc may be attacked indirectly even when no friendly unit has LOS. The "basis" field on the spotter-selected event records `'narc'` or `'inarc'` instead of `'los'`.

**Rationale**: matches MegaMek exactly (`ComputeToHit.java:374-378`). The NARC beacon serves as the terminal-guidance signal; the LRMs home on the beacon.

**Alternatives considered**:
- *Require both NARC and LOS spotter*: rejected — defeats the point of NARC tactical doctrine.
- *Apply additional penalty for NARC-only indirect*: rejected — MegaMek doesn't apply one; introducing one creates a parity gap.

### Decision F: Weapon `mode` field on combat state, not on construction

**Choice**: `weapon.mode: 'Direct' | 'Indirect'` is a **runtime combat state** field per weapon mount, not a construction-time field. Defaults to `'Direct'`; the player toggles per turn before declaring attacks.

**Rationale**: matches MegaMek where weapon modes are runtime (`weapon.curMode()`). Toggling is reversible turn-to-turn. Persisting in construction state would lock the player into a single mode for a chassis variant.

**Alternatives considered**:
- *Auto-detect mode from LOS*: rejected — players sometimes have LOS but prefer indirect (e.g., to avoid intervening woods penalty); the player's tactical choice has to be explicit.

## Data Flow

```
Player declares LRM attack against hex H from attacker A
              ↓
InteractiveSession.computeIndirectFireContext(A.id, weapon.id, H)
  ├─ A has LOS to H?  → return { isIndirect: false, permitted: true }
  ├─ Weapon mode === 'Indirect'?  → continue
  ├─ Weapon family is indirect-eligible (LRM/MML-LRM/Mortar/NLRM)?
  │     → no: return { permitted: false, reason: 'Weapon does not support indirect fire' }
  ├─ NARC/iNarc on target?
  │     → yes: spotter = target itself, basis = 'narc'
  ├─ Else: enumerate friendly units with LOS to H
  │     → none: return { permitted: false, reason: 'No valid spotter' }
  │     → ≥1: pick by (lowest move-penalty → closest → lowest id)
  ├─ Semi-guided LRM ammo + active TAG on target this turn?
  │     → yes: basis = 'semi-guided-tag'
  └─ FO SPA on spotter pilot?  → cancel spotter-walked +1
                ↓
Compute toHitPenalty: +1 (base) + (+1 if spotter walked and !FO)
                ↓
Emit IndirectFireSpotterSelected (or NarcOverride / ForwardObserver event)
                ↓
toHit/calculate.ts adds penalty to running to-hit number
                ↓
Resolver rolls hit/miss
                ↓
Before damage application: re-validate spotter is alive
  ├─ Dead: emit IndirectFireSpotterLost, force auto-miss (skip damage), still consume ammo + heat
  └─ Alive: continue normal damage application
```

## File Changes (Apply estimate — informational; not part of this change)

- New: none (no new source files needed at engine layer; the helper module already exists)
- Modified:
  - `src/engine/InteractiveSession.ts` — add `computeIndirectFireContext`
  - `src/utils/gameplay/toHit/calculate.ts` — accept + apply `IIndirectFireResolution`
  - `src/lib/combat/combatResolution.ts` — emit 4 new event variants, liveness re-check
  - `src/types/gameplay/CombatInterfaces.ts` — `IIndirectFireResolution`, event variants, `weapon.mode`
  - `src/lib/spa/catalog/gunnerySPAs.ts` — register `FORWARD_OBSERVER`
- Deleted: none

## Risks

- **R1 (medium)**: the existing 594 LOC of `indirectFire.test.ts` tests the helper in isolation; the Apply wave must add resolver-level scenario tests (LRM boat + spotter + dead spotter + FO + NARC) to validate the integration. Test count estimate ~30-50 new tests is realistic.
- **R2 (low)**: weapon `mode` toggle requires UI work. The mode toggle is in scope for this spec; the UI Storybook stories are an Apply-wave deliverable.
- **R3 (low)**: deterministic spotter election may surprise players used to MegaMek's hidden random tiebreaks. Mitigation: surface the spotter ID in the attack-resolution tooltip so players see who was elected and why.
