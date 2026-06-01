# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Isometric Projection Parity And Occlusion Tools

Isometric mode SHALL be presentation state only and SHALL consume the same
terrain, elevation, movement, combat, LOS, fog, cover, and firing-arc projection
data as top-down mode.

Isometric mode SHALL make stacked elevation layers readable, support battlefield
rotation, and provide interaction aids for units obscured by high terrain or
tall stacks.

#### Scenario: Touch gesture rotates the isometric camera

- **GIVEN** the tactical map is in isometric mode on a touch-capable surface
- **WHEN** the player twists a two-finger touch gesture by one represented
  60-degree step
- **THEN** the map SHALL rotate the isometric camera by one discrete heading
  step
- **AND** the projection layer SHALL expose the updated isometric rotation step
- **AND** the same surface SHALL continue to support single-touch pan and
  two-finger pinch zoom
- **AND** the focused map surface SHALL expose the shared projection source,
  isometric-camera channel, presentation rules surface, and touch rotation
  contract.
