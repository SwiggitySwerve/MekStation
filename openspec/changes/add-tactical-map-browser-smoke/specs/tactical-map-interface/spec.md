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
- **AND** a reachable movement-highlighted hex with a blocked movement mode
  SHALL expose legal option states, blocked option reason metadata, and a
  separate blocked-options badge that does not rely on color alone
- **AND** when the Run overlay contains a destination whose Run path is blocked
  but a Walk path is legal, the map SHALL render the reachable Walk projection
  as primary while retaining the blocked Run option metadata
- **AND** a tracked vehicle destination with an over-limit elevation change
  SHALL expose the terrain-blocked elevation reason, elevation delta/cost, and
  a non-color invalid badge
- **AND** a hover vehicle destination over represented deep water SHALL expose
  reachable movement, zero terrain/elevation surcharge, motive metadata, and
  the water/smoke terrain layers
- **AND** a naval vehicle destination on represented clear land SHALL expose
  the water-required terrain blocker, zero heat, motive metadata, and a
  non-color invalid badge
- **AND** a biped swim destination through represented deep water SHALL expose
  reachable movement, zero water/elevation surcharge, swim heat, elevation
  delta, and water terrain metadata
- **AND** a movement-blocked hex SHALL expose the engine-aligned rejection
  reason and render an invalid badge that does not rely on color alone
- **AND** a LOS-blocked combat target SHALL expose the blocked target id,
  NoLineOfSight rejection, blocker hex metadata, and an invalid combat badge
- **AND** an elevation-LOS-blocked combat target SHALL expose the elevation
  blocker reason, blocker hex metadata, elevation label, and non-color invalid
  and blocker badges
- **AND** a medium-range combat target SHALL expose the target id, distance,
  range band, available weapon ids, and per-weapon range option metadata
- **AND** a combat target outside the selected weapon's firing arc SHALL expose
  `OutOfArc` rejection metadata, per-weapon arc blocker details, and a combat
  invalid badge that does not rely on color alone
- **AND** a same-hex combat target SHALL expose `SameHex` rejection metadata
  and a combat invalid badge that does not rely on color alone, even when the
  selected weapon is otherwise in range
- **AND** a combat target in represented partial cover SHALL expose the cover
  level, modifier, to-hit modifier, reason, and a cover badge that does not rely
  on color alone
- **WHEN** browser automation switches to isometric mode and rotates the camera
- **THEN** isometric stack, occluder, visibility, rotation, and depth metadata
  SHALL update in the rendered DOM
- **AND** rotating the camera SHALL move the active occluder metadata and
  highlight to the tall elevation stack that is actually in front for that
  camera angle
- **AND** the rendered map output SHALL contain nonblank top-down and isometric
  pixels
