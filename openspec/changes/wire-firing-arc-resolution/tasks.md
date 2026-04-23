# Tasks: Wire Firing Arc Resolution

## 0. Prerequisites

- [x] 0.1 `fix-combat-rule-accuracy` merged to main (to-hit math must be correct before changing which arc supplies the hit-location table) — satisfied by PR #338

## 1. Audit Hardcoded Arc Usage

- [x] 1.1 Grep every `FiringArc.Front` reference in the engine and gameSession paths
- [x] 1.2 Confirm which call sites are real combat path (not unit-test fixtures)
- [x] 1.3 Produce a worklist of replacement points

## 2. Confirm Arc Helper API

- [x] 2.1 Review `firingArc.ts` / `firingArcs.ts` — confirm signature is `computeFiringArc(attackerHex, targetHex, targetFacing): FiringArc`
- [x] 2.2 Confirm boundary handling is consistent (front precedence on front/side boundary, rear precedence on rear/side boundary)
- [x] 2.3 If duplicate helpers exist across the two files, pick one and deprecate the other — NO duplicates: `firingArc.ts` is the attack-path API wrapping `firingArcs.ts` low-level `determineArc`. Layering documented in `src/utils/gameplay/firingArc.ts` header.

## 3. Wire Arc Computation Into Attack Path

- [x] 3.1 In `gameSessionAttackResolution.ts`, compute the arc per attacker/target pair instead of reading a constant
- [x] 3.2 Pass the computed arc through to `hitLocation.ts` so it picks the correct table (Front / Left / Right / Rear)
- [x] 3.3 Include the arc on the `AttackResolved` event payload as `attackerArc: FiringArc`
- [x] 3.4 Remove all `FiringArc.Front` literals from the attack-resolution path

## 4. Hit Location Arc Propagation

- [x] 4.1 Confirm `hitLocation.ts` already supports arc parameter (per existing spec)
- [x] 4.2 If the game path was bypassing it, reconnect so arc determines the table used
- [x] 4.3 Unit tests: left-arc attack lands on the left-table locations (LA / LT / LL etc.)

## 5. Edge Cases

- [x] 5.1 Handle same-hex attacker/target: reject the attack with an `AttackInvalid` / `SameHex` reason
- [x] 5.2 Handle attacker facing changes within the turn — use target facing at time of resolution
- [x] 5.3 Test rear-arc attack: target facing 0 (north), attacker directly south, arc SHALL be Rear

## 6. Boundary Determinism

- [x] 6.1 Select a consistent convention for hex-side boundaries (front precedence over side; rear precedence over side)
- [x] 6.2 Document the convention in the arc helper — see JSDoc on `determineArc` in `src/utils/gameplay/firingArcs.ts` and header comment on `src/utils/gameplay/firingArc.ts`
- [x] 6.3 Add a property-based test that sweeping attacker position around the target returns exactly one arc per position (no ambiguity) — see `src/utils/gameplay/__tests__/firingArc.test.ts` § "property-based sweep" (6 facings × radius 3/5)

## 7. Bot Integration

- [ ] 7.1 `AttackAI` SHOULD prefer arcs that expose rear armor (optional tactical heuristic) — DEFERRED: `IAIUnitState` does not yet expose per-arc armor totals; tracked for a later AI surface extension
- [x] 7.2 Minimum: `AttackAI` must not crash when target is in rear arc — see `src/simulation/__tests__/attackAI.test.ts` § "rear-arc safety"

## 8. UI Consumers (non-blocking)

- [x] 8.1 Ensure the UI event log can display the arc string — `EventLogDisplay.tsx` now appends `[<arc> arc]` to AttackResolved rows; tested in `EventLogDisplay.arc.test.tsx`
- [ ] 8.2 Optional: highlight arc on the hex map during attack preview — DEFERRED to a later UI wave (non-blocking per task 8 header)

## 9. Per-Change Smoke Test

- [x] 9.1 Fixture: attacker at hex (0,0) facing north; target at (0,3) facing north — attacker is directly south of target
- [x] 9.2 Action: fire any weapon from attacker
- [x] 9.3 Assert: `AttackResolved.payload.attackerArc === 'Rear'` (not hardcoded `Front`)
- [x] 9.4 Second fixture: target rotates 180° (faces south, attacker now in front arc)
- [x] 9.5 Assert: `attackerArc === 'Front'`
- [x] 9.6 Regression guard: grep source for `FiringArc.Front` in the attack-resolution path — zero matches outside test fixtures

## 10. Validation

- [x] 10.1 `openspec validate wire-firing-arc-resolution --strict` — clean (1.3.0)
- [ ] 10.2 Autonomous fuzzer reports no new invariant violations related to arcs — DEFERRED to Wave 2: autonomous fuzzer harness is not yet in-repo; tracked as follow-up
- [ ] 10.3 Build + lint clean — verified in PR pipeline (see PR description)
