# heat-overflow-effects (delta)

## ADDED Requirements

### Requirement: Heat Effects Applied Each Heat Phase

Heat effects SHALL be evaluated every heat phase and at each relevant trigger point.

#### Scenario: Movement penalty applied before next movement

- **GIVEN** a unit at heat 15
- **WHEN** the heat phase completes
- **THEN** the unit's effective walk MP SHALL be reduced by `floor(15 / 5) = 3`

#### Scenario: To-hit penalty applied on next attack

- **GIVEN** a unit at heat 13 during the weapon attack phase
- **WHEN** the attack to-hit is computed
- **THEN** the heat-threshold modifier SHALL be +2

#### Scenario: Ammo explosion risk rolled at heat 19

- **GIVEN** a unit at heat 19 with explosive ammo bins
- **WHEN** the heat phase runs the ammo-explosion check
- **THEN** 2d6 SHALL be rolled vs TN 4 per bin
- **AND** failure SHALL explode the bin

#### Scenario: Pilot heat damage at heat 15

- **GIVEN** a unit at heat 15
- **WHEN** the heat phase runs pilot-damage check
- **THEN** the pilot SHALL take 1 damage

#### Scenario: Pilot heat damage at heat 25+

- **GIVEN** a unit at heat 25
- **WHEN** the heat phase runs pilot-damage check
- **THEN** the pilot SHALL take 2 damage
