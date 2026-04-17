# Tasks: Wire Firing Arc Resolution

## 0. Prerequisites

- [ ] 0.1 `fix-combat-rule-accuracy` merged to main (to-hit math must be correct before changing which arc supplies the hit-location table)

## 1. Audit Hardcoded Arc Usage

- [ ] 1.1 Grep every `FiringArc.Front` reference in the engine and gameSession paths
- [ ] 1.2 Confirm which call sites are real combat path (not unit-test fixtures)
- [ ] 1.3 Produce a worklist of replacement points

## 2. Confirm Arc Helper API

- [ ] 2.1 Review `firingArc.ts` / `firingArcs.ts` — confirm signature is `computeFiringArc(attackerHex, targetHex, targetFacing): FiringArc`
- [ ] 2.2 Confirm boundary handling is consistent (front precedence on front/side boundary, rear precedence on rear/side boundary)
- [ ] 2.3 If duplicate helpers exist across the two files, pick one and deprecate the other

## 3. Wire Arc Computation Into Attack Path

- [ ] 3.1 In `gameSessionAttackResolution.ts`, compute the arc per attacker/target pair instead of reading a constant
- [ ] 3.2 Pass the computed arc through to `hitLocation.ts` so it picks the correct table (Front / Left / Right / Rear)
- [ ] 3.3 Include the arc on the `AttackResolved` event payload as `attackerArc: FiringArc`
- [ ] 3.4 Remove all `FiringArc.Front` literals from the attack-resolution path

## 4. Hit Location Arc Propagation

- [ ] 4.1 Confirm `hitLocation.ts` already supports arc parameter (per existing spec)
- [ ] 4.2 If the game path was bypassing it, reconnect so arc determines the table used
- [ ] 4.3 Unit tests: left-arc attack lands on the left-table locations (LA / LT / LL etc.)

## 5. Edge Cases

- [ ] 5.1 Handle same-hex attacker/target: reject the attack with an `AttackInvalid` / `SameHex` reason
- [ ] 5.2 Handle attacker facing changes within the turn — use target facing at time of resolution
- [ ] 5.3 Test rear-arc attack: target facing 0 (north), attacker directly south, arc SHALL be Rear

## 6. Boundary Determinism

- [ ] 6.1 Select a consistent convention for hex-side boundaries (front precedence over side; rear precedence over side)
- [ ] 6.2 Document the convention in the arc helper
- [ ] 6.3 Add a property-based test that sweeping attacker position around the target returns exactly one arc per position (no ambiguity)

## 7. Bot Integration

- [ ] 7.1 `AttackAI` SHOULD prefer arcs that expose rear armor (optional tactical heuristic)
- [ ] 7.2 Minimum: `AttackAI` must not crash when target is in rear arc

## 8. UI Consumers (non-blocking)

- [ ] 8.1 Ensure the UI event log can display the arc string
- [ ] 8.2 Optional: highlight arc on the hex map during attack preview

## 9. Per-Change Smoke Test

- [ ] 9.1 Fixture: attacker at hex (0,0) facing north; target at (0,3) facing north — attacker is directly south of target
- [ ] 9.2 Action: fire any weapon from attacker
- [ ] 9.3 Assert: `AttackResolved.payload.attackerArc === 'Rear'` (not hardcoded `Front`)
- [ ] 9.4 Second fixture: target rotates 180° (faces south, attacker now in front arc)
- [ ] 9.5 Assert: `attackerArc === 'Front'`
- [ ] 9.6 Regression guard: grep source for `FiringArc.Front` in the attack-resolution path — zero matches outside test fixtures

## 10. Validation

- [ ] 10.1 `openspec validate wire-firing-arc-resolution --strict`
- [ ] 10.2 Autonomous fuzzer reports no new invariant violations related to arcs
- [ ] 10.3 Build + lint clean
