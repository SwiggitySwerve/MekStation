# tactical-map-interface Specification Delta

## ADDED Requirements

### Requirement: Firing Arc Shading Overlay

The tactical map interface SHALL render firing-arc shading for the
selected unit's front, side, and rear arcs.

#### Scenario: Arc colors by classification

- **GIVEN** a friendly unit is selected
- **WHEN** the arc overlay renders
- **THEN** front-arc hexes SHALL shade green at ~25% alpha
- **AND** left/right side hexes SHALL shade yellow at ~20% alpha
- **AND** rear-arc hexes SHALL shade red-pink at ~25% alpha

#### Scenario: Arc shading limited to weapon range

- **GIVEN** a unit with maximum weapon range 12 hexes
- **WHEN** the arc overlay renders
- **THEN** only hexes within 12 range SHALL shade
- **AND** hexes beyond range SHALL remain unshaded

#### Scenario: Colorblind shape overlay

- **GIVEN** a colorblind simulation mode
- **WHEN** the arc overlay renders
- **THEN** each arc SHALL include a shape overlay (up-chevron for front,
  dot for side, minus for rear)
- **AND** arcs SHALL remain distinguishable without color

#### Scenario: Arcs hide during animation

- **GIVEN** a movement animation is active
- **WHEN** the overlay would render
- **THEN** arc shading SHALL be suppressed
- **AND** shading resumes after the animation completes

#### Scenario: User hotkey toggles arcs

- **GIVEN** the user presses the arc toggle hotkey (A)
- **WHEN** toggled off
- **THEN** arc shading SHALL hide regardless of selection
- **AND** toggling back on SHALL restore arc rendering

### Requirement: Line-Of-Sight Overlay Coexists With Arc Shading

The tactical map interface SHALL render the LOS line on top of firing
arc shading when both overlays are active.

#### Scenario: LOS line renders above arc shading

- **GIVEN** arc shading is visible and the user hovers a hex
- **WHEN** the LOS overlay renders
- **THEN** the LOS line SHALL render above the arc shading layer
- **AND** the line SHALL remain legible against the shading
