# Spec Delta: Hull-Down Position

## MODIFIED Requirements

### Requirement: Hull-Down Firing Restrictions

The system SHALL prevent represented hull-down vehicle attackers from firing
direct front-mounted weapons while preserving MegaMek's indirect-fire exception.

#### Scenario: Hull-down vehicle cannot directly fire front-mounted weapon

- **GIVEN** a represented vehicle attacker is hull-down
- **AND** the attacker has a front-mounted weapon
- **AND** the attack is not declared as indirect fire
- **WHEN** the player previews or declares a weapon attack with that weapon
- **THEN** the weapon option SHALL be marked unavailable
- **AND** the blocked reason SHALL explain that hull-down vehicle front-mounted
  weapons are blocked by terrain
- **AND** a commit containing only blocked front-mounted direct weapons SHALL
  emit an invalid attack before declaration.

#### Scenario: Hull-down vehicle can still fire front-mounted weapon indirectly

- **GIVEN** a represented vehicle attacker is hull-down
- **AND** the attacker has an indirect-fire-capable front-mounted weapon
- **WHEN** the weapon is declared in indirect mode
- **THEN** the hull-down front-mount restriction SHALL NOT block that weapon.
