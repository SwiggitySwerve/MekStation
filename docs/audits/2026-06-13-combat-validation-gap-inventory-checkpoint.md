# Combat Validation Gap Inventory Checkpoint

## Latest Checkpoint

As of the live exporter pass on 2026-06-15, the catalog-driven BattleMech
combat validation suite has no unresolved BattleMech helper-only or unsupported
rows. The former final leaf blocker,
`ruleSupport.physicalLegalityGates.shared.displacement-domino-step-out-cfr`,
is now represented by replayable `blockerStepOutDecision` payloads that apply
successful `domino_step_out` displacement without forced DominoEffect PSRs and
preserve forced fallback for failed, declined, invalid, or no-response
decisions.

## Current Accounting

Live summary command:

```powershell
npx.cmd tsx scripts/print-combat-validation-gaps.ts --format=summary
```

Current counts:

- Total unresolved rows: 0
- Helper-only aggregate rows: 0
- Unsupported leaf rows: 0
- By section: none
- By scope: none

Live leaf-ref command:

```powershell
npx.cmd tsx scripts/print-combat-validation-gaps.ts --format=refs --scope=leaf
```

## Remaining Boundaries By Lane

### Physical Displacement

Physical core and self-risk rows are integrated. The represented slice
covers occupied-hex domino positional displacement, domino PSRs, same-phase
occupancy refresh, represented minefield fallout, represented terrain/building
and environment PSR fallout, friendly occupied DFA-miss avoidance, grounded
DropShip radius-two DFA hit displacement search, blocked successful-charge
no-op semantics, charge/DFA self-risk, immediate DFA miss fall timing, DFA
impossible-displacement destruction, and representative physical command/runner
parity. It also now covers voluntary step-out/CFR handling during
`TWGameManager.doEntityDisplacement`-style domino displacement through a
replayable event/session/runner payload surface for the eligible blocker,
side-entered/non-jumping context, legal forward/backward step options, blocker
step-out PSR result, `CFR_DOMINO_EFFECT` response, returned step-out path, and
null/no-response forced-displacement fallback.

The former
`ruleSupport.physicalLegalityGates.shared.displacement-domino-dropship-secondary-hex`
row is tracked as out-of-scope for this BattleMech
validation matrix because full DropShip footprint and secondary-hex
consequences require a separate large-unit validation matrix. The represented
BattleMech slice remains grounded-DropShip radius-two DFA hit displacement
search.

### Terrain And Environment

Terrain and movement/LOS aggregate rows are passive rollups. Represented
coverage includes terrain movement costs, partial cover, woods/smoke/fog/night
and dust/environmental modifiers, water/fire heat, source-backed land-to-depth-2+
water endpoint blocking, single-path and divided pure-elevation blocking,
underwater clear/non-water depth-0 blocking, same-building endpoint base-
elevation plus explicit LOS-height counting, building-height blocking, divided
side-path blocking/modifier selection, represented TacOps HeavyIndustrial and
PlantedField LOS1 side-path density/elevation behavior, `TerrainType.Mines`,
coordinate-state conventional minefield damage/lifecycle, manual conventional
and command-detonated detonation controls, density decrement, hidden
conventional reveal state, active/inferno/vibrabomb represented slices, and
typed non-conventional fail-closed guards, plus represented EMP
no-effect/interference/shutdown outcomes with replayable
`EmpMinefieldEffectApplied` state.

No terrain/environment leaf blockers remain in the current inventory. EMP
minefield target/electronics effects and grounded DropShip LOS cover-provider
output are represented by explicit integrated rows.

TacOps industrial-zone and planted-field side-path classes are no longer
current blockers: MekStation now has represented `TerrainType.HeavyIndustrial`
and `TerrainType.PlantedField` rows, source-pinned LOS/to-hit catalog entries,
and behavior tests for straight/divided TacOps LOS1 side-path elevation gating,
heavy-industrial blocking after more than two represented hexes, and planted-
field blocking after more than five represented fields.

### Objective Rollups

No helper-only objective rollups remain in the unresolved exporter. Physical
core actions, physical self-risk, damage/death equipment-critical rows,
physical catalog/runtime-action rows, minefield variant side-path rows, EMP
minefield effects, grounded DropShip LOS cover providers, and TacOps
HeavyIndustrial/PlantedField LOS rows are no longer unresolved BattleMech leaf
blockers in the live exporter.

## Verification Snapshot

Fresh commands run for this checkpoint:

- `npx.cmd tsx scripts/print-combat-validation-gaps.ts --format=summary`
- `npx.cmd tsx scripts/print-combat-validation-gaps.ts --format=refs --scope=leaf`
- `npm.cmd run validate:combat` passed: unresolved baseline `0` total rows,
  out-of-scope split `140` rows, and 76 suites / 2648 tests.
- `npm.cmd run typecheck -- --pretty false` passed.
- `npx.cmd oxfmt --check ...` passed for touched files.
- `npx.cmd openspec validate --all --strict` passed.

## Finish-Up Rule

A leaf row is complete only when its exact exported row is removed from
`getCombatValidationUnresolvedRows`, or when the row remains visible as an
explicit unsupported feature gap. Source refs, helper functions, sibling
slices, and knownLimitations entries do not count as coverage by themselves.

Do not re-open already integrated coverage for catalog fallback prevention, MML
variable damage parsing, UAC/RAC/LB-X/Streak/Artemis/NARC/TAG/AMS represented
slices, C3 runtime consumption/seeding, ejection targetability/removal,
represented physical commands, represented Claw/Talon runtime modifier
lifecycle, represented minefield conventional damage/lifecycle, or represented
terrain LOS sub-slices unless a fresh exporter or test failure proves drift.
