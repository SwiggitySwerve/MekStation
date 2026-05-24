# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Top-Down and Isometric Tactical Map Rendering

Each rendered hex SHALL expose terrain type and elevation. Elevation SHALL be visible as a readable number on or near the hex at playable zoom levels, while terrain visuals and overlays remain distinguishable.

Isometric mode SHALL render terrain/elevation stacks, unit tokens, occluder
highlights, and camera rotation metadata from the same projection data used by
the top-down map.

#### Scenario: Browser smoke covers top-down and isometric tactical context

- **GIVEN** the development/test tactical map browser harness renders a map
  with terrain, elevation, movement, combat, and an isometric occluder case
- **WHEN** browser automation inspects the top-down map
- **THEN** terrain labels, elevation labels, movement badges, and combat badges
  SHALL expose the expected projection metadata
- **AND** a movement-highlighted hex with multiple legal movement modes SHALL
  expose the walk, run, and jump option costs, terrain costs, elevation costs,
  and heat metadata together
- **AND** a movement-blocked hex SHALL expose the engine-aligned rejection
  reason and render an invalid badge that does not rely on color alone
- **AND** a LOS-blocked combat target SHALL expose the blocked target id,
  NoLineOfSight rejection, blocker hex metadata, and an invalid combat badge
- **WHEN** browser automation switches to isometric mode and rotates the camera
- **THEN** isometric stack, occluder, visibility, rotation, and depth metadata
  SHALL update in the rendered DOM
- **AND** rotating the camera SHALL move the active occluder metadata and
  highlight to the tall elevation stack that is actually in front for that
  camera angle
- **AND** the rendered map output SHALL contain nonblank top-down and isometric
  pixels
