## ADDED Requirements

### Requirement: Maximum Heat Display

The system SHALL calculate and display the maximum possible heat generation for UI purposes.

#### Scenario: Heat generated includes movement

- **WHEN** calculating heatGenerated for display
- **THEN** total SHALL include weapon heat plus worst-case movement heat
- **AND** movement heat = max(runningHeat, jumpingHeat)
- **AND** runningHeat = 2
- **AND** jumpingHeat = number of jump jets

#### Scenario: Running vs jumping heat selection

- **WHEN** mech has fewer than 3 jump jets
- **THEN** movement heat SHALL be 2 (running is worse)
- **AND** when mech has 3 or more jump jets
- **THEN** movement heat SHALL equal jump MP (jumping is worse)

#### Scenario: Alpha strike heat tracking

- **WHEN** calculating heat profile
- **THEN** alphaStrikeHeat SHALL track weapon-only heat separately
- **AND** heatGenerated SHALL include weapons + movement
- **AND** netHeat = heatGenerated - heatDissipated

#### Scenario: Heat profile with no weapons

- **WHEN** mech has no weapons and no jump jets
- **THEN** heatGenerated SHALL be 2 (running heat only)
- **AND** alphaStrikeHeat SHALL be 0

#### Scenario: Heat profile with 5 jump jets

- **WHEN** mech has 5 jump jets and no weapons
- **THEN** heatGenerated SHALL be 5 (jump heat > running heat)
- **AND** alphaStrikeHeat SHALL be 0
