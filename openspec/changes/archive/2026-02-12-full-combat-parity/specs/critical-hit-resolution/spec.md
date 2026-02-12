## ADDED Requirements

### Requirement: Critical Hit Roll Resolution

When internal structure is exposed at a location, the system SHALL roll 2d6 on the critical hit determination table to determine the number of critical hits inflicted.

#### Scenario: Standard critical hit determination roll

- **WHEN** internal structure is exposed at a location and 2d6 is rolled
- **THEN** roll 2-7 SHALL result in 0 critical hits (no critical)
- **AND** roll 8-9 SHALL result in 1 critical hit
- **AND** roll 10-11 SHALL result in 2 critical hits
- **AND** roll 12 SHALL have location-dependent effects

#### Scenario: Roll of 12 on a limb (arm or leg)

- **WHEN** critical hit determination roll is 12 on an arm or leg location
- **THEN** the limb SHALL be blown off (all components destroyed, location destroyed)

#### Scenario: Roll of 12 on the head

- **WHEN** critical hit determination roll is 12 on the head
- **THEN** the head SHALL be destroyed (pilot killed)

#### Scenario: Roll of 12 on a torso location

- **WHEN** critical hit determination roll is 12 on center torso, left torso, or right torso
- **THEN** 3 critical hits SHALL be applied to that torso location

### Requirement: Critical Slot Selection

The system SHALL select critical slots randomly from occupied, non-destroyed slots in the affected location.

#### Scenario: Random slot selection from occupied slots

- **WHEN** applying N critical hits to a location
- **THEN** each critical hit SHALL randomly select one occupied, non-destroyed slot
- **AND** the component occupying that slot SHALL receive a critical hit
- **AND** if all occupied slots are already destroyed, remaining critical hits SHALL have no additional effect

#### Scenario: Multi-slot component receives one hit

- **WHEN** a critical slot is selected that belongs to a multi-slot component (e.g., a weapon occupying 3 slots)
- **THEN** only one critical hit SHALL be applied to that component per slot selection
- **AND** additional slot selections on the same component SHALL count as additional hits

### Requirement: Engine Critical Hit Effects

Engine critical hits SHALL generate +5 heat per hit and 3 engine hits SHALL destroy the unit.

#### Scenario: First engine critical hit

- **WHEN** an engine component receives its first critical hit
- **THEN** the unit SHALL generate +5 additional heat per turn
- **AND** engineHits SHALL be set to 1

#### Scenario: Second engine critical hit

- **WHEN** an engine component receives its second critical hit
- **THEN** the unit SHALL generate +10 additional heat per turn (cumulative)
- **AND** engineHits SHALL be set to 2

#### Scenario: Third engine critical hit destroys unit

- **WHEN** an engine component receives its third critical hit
- **THEN** the unit SHALL be destroyed immediately
- **AND** a UnitDestroyed event SHALL be emitted

### Requirement: Gyro Critical Hit Effects

Gyro critical hits SHALL impose +3 PSR modifier per hit, and 2 hits SHALL destroy the gyro.

#### Scenario: First gyro critical hit

- **WHEN** a gyro component receives its first critical hit
- **THEN** all piloting skill rolls SHALL receive a +3 modifier
- **AND** the pilot SHALL immediately make a PSR to avoid falling

#### Scenario: Second gyro critical hit

- **WHEN** a gyro component receives its second critical hit (standard gyro)
- **THEN** the gyro SHALL be destroyed
- **AND** the unit SHALL automatically fall
- **AND** the unit SHALL be unable to stand for the remainder of the game

### Requirement: Cockpit Critical Hit Effects

A cockpit critical hit SHALL kill the pilot.

#### Scenario: Cockpit takes critical hit

- **WHEN** the cockpit receives a critical hit
- **THEN** the pilot SHALL be killed immediately
- **AND** the unit SHALL be rendered inoperable
- **AND** a PilotHit event with lethal=true SHALL be emitted

### Requirement: Sensor Critical Hit Effects

Sensor critical hits SHALL impose cumulative to-hit penalties.

#### Scenario: First sensor critical hit

- **WHEN** sensors receive their first critical hit
- **THEN** all attacks by the unit SHALL receive a +1 to-hit modifier
- **AND** sensorHits SHALL be set to 1

#### Scenario: Second sensor critical hit

- **WHEN** sensors receive their second critical hit
- **THEN** all attacks by the unit SHALL receive a +2 to-hit modifier (total, not cumulative with first)
- **AND** sensorHits SHALL be set to 2

### Requirement: Actuator Critical Hit Effects

The system SHALL apply distinct effects for each of the 7 actuator types when critically hit.

#### Scenario: Shoulder actuator destroyed

- **WHEN** a shoulder actuator receives a critical hit
- **THEN** the arm SHALL be unable to punch with that arm
- **AND** weapons in that arm SHALL receive a +4 to-hit modifier

