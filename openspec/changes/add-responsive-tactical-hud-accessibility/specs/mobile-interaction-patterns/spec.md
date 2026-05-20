## ADDED Requirements

### Requirement: Tactical HUD Responsive Slot Reallocation

The mobile interaction system SHALL define how tactical shell slots reallocate across desktop, tablet, phone, ultrawide, and constrained-height viewports.

#### Scenario: Desktop shows persistent border UI
- **GIVEN** viewport width is at least the desktop breakpoint
- **WHEN** tactical combat renders
- **THEN** top status, side trays, bottom action dock, minimap cluster, and map SHALL be simultaneously available
- **AND** the map SHALL remain the largest single region

#### Scenario: Phone uses one bottom sheet at a time
- **GIVEN** viewport width is below the mobile breakpoint
- **WHEN** the player opens actions, inspector, feed, or lenses
- **THEN** that surface SHALL open as the single active bottom sheet
- **AND** opening a second bottom sheet SHALL collapse the previous one
- **AND** the map SHALL remain visible behind or above the sheet

#### Scenario: Constrained height collapses nonessential chrome
- **GIVEN** viewport height is constrained below the tactical minimum height
- **WHEN** combat renders
- **THEN** noncritical top-band details SHALL collapse into a compact status menu
- **AND** active phase, active unit, and primary action affordance SHALL remain visible

### Requirement: Tactical Touch Gestures

The mobile interaction system SHALL provide tactical-safe touch gestures for map, token, hex, tray, and bottom-sheet interactions.

#### Scenario: Long press opens context menu
- **GIVEN** the user long-presses a token or hex
- **WHEN** the gesture exceeds the configured delay without exceeding movement threshold
- **THEN** the tactical context menu SHALL open
- **AND** the native browser context menu SHALL be suppressed where supported

#### Scenario: Map pan is not stolen by sheets
- **GIVEN** a bottom sheet is partially open
- **WHEN** the user drags on the visible map area
- **THEN** the map SHALL pan
- **AND** the bottom sheet SHALL only drag when the gesture starts on its handle or scroll region

### Requirement: Tactical UI Settings

The tactical HUD SHALL expose user settings for minimap size, tooltip delay, panel density, auto-cycle, quick movement animation, quick combat animation, and reduced motion.

#### Scenario: Minimap size setting changes shell allocation
- **GIVEN** the player changes minimap size
- **WHEN** the tactical shell re-renders
- **THEN** the minimap cluster SHALL resize within configured bounds
- **AND** it SHALL not overlap primary command controls or active unit token

#### Scenario: Reduced motion disables tactical animations
- **GIVEN** reduced motion is enabled
- **WHEN** movement, attack, notification, or replay playback feedback occurs
- **THEN** the UI SHALL use immediate state changes or low-motion fades instead of movement-heavy animation
