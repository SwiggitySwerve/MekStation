# critical-hit-system Specification

## Purpose

TBD - created by archiving change implement-phase4-validation. Update Purpose after archive.

## Requirements

### Requirement: Critical Hit Tables

Each location SHALL have a critical hit table.

#### Scenario: Critical slot determination with manifest

- **WHEN** a critical hit is scored on a location
- **THEN** a slot manifest SHALL be built from the unit's construction data
- **AND** a random occupied, non-destroyed slot SHALL be selected from the manifest
- **AND** the component occupying that slot SHALL receive the critical hit effect
- **AND** if the component is an actuator, the specific actuator type (shoulder, upper arm, lower arm, hand, hip, upper leg, lower leg, foot) SHALL determine the effect

### Requirement: Critical Hit Effects

Components SHALL have defined critical hit effects.

#### Scenario: Weapon critical

- **WHEN** a weapon takes critical hit
- **THEN** weapon SHALL be destroyed and cannot be used

#### Scenario: Engine critical

- **WHEN** engine takes critical hit
- **THEN** engine hit counter SHALL increase
- **AND** each engine hit SHALL generate +5 additional heat per turn
- **AND** 3 engine hits SHALL destroy the unit

#### Scenario: Gyro critical

- **WHEN** gyro takes critical hit
- **THEN** gyro hit counter SHALL increase
- **AND** each gyro hit SHALL add +3 to all PSR target numbers
- **AND** a PSR SHALL be triggered immediately
- **AND** 2 gyro hits on a standard gyro SHALL destroy the gyro (unit cannot stand)

#### Scenario: Cockpit critical

- **WHEN** cockpit takes critical hit
- **THEN** the pilot SHALL be killed immediately

#### Scenario: Sensor critical

- **WHEN** sensors take critical hit
- **THEN** sensor hit counter SHALL increase
- **AND** 1 sensor hit SHALL add +1 to all attack to-hit rolls
- **AND** 2 sensor hits SHALL add +2 to all attack to-hit rolls

#### Scenario: Life support critical

- **WHEN** life support takes critical hit
- **THEN** life support hit counter SHALL increase
- **AND** life support SHALL require 2 hits to destroy (hitsToDestroy = 2)
- **AND** life support destruction SHALL expose the pilot to environmental damage

#### Scenario: Heat sink critical

- **WHEN** a heat sink takes critical hit
- **THEN** the heat sink SHALL be destroyed
- **AND** heat dissipation capacity SHALL be reduced accordingly

#### Scenario: Jump jet critical

- **WHEN** a jump jet takes critical hit
- **THEN** the jump jet SHALL be destroyed
- **AND** maximum jump MP SHALL be reduced by 1

### Requirement: Ammo Explosion

Ammunition critical hits SHALL cause explosions.

#### Scenario: Ammo explosion with full damage calculation

- **WHEN** ammunition takes critical hit
- **THEN** remaining rounds SHALL cause explosion
- **AND** explosion damage = remainingRounds × damagePerRound
- **AND** CASE SHALL limit explosion damage to the single location (no transfer)
- **AND** CASE II SHALL limit transfer to 1 point
- **AND** without CASE, damage SHALL transfer normally and pilot SHALL take 1 damage

### Requirement: Critical Slot Selection

The system SHALL select critical slots randomly from occupied, non-destroyed slots in the affected location when a critical hit is scored.

#### Scenario: Slot selection from occupied slots

- **WHEN** a critical hit is to be applied to a location
- **THEN** the system SHALL build a manifest of occupied, non-destroyed slots in that location
- **AND** one slot SHALL be randomly selected from that manifest
- **AND** the component occupying that slot SHALL receive the critical hit

#### Scenario: All slots already destroyed

- **WHEN** a critical hit is to be applied to a location where all occupied slots are already destroyed
- **THEN** the critical hit SHALL have no additional effect

### Requirement: Eight Actuator Type Differentiation

The system SHALL differentiate between 8 distinct actuator types, each with unique critical hit effects.

#### Scenario: Shoulder actuator distinct from upper arm

- **WHEN** a shoulder actuator receives a critical hit
- **THEN** the effect SHALL be different from an upper arm actuator hit
- **AND** shoulder destruction SHALL prevent punching with that arm entirely (+4 weapon to-hit)
- **AND** upper arm destruction SHALL impose +1 weapon to-hit and halve punch damage

#### Scenario: Hip actuator distinct from upper leg

- **WHEN** a hip actuator receives a critical hit
- **THEN** the unit SHALL be unable to kick with that leg and require PSR per hex of movement
- **AND** upper leg destruction SHALL impose +2 kick to-hit and halve kick damage

#### Scenario: Foot actuator effects

- **WHEN** a foot actuator receives a critical hit
- **THEN** the kick to-hit modifier SHALL be +1
- **AND** a +1 PSR modifier for terrain SHALL be applied

### Requirement: TAC Wiring

Through-Armor Critical processing SHALL be wired into the damage pipeline so that TAC results from hit location rolls trigger critical hit resolution.

#### Scenario: TAC triggers critical resolution

- **WHEN** a hit location roll of 2 occurs and the TAC flag is set
- **THEN** the critical-hit-resolution system SHALL be invoked for the TAC location
- **AND** the critical hit determination roll SHALL be made regardless of remaining armor at that location

### Requirement: Roll of 12 Location-Dependent Effects

A critical hit determination roll of 12 SHALL have different effects based on the location type.

#### Scenario: Roll of 12 on arm or leg

- **WHEN** the critical hit determination roll is 12 on an arm or leg
- **THEN** the limb SHALL be blown off entirely (all components destroyed)

#### Scenario: Roll of 12 on head

- **WHEN** the critical hit determination roll is 12 on the head
- **THEN** the head SHALL be destroyed and the pilot SHALL be killed

#### Scenario: Roll of 12 on torso

- **WHEN** the critical hit determination roll is 12 on a center, left, or right torso
- **THEN** 3 critical hits SHALL be applied to that torso location
