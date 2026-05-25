# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Isometric Projection Parity And Occlusion Tools

Isometric mode SHALL be presentation state only and SHALL consume the same terrain, elevation, movement, combat, LOS, fog, cover, and firing-arc projection data as top-down mode.

Isometric mode SHALL make stacked elevation layers readable, support battlefield rotation, and provide interaction aids for units obscured by high terrain or tall stacks.

#### Scenario: Capped isometric stacks expose true height

- **GIVEN** a top-down hex has terrain whose effective isometric height is greater than the readable rendered layer cap
- **WHEN** the player switches the tactical map to isometric mode
- **THEN** the hex SHALL expose the true effective stack height
- **AND** the hex SHALL expose the number of rendered stack layers
- **AND** the hex SHALL expose whether the stack is visually capped and how many effective levels exceed the rendered cap
- **AND** the rendered stack SHALL show a compact cap badge with the true effective height
- **AND** movement, combat, LOS, occlusion, and depth legality SHALL continue to come from the shared terrain/elevation projection rather than the rendered layer count
