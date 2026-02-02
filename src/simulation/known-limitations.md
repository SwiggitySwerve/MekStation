# Known Limitations

This document lists features that are not fully implemented in the MekStation game engine. The simulation system should **NOT** report violations related to these limitations as bugs.

These are documented gaps in functionality, not defects. They represent future work or design decisions to simplify the initial implementation.

---

## Physical Attacks

**Status**: Not Implemented (marked "Future" in codebase)

**Why**: Physical attacks (punches, kicks, pushes, charges, death-from-above) require complex hit location tables, damage calculations, and piloting skill checks that are not yet implemented. The game phase exists (`GamePhase.PhysicalAttack`) but has no resolution logic.

**When**: Planned for future milestone after ranged combat is stable and thoroughly tested.

**Code Reference**: `src/types/gameplay/GameSessionInterfaces.ts:39` - `PhysicalAttack = 'physical_attack'` with comment "Physical attacks (future)"

**Example Violations to Exclude**:
- "Unit should have physical attack option available"
- "Physical attack phase has no actions"
- "Melee combat not resolved"
- "Punch/kick/charge not implemented"

---

## Ammo Consumption Tracking

**Status**: Not Tracked (partial implementation)

**Why**: While ammo types are defined in the type system (`IUnitGameState.ammo: Record<string, number>`), actual consumption during weapon firing is not enforced. Units can fire weapons indefinitely without depleting ammunition. Reload mechanics and ammo bin management are not implemented.

**When**: Part of resource management milestone, requires persistent unit state and reload actions.

**Code Reference**: 
- `src/types/gameplay/GameSessionInterfaces.ts:451` - `ammo` field exists but not enforced
- `src/types/gameplay/CombatInterfaces.ts` - `ammoConsumed` field in interfaces but not validated

**Example Violations to Exclude**:
- "Unit fired weapon with 0 ammo remaining"
- "Ammo not decremented after firing"
- "Reload action not available"
- "Ammo bin empty but weapon still fires"

---

## Heat Shutdown Mechanics

**Status**: Partially Implemented (thresholds defined, enforcement incomplete)

**Why**: Heat thresholds are defined (`HEAT_THRESHOLDS.SHUTDOWN = 30` in `src/constants/heat.ts`), and heat accumulation is tracked, but automatic shutdown enforcement, shutdown recovery rolls, and heat-induced ammo explosions are not fully implemented in the game loop.

**When**: Part of heat management milestone, requires state machine for shutdown/restart cycles.

**Code Reference**:
- `src/constants/heat.ts:32` - `SHUTDOWN: 30` threshold defined
- `src/types/validation/HeatManagement.ts` - Shutdown risk checks exist but not enforced
- `src/utils/gameplay/__tests__/resolveHeatPhase.test.ts` - Tests for shutdown checks exist but implementation incomplete

**Example Violations to Exclude**:
- "Unit should shut down at 30 heat"
- "Shutdown recovery roll not performed"
- "Heat-induced ammo explosion not triggered at 24+ heat"
- "Unit moved after shutdown"

---

## Terrain Movement Cost Validation

**Status**: Partial Implementation (simplified costs)

**Why**: Basic terrain movement costs are implemented (`getHexMovementCost` in `src/utils/gameplay/movement.ts`), but some terrain types (water depth, rubble levels, building entry/exit) use simplified or placeholder costs. Detailed terrain rules from TechManual are not fully enforced.

**When**: Refinement in terrain milestone, requires expanded terrain type definitions.

**Code Reference**:
- `src/utils/gameplay/movement.ts:92-139` - `getHexMovementCost` function with basic terrain handling
- `src/types/gameplay/TerrainTypes.ts` - `TERRAIN_PROPERTIES` with simplified modifiers

**Example Violations to Exclude**:
- "Movement cost incorrect for water hexes" (unless clearly broken)
- "Rubble terrain cost should vary by level"
- "Building entry/exit cost not applied"
- "Terrain modifier mismatch with TechManual" (for unimplemented terrain types)

---

## Pilot Skill Checks

**Status**: Partially Implemented (piloting checks incomplete)

**Why**: Pilot skill values (`gunnery`, `piloting`) are tracked in `IGameUnit`, but many piloting skill checks are not enforced:
- Fall checks after taking leg damage
- Skid checks after running on pavement
- Consciousness checks after head hits (defined but not enforced)
- Ejection mechanics

**When**: Part of pilot mechanics milestone.

**Code Reference**:
- `src/types/gameplay/GameSessionInterfaces.ts:416-417` - Pilot skills defined
- `src/types/gameplay/GameSessionInterfaces.ts:327-330` - Consciousness check fields exist but not enforced

