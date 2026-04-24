# camera-controls Specification

## Purpose
TBD - created by archiving change add-minimap-and-camera-controls. Update Purpose after archive.
## Requirements
### Requirement: Camera Pan

The camera controls system SHALL support panning via mouse click-drag
and keyboard shortcuts.

#### Scenario: Click-drag pans camera

- **GIVEN** the map is displayed at zoom 1.0
- **WHEN** the user click-drags on an empty hex
- **THEN** the camera SHALL pan by the drag delta in pixels
- **AND** the unit selection SHALL NOT change

#### Scenario: Arrow keys pan by one hex worth

- **GIVEN** no modal overlay is active
- **WHEN** the user presses an arrow key (or WASD equivalent)
- **THEN** the camera SHALL pan by approximately one hex width in the
  corresponding direction

#### Scenario: Pan clamps to map bounds

- **GIVEN** the camera is at the left edge of the map
- **WHEN** the user pans further left
- **THEN** the camera SHALL clamp at the map's left edge
- **AND** no empty space beyond the map SHALL scroll into view

### Requirement: Camera Zoom

The camera controls system SHALL support zoom via scroll wheel and
keyboard shortcuts, with zoom-to-cursor anchoring for the wheel.

#### Scenario: Scroll wheel zooms with cursor anchor

- **GIVEN** the cursor is over a specific hex
- **WHEN** the user scrolls to zoom in
- **THEN** the hex beneath the cursor SHALL remain beneath the cursor
  after the zoom (within 1px tolerance)

#### Scenario: Keyboard zoom

- **GIVEN** no modal overlay is active
- **WHEN** the user presses `+` or `-`
- **THEN** zoom SHALL change by 10% per keystroke

#### Scenario: Zoom clamps to bounds

- **GIVEN** the zoom is at 2.0
- **WHEN** the user scrolls to zoom in further
- **THEN** zoom SHALL clamp at 2.0
- **AND** zoom-out is clamped at 0.3

### Requirement: Unit Focus

The camera controls system SHALL support centering on a unit via
double-click and keyboard shortcut.

#### Scenario: Double-click centers on unit

- **GIVEN** a unit token is on-screen
- **WHEN** the user double-clicks the token
- **THEN** the camera SHALL center on the unit's hex
- **AND** the unit SHALL be selected
- **AND** center animation SHALL ease over 200ms

#### Scenario: Low-zoom focus bumps zoom

- **GIVEN** the zoom is 0.4 when the user double-clicks a unit
- **WHEN** the focus action runs
- **THEN** zoom SHALL bump to 0.8 before centering

#### Scenario: Space recenters on selected unit

- **GIVEN** a unit is selected
- **WHEN** the user presses Space
- **THEN** the camera SHALL center on that unit

### Requirement: Hotkey Help Overlay

The camera controls system SHALL provide a hotkey help overlay
triggered by the `?` key.

#### Scenario: Help overlay opens

- **GIVEN** no modal overlay is active
- **WHEN** the user presses `?`
- **THEN** the hotkey help overlay SHALL open
- **AND** list camera, overlay, combat, and help hotkeys grouped

#### Scenario: Esc closes help overlay

- **GIVEN** the hotkey help overlay is open
- **WHEN** the user presses Esc
- **THEN** the overlay SHALL close

#### Scenario: First-time prompt

- **GIVEN** a user has never opened the hotkey help
- **WHEN** their session starts
- **THEN** a subtle "Press ? for shortcuts" prompt SHALL render briefly
- **AND** the prompt SHALL NOT re-appear after first dismissal

### Requirement: Reduced Motion Disables Camera Easing

The camera controls system SHALL honor `prefers-reduced-motion` by
disabling camera easing animations.

#### Scenario: Reduced motion snaps focus

- **GIVEN** `prefers-reduced-motion: reduce` is set
- **WHEN** the user double-clicks a unit
- **THEN** the camera SHALL snap to center instantly
- **AND** no easing animation SHALL play

