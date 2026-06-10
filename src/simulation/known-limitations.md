# Known Limitations — Legacy Detector Filter Ledger

This document describes the **legacy generic-detector exclusion buckets** used
by `isKnownLimitation()` in `src/simulation/core/knownLimitations.ts`. Each
bucket suppresses violation messages from older generic simulation detectors
whose wording cannot distinguish real bugs from historic engine gaps.

**This file is NOT the feature-status source of truth.** Per the 2026-06-09
audit (finding E-10) this ledger had drifted badly: it still claimed line of
sight, heat shutdown, critical-hit effects, pilot skill checks, ammo
consumption, and terrain costs were unimplemented while the combat validation
catalog marks them integrated. Feature status lives in the honest ledgers:

- `src/simulation/runner/CombatValidationCatalog.ts` — per-feature support
  levels (`integrated` / `helper-only` / `unsupported` / `out-of-scope`) with
  MegaMek source references
- `src/simulation/runner/CombatValidationGapInventory.ts` — machine-readable
  inventory of every unresolved (non-integrated, non-out-of-scope) row;
  printable via `npx tsx scripts/print-combat-validation-gaps.ts`

**Why the buckets survive after the features shipped:** the regex buckets only
filter messages from _legacy generic detectors_. The BattleMech combat
validation lane bypasses this filter entirely (the
`battlemech-combat-validation` invariant is an explicit bypass in
`knownLimitations.ts`, proven by `combatValidationScope.contract.test.ts`), so
real validation evidence is never suppressed. Removing a bucket is safe only
after auditing that no legacy detector still emits matching messages.

---

## Physical Attacks

**Status**: Implemented for BattleMechs; broad legacy filter retained for generic simulation detectors

**Why**: The current BattleMech combat stack has runtime support for punch, kick, push, charge, death-from-above, and the supported melee weapon attack types (hatchet, sword, mace, lance, retractable blade, flail, wrecking ball). The broad `physicalAttacks` known-limitation bucket is retained only for older generic invariant reports whose messages do not distinguish implemented BattleMech mechanics from missing physical-combat families.

**Catalog validation rule**: BattleMech combat validation invariants must not be filtered through this broad bucket. They bypass known-limitation filtering via `battlemech-combat-validation` and use the explicit support maps under `src/simulation/runner/` to classify integrated, helper-only, and unsupported physical behavior.

**Current explicit gaps** (see the gap inventory for the authoritative list):

- Claws and talons intentionally remain modifiers on punch/kick/DFA rather than standalone attacks; automatic missing/breached event production from mounted-equipment state remains a gap (`ruleSupport.physicalDamageModifiers.claw-equipment-lifecycle` / `talon-equipment-lifecycle`).
- Displacement domino chains are partial (`ruleSupport.physicalLegalityGates.shared.displacement-domino-chain`).
- Non-BattleMech physical combat families require separate validation matrices (out-of-scope split).

**Code Reference**:

- `src/utils/gameplay/physicalAttacks/types.ts` - runtime-supported physical attack type list
- `src/simulation/runner/CombatFeatureSupport.ts` - official physical weapon support map
- `src/simulation/runner/CombatPhysicalActionSupport.ts` - physical action support map

**Example Violations to Exclude** (legacy generic detectors only):

- "Generic physical attack option unavailable in non-catalog detector"
- "Vehicle melee combat not resolved"
- "Unsupported physical weapon lacks runtime attack type"

---

## Ammo Consumption Tracking

**Status**: Implemented; legacy filter bucket retained

**Why the bucket exists**: this section previously claimed ammo consumption
was not enforced. That is no longer true: `consumeAmmo`
(`src/utils/gameplay/ammoTracking.ts`) is wired into the weapon-attack phase
(`src/simulation/runner/phases/weaponAttack.ts`,
`weaponAttackHitResolution.helpers.ts`), `AmmoConsumed` events are emitted
with `roundsRemaining`, and heat-induced ammo explosions plus
ammunition-explosion pilot damage are resolved
(`phases/heatAmmoExplosions.ts`, `phases/ammoExplosionPilotDamage.ts`). The
bucket survives only to mute legacy generic detectors with ammo-themed
messages.

**Remaining gaps** (gap inventory): ammo _compatibility metadata_ rows —
`featureSupport.ammunitionCompatibility.battlemech-ammo-missing-compatible-weapon-refs`
and `nonstandard-empty-compatible-row`.

