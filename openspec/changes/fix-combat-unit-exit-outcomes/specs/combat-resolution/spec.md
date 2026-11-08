## ADDED Requirements

### Requirement: Combat Outcome Unit Exit Reason

`IUnitCombatDelta` SHALL carry an optional `exitReason` of `'ejected'` or `'retreated'` when the unit left the battle by ejection or retreat, derived from the unit state at outcome derivation. The field SHALL be omitted for a unit that stayed, so outcomes without exits keep their persisted bytes, and `COMBAT_OUTCOME_VERSION` SHALL stay 1. `finalStatus` SHALL remain the damage classification.

Consumers SHALL read the exit through `readDeltaExitReason`: the field when present; otherwise the first `UnitDestroyed`, `UnitEjected` or `UnitRetreated` event for the unit in `report.log`, where a destruction logged first means no exit; otherwise null.

#### Scenario: Ejected unit records its exit

- **GIVEN** a session in which a player unit's pilot ejected
- **WHEN** the combat outcome is derived (interactive, fast-forward or multiplayer close)
- **THEN** the unit's delta SHALL carry `exitReason: 'ejected'`
- **AND** a unit that stayed SHALL have no `exitReason` property

#### Scenario: An outcome stored before the field is read through its log

- **GIVEN** a persisted outcome whose deltas lack `exitReason` and whose `report.log` holds a `UnitRetreated` for an enemy unit
- **WHEN** `readDeltaExitReason` reads that unit
- **THEN** it SHALL return `'retreated'`

#### Scenario: No exit recorded

- **GIVEN** a delta without `exitReason` and a log without an exit event for the unit
- **WHEN** `readDeltaExitReason` reads it
- **THEN** it SHALL return null

### Requirement: Combat Outcome Pilot Death

A pilot SHALL be recorded KIA (`pilotState.killed: true`, `finalStatus: KIA`) only when the pilot reached 6 wounds or the unit was destroyed with cause `pilot_death` or `head_destroyed`, and never after the pilot ejected. A knocked-out pilot in a destroyed unit SHALL be recorded Unconscious, not KIA. This follows MekHQ, where a person is dead at 6 hits (`PersonStatus.setHits`/`isDead`, ResolveScenarioTracker.java:2615-2645 at e7adc2c), and MegaMek, which sets hits to 6 on crew death or doom and not once ejected (Crew.java:1201-1215, 1252-1258 at 48fcb2f64).

#### Scenario: Knocked-out pilot in a destroyed unit survives

- **GIVEN** a unit destroyed through the center torso whose pilot is unconscious with 3 wounds
- **WHEN** the combat outcome is derived
- **THEN** the pilot SHALL be Unconscious and `killed` SHALL be false

#### Scenario: Head destruction kills the pilot

- **GIVEN** a unit destroyed with cause `head_destroyed`
- **WHEN** the combat outcome is derived
- **THEN** the pilot SHALL be KIA

### Requirement: Exit-Aware Salvage Eligibility

Salvage SHALL include an enemy unit whose pilot ejected, whatever its damage, and SHALL exclude an enemy unit that retreated. Units that stayed SHALL keep each caller's existing rule. Campaign salvage and co-op salvage SHALL share one eligibility helper. MekHQ adds enemy graveyard wrecks, ejected units included, to potential salvage (ResolveScenarioTracker.java:658-680; MegaMek Game.java:1334-1344) and never adds an enemy that retreated (ResolveScenarioTracker.java:568-608).

#### Scenario: Retreated damaged enemy is not salvage

- **GIVEN** an outcome with a damaged enemy that retreated and a damaged enemy that stayed
- **WHEN** salvage candidates are aggregated
- **THEN** only the enemy that stayed SHALL be a candidate

#### Scenario: Abandoned enemy is salvage

- **GIVEN** an undamaged enemy whose pilot ejected
- **WHEN** salvage candidates are aggregated
- **THEN** it SHALL be a candidate with final status `ejected`

### Requirement: Ejected Player Unit Field Recovery

When a player unit's pilot ejected and the player did not win, post-battle processing SHALL set the unit's `combatReady` to false. A unit that retreated SHALL keep its `combatReady`. MekHQ recovers an abandoned player wreck only when the player controls the field (`assignFoundEntity(wreck, !control)`, ResolveScenarioTracker.java:637); MekStation uses the post-battle winner as the control proxy.

#### Scenario: Ejected unit lost in a defeat

- **GIVEN** an outcome the player lost with a player unit whose pilot ejected
- **WHEN** the outcome is applied
- **THEN** that unit's `combatReady` SHALL be false

#### Scenario: Ejected unit recovered in a victory

- **GIVEN** an outcome the player won with a player unit whose pilot ejected
- **WHEN** the outcome is applied
- **THEN** that unit's `combatReady` SHALL stay true

## REMOVED Requirements

### Requirement: Combat Outcome Pilot KIA Path Documented As Wave-5 Gated

**Reason**: KIA is reachable (`applyPilotHit` marks the pilot dead at 6 wounds) and now follows the Combat Outcome Pilot Death requirement, so the remark this requirement mandated was wrong.

**Migration**: The `pilotState` JSDoc in `src/types/combat/CombatOutcome.ts` documents the KIA rule instead.
