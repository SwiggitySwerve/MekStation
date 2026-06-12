# camera-controls Delta — add-isometric-elevation-extrusion

## ADDED Requirements

### Requirement: Isometric Camera Rotation

The camera system SHALL provide discrete isometric battlefield rotation across
six 60-degree headings, exposed through a player-facing control, preserving the
centered view target across heading changes and honoring reduced-motion
preferences for any rotation transition.

#### Scenario: Player rotates the battlefield through discrete headings

- **GIVEN** the tactical map is in isometric mode
- **WHEN** the player activates the rotate control (or its hotkey)
- **THEN** the camera SHALL advance to the adjacent discrete heading
- **AND** the scene SHALL re-render with depth ordering correct for the new heading
- **AND** repeated activation SHALL cycle through all six headings back to the original

#### Scenario: Rotation preserves the centered view target

- **GIVEN** the isometric camera is centered on a unit or hex
- **WHEN** the player rotates to another heading
- **THEN** the centered target SHALL remain within the viewport after the rotation
- **AND** subsequent center-on requests SHALL account for the active heading's transform

#### Scenario: Reduced motion disables rotation transition animation

- **GIVEN** the player has reduced motion enabled
- **WHEN** the camera changes heading
- **THEN** the heading change SHALL apply instantly without interpolated transition
- **AND** the resulting scene SHALL be identical to the animated path's end state

#### Scenario: Rotation control is unavailable in top-down mode

- **GIVEN** the tactical map is in top-down mode
- **WHEN** the camera controls render
- **THEN** the isometric rotate control SHALL be hidden or disabled
- **AND** entering isometric mode SHALL restore the control with the last active heading
