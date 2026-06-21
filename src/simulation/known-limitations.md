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
filter messages from _legacy generic detectors_. Suppression is explicit opt-in:
`knownLimitations.ts` suppresses only allowlisted legacy detector invariants or
violations carrying an explicit legacy marker. New validation invariants,
including `battlemech-combat-validation`, are visible by default even when their
message text matches one of the broad buckets. Removing a bucket is safe only
after auditing that no legacy detector still emits matching messages.

---

## Physical Attacks

**Status**: Implemented for BattleMechs; broad legacy filter retained for generic simulation detectors

**Why**: The current BattleMech combat stack has runtime support for punch, kick, push, charge, death-from-above, and the supported melee weapon attack types (hatchet, sword, mace, lance, retractable blade, flail, wrecking ball). The broad `physicalAttacks` known-limitation bucket is retained only for older generic invariant reports whose messages do not distinguish implemented BattleMech mechanics from missing physical-combat families.

**Catalog validation rule**: BattleMech combat validation invariants must not be filtered through this broad bucket. They are not on the suppressible legacy-detector allowlist, so `battlemech-combat-validation` failures remain visible while the explicit support maps under `src/simulation/runner/` classify integrated, helper-only, and unsupported physical behavior.

**Current explicit boundaries** (see the gap inventory for the authoritative
list):

- Claws and Talons are represented physical-weapon catalog entries: represented punch/kick/DFA modifiers are integrated in the physical-weapon feature catalog and under `ruleSupport.physicalDamageModifiers.claws` / `ruleSupport.physicalDamageModifiers.talons`, but they are not runtime `PhysicalAttackType` standalone attacks.
- Automatic missing/breached lifecycle event production from source mounted-equipment state remains split to source-construction/editor parity (`ruleSupport.physicalDamageModifiers.claw-equipment-lifecycle` / `ruleSupport.physicalDamageModifiers.talon-equipment-lifecycle`) rather than the unresolved BattleMech blocker inventory.
- Displacement domino-chain secondary fallout
  (`ruleSupport.physicalLegalityGates.shared.displacement-domino-secondary-fallout`)
  is now a split-accounting row, not an unsupported leaf. Represented
  destination terrain/building/environment fallout is integrated under
  `ruleSupport.physicalLegalityGates.shared.displacement-domino-terrain-building-environment-fallout`.
  `ruleSupport.physicalLegalityGates.shared.displacement-domino-step-out-cfr`
  is represented through replayable `blockerStepOutDecision` payloads:
  successful `CFR_DOMINO_EFFECT` decisions apply `domino_step_out`
  displacement without forced DominoEffect PSRs, while failed, declined,
  invalid, or no-response decisions preserve forced domino fallback.
  `ruleSupport.physicalLegalityGates.shared.displacement-domino-dropship-secondary-hex`
  is tracked as out-of-scope for this BattleMech validation matrix because full
  DropShip footprint/secondary-hex consequences require separate large-unit
  validation.
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

**Remaining gaps** (gap inventory): no ammo-compatibility rows remain in the
unresolved BattleMech blocker inventory. The former
`featureSupport.ammunitionCompatibility.unsupported-rotary-ac-10-20-ammo` row is
kept here only as historical context for this broad legacy bucket. The generic
missing-compatible bucket is integrated as empty, while experimental and
unofficial empty-compatible rows are scoped out of the official BattleMech
completion lane.

Catalog evidence: the official autocannon ammo catalog carries `rotaryac10` and
`rotaryac20` with empty `compatibleWeaponIds`, while the official
ballistic-autocannon weapon catalog currently exposes only Rotary AC/2 and
Rotary AC/5 weapon rows. Keep RAC/10 and RAC/20 compatibility from silently
falling back to arbitrary Rotary AC rows unless matching official BattleMech
weapon rows exist in the imported catalog.

**Hazard note**: a real ammo-tracking regression reported by an allowlisted
legacy generic detector would be filtered by this bucket. Catalog-lane
invariants are not suppressible by this filter and are the enforcement surface
for ammo behavior.

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

**Hazard note**: same as ammo: catalog-lane invariants are not suppressible by
this filter and are the enforcement surface for heat behavior.

---

## Terrain Movement Cost Validation

**Status**: Implemented; legacy filter bucket retained

