## ADDED Requirements

### Requirement: Phase Damage PSR After Every Damage Phase

At the end of the Physical Attack phase the standalone runner SHALL queue one `20+_damage` PSR for every surviving unit that can fall under MegaMek 48fcb2f64 `Mek.canFall` (a BattleMech-like unit that is not prone) and whose `damageThisPhase` reached the threshold (`TWPhaseEndManager.java:239`, `TWGameManager.java:17843-17893`). The threshold SHALL be 20, or 30 for a dual cockpit with an active dedicated pilot. The weapon-hit path and the end-of-phase sweep SHALL use the same helper, and a unit SHALL carry at most one `20+_damage` PSR at a time.

#### Scenario: Physical damage crosses the threshold

- **GIVEN** two attackers each kick one standing BattleMech in the Physical Attack phase
- **WHEN** the target's `damageThisPhase` is 20 or more at the end of the phase
- **THEN** exactly one `20+_damage` PSR SHALL be pending on the target

#### Scenario: Below the threshold

- **WHEN** the target took less than 20 physical damage
- **THEN** no `20+_damage` PSR SHALL be queued

#### Scenario: A unit that cannot fall

- **WHEN** a prone unit or a unit that is not a BattleMech reaches 20 damage in a phase
- **THEN** no `20+_damage` PSR SHALL be queued

#### Scenario: Dual cockpit threshold

- **WHEN** a dual cockpit unit with a dedicated pilot takes 29 damage in a phase
- **THEN** no PSR SHALL be due
- **AND** at 30 damage one SHALL be due

### Requirement: Movement Terrain PSRs Follow The Pinned Rules

Movement terrain PSRs SHALL follow MegaMek 48fcb2f64. Every step that changes position into a water hex SHALL roll the entering-water PSR, including water to water and a jump landing (`Entity.checkWaterMove`, `Entity.java:9615-9639`; `MovePathHandler.java:1615`); a hex that is ice-covered water is walked on and SHALL NOT roll for water. There SHALL be no exiting-water roll and no running-through-rough roll. Ice SHALL follow reckless-movement semantics (`Entity.checkRecklessMove`, `Entity.java:9241-9290`): one `moving_on_ice` PSR for each non-jump step taken in a hex containing ice, including a turn made on the ice. Entering rubble above level 5 (ultra-rubble) SHALL add +1 (`Entity.checkRubbleMove`, `Entity.java:9556-9559`). The `exiting_water` and `running_rough_terrain` reason codes SHALL remain valid for older replays.

#### Scenario: Water to water rolls again

- **WHEN** a standing BattleMech walks from one water hex into another
- **THEN** an `entering_water` PSR SHALL be queued for that step

#### Scenario: Leaving water rolls nothing

- **WHEN** a BattleMech walks from a water hex onto clear ground
- **THEN** no PSR SHALL be queued

#### Scenario: Rough terrain rolls nothing

- **WHEN** a BattleMech runs into a rough hex
- **THEN** no PSR SHALL be queued

#### Scenario: Ice rolls on each step in the hex

- **WHEN** a BattleMech walks into an ice hex and then turns there
- **THEN** two `moving_on_ice` PSRs SHALL be queued
- **AND** a jump landing on the ice hex SHALL queue none

#### Scenario: Ultra-rubble

- **WHEN** a BattleMech enters a rubble hex of level 6
- **THEN** the `entering_rubble` PSR SHALL carry modifier +1
- **AND** at level 5 it SHALL carry modifier 0

### Requirement: Displacement Terrain PSRs

A unit forced into a hex by a displacement SHALL be given terrain PSRs only by `planDisplacementTerrainPSRs`, which follows `TWGameManager.doEntityDisplacement` (`TWGameManager.java:9771-9866`): building collapse for an overloaded building, the bog-down check for a BattleMech entering a bog-down hex whether or not it left one, and entering water for a BattleMech that can fall. There SHALL be no rubble, ice or exiting-water roll in a displacement. The PSRs SHALL carry no `movement-step` trigger source. The runner applies them for domino displacement.

#### Scenario: Domino into rubble over water

- **WHEN** a domino displacement moves a BattleMech into a hex with water over rubble
- **THEN** one `entering_water` PSR SHALL be queued and no `entering_rubble` PSR

#### Scenario: Domino between swamp hexes

- **WHEN** a domino displacement moves a BattleMech from a swamp hex into another swamp hex
- **THEN** a `swamp_bog_down` PSR SHALL be queued
