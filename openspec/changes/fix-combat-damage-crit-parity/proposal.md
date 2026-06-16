# Change: Restore MegaMek Parity in Damage and Critical-Hit Resolution

## Why

The 2026-06-12 full codebase review confirmed five high/critical parity defects and four
mediums in the damage + critical-hit resolution surface, all cross-checked against the
MegaMek Java sources of truth (`E:/Projects/megamek`). Each currently lets combat resolve
*differently from the rules the spec claims to enforce*, and the green test suite does not
catch any of them.

- **C-1 (critical) — head damage capped at 3 points per hit at four sites.** Overflow is
  discarded so a 15-pt Gauss to the head strips 3 armor and the head survives; cockpit kills
  are *impossible* in both combat paths. The "Total Warfare p.41" justification in
  `src/utils/gameplay/damage/resolve.ts:27-34` is fabricated — `3` is the head's internal
  structure value, not a damage cap. The cap is applied at `resolve.ts:205-208`
  (`HEAD_DAMAGE_CAP_PER_HIT`), `src/simulation/runner/phases/weaponAttackHitResolution.ts:372-374`
  (`HEAD_HIT_DAMAGE_CAP`), `src/simulation/runner/phases/physicalAttackDamage.ts:22-30`
  (`capPhysicalDamageForLocation`), and `src/utils/gameplay/gameSessionAttackResolution.ts:229-231`.
  MegaMek `TWDamageManager` applies full damage to armor then internal structure on a head hit
  and inflicts exactly one crew wound — it never caps the damage.

- **A-1 (high) — crit-slot selection makes slots 6+ unreachable.**
  `src/utils/gameplay/criticalHitResolution/selection.ts:88-89` computes the slot index as
  `(roll - 1) % availableSlots.length` with a single d6. In any 12-slot torso/arm with more
  than 6 available slots, the modulo can never produce indices ≥ 6, so equipment placed last
  (commonly ammo / heat sinks) can never be critted. MegaMek `TWGameManager.java:21731` uses a
  uniform `randomInt(numSlots)` with rejection of already-hit slots.

- **A-2 (high) — standard CASE caps ammo-explosion transfer at 10 points instead of venting all
  excess.** `src/utils/gameplay/ammoTracking/caseProtection.ts:44-52` applies
  `Math.min(totalDamage, STANDARD_CASE_DAMAGE_CAP, internalStructureRemaining)`, under-destroying
  healthy CASE'd side torsos. MegaMek `TWDamageManager.java:1689` vents all explosion damage
  beyond the consumed internal structure to the environment (no transfer to the next location),
  so the local location absorbs as much damage as it has internal structure — not an arbitrary
  10-point cap.

- **A-3 (high) — vehicle engine crit auto-destroys on second hit.**
  `src/utils/gameplay/vehicleCriticalHitResolution.ts:319-328` (`applyEngineHit`) sets
  `destroyed: true` once `engineHits >= 2`. MegaMek `Tank.java:2180` (`Tank.engineHit()`) only
  *immobilizes* the vehicle on an engine hit; destruction is a gated optional fusion-explosion
  rule, never a deterministic consequence of a second hit.

- **A-4 (high) — resolver ammo-explosion crit applies no damage.**
  `src/utils/gameplay/criticalHitResolution/equipmentEffects.ts:70-84` (`applyAmmoHit`) returns
  the component damage state unchanged and emits only an `AmmoExplosion` effect marker — no
  internal-structure damage, no CASE handling, no pilot damage. In the live `resolveAttack`
  path (`processTAC → resolveCriticalHits → applyAmmoHit`) the explosion is silently dropped.
  MegaMek `TWGameManager.applyCriticalHit:19059` routes ammo crits through the full explosion
  pipeline.

Mediums confirmed in the same surface:

- TAC (location roll of 2) handling exists in the interactive engine but the simulation runner
  does not apply it (`src/simulation/runner/phases/weaponAttackHitResolution.ts:372`), so the
  interactive engine and sim diverge on every roll-of-2.
- Motive damage models a motion-type "heavy" result as `heavy → immobilize` escalation
  (`src/utils/gameplay/motiveDamage.ts:115-133`, `applyMotionTypeAggravation`), not MegaMek's
  flat 2d6 motive-roll *modifiers* (Hover +3, Wheeled +2, WiGE +4…).
- Non-CASE explosion pilot damage is encoded as `1`
  (`src/utils/gameplay/ammoTracking/explosions.ts:25`, `UNPROTECTED_EXPLOSION_PILOT_DAMAGE = 1`),
  contradicting the canonical 2-wound rule for an unprotected ammo cook-off.
- Vehicle driver/commander crits are modeled as 2-hit kill counters
  (`src/utils/gameplay/vehicleCriticalHitResolution.ts:288-296` / `:303-316`). This is
  *contested* — the production table layer already escalates crew faithfully and the buggy
  branch is reachable only via the BA leg-attack helper — so the fix is to align the helper,
  not to rewrite the table layer.

## What Changes

