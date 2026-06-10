# Spec Delta: Hull-Down Position

## MODIFIED Requirements

### Requirement: Hull-Down To-Hit Modifier

The system SHALL apply the MegaMek-backed hull-down target modifier to
represented Mek-style targets when the target is hull-down and LOS or terrain
cover is present.

#### Scenario: Covered hull-down target gets MegaMek modifier

- **GIVEN** a represented target is hull-down
- **AND** the attack LOS or target terrain grants partial cover
- **WHEN** an attacker previews or declares a weapon attack against that target
- **THEN** the to-hit calculation SHALL include a `Hull Down` terrain modifier
  of `+2`
- **AND** the modifier SHALL be separate from the represented partial-cover
  modifier already carried by the cover projection.

#### Scenario: Hull-down without cover does not add target modifier

- **GIVEN** a represented target is hull-down
- **AND** the attack LOS and target terrain do not provide cover
- **WHEN** an attacker previews or declares a weapon attack against that target
- **THEN** the to-hit calculation SHALL NOT add the `Hull Down` modifier.
