# tactical-map-interface Specification Delta

## ADDED Requirements

### Requirement: Minimap Panel

The tactical map interface SHALL render a minimap panel in the top-right
corner showing the full map, unit positions, and the current camera
viewport.

#### Scenario: Minimap dimensions and placement

- **GIVEN** the combat surface is rendering
- **WHEN** the minimap renders
- **THEN** it SHALL be positioned in the top-right corner
- **AND** it SHALL be 200x200 pixels with 12px margin
- **AND** it SHALL include an opaque backdrop with a subtle drop shadow

#### Scenario: Unit dots by side

- **GIVEN** the minimap is visible
- **WHEN** unit dots render
- **THEN** each unit SHALL render as a dot colored by side (Player
  blue, Opponent red, Neutral gray)
- **AND** dot size SHALL scale with weight class

#### Scenario: Camera viewport rectangle

- **GIVEN** the main camera is zoomed in on part of the map
- **WHEN** the minimap renders
- **THEN** a bordered rectangle SHALL render on the minimap
  representing the current camera viewport
- **AND** the rectangle SHALL update live as the camera pans/zooms

### Requirement: Minimap Interactions

The tactical map interface SHALL accept click and drag interactions on
the minimap to pan the main camera.

#### Scenario: Click centers main camera

- **GIVEN** the minimap is visible
- **WHEN** the user clicks on a point within the minimap
- **THEN** the main camera SHALL center on the corresponding map
  location

#### Scenario: Drag on viewport rectangle pans

- **GIVEN** the user is dragging on the minimap's viewport rectangle
- **WHEN** the drag moves
- **THEN** the main camera SHALL pan continuously to match

#### Scenario: Unit dot tooltip on hover

- **GIVEN** the user hovers a unit dot on the minimap
- **WHEN** the hover settles
- **THEN** a tooltip SHALL render with the unit's name and side

### Requirement: Minimap Toggle

The tactical map interface SHALL allow the user to toggle minimap
visibility.

#### Scenario: M hotkey toggles minimap

- **GIVEN** no modal overlay is active
- **WHEN** the user presses M
- **THEN** the minimap visibility SHALL toggle
- **AND** the toggle state SHALL persist across the current session

#### Scenario: Minimap accessibility role

- **GIVEN** the minimap is visible
- **WHEN** a screen reader traverses the page
- **THEN** the minimap SHALL expose `role="region"` with an
  `aria-label` describing it

### Requirement: Double-Click Unit Focus

The tactical map interface SHALL center the camera on a unit when the
user double-clicks its token.

#### Scenario: Double-click focuses and selects

- **GIVEN** a unit token is on-screen
- **WHEN** the user double-clicks the token
- **THEN** the camera SHALL center on the unit
- **AND** the unit SHALL become the selected unit
- **AND** a single click SHALL still behave as selection-only (no
  focus)
