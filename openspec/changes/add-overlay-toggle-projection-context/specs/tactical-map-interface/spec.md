# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat,
path, selected, and hover state into a single per-hex projection before
rendering hex cells or hover explanations. Rendered map highlights and the
controls that reveal those highlights SHALL expose the projection context needed
to explain why a highlight exists.

#### Scenario: Overlay toggles expose projection channels

**GIVEN** movement, cover, firing arc, or LOS overlay controls are rendered
**WHEN** a user or browser test inspects the toggle
**THEN** the toggle SHALL expose the map-layer id it controls
**AND** the toggle SHALL expose whether that layer is currently visible
**AND** the toggle SHALL expose the shared tactical projection source
**AND** the toggle SHALL expose the projection channel used by the overlay
**AND** the toggle SHALL expose the rules surface revealed by the overlay
**AND** the toggle SHALL have an accessible label summarizing visibility and projection context
