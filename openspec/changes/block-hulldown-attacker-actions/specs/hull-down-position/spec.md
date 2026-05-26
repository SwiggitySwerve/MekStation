# Spec Delta: Hull-Down Position

## MODIFIED Requirements

### Requirement: Hull-Down Firing Restrictions

The system SHALL prevent a represented hull-down Mek attacker from firing
leg-mounted weapons, while allowing otherwise legal non-leg weapons in the same
selection to remain available.

#### Scenario: Hull-down Mek cannot fire leg-mounted weapon

- **GIVEN** a represented Mek attacker is hull-down
- **AND** the attacker has a weapon mounted in a leg location
- **WHEN** the player previews or declares a weapon attack with that weapon
- **THEN** the weapon option SHALL be marked unavailable
- **AND** the blocked reason SHALL explain that hull-down Meks cannot fire
  leg-mounted weapons
- **AND** a commit containing only blocked leg-mounted weapons SHALL emit an
  invalid attack before declaration.

#### Scenario: Hull-down Mek can still fire upper-body weapons

- **GIVEN** a represented Mek attacker is hull-down
- **AND** the selected weapons include a leg-mounted weapon and an arm-mounted or
  torso-mounted weapon
- **WHEN** the player previews or declares the attack
- **THEN** the leg-mounted weapon SHALL be excluded with a blocked reason
- **AND** the otherwise legal upper-body weapon SHALL remain available for the
  preview and commit.

### Requirement: Hull-Down Physical Attack Restrictions

The system SHALL prevent a represented hull-down attacker from making a kick
attack and SHALL expose the restriction in physical attack projections before
commit.

#### Scenario: Hull-down attacker cannot kick

- **GIVEN** a represented attacker is hull-down
- **AND** an adjacent target is selected
- **WHEN** the map projects physical attack options
- **THEN** kick options SHALL be marked ineligible
- **AND** the restriction reason SHALL explain that the attacker is hull-down.
