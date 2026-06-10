## ADDED Requirements

### Requirement: Isometric Rotation Heading Metadata

The tactical map interface SHALL expose the current isometric camera heading whenever isometric rotation controls are visible.

#### Scenario: Isometric controls show current heading

**GIVEN** the tactical map is in top-down mode
**WHEN** the player switches to isometric mode
**THEN** the rotation controls SHALL show the current camera heading
**AND** the heading SHALL expose the current rotation step
**AND** the heading SHALL expose the equivalent degree value.

#### Scenario: Heading updates when the camera rotates

**GIVEN** the tactical map is in isometric mode
**WHEN** the player rotates the camera left or right
**THEN** the current heading label SHALL update to the new rotation step and degree value
**AND** the map SHALL preserve render-only rotation without changing axial hex click coordinates.
