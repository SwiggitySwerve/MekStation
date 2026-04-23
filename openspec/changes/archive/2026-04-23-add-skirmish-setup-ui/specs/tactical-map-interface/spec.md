# tactical-map-interface Specification Delta

## ADDED Requirements

### Requirement: Pre-Battle Map Preview

The tactical map interface SHALL render a non-interactive preview of the
prospective skirmish map on the pre-battle setup screen, using the same hex
grid, terrain, and viewport framing that will be used once combat begins.

**Priority**: Critical

#### Scenario: Preview reflects selected radius

- **GIVEN** the user selects map radius 8 on the pre-battle screen
- **WHEN** the preview renders
- **THEN** the preview SHALL show `3 * 8^2 + 3 * 8 + 1 = 217` hexes
- **AND** the preview viewport SHALL frame the entire hex grid with padding

#### Scenario: Preview reflects selected terrain preset

- **GIVEN** the user selects terrain preset `"Woods"`
- **WHEN** the preview renders
- **THEN** each hex SHALL be filled with the terrain color for the preset's
  per-hex `TerrainType`
- **AND** preview SHALL NOT respond to click or hover (non-interactive)

#### Scenario: Preview updates live on config change

- **GIVEN** the user changes radius from 8 to 12
- **WHEN** the configuration value updates
- **THEN** the preview SHALL re-render within the same frame with the new
  radius
- **AND** no stale hexes from the previous radius SHALL remain visible

### Requirement: Deployment Zone Overlay

The tactical map interface SHALL render per-side deployment zone overlays on
the pre-battle preview, visually distinguishing Player and Opponent zones
while preserving underlying terrain colors.

**Priority**: High

#### Scenario: Zones rendered with side colors

- **GIVEN** deployment zones for Player (west) and Opponent (east)
- **WHEN** the preview renders with zone overlays enabled
- **THEN** Player zone hexes SHALL have a semi-transparent blue tint
  (rgba(59,130,246,0.35))
- **AND** Opponent zone hexes SHALL have a semi-transparent red tint
  (rgba(239,68,68,0.35))
- **AND** terrain color SHALL remain visible under the tint

#### Scenario: Zone tooltip on hover

- **GIVEN** zone overlays are visible
- **WHEN** the user hovers a hex in the Player zone
- **THEN** a tooltip SHALL display `"Player deployment"` and the zone's
  hex count
- **AND** moving to an Opponent hex SHALL switch the tooltip to
  `"Opponent deployment"`

#### Scenario: Empty zones handled

- **GIVEN** a terrain preset that produces no valid deployment hexes for a
  side
- **WHEN** the preview renders
- **THEN** a warning banner SHALL display
  `"No valid deployment hexes for <side>"`
- **AND** "Launch Skirmish" SHALL be disabled

### Requirement: Terrain Preset Legend

The tactical map interface SHALL render a legend adjacent to the pre-battle
preview showing the colors and labels of terrain types present in the
selected preset.

**Priority**: Medium

#### Scenario: Legend matches preview

- **GIVEN** a preset that contains Clear, LightWoods, and HeavyWoods hexes
- **WHEN** the legend renders
- **THEN** exactly three entries SHALL be listed (no duplicates, no extras)
- **AND** each entry's swatch color SHALL match the same terrain color used
  in the preview
- **AND** each entry's label SHALL use the canonical terrain name from
  `terrain-system`
