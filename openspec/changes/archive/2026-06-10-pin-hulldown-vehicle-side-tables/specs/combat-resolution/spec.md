# Spec Delta: Combat Resolution

## MODIFIED Requirements

### Requirement: Vehicle Hit Location Tables

The system SHALL use vehicle-specific hit-location tables per attack direction,
and SHALL apply MegaMek hull-down fixed-location behavior when a hull-down
vehicle or vehicle-mode QuadVee is hit through a protected arc.

#### Scenario: Hull-down turreted vehicle protected arc uses turret

- **GIVEN** a hull-down vehicle or vehicle-mode QuadVee with an available turret
- **AND** the attack direction is front, left, or right for a non-backed entry
- **WHEN** vehicle hit location is resolved
- **THEN** the hit location SHALL be `turret`
- **AND** no normal vehicle hit-location table roll SHALL be consumed
- **AND** the result SHALL not be a TAC result.

#### Scenario: Hull-down non-turret vehicle protected arc uses incoming side

- **GIVEN** a hull-down vehicle or vehicle-mode QuadVee without an available
  turret, or whose turret is ignored
- **AND** the attack direction is front, left, or right for a non-backed entry
- **WHEN** vehicle hit location is resolved
- **THEN** the hit location SHALL be the fixed incoming side location:
  `front`, `left_side`, or `right_side`
- **AND** the result SHALL not be a TAC result.

#### Scenario: Hull-down vehicle exposed opposite arc uses normal table

- **GIVEN** a hull-down vehicle or vehicle-mode QuadVee that did not back into
  hull-down
- **AND** the attack direction is rear
- **WHEN** vehicle hit location is resolved
- **THEN** the normal rear vehicle hit-location table SHALL be used
- **AND** VTOL rotor redirection and TAC handling SHALL remain normal.

#### Scenario: Backed hull-down entry flips protected direction

- **GIVEN** a hull-down vehicle or vehicle-mode QuadVee whose entry path
  included a backward step
- **WHEN** vehicle hit location is resolved
- **THEN** rear, left, and right attacks SHALL use hull-down fixed-location
  behavior
- **AND** front attacks SHALL use the normal front vehicle hit-location table.
