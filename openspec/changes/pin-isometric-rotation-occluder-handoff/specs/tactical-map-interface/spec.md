# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Isometric Presentation

The tactical map interface SHALL render isometric mode as a presentation layer
over the same axial battlefield state while keeping elevation stacks, camera
rotation, and occlusion aids inspectable.

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
