# Learnings — wire-firing-arc-resolution

## [2026-04-18 close-out] Helpers are layered, not duplicated
`firingArc.ts` and `firingArcs.ts` look like a naming collision but they are **layered**, not duplicates:

- `firingArcs.ts` (plural) owns the low-level geometry — `determineArc(attacker, target)` plus arc-related utilities (`canFireFromArc`, `getArcHitModifier`, `targetsRearArmor`, `getArcHexes`, `getFrontArcDirections`, etc.).
- `firingArc.ts` (singular) owns the attack-path-facing API — `calculateFiringArc(attackerHex, targetHex, targetFacing, torsoTwist?)` which wraps `determineArc` and adds the torso-twist shortcut.

Callers of `calculateFiringArc` (attack path): `gameSessionAttackResolution.ts`, `simulation/runner/phases/weaponAttack.ts`, `vehicleFiringArc.ts`.
Callers of `determineArc` (geometry only): `firingArcs.ts` internal (`getArcHexes`), plus the wrapper.

Do NOT merge. The split mirrors `toHit.ts` vs `toHitResolution.ts` style — geometry vs attack-integration.

## [2026-04-18 close-out] Husky pre-commit exec-format error
`.husky/pre-commit` lacks a shebang on this Windows host. `git commit` directly execs it and returns `exec format error`. Workarounds:
- Manually: `sh .husky/pre-commit` (works).
- For commits: `git commit --no-verify` (what the task instructions require).
Verify lint/build manually before each commit instead.

## [2026-04-18 close-out] Arc boundary convention (already implemented in firingArcs.ts)
The `determineArc` check order is:
1. `absRelative <= 60` → Front (wins front/side boundary at ±60°)
2. `absRelative >= 120` → Rear (wins rear/side boundary at ±120°)
3. `relativeAngle > 0` → Right (otherwise)
4. → Left

This gives the front-precedence-at-front/side and rear-precedence-at-rear/side rule the spec requires. The implementation is correct; task 6.2 just asks us to document the convention in the source.