**Example Violations to Exclude**:
- "Piloting check not performed after leg damage"
- "Unit should fall after failed piloting check"
- "Consciousness check not triggered"
- "Ejection not available"

---

## Critical Hit Effects

**Status**: Partially Implemented (damage tracking only)

**Why**: Critical hits are tracked (`IDamageAppliedPayload.criticals`), but many critical hit effects are not enforced:
- Weapon destruction (tracked but not enforced in firing)
- Actuator damage affecting movement/attacks
- Sensor hits affecting targeting
- Gyro hits affecting piloting
- Engine hits affecting movement and heat

**When**: Part of critical effects milestone.

**Code Reference**:
- `src/types/gameplay/GameSessionInterfaces.ts:297` - `criticals` field exists
- `src/types/gameplay/GameSessionInterfaces.ts:449` - `destroyedEquipment` tracked but not enforced

**Example Violations to Exclude**:
- "Destroyed weapon still fires"
- "Actuator damage not affecting movement"
- "Sensor critical not affecting to-hit"
- "Gyro hit not affecting piloting checks"
- "Engine hit not affecting heat dissipation"

---

## Line of Sight (LOS) Validation

**Status**: Not Implemented (placeholder logic)

**Why**: True line-of-sight calculations considering terrain elevation, building heights, and intervening obstacles are not implemented. Current implementation may use simplified range checks.

**When**: Part of advanced combat milestone, requires 3D terrain model.

**Code Reference**:
- Movement validation exists but LOS validation is incomplete

**Example Violations to Exclude**:
- "LOS blocked by intervening terrain"
- "Elevation difference not considered for LOS"
- "Building blocks LOS but attack allowed"
- "Partial cover not calculated"

---

## Special Pilot Abilities (SPAs)

**Status**: Not Implemented (stubs exist)

**Why**: Special Pilot Abilities are defined in the type system but not enforced during gameplay. Effects like "Gunnery Specialist", "Dodge", "Melee Specialist" do not modify combat calculations.

**When**: Part of advanced pilot mechanics milestone.

**Code Reference**:
- `src/lib/campaign/progression/spaAcquisition.ts` - Marked `@stub - Not implemented`
- `src/types/pilot/SpecialAbilities.ts` - Abilities defined but not applied

**Example Violations to Exclude**:
- "SPA effect not applied to to-hit roll"
- "Dodge ability not reducing incoming damage"
- "Gunnery Specialist bonus not applied"

---

## Vehicle and Aerospace Rules

**Status**: Not Implemented (BattleMech-only)

**Why**: The game engine currently focuses on BattleMech combat. Vehicle movement rules (wheeled, tracked, hover, VTOL), vehicle damage tables, and aerospace unit rules are not implemented.

**When**: Future expansion after core BattleMech gameplay is complete.

**Code Reference**:
- `src/services/units/handlers/` - Multiple vehicle handlers marked "not implemented"
- `src/services/units/handlers/__tests__/VTOLUnitHandler.test.ts` - Tests expect "not implemented" errors

**Example Violations to Exclude**:
- "Vehicle movement rules not applied"
- "VTOL altitude not tracked"
- "Aerospace unit movement invalid"
- "Vehicle damage table not used"

---

## Campaign Progression Systems

**Status**: Not Implemented (stubs exist)

**Why**: Campaign-level systems like XP awards, skill progression, unit repair, and force management are stubbed out but not functional.

**When**: Part of campaign milestone.

**Code Reference**:
- `src/lib/campaign/progression/xpAwards.ts` - Marked `@stub - Not implemented`
- `src/lib/campaign/progression/spaAcquisition.ts` - Marked `@stub - Not implemented`

**Example Violations to Exclude**:
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

When implementing invariant checks, consult this document to avoid reporting known limitations as violations. Use the programmatic exclusion function `isKnownLimitation()` in `src/simulation/core/knownLimitations.ts`.

### For Game Engine Developers

When implementing a feature listed here:
1. Remove the corresponding section from this document
2. Update the exclusion patterns in `knownLimitations.ts`
3. Add tests to verify the feature works correctly
4. Update the simulation invariants to check the new feature

### For Simulation Report Reviewers

If a violation appears in simulation output, check this document first. If it matches a known limitation, the violation should have been filtered out - this indicates a bug in the exclusion logic, not the game engine.

---

## Maintenance

**Last Updated**: 2026-02-01

**Review Frequency**: Update this document whenever:
- A new limitation is discovered during simulation runs
- A previously limited feature is implemented
- Simulation invariants are added that might trigger false positives
