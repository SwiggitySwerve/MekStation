# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Isometric Projection Parity And Occlusion Tools

Isometric mode SHALL be presentation state only and SHALL consume the same
terrain, elevation, movement, combat, LOS, fog, cover, and firing-arc projection
data as top-down mode.

Isometric mode SHALL make stacked elevation layers readable, support battlefield
rotation, and provide interaction aids for units obscured by high terrain or
tall stacks.

#### Scenario: Camera rotation retargets rendered terrain occlusion metadata

- **GIVEN** the tactical map is in isometric mode with a unit between tall
  terrain on opposite camera sides
- **WHEN** the player rotates the isometric camera until the opposite tall hex
  becomes the foreground occluder
- **THEN** the rendered scene token SHALL expose the occluding hex or hexes for
  the current camera step
- **AND** the rendered scene token SHALL expose the camera rotation step that
  produced the occlusion metadata
- **AND** the tall-hex occluder highlight and elevation stack SHALL expose the
  same camera rotation step
- **AND** the previous camera-side occluder highlight SHALL be removed once that
  hex is no longer in front of the unit
- **AND** the scene token accessibility label SHALL name the camera step for the
  current terrain-occlusion explanation.
