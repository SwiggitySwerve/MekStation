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
