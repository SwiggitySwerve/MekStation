# heat-overflow-effects Specification

## Purpose

Documents the effects of heat overflow on BattleMech performance including movement penalties, combat modifiers, shutdown risks, and ammunition explosion chances per the BattleTech TechManual heat scale.

## ADDED Requirements

### Requirement: Heat Scale Thresholds

The system SHALL define heat scale effects at official TechManual thresholds.

#### Scenario: Complete heat scale table

- **GIVEN** a BattleMech with accumulated heat
- **WHEN** heat effects are calculated
- **THEN** the following thresholds SHALL apply:
  | Heat | Move Penalty | To-Hit Mod | Shutdown | Ammo Explosion |
  |------|-------------|------------|----------|----------------|
  | 0-4 | 0 | 0 | - | - |
  | 5-9 | -1 | 0 | - | - |
  | 10-14| -2 | +1 | - | - |
  | 15-17| -3 | +2 | - | - |
  | 18-19| -4 | +3 | - | - |
  | 20-21| -5 | +4 | 8+ | - |
  | 22-23| -6 | +4 | 6+ | - |
  | 24 | -7 | +4 | 6+ | 8+ |
  | 25 | -8 | +4 | 4+ | 8+ |
  | 26-27| -9 | +4 | 4+ | 6+ |
  | 28-29| -10 | +4 | 4+ | 4+ |
  | 30+ | Shutdown | - | Auto | Auto |

### Requirement: Movement Penalty Application

Heat movement penalties SHALL reduce available movement points.

#### Scenario: Heat reduces movement

- **GIVEN** a BattleMech with Walk 5 and Run 8
- **WHEN** heat level is 9
- **THEN** effective Walk SHALL be 4 (-1 penalty)
- **AND** effective Run SHALL be 7 (-1 penalty)

#### Scenario: TSM interaction with heat

- **GIVEN** a BattleMech with Walk 5 and TSM equipped
- **WHEN** heat level is 9 (TSM activates)
- **THEN** TSM SHALL add +2 to Walk MP
- **AND** heat penalty SHALL subtract 1 from movement
- **AND** effective Walk SHALL be 6 (5 + 2 - 1)
- **AND** effective Run SHALL be 9 (ceil(6 × 1.5))

### Requirement: Shutdown Risk Calculation

The system SHALL calculate shutdown risk at appropriate heat levels.

#### Scenario: Shutdown avoidance roll

- **GIVEN** a BattleMech with heat level 20
- **WHEN** end phase shutdown check occurs
- **THEN** pilot SHALL roll 2d6
- **AND** result of 8+ SHALL avoid shutdown
- **AND** result below 8 SHALL cause shutdown

#### Scenario: Automatic shutdown

- **GIVEN** a BattleMech with heat level 30+
- **WHEN** end phase occurs
- **THEN** mech SHALL automatically shut down
- **AND** no roll SHALL be permitted

### Requirement: Ammunition Explosion Risk

The system SHALL calculate ammo explosion risk at critical heat levels.

#### Scenario: Ammo explosion check

- **GIVEN** a BattleMech with heat level 24 and ammunition
- **WHEN** end phase ammo explosion check occurs
- **THEN** pilot SHALL roll 2d6 per ammo bin
- **AND** result of 8+ SHALL avoid explosion
- **AND** result below 8 SHALL cause ammo explosion

#### Scenario: Automatic ammo explosion

- **GIVEN** a BattleMech with heat level 30+ and ammunition
- **WHEN** end phase occurs
- **THEN** all ammunition SHALL automatically explode
- **AND** no roll SHALL be permitted

### Requirement: TSM Activation Threshold

Triple Strength Myomer SHALL activate at specific heat threshold.

#### Scenario: TSM heat activation

- **GIVEN** a BattleMech with TSM equipped
- **WHEN** heat level reaches 9 or higher
- **THEN** TSM SHALL become active
- **AND** Walk MP SHALL increase by 2
- **AND** physical attack damage SHALL double

#### Scenario: TSM deactivation

- **GIVEN** a BattleMech with active TSM
- **WHEN** heat level drops below 9
- **THEN** TSM SHALL deactivate
- **AND** movement and damage SHALL return to normal

## Related Capabilities

- `heat-management-system` - Heat generation and dissipation tracking
- `heat-sink-system` - Heat dissipation equipment
- `movement-system` - Movement point calculations
- `ammunition-system` - Ammunition storage and explosion mechanics
