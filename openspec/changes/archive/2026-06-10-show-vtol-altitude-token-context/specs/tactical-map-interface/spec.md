# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Per-Type Token Rendering

Vehicle tokens representing VTOL combat state SHALL expose the current VTOL
altitude as visible token chrome, token wrapper metadata, and accessible token
context. Non-VTOL vehicle tokens SHALL NOT render VTOL altitude chrome even if a
legacy caller provides altitude-like data.

#### Scenario: VTOL token exposes altitude context

**GIVEN** a vehicle unit has represented combat state with motion type `VTOL`
**AND** the represented vehicle combat state has altitude 3
**WHEN** the tactical map projects that unit into a vehicle token
**THEN** the token SHALL expose altitude 3 in wrapper metadata
**AND** the token accessible label SHALL include altitude 3
**AND** the vehicle token SHALL render a visible non-color altitude badge

#### Scenario: Browser harness preserves VTOL altitude context

**GIVEN** the tactical-map browser harness renders a VTOL elevation movement
scenario
**AND** the selected VTOL token has altitude 3
**WHEN** the top-down map SVG renders the token and movement overlay together
**THEN** the rendered token wrapper SHALL expose altitude 3 metadata
**AND** the rendered token accessible label SHALL include altitude 3
**AND** the rendered vehicle token SHALL show the visible altitude badge

#### Scenario: Isometric scene preserves VTOL altitude context

**GIVEN** the tactical-map browser harness renders a VTOL elevation movement
scenario
**AND** the player switches the map to isometric mode
**WHEN** the isometric scene depth-sorts the VTOL token
**THEN** the isometric scene token wrapper SHALL expose the unit type as vehicle
**AND** the isometric scene token wrapper SHALL expose the VTOL motion type
**AND** the isometric scene token wrapper SHALL expose altitude 3
**AND** the nested vehicle token SHALL keep the visible altitude badge

#### Scenario: Non-VTOL vehicle token does not expose altitude chrome

**GIVEN** a vehicle unit does not use VTOL motion
**WHEN** the tactical map renders that unit as a vehicle token
**THEN** the vehicle token SHALL NOT render the VTOL altitude badge
