# physical-weapons-system (delta)

## ADDED Requirements

### Requirement: Melee Weapons Integrate With Physical Attack Phase

Melee weapons (hatchet, sword, mace, lance) SHALL be declarable as physical attacks (`attackType: Club`) during the physical-attack phase, with their weapon-specific damage formulas and to-hit modifiers.

#### Scenario: Hatchet attack

- **GIVEN** a 60-ton mech with a hatchet
- **WHEN** declaring a hatchet attack
- **THEN** damage SHALL be `floor(60 / 5) = 12`
- **AND** to-hit SHALL use piloting skill with hatchet-specific modifier

#### Scenario: Sword attack

- **GIVEN** a 55-ton mech with a sword
- **WHEN** declaring a sword attack
- **THEN** damage SHALL be `floor(55 / 10) + 1 = 6`
- **AND** to-hit SHALL receive -2 modifier

#### Scenario: Mace attack

- **GIVEN** a 75-ton mech with a mace
- **WHEN** declaring a mace attack
- **THEN** damage SHALL be `floor(75 / 4) = 18`
- **AND** to-hit SHALL receive +1 modifier

#### Scenario: Lance charging

- **GIVEN** a 50-ton mech with a lance, charging
- **WHEN** declaring a charge-with-lance
- **THEN** damage SHALL be doubled: `floor(50 / 5) × 2 = 20` per hit
- **AND** the charge ruleset SHALL otherwise apply

#### Scenario: Missing hand/lower-arm blocks club attack

- **GIVEN** a mech with destroyed lower-arm or hand actuators on the club arm
- **WHEN** declaring a club attack
- **THEN** the declaration SHALL be rejected with reason `MissingActuator`
