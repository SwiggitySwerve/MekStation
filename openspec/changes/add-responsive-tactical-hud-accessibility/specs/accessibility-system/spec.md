## ADDED Requirements

### Requirement: Tactical Command Shell Keyboard Navigation

The accessibility system SHALL support keyboard navigation across tactical map, command dock, turn rail, trays, drawers, feed, minimap, and replay controls.

#### Scenario: Keyboard user reaches primary combat command
- **GIVEN** a keyboard-only user is in an active combat phase
- **WHEN** they tab into the tactical command shell
- **THEN** focus order SHALL reach active unit summary, map region, primary action dock, turn rail, inspectors, feed, minimap, and settings in a predictable order
- **AND** the primary legal command SHALL be reachable without requiring pointer interaction

#### Scenario: Map focus mode supports arrow navigation
- **GIVEN** keyboard focus is in the map region
- **WHEN** the user uses arrow keys
- **THEN** the focused hex SHALL move in axial-neighbor directions according to the map orientation
- **AND** Enter or Space SHALL select the focused hex or token according to current mode

### Requirement: Tactical Screen Reader Announcements

The accessibility system SHALL announce combat-relevant state changes without flooding screen reader users.

#### Scenario: Phase and active unit announcement
- **GIVEN** the phase or active unit changes
- **WHEN** the live region announces the update
- **THEN** it SHALL include phase, side, active unit label, and required action summary
- **AND** repeated low-impact updates within the same phase SHALL be deduplicated

#### Scenario: Critical event announcement
- **GIVEN** a critical hit, shutdown, ammo explosion, destruction, objective change, or game end event occurs
- **WHEN** the event feed receives it
- **THEN** an assertive or high-priority announcement SHALL be emitted according to user accessibility preferences

### Requirement: Tactical High Contrast and Non-Color Encoding

The accessibility system SHALL ensure tactical overlays, intel states, and command availability are distinguishable without relying on color alone.

#### Scenario: Overlay states use shape or pattern
- **GIVEN** movement, attack, cover, LOS, fog, and objective overlays are visible
- **WHEN** high contrast or color-vision support is enabled
- **THEN** overlay states SHALL use shape, pattern, icon, stroke, or label differences in addition to color

#### Scenario: Disabled commands expose text reasons
- **GIVEN** a command is disabled
- **WHEN** the user focuses it with keyboard or screen reader
- **THEN** the disabled reason SHALL be available as accessible text
- **AND** visual disabled styling SHALL not be the only indicator