**Hazard note**: a real ammo-tracking regression reported by a legacy generic
detector would be filtered by this bucket. Catalog-lane invariants bypass the
filter and are the enforcement surface for ammo behavior.

---

## Heat Shutdown Mechanics

**Status**: Implemented; legacy filter bucket retained

**Why the bucket exists**: this section previously claimed shutdown
enforcement was incomplete. The catalog now marks the full chain integrated
(`CombatRuleSupport.ts`): `runHeatPhase` emits avoidable `ShutdownCheck`
events at heat 14–29, automatic shutdown persists at heat 30+, `StartupAttempt`
restarts shutdown units after dissipation, and heat-induced ammo explosions
fire (`phases/heatThresholdEvents.ts`, `phases/heatAmmoExplosions.ts`,
`phases/heatCriticalDamage.ts`). The bucket survives only for legacy generic
detectors with shutdown-themed messages.

**Hazard note**: same as ammo — catalog-lane invariants bypass this filter and
are the enforcement surface for heat behavior.

---

## Terrain Movement Cost Validation

**Status**: Implemented; legacy filter bucket retained

**Why the bucket exists**: this section previously claimed terrain costs were
simplified placeholders. The 2026-06-09 audit wave W2 (PR #802) landed the
terrain entry-cost table per motive type/level and multi-feature hex cost
summing aligned with MegaMek. The bucket survives only for legacy generic
detectors with terrain-cost-themed messages.

**Remaining gaps** (gap inventory): `ruleSupport.terrainEnvironment.mines`
(helper-only) and `ruleSupport.terrainEnvironment.terrain-los-side-paths`.

---

## Pilot Skill Checks

**Status**: Implemented; legacy filter bucket retained

**Why the bucket exists**: this section previously claimed fall checks and
consciousness checks were unenforced. The runner resolves PSRs each turn
(`runPSRPhase` emits `PSRResolved` and `UnitFell` with pilot damage — proven
with existence teeth in `simulation-combat-integration.test.ts`), and
consciousness checks are integrated (`resolvePilotConsciousnessCheck`,
pilot-death destruction cause `pilot_death`; see `CombatFeatureSupport.ts`
consciousness entries). The bucket survives only for legacy generic detectors
with piloting-check-themed messages.

**Remaining gaps** (gap inventory): SPA/modifier _application_ rows under
`pilotSkills.pilotModifierResolvers.*` (e.g. `consciousness-application`,
`psr-spa-application`) — the checks run; some pilot-ability modifiers do not
yet feed them.

---

## Critical Hit Effects

**Status**: Implemented for system slots; generic equipment cascade partial; legacy filter bucket retained

**Why the bucket exists**: this section previously claimed critical effects
were "damage tracking only". `CombatCriticalSlotEffectSupport.ts` now marks
integrated effects for actuator (with PSR queueing), ammo (explosions),
cockpit (pilot death), engine (3-hit destruction), gyro (PSRs), heat sink,
jump jet, life support, sensor (to-hit penalties), and weapon destruction.
The bucket survives only for legacy generic detectors with
critical-effect-themed messages.

**Remaining gaps** (gap inventory): generic `equipment` slot cascades are
helper-only (`damageAndDeath.criticalComponents.equipment`,
`damageAndDeath.criticalSlotEffects.equipment`) — MegaMek's
equipment-specific branches (shields, SCM, emergency coolant, HarJel, etc.)
do not all cascade through MekStation state yet.

---

## Line of Sight (LOS) Validation

**Status**: Implemented; legacy filter bucket retained

**Why the bucket exists**: this section previously claimed LOS was placeholder
logic. `calculateLOS` now blocks LOS via terrain `blocksLOS` /
`losBlockHeight` rules, accumulates woods/smoke density through intervening
hexes (blocking once cumulative density exceeds 2), feeds intervening-terrain
to-hit modifiers into `runAttackPhase`, and partial cover is computed
(`phases/__tests__/weaponAttackPartialCover.test.ts`). See
`CombatTerrainEnvironmentSupport.ts`. The bucket survives only for legacy
generic detectors with LOS-themed messages.

**Remaining gaps** (gap inventory):
`ruleSupport.terrainEnvironment.terrain-los-side-paths` — richer MegaMek
building-level LOS handling is not fully mirrored.

---

## Special Pilot Abilities (SPAs)

**Status**: Partially Implemented

**Why**: The combat validation catalog now tracks which SPAs are integrated, helper-only, or unsupported. Several ranged, heat, toughness, physical, and target-modifier SPAs are enforced during gameplay, including source-backed Dodge Maneuver to-hit behavior for explicit dodging Mek targets. Other SPA families still remain helper-only or unsupported until their owning combat pipeline consumes them.

**When**: Part of advanced pilot mechanics milestone.

**Code Reference**:

- `src/lib/campaign/progression/spaAcquisition.ts` - Marked `@stub - Not implemented`
- `src/types/pilot/SpecialAbilities.ts` - Abilities defined but not applied
- `src/simulation/runner/CombatFeatureSupport.ts` - Source of truth for SPA combat integration state

**Example Violations to Exclude**:

- "Unsupported SPA effect not applied to combat resolution"
- "Helper-only SPA visible but not consumed by runner pipeline"
- "Gunnery Specialist bonus not applied"

---

## Vehicle and Aerospace Rules

**Status**: Out of scope for the BattleMech combat validation lane

**Why**: The game engine's combat validation lane focuses on BattleMech combat. Vehicle movement rules (wheeled, tracked, hover, VTOL), vehicle damage tables, and aerospace unit rules are explicitly partitioned out of the BattleMech support matrices (`non-battlemech-combat-system-split` in `CombatValidationScopeSupport.ts`) and need their own validation matrices.

**Code Reference**:

- `src/services/units/handlers/` - Multiple vehicle handlers marked "not implemented"
- `src/simulation/runner/CombatValidationScopeSupport.ts` - out-of-scope split entries

**Example Violations to Exclude**:

- "Vehicle movement rules not applied"
- "VTOL altitude not tracked"
- "Aerospace unit movement invalid"
- "Vehicle damage table not used"

---

## Campaign Progression Systems

**Status**: Partially Implemented

**Why**: Core post-battle progression is wired (post-battle XP awards with a
double-apply guard, kill/mission counters, processor registration — 2026-06-09
audit wave W3, PR #803). Academy/education XP and the coming-of-age SPA
subsystem remain stubbed (`@stub` markers in
`src/lib/campaign/progression/xpAwards.ts` and `spaAcquisition.ts`).

**Example Violations to Exclude** (legacy generic detectors only):

- "XP not awarded after battle"
- "Pilot skill not improving"
- "Unit repair not tracked"
- "Force management not available"

---

## MTF File Parsing

**Status**: Not Implemented (JSON import only)

**Why**: Direct parsing of MegaMek's MTF (MechTech Format) files is not implemented. Only pre-converted JSON import is supported.

**When**: Low priority - JSON import covers most use cases.

**Code Reference**:

- `src/services/conversion/MTFImportService.ts` - Methods return "not implemented" errors

**Example Violations to Exclude**:

- "MTF file parsing failed"
- "Direct MTF import not available"

---

## How to Use This Document

### For Simulation Developers

The exclusion buckets apply ONLY to legacy generic detectors. New invariants
that produce validation evidence must register under (or alongside) the
`battlemech-combat-validation` bypass so they are never filtered. Do not add
new broad buckets for shipped features.

### For Game Engine Developers

When a feature listed here changes status:

1. Update the section here to match the catalog/gap-inventory reality
2. Audit whether any legacy detector still emits messages matching the bucket;
   if none do, retire the bucket (this requires updating the validation traps
   in `CombatValidationScopeSupport.ts` and the contract tests in lockstep)
3. Never report feature status from this file — cite the catalog

### For Simulation Report Reviewers

If a violation was filtered as a known limitation but the section above says
the feature is implemented, treat it as a potential masked bug: re-run the
catalog validation lane (which bypasses the filter) before dismissing it.

---

## Maintenance

**Last Updated**: 2026-06-10 (2026-06-09 audit finding E-10 — stale
unimplemented claims for LOS / heat shutdown / critical effects / pilot
checks / ammo consumption / terrain costs corrected against
`CombatValidationCatalog` + `CombatValidationGapInventory`)

**Review Frequency**: Update this document whenever:

- A feature covered by a bucket changes support level in the catalog
- A legacy generic detector is added or retired
- Simulation invariants are added that might trigger false positives
