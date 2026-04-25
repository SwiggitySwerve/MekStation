# Change: Wire Firing Arc Resolution

## Why

The engine currently uses `FiringArc.Front` for every attack regardless of attacker position or target facing. Side and rear attacks therefore never draw the correct hit-location tables and never apply rear-armor values. The math needed already exists in `src/utils/gameplay/firingArc.ts` and `firingArcs.ts` (arc from hex positions plus target facing), and the `firing-arc-calculation` spec is already archived. What's missing is the single wiring step: instead of hardcoding `FiringArc.Front` in the attack path, call the arc helper. Once wired, rear/side hit location tables become reachable, and rear armor starts being meaningful. See `openspec/changes/archive/2026-02-12-full-combat-parity/proposal.md` Phase 1 for context.

## What Changes

- Replace every hardcoded `FiringArc.Front` in the attack-resolution path with `computeFiringArc(attackerHex, targetHex, targetFacing)` from `firingArc.ts`
- Thread the computed `FiringArc` through the attack event payload (`attackerArc` field) so hit-location resolution reads it
- Update the `to-hit-resolution` hit-location scenarios to use the real arc (front / left / right / rear tables)
- Apply the side-attack-during-movement boundary resolution consistently (front arc precedence on the front/side boundary, rear arc precedence on the rear/side boundary)
- Emit a warning event when attacker and target are in the same hex (arc is undefined); reject the attack
- Record the arc in the `AttackResolved` event so the UI can display it

## Dependencies

- **Requires**: `fix-combat-rule-accuracy` (to-hit math needs to be correct before arc changes which modifiers apply)
- **Blocks**: `integrate-damage-pipeline` (hit location depends on real arc)

## Impact

- **Affected specs**: `firing-arc-calculation` (confirm computation wired into combat), `to-hit-resolution` (hit location uses computed arc), `combat-resolution` (attack events carry computed arc)
- **Affected code**: `src/engine/GameEngine.ts`, `src/engine/GameEngine.phases.ts`, `src/utils/gameplay/gameSessionAttackResolution.ts`, `src/utils/gameplay/hitLocation.ts`, `src/utils/gameplay/firingArc.ts`, `src/utils/gameplay/firingArcs.ts`
- **Test fallout**: tests that assert front-arc hit locations need variants for left/right/rear arcs
- **No new modules required**. The helper already exists; this change wires it.
