# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Isometric Rotation Heading Metadata

The tactical map interface SHALL expose the current isometric camera heading
whenever isometric rotation controls are visible. The map SHALL provide a reset
control that restores pan, zoom, and the isometric camera heading to their
canonical defaults without changing axial hex click coordinates.

#### Scenario: Reset view restores canonical isometric heading

**GIVEN** the tactical map is in isometric mode
**AND** the player has rotated the isometric camera away from heading 0
**WHEN** the player activates reset view
**THEN** the projection layer SHALL expose rotation step 0
**AND** the heading metadata SHALL expose 0 degrees
**AND** the projection transform SHALL use the canonical heading
**AND** axial hex clicks SHALL still target the same battlefield coordinates
