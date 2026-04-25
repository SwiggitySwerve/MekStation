# physical-attack-system (delta)

## ADDED Requirements

### Requirement: Physical Attack Phase Is Non-Empty

The `GamePhase.PhysicalAttack` branch in the engine SHALL execute declaration, validation, to-hit resolution, damage resolution, and PSR triggering steps — not merely advance the phase.

#### Scenario: Phase runs resolution when declarations exist

- **GIVEN** two units with valid physical-attack declarations
- **WHEN** the physical-attack phase runs
- **THEN** both declarations SHALL be validated, to-hit rolled, and damage applied
- **AND** `PhysicalAttackResolved` events SHALL be emitted for both

#### Scenario: Phase advances cleanly with no declarations

- **GIVEN** no declarations this phase
- **WHEN** the physical-attack phase runs
- **THEN** the phase SHALL advance without error

### Requirement: Punch Resolution Per TechManual

Punches SHALL use piloting skill + actuator modifiers + TMM, deal `ceil(weight / 10)` damage per arm, and use the 1d6 punch hit-location table.

#### Scenario: 80-ton mech punch damage

- **GIVEN** an 80-ton mech landing a punch
- **WHEN** punch damage is computed
- **THEN** damage SHALL be 8 per arm

#### Scenario: Punch to-hit with actuator damage

- **GIVEN** an attacker with piloting 4 and a damaged upper-arm actuator (+1)
- **WHEN** punch to-hit is computed
- **THEN** the base TN SHALL be 4 + 1 = 5 (before target movement modifier)

#### Scenario: Arm that fired cannot punch

- **GIVEN** an arm that fired a weapon this turn
- **WHEN** the unit declares a punch with that arm
- **THEN** the declaration SHALL be rejected with `PhysicalAttackInvalid` reason `ArmFired`

### Requirement: Kick Resolution Per TechManual

Kicks SHALL use piloting skill - 2 + actuator modifiers + TMM, deal `floor(weight / 5)` damage, and use the 1d6 kick hit-location table.

#### Scenario: 80-ton mech kick damage

- **GIVEN** an 80-ton mech landing a kick
- **WHEN** kick damage is computed
- **THEN** damage SHALL be 16

#### Scenario: Kick miss triggers attacker PSR

- **GIVEN** a kick that misses the target
- **WHEN** resolution completes
- **THEN** the attacker SHALL have a `KickMiss` PSR queued

### Requirement: Charge Resolution

Charges SHALL be available only when the attacker ran this turn. Damage to the target SHALL be `ceil(attacker.weight / 10) × (hexesMoved - 1)` in 5-point clusters. The attacker SHALL also take `ceil(target.weight / 10)` damage in 5-point clusters. Both units queue PSRs.

#### Scenario: Charge damage calculation

- **GIVEN** a 50-ton attacker running 5 hexes into a 70-ton target
- **WHEN** charge damage is computed
- **THEN** target damage SHALL be `ceil(50 / 10) × (5 - 1) = 5 × 4 = 20`
- **AND** attacker damage SHALL be `ceil(70 / 10) = 7`

#### Scenario: Charge miss queues PSR

- **GIVEN** a charge that misses
- **WHEN** resolution completes
- **THEN** a `MissedCharge` PSR SHALL be queued on the attacker

### Requirement: Charge Miss Displaces Attacker To Side Hex

When a charge misses, the attacker SHALL be displaced to one of the two hexes 60 degrees off the charge direction (i.e., `(facing + 1) % 6` or `(facing + 5) % 6` from the attacker's pre-charge source hex), not into the target hex. The resolver SHALL prefer the higher-elevation candidate; on tie, the seeded RNG picks. If neither side hex is a valid displacement target, the attacker SHALL remain at the source hex. The target SHALL NOT receive a `PhysicalAttackTarget` PSR on miss because no contact occurs.

#### Scenario: Charge miss displaces attacker to side hex

- **GIVEN** an attacker that charged target hex `T` from source hex `S` along facing `F` and missed the to-hit roll
- **WHEN** miss displacement resolves
- **THEN** the attacker SHALL be moved to either `S.translated((F + 1) % 6)` or `S.translated((F + 5) % 6)`
- **AND** the higher-elevation side hex SHALL be preferred; ties break via the seeded RNG
- **AND** the attacker SHALL NOT enter target hex `T`

#### Scenario: Charge miss with both side hexes invalid

- **GIVEN** a charge miss where both side hexes are off-map or blocked
- **WHEN** miss displacement resolves
- **THEN** the attacker SHALL remain at source hex `S`
- **AND** a `MissedCharge` PSR SHALL still be queued on the attacker

### Requirement: Death From Above (DFA) Resolution

DFA SHALL be available only when the attacker jumped this turn. Target damage = `ceil(attacker.weight / 10) × 3`. Attacker leg damage = `ceil(attacker.weight / 5)`.

#### Scenario: DFA damage

- **GIVEN** a 60-ton mech performing DFA
- **WHEN** damage is computed
- **THEN** target damage SHALL be `ceil(60 / 10) × 3 = 18`
- **AND** attacker leg damage SHALL be `ceil(60 / 5) = 12`

#### Scenario: DFA miss triggers attacker fall

- **GIVEN** a DFA that misses
- **WHEN** resolution completes
- **THEN** a `MissedDFA` PSR SHALL be queued on the attacker
- **AND** on PSR failure the attacker SHALL fall (via fall-mechanics)

### Requirement: Push Resolution

Pushes SHALL use piloting skill - 1 for to-hit, apply no damage, and displace the target 1 hex in the attacker's facing direction on success.

#### Scenario: Push hit displaces target

- **GIVEN** a successful push
- **WHEN** resolution completes
- **THEN** the target SHALL move 1 hex in the attacker's facing
- **AND** the target SHALL have a `PhysicalAttackTarget` PSR queued

#### Scenario: Push into invalid hex

- **GIVEN** a push where the destination hex is off-map or blocked
- **WHEN** resolution completes
- **THEN** the push SHALL fail
- **AND** a fall SHALL be resolved per rules

### Requirement: Restriction Validation

Declarations that violate physical-attack restrictions SHALL be rejected before to-hit resolution.

#### Scenario: Same limb kick + punch blocked

- **GIVEN** a unit that punched with its right arm this turn
- **WHEN** the unit declares a right-arm kick (impossible anatomy, but rule: same limb)
- **THEN** the declaration SHALL be rejected

#### Scenario: DFA without jump blocked

- **GIVEN** a unit that walked this turn
- **WHEN** the unit declares DFA
- **THEN** the declaration SHALL be rejected with reason `NoJumpThisTurn`

#### Scenario: Missing actuators block attack

- **GIVEN** a unit whose right foot actuator is destroyed
- **WHEN** the unit declares a right-leg kick
- **THEN** the declaration SHALL be rejected with reason `MissingActuator`
