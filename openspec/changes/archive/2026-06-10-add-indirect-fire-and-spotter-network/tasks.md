# Tasks: Add Indirect Fire and Spotter Network

## 1. Engine integration contract (indirect-fire-system delta)

- [x] 1.1 Add `IIndirectFireResolution` type to `src/types/gameplay/CombatInterfaces.ts`
- [x] 1.2 Implement `InteractiveSession.computeIndirectFireContext(...)` via thin `InteractiveSession.indirectFire.ts` collaborator that calls the existing `resolveIndirectFire` helper
- [x] 1.3 Jest tests cover unknown-attacker / non-indirect-weapon / LOS-direct-pass-through / no-LOS-no-spotter / no-LOS-with-spotter / spotter-walked / destroyed-candidates-skipped

## 2. Forward Observer SPA

- [x] 2.1 Register `FORWARD_OBSERVER` SPA in the SPA catalog
  > Implemented as MegaMek `MISC_FORWARD_OBSERVER` in `src/lib/spa/catalog/miscAndInfantrySPAs.ts`; `gunnerySPAs.ts` documents why the id remains in the misc category.
- [x] 2.2 Wire `IIndirectFireResolution` to consult represented pilot SPAs; cancel +1 spotter-walked when true
  > Implemented through session-state `pilotSpas`, helper/projection metadata, and commit-time `IndirectFireForwardObserver` event emission.
- [x] 2.3 Add unit/integration tests: FO SPA + walking spotter -> toHitPenalty === 1 (not 2)
  > Covered by helper, collaborator, commit dispatch, and map tooltip/data-attribute tests.

## 3. NARC / iNarc spotter override

- [x] 3.1 Extend `IIndirectFireRequest` with NARC/iNarc team-mark flags (optional, backward-compat); add `basis` field to `IIndirectFireResult`
- [x] 3.2 In `resolveIndirectFire`, permit indirect when no LOS spotter but NARC/iNarc-marked by attacker's team (`basis='narc'|'inarc'`, no spotter, `toHitPenalty=1`); wire `computeIndirectFireContext` to read beacon flags from target unit state
- [x] 3.3 Unit/collaborator tests cover NARC/iNarc override behavior

## 4. Indirect-eligible weapon catalog + mode toggle

- [x] 4.1 `INDIRECT_ELIGIBLE_WEAPON_FAMILIES` constant exported from `src/utils/gameplay/indirectFire.ts` - 5 families (LRM / LRM_IMP / MML_LRM / MEK_MORTAR / NLRM). `isIndirectFireCapable` matches `mortar` alongside `lrm`; Streak variants explicitly excluded.
- [x] 4.2 Reject mode-toggle on non-eligible weapons at UI + resolver
  > WeaponSelector exposes the Direct/Indirect segmented control, store validation rejects non-eligible indirect requests with a player-facing error, and the resolver still normalizes invalid Indirect requests to Direct as defense in depth.
- [x] 4.3 Add `weapon.mode: 'Direct' | 'Indirect'` to per-weapon combat state
  > Per-unit `weaponModesByUnitId` state now threads selected modes through `InteractiveSession.applyAttack`; engine declaration payloads carry resolved `mode` with invalid Indirect requests normalized to Direct.
- [x] 4.4 Persist mode in event-log replay round-trip
  > Covered by attack-event serialization/deserialization regression: `AttackDeclared.weaponAttacks[].mode` survives event-log round-trip with mixed Direct/Indirect weapons.
- [x] 4.5 Unit tests cover the eligibility surface: accepted families and rejected Streak / direct-fire / MML-SRM variants.

## 5. Combat-resolution dispatch + event log

- [x] 5.1 Resolver invokes `computeIndirectFireContext` before `computeToHit`
  > Implemented in `applyInteractiveSessionAttack` / phase attack paths by pre-computing indirect-fire resolution before `declareAttack`.
- [x] 5.2 Add 4 typed event variants
  > Payload interfaces, `GameEventType` enum entries, and status-event union variants are present for SpotterSelected, SpotterLost, ForwardObserver, and NarcOverride.
- [x] 5.3 Emit `IndirectFireSpotterSelected` when `computeIndirectFireContext` resolves
- [x] 5.4 Extend event-log display formatting for the 4 new event types
- [x] 5.5 Scenario test: full LRM-15 indirect attack with valid spotter
- [x] 5.6 Apply +1 `Spotting for indirect fire` modifier when an elected spotter fires later in the same turn
  > Implemented by scanning prior same-turn `IndirectFireSpotterSelected` events during `declareAttack`; covered by a focused dispatch regression.

## 6. Spotter liveness re-check

- [x] 6.1 Mid-resolution spotter death -> auto-miss + `IndirectFireSpotterLost` emission
- [x] 6.2 Scenario test for spotter-killed-mid-resolution

## 7. Spec deltas

- [x] 7.1 Spec `indirect-fire-system/spec.md` authored
- [x] 7.2 Spec `combat-resolution/spec.md` authored
- [x] 7.3 Spec `weapon-system/spec.md` authored
- [x] 7.4 `npx.cmd openspec validate add-indirect-fire-and-spotter-network --strict` passes clean
- [x] 7.5 Focused jest/typecheck verification passes for current slices
- [x] 7.6 Document archive lifecycle gate
  > Implementation and documentation follow-ups are now represented. Leave the change unarchived until the branch is reviewed/merged or the user explicitly asks to archive.

## 8. Documentation + follow-up notes

- [x] 8.1 Playtest notes for indirect-fire UI mode toggle, replay, and FO/NARC map explanation cases
  > Captured in `playtest-notes.md` with automated evidence and manual browser-playtest gaps called out.
- [x] 8.2 Arrow IV `_followups.md` before archive
  > Captured in `_followups.md` as a separate future `add-arrow-iv-artillery` OpenSpec change boundary.

## Current slice summary

The indirect-fire engine path now has:
- `IIndirectFireResolution` typed contract and `InteractiveSession.indirectFire.ts` collaborator
- SSoT indirect-eligible weapon families and capability checks
- NARC/iNarc and semi-guided TAG override support
- Forward Observer SPA catalog entry, penalty cancellation, map projection explanation, and `IndirectFireForwardObserver` event emission
- Per-weapon Direct/Indirect mode selection in the weapon planning UI, with non-eligible weapon rejection before commit
- Event-log serialization coverage for mixed Direct/Indirect `AttackDeclared.weaponAttacks[].mode`
- Combat-resolution dispatch and event-log formatting for the four indirect-fire event variants
- Same-turn +1 spotting-fire modifier for elected spotters who later fire their own direct attacks
- Spotter liveness re-check with auto-miss + `IndirectFireSpotterLost`
- Playtest/readiness notes plus explicit Arrow IV/artillery follow-up boundaries

**Remaining lifecycle work:**
- Archive the change after review/merge or explicit archive instruction. This is not an incomplete PR implementation task.
