# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Per-Type Token Rendering

Vehicle tokens representing altitude-tracked VTOL or WiGE combat state SHALL
expose the current altitude as visible token chrome, token wrapper metadata,
isometric scene metadata, and accessible token context. Ground-only vehicle
tokens SHALL NOT render altitude chrome even if a legacy caller provides
altitude-like data.

#### Scenario: WiGE token exposes altitude context

- **GIVEN** a vehicle unit has represented combat state with motion type `WiGE`
- **AND** the represented vehicle combat state has altitude 2
- **WHEN** the tactical map projects that unit into a vehicle token
- **THEN** the token SHALL expose altitude 2 in wrapper metadata
- **AND** the token accessible label SHALL include altitude 2
- **AND** the vehicle token SHALL render a visible non-color altitude badge

#### Scenario: Isometric scene preserves WiGE altitude context

- **GIVEN** a vehicle token uses WiGE motion
- **AND** the token has represented altitude 2
- **WHEN** the player switches the map to isometric mode
- **THEN** the isometric scene token wrapper SHALL expose the unit type as
  vehicle
- **AND** the isometric scene token wrapper SHALL expose the WiGE motion type
- **AND** the isometric scene token wrapper SHALL expose altitude 2
- **AND** the nested vehicle token SHALL keep the visible altitude badge

#### Scenario: Ground-only vehicle token does not expose altitude chrome

- **GIVEN** a vehicle unit does not use VTOL or WiGE motion
- **WHEN** the tactical map renders that unit as a vehicle token
- **THEN** the vehicle token SHALL NOT render the altitude badge
