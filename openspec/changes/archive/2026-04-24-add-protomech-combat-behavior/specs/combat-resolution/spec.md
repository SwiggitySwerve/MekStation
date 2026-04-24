# combat-resolution (delta)

## ADDED Requirements

### Requirement: ProtoMech Combat Dispatch

The combat resolution engine SHALL route ProtoMech targets to a proto-specific damage pipeline.

#### Scenario: Proto target routing

- **GIVEN** an attack whose target has `unitType === UnitType.PROTOMECH`
- **WHEN** the engine resolves the hit
- **THEN** `protoMechResolveDamage()` SHALL be invoked
- **AND** proto-specific hit-location and crit tables SHALL be used

### Requirement: ProtoMech Damage Chain

The proto damage chain SHALL apply armor-then-structure per location with no cross-location transfer.

#### Scenario: Damage contained to location

- **GIVEN** a proto where the LeftArm has 3 armor and 3 structure
- **WHEN** 15 damage hits the LeftArm
- **THEN** armor and structure SHALL both be reduced to 0
- **AND** the LeftArm SHALL be destroyed
- **AND** the 9 excess damage SHALL be discarded (not transferred to Torso)

#### Scenario: Torso destruction destroys proto

- **GIVEN** a proto whose Torso armor and structure drop to 0
- **WHEN** the destruction event fires
- **THEN** the proto SHALL be flagged destroyed
- **AND** a `UnitDestroyed` event SHALL fire

#### Scenario: Main gun destruction

- **GIVEN** a proto whose MainGun location is destroyed
- **WHEN** the destruction event fires
- **THEN** the main gun weapon SHALL be removed
- **AND** a `ProtoLocationDestroyed` event SHALL specify MainGun
- **AND** the proto SHALL continue operating (not destroyed)

### Requirement: ProtoMech Critical Hit Table

The system SHALL use a proto-specific crit table simpler than the mech table.

#### Scenario: Proto crit outcomes

- **WHEN** a proto critical hit is rolled (2d6)
- **THEN** outcomes SHALL map:
  - 2-7 = no critical
  - 8-9 = random equipment destroyed at the hit location
  - 10-11 = engine hit (1st = -1 MP, 2nd = engine destroyed → proto destroyed)
  - 12 = pilot killed (proto abandoned, counts as destroyed)

#### Scenario: Pilot killed ends participation

- **GIVEN** a proto whose 12 crit fires
- **WHEN** the event is applied
- **THEN** a `ProtoPilotKilled` event SHALL fire
- **AND** the proto SHALL be removed from active play

### Requirement: Glider ProtoMech Fall Rule

Glider protos SHALL make a fall roll on any structure-exposing damage while airborne.

#### Scenario: Fall roll triggered

- **GIVEN** an airborne Glider proto that takes damage exposing structure
- **WHEN** the damage resolves
- **THEN** a piloting roll vs TN 7 SHALL be made
- **AND** on failure a `GliderFall` event SHALL fire
- **AND** the proto SHALL take `10 × altitude` fall damage
- **AND** altitude SHALL reset to 0

## MODIFIED Requirements

### Requirement: Damage Distribution

The system SHALL distribute damage across units based on battle intensity and outcome.

#### Scenario: Victory results in light damage

- **GIVEN** a battle with outcome VICTORY and 4 player units
- **WHEN** distributeDamage is called
- **THEN** units receive 0-30% damage on average

#### Scenario: Defeat results in heavy damage

- **GIVEN** a battle with outcome DEFEAT and 4 player units
- **WHEN** distributeDamage is called
- **THEN** units receive 40-80% damage on average

#### Scenario: Draw results in moderate damage

- **GIVEN** a battle with outcome DRAW and 4 player units
- **WHEN** distributeDamage is called
- **THEN** units receive 20-50% damage on average

#### Scenario: Abandoned proto counts as destroyed

- **GIVEN** a battle where a proto was abandoned due to pilot kill
- **WHEN** distributeDamage is called
- **THEN** the proto SHALL be counted as destroyed for victory/salvage purposes