#### Scenario: Upper arm actuator destroyed

- **WHEN** an upper arm actuator receives a critical hit
- **THEN** attacks with that arm's weapons SHALL receive a +1 to-hit modifier
- **AND** punch damage from that arm SHALL be halved (round down)

#### Scenario: Lower arm actuator destroyed

- **WHEN** a lower arm actuator receives a critical hit
- **THEN** attacks with that arm's weapons SHALL receive a +1 to-hit modifier
- **AND** punch damage from that arm SHALL be halved (round down)

#### Scenario: Hand actuator destroyed

- **WHEN** a hand actuator receives a critical hit
- **THEN** attacks with that arm's weapons SHALL receive a +1 to-hit modifier
- **AND** the arm SHALL be unable to use melee weapons requiring a hand actuator

#### Scenario: Hip actuator destroyed

- **WHEN** a hip actuator receives a critical hit
- **THEN** the unit SHALL be unable to kick with that leg
- **AND** the unit SHALL require a PSR for each hex of movement
- **AND** movement MP SHALL be halved

#### Scenario: Upper leg actuator destroyed

- **WHEN** an upper leg actuator receives a critical hit
- **THEN** kick attacks with that leg SHALL receive a +2 to-hit modifier
- **AND** kick damage from that leg SHALL be halved (round down)

#### Scenario: Lower leg actuator destroyed

- **WHEN** a lower leg actuator receives a critical hit
- **THEN** kick attacks with that leg SHALL receive a +2 to-hit modifier
- **AND** kick damage from that leg SHALL be halved (round down)

#### Scenario: Foot actuator destroyed

- **WHEN** a foot actuator receives a critical hit
- **THEN** kick attacks with that leg SHALL receive a +1 to-hit modifier
- **AND** the unit SHALL receive a +1 PSR modifier for terrain

### Requirement: Weapon Critical Hit Effects

A weapon receiving a critical hit SHALL be destroyed and unusable.

#### Scenario: Weapon destroyed by critical hit

- **WHEN** a weapon component receives a critical hit
- **THEN** the weapon SHALL be marked as destroyed
- **AND** the weapon SHALL NOT be usable for the remainder of the game
- **AND** the weapon SHALL be added to weaponsDestroyed in component damage state

### Requirement: Heat Sink Critical Hit Effects

A heat sink receiving a critical hit SHALL reduce heat dissipation capacity.

#### Scenario: Heat sink destroyed by critical hit

- **WHEN** a heat sink receives a critical hit
- **THEN** the heat sink SHALL be destroyed
- **AND** heat dissipation capacity SHALL be reduced by 1 (single) or 2 (double)
- **AND** heatSinksDestroyed counter SHALL be incremented

### Requirement: Jump Jet Critical Hit Effects

A jump jet receiving a critical hit SHALL reduce jump MP.

#### Scenario: Jump jet destroyed by critical hit

- **WHEN** a jump jet receives a critical hit
- **THEN** the jump jet SHALL be destroyed
- **AND** maximum jump MP SHALL be reduced by 1
- **AND** jumpJetsDestroyed counter SHALL be incremented

### Requirement: Through-Armor Critical (TAC) Processing

When a hit location roll results in a TAC-eligible result (roll of 2), the system SHALL process a Through-Armor Critical on the appropriate location.

#### Scenario: TAC triggered on hit location roll of 2

- **WHEN** a hit location roll results in 2
- **THEN** a Through-Armor Critical check SHALL be performed on the TAC location
- **AND** the TAC location SHALL be determined by attack direction (front/rear → CT, left → LT, right → RT)

#### Scenario: TAC on location with remaining armor

- **WHEN** a TAC is triggered on a location that still has armor
- **THEN** a critical hit determination roll SHALL still be made
- **AND** if the roll indicates criticals, they SHALL be applied regardless of armor

### Requirement: Cascade Effects

Critical hits SHALL trigger appropriate cascade effects such as ammo explosions and PSR triggers.

#### Scenario: Ammo critical triggers explosion

- **WHEN** an ammo bin receives a critical hit
- **THEN** an ammo explosion SHALL be triggered immediately
- **AND** the ammo-explosion-system SHALL handle damage resolution

#### Scenario: Gyro or leg critical triggers PSR

- **WHEN** a gyro, hip, upper leg, lower leg, or foot actuator receives a critical hit
- **THEN** a piloting skill roll SHALL be triggered
- **AND** the PSR SHALL use appropriate modifiers for the damaged component

### Requirement: Injectable Randomness for Critical Hits

All critical hit resolution SHALL use injectable DiceRoller for deterministic testing.

#### Scenario: Deterministic critical hit resolution

- **WHEN** resolving critical hits with a seeded DiceRoller
- **THEN** identical inputs and seeds SHALL produce identical critical hit outcomes
- **AND** slot selection SHALL use the same injectable random source
