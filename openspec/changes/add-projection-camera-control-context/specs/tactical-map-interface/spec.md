# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Isometric Projection Parity And Occlusion Tools

Isometric mode SHALL be presentation state only and SHALL consume the same terrain, elevation, movement, combat, LOS, fog, cover, and firing-arc projection data as top-down mode.

Isometric mode SHALL make stacked elevation layers readable, support battlefield rotation, and provide interaction aids for units obscured by high terrain or tall stacks.

#### Scenario: Projection and camera controls expose presentation context

- **GIVEN** the tactical map renders the projection mode toggle
- **WHEN** a user, accessibility surface, or browser test inspects the toggle
- **THEN** the toggle SHALL expose the shared tactical projection source
- **AND** the toggle SHALL expose the projection view-mode channel
- **AND** the toggle SHALL expose the presentation rules surface
- **AND** the toggle SHALL expose the current projection mode, target projection mode, and current isometric camera heading
- **AND** the accessible label SHALL summarize the current and target view modes

- **GIVEN** isometric mode is active
- **WHEN** a user, accessibility surface, or browser test inspects the rotate-left or rotate-right controls
- **THEN** each control SHALL expose the shared tactical projection source
- **AND** each control SHALL expose the isometric-camera channel and presentation rules surface
- **AND** each control SHALL expose the current and next camera heading
- **AND** each accessible label SHALL summarize the current and next heading

- **GIVEN** isometric mode is active and the tactical map grid has focus
- **WHEN** the user presses `Q` or `E`
- **THEN** the map SHALL rotate the isometric camera left or right by one
  discrete heading step
- **AND** the focused map surface SHALL expose the shared projection source,
  isometric-camera channel, presentation rules surface, and the `Q`/`E`
  rotation key contract
