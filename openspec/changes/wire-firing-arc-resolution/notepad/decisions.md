# Decisions — wire-firing-arc-resolution

## [2026-04-18 close-out] Keep `firingArc.ts` and `firingArcs.ts` as layered modules (task 2.3)

**Choice**: Do NOT merge or deprecate either file.

**Rationale**:
- `firingArc.ts` (singular) is the attack-path entry point used by
  `gameSessionAttackResolution.ts`, `simulation/runner/phases/weaponAttack.ts`,
  and `vehicleFiringArc.ts`. It handles the same-hex + torso-twist
  shortcuts and returns a `FiringArc`.
- `firingArcs.ts` (plural) hosts the low-level geometry (`determineArc`) and
  arc utilities (`canFireFromArc`, `getArcHitModifier`, `targetsRearArmor`,
  `getArcHexes`, `getFront/RearArcDirections`). These are used by the
  wrapper and by UI/visualisation code.

This mirrors the `toHit.ts` / `toHitResolution.ts` split — geometry vs
attack-integration. Merging would conflate two responsibilities, force
every caller to pull in visualisation utilities, and make torso-twist
shortcuts harder to maintain.

**Discovered during**: Task 2.3 audit.

## [2026-04-18 close-out] Arc boundary convention (task 6.1/6.2)

**Choice**:
- Front arc wins at ±60° (front/side boundary).
- Rear arc wins at ±120° (rear/side boundary).
- Side arcs fill the strict interiors.

**Rationale**: Documented in JSDoc on `determineArc` in `firingArcs.ts`.
Uses `absRelative <= 60` for Front and `absRelative >= 120` for Rear so
the inequalities claim the boundary hexes. Deterministic — same
`(attacker, target, facing)` always returns the same arc. Property-based
sweep test (`firingArc.test.ts` § "property-based sweep") verifies across
6 facings × radius 3 positions.

**Discovered during**: Task 6.1 / 6.2.

## [2026-04-18 close-out] Task 7.1 (AttackAI rear-arc preference) DEFERRED

**Choice**: Not implemented in this change.

**Rationale**: `IAIUnitState` does not currently expose per-arc armor
totals to the AI layer. A rear-armor heuristic would require either a new
AI surface field or direct coupling from AttackAI into the engine's unit
state — both are out of scope for this wiring change.

Task 7.2 (mandatory: no crash on rear arc) IS implemented — see
`attackAI.test.ts § "rear-arc safety"`.

**Discovered during**: Task 7 triage.

## [2026-04-18 close-out] Task 8.2 (hex-map arc highlight) DEFERRED

**Choice**: UI highlight of arc on hex map during attack preview is
deferred to a later UI wave.

**Rationale**: Task 8 header marks UI consumers as "non-blocking". The
event-log arc display (task 8.1) is the minimum viable surface. Hex-map
highlight intersects with the broader attack-preview overlay work
(`add-los-and-firing-arc-overlays`) which has its own change folder.

**Discovered during**: Task 8 triage.

## [2026-04-18 close-out] Task 10.2 (autonomous fuzzer) DEFERRED

**Choice**: Autonomous fuzzer invariant check is deferred to Wave 2.

**Rationale**: No autonomous fuzzer harness exists in-repo yet. The
property-based sweep test (task 6.3) provides the strongest available
arc-ambiguity guard until the fuzzer lands.

**Discovered during**: Task 10 triage.
