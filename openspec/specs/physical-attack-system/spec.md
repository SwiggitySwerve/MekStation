# physical-attack-system Specification

## Purpose

TBD - created by archiving change full-combat-parity. Update Purpose after archive.

## Requirements

### Requirement: Physical Attack Phase

The system SHALL process physical attacks in a dedicated phase after the weapon attack phase and before the heat phase.

#### Scenario: Phase ordering

- **WHEN** the weapon attack phase completes
- **THEN** the physical attack phase SHALL begin
- **AND** all physical attacks SHALL be declared and resolved before advancing to the heat phase

#### Scenario: Physical attack restrictions

- **WHEN** determining available physical attacks
- **THEN** an arm SHALL NOT punch if it fired a weapon that turn
- **AND** a unit SHALL NOT kick and punch in the same turn with the same limb

### Requirement: Punch Attack Resolution

Punch attacks SHALL use piloting skill plus actuator modifiers for to-hit, deal `ceil(weight / 10)` damage, and use the 1d6 punch hit location table.

#### Scenario: Punch to-hit calculation

- **WHEN** a unit with piloting skill 5 attempts a punch
- **THEN** the base to-hit target number SHALL be 5 (piloting skill)
- **AND** additional modifiers for actuator damage, target movement, and terrain SHALL apply

#### Scenario: Punch damage for 80-ton mech

- **WHEN** an 80-ton mech lands a punch
- **THEN** punch damage SHALL be `ceil(80 / 10) = 8` per arm

#### Scenario: Punch hit location

- **WHEN** a punch attack hits
- **THEN** the hit location SHALL be determined by 1d6 on the punch table
- **AND** roll 1=LA, 2=LT, 3=CT, 4=RT, 5=RA, 6=Head

#### Scenario: Punch with destroyed shoulder actuator

- **WHEN** a unit attempts to punch with an arm whose shoulder actuator is destroyed
- **THEN** the punch SHALL NOT be permitted with that arm

#### Scenario: Punch with damaged upper arm actuator

- **WHEN** a unit punches with an arm whose upper arm actuator is destroyed
- **THEN** the to-hit SHALL receive a +2 modifier
- **AND** punch damage SHALL be halved (round down)

#### Scenario: Punch with damaged lower arm actuator

- **WHEN** a unit punches with an arm whose lower arm actuator is destroyed
- **THEN** the to-hit SHALL receive a +2 modifier
- **AND** punch damage SHALL be halved (round down)

#### Scenario: Punch with destroyed hand actuator

- **WHEN** a unit punches with an arm whose hand actuator is destroyed
- **THEN** the to-hit SHALL receive a +1 modifier

### Requirement: Kick Attack Resolution

Kick attacks SHALL use `piloting skill - 2` plus actuator modifiers for to-hit, deal `floor(weight / 5)` damage, and use the 1d6 kick hit location table.

#### Scenario: Kick to-hit calculation

- **WHEN** a unit with piloting skill 5 attempts a kick
- **THEN** the base to-hit target number SHALL be 3 (5 - 2)
- **AND** additional modifiers for actuator damage and target movement SHALL apply

#### Scenario: Kick damage for 80-ton mech

- **WHEN** an 80-ton mech lands a kick
- **THEN** kick damage SHALL be `floor(80 / 5) = 16`

#### Scenario: Kick hit location

- **WHEN** a kick attack hits
- **THEN** the hit location SHALL be determined by 1d6 on the kick table
- **AND** roll 1-3=RL, 4-6=LL

#### Scenario: Target PSR after being kicked

- **WHEN** a kick attack successfully hits a target
- **THEN** the target SHALL make a PSR to avoid falling

#### Scenario: Attacker PSR after kick miss

- **WHEN** a kick attack misses
- **THEN** the attacker SHALL make a PSR to avoid falling

#### Scenario: Kick with destroyed hip actuator

- **WHEN** a unit attempts to kick with a leg whose hip actuator is destroyed
- **THEN** the kick SHALL NOT be permitted with that leg