- Remove the 3-point head damage cap at all four sites and apply full damage to the head
  (armor first, then internal structure, then the existing transfer/destruction cascade),
  while preserving the existing single pilot wound on a head hit and the existing roll-of-12
  head-destruction crit path. The head's 3-point internal structure value continues to govern
  destruction, but incoming damage is no longer truncated.
- Replace `(roll - 1) % availableSlots.length` slot selection with a uniform random selection
  over *all* slots in the location with rejection of already-destroyed/empty slots, so every
  slot index is reachable per `TWGameManager`.
- Change standard CASE to vent all explosion damage beyond the consumed internal structure
  (local location absorbs up to its remaining internal structure, the rest is vented, no
  transfer to the parent location), removing the 10-point cap; CASE II's 1-point transfer cap
  is unchanged.
- Make vehicle engine crits *immobilize* rather than auto-destroy on the second hit; keep
  deterministic destruction only where MegaMek does (it does not, under standard rules).
- Route the resolver ammo-explosion crit (`applyAmmoHit`) through the ammo-explosion module so
  a crit on a loaded bin produces explosion damage, CASE handling, and pilot damage on the live
  `resolveAttack` path.
- Apply TAC (roll-of-2 through-armor critical) in the simulation runner to match the
  interactive engine.
- Replace motive-damage `heavy → immobilize` motion-type escalation with MegaMek's flat motive
  2d6 roll modifiers per motion type.
- Correct the non-CASE explosion pilot-damage constant from 1 to 2 wounds.
- Align the BA-leg-attack-reachable driver/commander crit helper with the faithful crew-crit
  escalation already used by the production table layer (single source of truth for crew crit
  effects).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `damage-system`: tightens "Head Damage Cap Rule" into a no-cap full-damage rule (with the
  cluster-group sub-rule re-expressed accordingly) and tightens "Through Armor Critical (TAC)"
  to require the simulation runner to apply TAC.
- `critical-hit-resolution`: tightens "Critical Slot Selection" to a uniform-with-rejection
  selection over all slots, and tightens "Ammo critical triggers explosion" (under "Cascade
  Effects") so the resolver routes damage through the explosion module.
- `ammo-explosion-system`: tightens "CASE Protection" / "CASE Confines Ammo Explosion Damage"
  to vent-all-excess (no 10-point cap) and "No CASE Explosion Damage" to 2 pilot wounds.
- `vehicle-unit-system`: ADDS engine-crit-immobilize, motive-roll-modifier, and crew-crit
  single-source requirements that extend the existing "Motive Damage State Tracking" family
  (the spec's current Non-Goal boundary on combat resolution is narrowed for motive/crit
  resolution, which now has a behavioral home here rather than only state tracking).

## Impact

- `src/utils/gameplay/damage/resolve.ts` (`HEAD_DAMAGE_CAP_PER_HIT`, `resolveDamage` head cap).
- `src/simulation/runner/phases/weaponAttackHitResolution.ts` (head cap; TAC roll-of-2).
- `src/simulation/runner/phases/physicalAttackDamage.ts` (`capPhysicalDamageForLocation`).
- `src/utils/gameplay/gameSessionAttackResolution.ts` (inline head cap).
- `src/simulation/runner/SimulationRunnerConstants.ts` (`HEAD_HIT_DAMAGE_CAP` removal/retire).
- `src/utils/gameplay/criticalHitResolution/selection.ts` (`selectCriticalSlot`).
- `src/utils/gameplay/criticalHitResolution/equipmentEffects.ts` (`applyAmmoHit`).
- `src/utils/gameplay/ammoTracking/caseProtection.ts` (`resolveCaseAdjustedAmmoExplosionDamage`).
- `src/utils/gameplay/ammoTracking/explosions.ts` (`UNPROTECTED_EXPLOSION_PILOT_DAMAGE`).
- `src/utils/gameplay/vehicleCriticalHitResolution.ts` (`applyEngineHit`, `applyDriverHit`,
  `applyCommanderHit`).
- `src/utils/gameplay/motiveDamage.ts` (`applyMotionTypeAggravation`).
- New/updated unit + scenario tests under `src/utils/gameplay/**/__tests__` and
  `src/simulation/runner/**` exercising each fix against MegaMek-derived expectations.

## Non-goals

- To-hit and movement projection agreement (clusters B-1…B-4) — owned by the active
  `fix-tactical-projection-agreement-gaps` and the planned `extend-projection-agreement-tohit`
  changes.
- The `critical-hit-resolution` vs `critical-hit-system` capability-ownership drift (7 vs 8
  actuator types) — owned by the Wave 0 `reconcile-spec-source-of-truth` change.
- Skid/sideslip displacement resolution and TacOps leaping — separate movement-rules gaps, not
  this change.
- Heat-induced ammo-explosion thresholds and the heat phase generally — already specced and
  correct; only the *non-CASE pilot-damage constant* shared by both crit and heat explosions is
  touched here.
- Non-mech BV data/validation (cluster D) — out of scope.
