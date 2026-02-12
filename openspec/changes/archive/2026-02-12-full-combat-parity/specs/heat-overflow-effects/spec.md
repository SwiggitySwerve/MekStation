## ADDED Requirements

### Requirement: Shutdown/Startup Mechanics

The heat overflow system SHALL integrate shutdown and startup mechanics as defined in the shutdown-startup-system spec.

#### Scenario: Shutdown check at heat 14+

- **WHEN** a unit's heat level is 14 or above at the end of the heat phase
- **THEN** a shutdown check SHALL be performed
- **AND** the target number SHALL be `4 + floor((heat - 14) / 4) * 2`

#### Scenario: Automatic shutdown at heat 30+

- **WHEN** a unit's heat level is 30 or above
- **THEN** the unit SHALL automatically shut down without a roll

#### Scenario: Startup attempt at beginning of turn

- **WHEN** a shutdown unit begins its turn
- **THEN** a startup roll SHALL be attempted using the same target number formula

### Requirement: Pilot Heat Damage

At extreme heat levels, the pilot SHALL take damage from heat exposure.

#### Scenario: Pilot heat damage at heat 15-24

- **WHEN** a unit's heat level is between 15 and 24 (inclusive) during the heat phase
- **THEN** the pilot SHALL take 1 point of damage if life support is damaged

#### Scenario: Pilot heat damage at heat 25+

- **WHEN** a unit's heat level is 25 or above during the heat phase
- **THEN** the pilot SHALL take 2 points of damage if life support is damaged

#### Scenario: No pilot heat damage with functional life support

- **WHEN** life support is fully functional (0 hits)
- **THEN** the pilot SHALL NOT take heat-induced damage below heat 30

### Requirement: Consolidated Single Source of Truth

All heat effect thresholds SHALL be defined in a single canonical source (`constants/heat.ts`), eliminating contradicting threshold tables.

#### Scenario: Single heat effect table authority

- **WHEN** any system needs heat effect thresholds
- **THEN** it SHALL reference the single canonical source in `constants/heat.ts`
- **AND** the `toHit.ts` local heat thresholds SHALL be removed
- **AND** the `HeatManagement.ts` validation-time thresholds SHALL reference the canonical source

## MODIFIED Requirements

### Requirement: Heat Scale Thresholds

The system SHALL define heat scale effects at MegaMek canonical thresholds.

#### Scenario: Corrected heat scale table

- **GIVEN** a BattleMech with accumulated heat
- **WHEN** heat effects are calculated
- **THEN** the following MegaMek canonical thresholds SHALL apply:
  | Heat | To-Hit Mod | Move Penalty | Shutdown TN | Ammo TN |
  |------|------------|--------------|-------------|---------|
  | 0-7 | 0 | floor(heat/5) | - | - |
  | 8-12 | +1 | floor(heat/5) | - | - |
  | 13-13 | +2 | floor(heat/5) | - | - |
  | 14-16 | +2 | floor(heat/5) | 4 | - |
  | 17-18 | +3 | floor(heat/5) | varies | - |
  | 19-23 | varies | floor(heat/5) | varies | 4 |
  | 24+ | +4 | floor(heat/5) | varies | varies |
  | 30+ | - | Shutdown | Auto | Auto |
- **AND** to-hit modifiers SHALL be: +1 at heat 8, +2 at heat 13, +3 at heat 17, +4 at heat 24
- **AND** movement penalty SHALL be `floor(heat / 5)` MP reduction
- **AND** shutdown TN SHALL be `4 + floor((heat - 14) / 4) * 2` for heat ≥ 14
- **AND** ammo explosion TN SHALL be: 4 at heat 19, 6 at heat 23, 8 at heat 28

### Requirement: Movement Penalty Application

Heat movement penalties SHALL reduce available movement points.

#### Scenario: Heat reduces movement using floor(heat/5) formula

- **GIVEN** a BattleMech with Walk 5 and Run 8
- **WHEN** heat level is 9
- **THEN** movement penalty SHALL be `floor(9 / 5) = 1`
- **AND** effective Walk SHALL be 4
- **AND** effective Run SHALL be 7

#### Scenario: Heat level 15 movement penalty

- **GIVEN** a BattleMech with Walk 5
- **WHEN** heat level is 15
- **THEN** movement penalty SHALL be `floor(15 / 5) = 3`
- **AND** effective Walk SHALL be 2

#### Scenario: TSM interaction with heat

- **GIVEN** a BattleMech with Walk 5 and TSM equipped
- **WHEN** heat level is 9 (TSM activates)
- **THEN** TSM SHALL add +2 to Walk MP
- **AND** heat penalty SHALL subtract `floor(9 / 5) = 1` from movement
- **AND** effective Walk SHALL be 6 (5 + 2 - 1)

### Requirement: Shutdown Risk Calculation

The system SHALL calculate shutdown risk at appropriate heat levels.

#### Scenario: Shutdown avoidance roll with formula

- **GIVEN** a BattleMech with heat level 20
- **WHEN** end phase shutdown check occurs
- **THEN** the shutdown TN SHALL be `4 + floor((20 - 14) / 4) * 2 = 4 + 2 = 6`
- **AND** a 2d6 roll of 6 or higher SHALL avoid shutdown

#### Scenario: Automatic shutdown at 30+

- **GIVEN** a BattleMech with heat level 30+
- **WHEN** end phase occurs
- **THEN** mech SHALL automatically shut down
- **AND** no roll SHALL be permitted

### Requirement: Ammunition Explosion Risk

The system SHALL calculate ammo explosion risk at critical heat levels.

#### Scenario: Ammo explosion check at heat 19

- **GIVEN** a BattleMech with heat level 19 and ammunition
- **WHEN** end phase ammo explosion check occurs
- **THEN** roll SHALL be against target number 4
- **AND** a 2d6 roll of 4 or higher SHALL avoid explosion

#### Scenario: Ammo explosion check at heat 23

- **GIVEN** a BattleMech with heat level 23 and ammunition
- **WHEN** end phase ammo explosion check occurs
- **THEN** roll SHALL be against target number 6

#### Scenario: Ammo explosion check at heat 28

- **GIVEN** a BattleMech with heat level 28 and ammunition
- **WHEN** end phase ammo explosion check occurs
- **THEN** roll SHALL be against target number 8

#### Scenario: Automatic ammo explosion at 30+

- **GIVEN** a BattleMech with heat level 30+ and ammunition
- **WHEN** end phase occurs
- **THEN** all ammunition SHALL automatically explode