**Why the bucket exists**: this section previously claimed terrain costs were
simplified placeholders. The 2026-06-09 audit wave W2 (PR #802) landed the
terrain entry-cost table per motive type/level and multi-feature hex cost
summing aligned with MegaMek. The bucket survives only for legacy generic
detectors with terrain-cost-themed messages.

**Remaining gaps** (gap inventory): the broad minefield variant rows no longer
remain in the unresolved BattleMech blocker inventory:
`ruleSupport.terrainEnvironment.minefield-variant-side-paths` and
`ruleSupport.terrainEnvironment.minefield-non-conventional-type-semantics` are
split-accounting rows. No represented BattleMech minefield variant leaf remains
unsupported: represented EMP movement entry now applies source-backed
no-effect/interference/shutdown outcomes, explicit drone-OS modifier state,
duration state, and replayable `EmpMinefieldEffectApplied` events. Represented
command-detonated detonation, vibrabomb density/setting movement triggers,
active BattleMech ground-entry suppression, and jump-entry triggering are
represented separately in the catalog inventory.
The terrain LOS residual no longer has a represented grounded DropShip gap:
`ruleSupport.terrainEnvironment.terrain-los-grounded-dropship-cover-providers`
now covers entity-aware level-10 grounded DropShip LOS cover-provider state,
including runner weapon LOS and C3 spotter LOS option propagation.
Represented HeavyIndustrial and PlantedField TacOps LOS1 diagram elevation comparisons are integrated by
`calculateLOS`, including straight/divided side-path elevation gating, heavy
industrial blocking after more than two represented hexes, and planted-field
blocking after more than five represented fields. Fuel-tank elevation,
represented fuel-tank damageable cover-provider metadata, represented hard/soft
building cover-provider metadata, and damageable-cover hit-resolution routing
into represented `constructionFactor` terrain state are integrated separately
by explicit terrain feature metadata, including hard building classification
through `constructionFactor > 90`.
`ruleSupport.terrainEnvironment.terrain-los-side-paths` is now a split-accounting
row, not an unsupported leaf.

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

**Remaining gaps** (gap inventory): no SPA/modifier application rows remain in
the unresolved BattleMech blocker inventory. Heavy Lifter lift capacity,
carry-object capacity checks, represented pickup/drop lifecycle, represented
throw-release lifecycle, event-sourced carried-object state, overweight
no-side-effect rejection, and represented per-arm carried-cargo physical
legality are integrated for the represented BattleMech matrix. Throw-object
damage/displacement remains outside that represented release-lifecycle slice
instead of an unresolved BattleMech catalog blocker.
Maneuvering Ace controlled sideslip and flanking/turning producers are
integrated for represented BattleMech movement; out-of-control control-roll
production is split to aerospace/LAM scope, while represented pending
out-of-control PSR target-number relief remains integrated.

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

**Remaining gaps** (gap inventory): aggregate `equipment` critical rows
(`damageAndDeath.criticalComponents.equipment` and
`damageAndDeath.criticalSlotEffects.equipment`) are split-accounting rows.
Represented `Extended Fuel Tank` criticals cover the ground BattleMech fuel
explosion slice; generic `Fuel Tank` catalog aliases, LAM fuel equipment, and
incendiary/inferno ammunition lifecycle branches are explicit out-of-scope
lanes rather than unsupported BattleMech equipment-critical blockers. Ambiguous
or absent RISC Laser Pulse Module linked-laser evidence now stays generic and
fails closed without destroying a random same-location laser. Plain HarJel criticals now replay
breached-location state, and HarJel II/III now replay one secondary
same-location critical; broader HarJel breach prevention, breach-check bonuses,
armor repair, and environmental/exposure consequences remain explicit gaps.
Blue Shield special rules beyond represented shield preservation and
mode-gated official 5-point explosion payloads are pinned out of BattleMech
combat-state scope instead of counted as runtime coverage.
Represented hot-loaded weapon criticals cascade when the critical slot/event
explicitly carries `hotLoaded=true` plus positive `explosionDamage`; linked ammo
and unambiguous source HotLoad mode-state hydration are covered only when they
resolve to positive `explosionDamage`. Empty tracked
ammo-bin no-explosion handling, generic EquipmentDestroyed
name replay, Claw/Talons cleanup, Partial Wing runtime mutation, shield
preserved-function replay, SCM six-slot critical lifecycle replay, Emergency
Coolant System damaged-state replay, PLAYTEST_3 first-autocannon critical
replay, represented explicit explosion-damage equipment replay, represented PPC Capacitor charged-critical explosion replay, represented official Blue Shield
mode-gated 5-point equipment explosion replay, represented
Prototype Improved Jump Jet 10-point explosion replay, represented RISC Laser
Pulse Module explicit or unambiguous same-location linked-laser critical replay,
and stealth-linked ECM
replay are represented by narrower integrated sibling rows,
not by the aggregate equipment gap. The represented explosive-equipment slice
only claims critical slots that already carry an equipment identity plus
positive `explosionDamage`; it does not synthesize damage from static aliases,
fallback names, or generic explosive-equipment labels. The charged-capacitor slice only claims
PPC Capacitor critical slots already carrying represented explosion damage;
linked, cross-linked, double-capacitor, fired-PPC, and charge-mode lifecycle
parity remains outside that narrow row. The Prototype Improved Jump Jet slice
only claims the official `prototype-improved-jump-jet` misc catalog row and
MegaMek's 10-point explosive-equipment construction. The RISC Laser Pulse
Module slice claims explicit `linkedEquipment` state or exactly one
same-location working laser weapon that identifies the linked working laser
critical; ambiguous or absent same-location laser evidence remains generic
EquipmentDestroyed behavior. The Blue Shield explosion slice only claims
active/default source-mode 5-point `explosionDamage` plus explicit Off-mode
non-explosion, not broader activation, ARAD, hit-location, or defensive
special-rule lifecycle. Ambiguous RISC LPM linkage is represented by generic
no-fallback module destruction, while LAM/non-BattleMech fuel equipment,
bomb bays, incendiary ammo lifecycle, and unrepresented generic
explosive-equipment parity remain outside the represented ground BattleMech
equipment-critical replay slice.
The AC PLAYTEST_3 slice only claims the
first autocannon equipment/weapon critical recording autocannon-hit state with
`destroyed=false` and a later critical against the same mounted AC resolving
normally; broader AC rate-of-fire, jam, or explosion behavior is not claimed
here. SCM heat-benefit and heat-capacity mechanics plus broader coolant use,
coolant failure, and heat-phase behavior are not claimed by the narrow
critical-slot lifecycle rows. Bomb-bay equipment critical behavior is tracked as
an out-of-scope aerospace/small-craft row, not a BattleMech blocker.

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

**Remaining gaps** (gap inventory): represented grounded DropShip level-10
cover-provider output is integrated under
`ruleSupport.terrainEnvironment.terrain-los-grounded-dropship-cover-providers`.
Represented HeavyIndustrial and PlantedField TacOps LOS1 diagram
elevation/density comparisons are now integrated by `calculateLOS`. Fuel-tank
elevation, represented fuel-tank damageable cover-provider metadata,
represented hard/soft building cover-provider metadata, and damageable-cover
hit-resolution routing into represented `constructionFactor` terrain state are
integrated separately.
Represented single-path and divided-path
pure elevation blockers are accounted as integrated sibling rows, and
`ruleSupport.terrainEnvironment.terrain-los-side-paths` is now a split-accounting
row rather than an unsupported leaf.

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
that produce validation evidence should not be added to the suppressible
legacy-detector allowlist; they surface by default even when their message text
matches a broad bucket. Do not add new broad buckets for shipped features.

### For Game Engine Developers

When a feature listed here changes status:

1. Update the section here to match the catalog/gap-inventory reality
2. Audit whether any legacy detector still emits messages matching the bucket;
   if none do, retire the bucket (this requires updating the validation traps
   in `CombatValidationScopeSupport.ts` and the contract tests in lockstep)
3. Never report feature status from this file — cite the catalog

### For Simulation Report Reviewers

If a violation was filtered as a known limitation but the section above says
the feature is implemented, treat it as a potential masked bug: confirm the
emitting invariant is intentionally allowlisted as a legacy detector, then
re-run the catalog validation lane before dismissing it.

---

## Maintenance

**Last Updated**: 2026-06-21 (`restore-ci-correctness-teeth` inverted
suppression from broad message-text matching to explicit legacy-detector
opt-in, keeping new validation invariants visible by default)

**Review Frequency**: Update this document whenever:

- A feature covered by a bucket changes support level in the catalog
- A legacy generic detector is added or retired
- Simulation invariants are added that might trigger false positives