#### Scenario: Kick with damaged upper leg actuator

- **WHEN** a unit kicks with a leg whose upper leg actuator is destroyed
- **THEN** the to-hit SHALL receive a +2 modifier

#### Scenario: Kick with damaged lower leg actuator

- **WHEN** a unit kicks with a leg whose lower leg actuator is destroyed
- **THEN** the to-hit SHALL receive a +2 modifier

#### Scenario: Kick with destroyed foot actuator

- **WHEN** a unit kicks with a leg whose foot actuator is destroyed
- **THEN** the to-hit SHALL receive a +1 modifier

#### Scenario: Cannot kick while prone

- **WHEN** a unit is prone
- **THEN** kick attacks SHALL NOT be permitted

### Requirement: Charge Attack Resolution

Charge attacks SHALL use piloting plus movement modifiers for to-hit, deal `ceil(weight / 10) × (hexesMoved - 1)` to the target, with both units taking damage and requiring PSRs.

#### Scenario: Charge to-hit calculation

- **WHEN** a unit with piloting skill 5 charges after moving 4 hexes
- **THEN** the base to-hit SHALL be piloting skill 5 plus movement and skill differential modifiers

#### Scenario: Charge damage to target

- **WHEN** a 60-ton mech charges after moving 5 hexes
- **THEN** target damage SHALL be `ceil(60 / 10) × (5 - 1) = 6 × 4 = 24`

#### Scenario: Charge damage to attacker

- **WHEN** a charge hits and the target weighs 75 tons
- **THEN** the attacker SHALL take damage equal to `ceil(75 / 10) = 8` (target weight based)
- **AND** the damage formula SHALL be `ceil(targetWeight / 10)`

#### Scenario: Both units make PSR after charge

- **WHEN** a charge attack hits
- **THEN** both the attacker and target SHALL make PSRs to avoid falling

### Requirement: Death From Above (DFA) Attack Resolution

DFA attacks SHALL use piloting plus jump movement modifiers for to-hit, deal `ceil(weight / 10) × 3` to the target, and `ceil(weight / 5)` to the attacker's legs.

#### Scenario: DFA to-hit calculation

- **WHEN** a unit with piloting skill 5 attempts a DFA
- **THEN** the base to-hit SHALL be piloting skill plus jump movement modifiers

#### Scenario: DFA damage to target

- **WHEN** a 70-ton mech lands a DFA
- **THEN** target damage SHALL be `ceil(70 / 10) × 3 = 7 × 3 = 21`
- **AND** damage SHALL be applied using the punch hit location table

#### Scenario: DFA damage to attacker legs

- **WHEN** a 70-ton mech lands a DFA
- **THEN** attacker leg damage SHALL be `ceil(70 / 5) = 14` total
- **AND** damage SHALL be split equally between both legs
- **AND** each leg SHALL take `ceil(totalDamage / 2) = ceil(14 / 2) = 7` damage

#### Scenario: Both units PSR after DFA

- **WHEN** a DFA attack hits
- **THEN** both units SHALL make PSRs to avoid falling

#### Scenario: DFA miss consequences

- **WHEN** a DFA attack misses
- **THEN** the attacker SHALL make a PSR with a +4 modifier
- **AND** if the PSR fails, the attacker SHALL take normal falling damage

### Requirement: Push Attack Resolution

Push attacks SHALL use `piloting skill - 1` for to-hit, deal no damage, displace the target one hex, and trigger a target PSR.

#### Scenario: Push to-hit calculation

- **WHEN** a unit with piloting skill 5 attempts a push
- **THEN** the base to-hit target number SHALL be 4 (5 - 1)

#### Scenario: Successful push

- **WHEN** a push attack hits
- **THEN** the target SHALL be displaced one hex in the direction of the push
- **AND** no damage SHALL be dealt
- **AND** the target SHALL make a PSR to avoid falling

### Requirement: Melee Weapon Attacks

