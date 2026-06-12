# tactical-map-interface Delta — add-isometric-elevation-extrusion

## MODIFIED Requirements

### Requirement: Isometric Presentation

The tactical map interface SHALL render isometric mode as a presentation layer
over the same axial battlefield state while keeping elevation stacks, camera
rotation, and occlusion aids inspectable. Hexes with positive elevation SHALL
render visible extrusion faces so stacked elevation reads as solid terrain
height, depth-ordered correctly at every discrete camera heading, without
changing occluder semantics, hover targets, or projection data.

#### Scenario: Rotation updates active terrain occluder

- **GIVEN** a unit may be hidden behind different elevated terrain from different isometric camera headings
- **WHEN** the player rotates the isometric camera until another elevated hex is in front of the unit
- **THEN** token foreground boost metadata SHALL identify the newly active occluder hex and elevation
- **AND** the previous occluder hex SHALL no longer expose active occluder highlight metadata
- **AND** hover context for the new occluder SHALL show its elevation, camera heading, affected unit ids, and source reason

#### Scenario: Full rotation cycle restores original occluder state

- **GIVEN** an isometric battlefield has a camera-dependent elevated-terrain occluder
- **WHEN** the player rotates through all six discrete camera headings and returns to the original heading
- **THEN** the projection layer SHALL expose the original rotation step
- **AND** scene depth metadata SHALL match the original heading
- **AND** active occluder metadata and highlights SHALL return to the original terrain hex

#### Scenario: Elevated hexes render camera-facing extrusion faces

- **GIVEN** the tactical map is in isometric mode
- **AND** a hex has positive elevation
- **WHEN** the isometric scene renders at any discrete camera heading
- **THEN** the hex SHALL render its camera-facing extrusion faces beneath its top face with height proportional to its elevation
- **AND** the visible face selection SHALL correspond to the current rotation step
- **AND** zero-elevation hexes SHALL render no extrusion faces

#### Scenario: Extrusion faces depth-sort with their owner hex

- **GIVEN** adjacent hexes of different elevations render in isometric mode
- **WHEN** the scene depth-orders its items
- **THEN** each hex's extrusion faces SHALL paint immediately beneath that hex's top face in the shared depth ordering
- **AND** unit tokens SHALL keep their existing depth ordering relative to hex top faces
- **AND** rotating through all six headings SHALL never produce a lower hex painting over a nearer higher hex's faces

#### Scenario: Extrusion is visual-only and preserves interaction semantics

- **GIVEN** isometric extrusion faces are rendered
- **WHEN** the player hovers, clicks, or inspects occluder highlights
- **THEN** extrusion faces SHALL NOT be hover or hit targets
- **AND** occluder metadata, occluder highlights, and hover explanations SHALL be unchanged from the pre-extrusion contract
- **AND** movement, combat, LOS, and fog projection data SHALL be byte-identical with extrusion enabled or absent