The system SHALL support melee weapon attacks with weapon-specific to-hit modifiers and damage formulas.

#### Scenario: Hatchet attack

- **WHEN** a unit with a hatchet attacks in melee
- **THEN** the to-hit modifier SHALL be -1 (easier than punch)
- **AND** damage SHALL be `floor(weight / 5)`
- **AND** the arm MUST have a functional lower arm and hand actuator

#### Scenario: Sword attack

- **WHEN** a unit with a sword attacks in melee
- **THEN** the to-hit modifier SHALL be -2
- **AND** damage SHALL be `floor(weight / 10) + 1`
- **AND** the arm MUST have a functional lower arm and hand actuator

#### Scenario: Mace attack

- **WHEN** a unit with a mace attacks in melee
- **THEN** the to-hit modifier SHALL be +1 (harder to hit)
- **AND** damage SHALL be `floor(weight × 2 / 5)`
- **AND** the arm MUST have a functional lower arm and hand actuator

### Requirement: TSM Melee Damage Bonus

Triple Strength Myomer (TSM) SHALL double weight-based melee damage when active at heat 9 or higher.

#### Scenario: TSM activation threshold

- **WHEN** a unit has TSM installed
- **THEN** TSM SHALL activate when heat >= 9
- **AND** effective weight for damage calculations SHALL be doubled

#### Scenario: TSM doubles punch damage

- **WHEN** a 50-ton mech with active TSM (heat >= 9) punches
- **THEN** punch damage SHALL be `ceil(50 / 10) × 2 = 10`

#### Scenario: TSM doubles kick damage

- **WHEN** a 50-ton mech with active TSM (heat >= 9) kicks
- **THEN** kick damage SHALL be `floor(50 / 5) × 2 = 20`

### Requirement: Underwater Melee Penalty

Physical attacks performed underwater SHALL deal half damage.

#### Scenario: Underwater melee damage halved

- **WHEN** a unit performs a physical attack while standing in water depth 2+
- **THEN** all physical attack damage SHALL be halved (round down)

### Requirement: Physical Attack Resolution Flow

The system SHALL resolve physical attacks through a complete flow: restriction check, to-hit calculation, dice roll, damage calculation, and hit location determination.

#### Scenario: Complete attack resolution

- **WHEN** resolving a physical attack
- **THEN** the system SHALL first check attack restrictions (actuators, weapon firing, prone status)
- **AND** if restricted, SHALL return a failed result with reason
- **AND** if allowed, SHALL calculate to-hit target number with all modifiers
- **AND** SHALL roll 2d6 for to-hit check
- **AND** if hit, SHALL calculate damage and determine hit location
- **AND** if miss, SHALL apply miss consequences (kick/DFA PSR)

#### Scenario: Hit location determination

- **WHEN** a physical attack hits and deals damage
- **THEN** the system SHALL roll 1d6 for hit location
- **AND** punch/DFA/melee weapons SHALL use punch hit location table
- **AND** kick SHALL use kick hit location table

#### Scenario: PSR triggers

- **WHEN** a kick hits
- **THEN** the target SHALL make a PSR to avoid falling
- **WHEN** a kick misses
- **THEN** the attacker SHALL make a PSR to avoid falling
- **WHEN** a DFA hits
- **THEN** both attacker and target SHALL make PSRs to avoid falling
- **WHEN** a DFA misses
- **THEN** the attacker SHALL make a PSR with +4 modifier
- **WHEN** a charge hits
- **THEN** both attacker and target SHALL make PSRs to avoid falling
- **WHEN** a push hits
- **THEN** the target SHALL make a PSR to avoid falling

### Requirement: Injectable Randomness for Physical Attacks

All physical attack resolution SHALL use injectable DiceRoller for deterministic testing.

#### Scenario: Deterministic physical attack resolution

- **WHEN** resolving physical attacks with a seeded DiceRoller
- **THEN** identical inputs and seeds SHALL produce identical to-hit rolls and hit locations
