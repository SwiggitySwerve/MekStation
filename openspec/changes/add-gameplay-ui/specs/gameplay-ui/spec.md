# Gameplay UI Specification

## ADDED Requirements

### Requirement: Split View Layout

The system SHALL provide a split view layout for gameplay.

#### Scenario: Default layout
- **GIVEN** gameplay page loads
- **WHEN** displaying game session
- **THEN** hex map SHALL be displayed on one side
- **AND** record sheet SHALL be displayed on other side
- **AND** phase banner SHALL be visible at top
- **AND** action bar SHALL be visible at bottom

#### Scenario: Panel resizing
- **GIVEN** split view layout
- **WHEN** user drags divider
- **THEN** panels SHALL resize proportionally
- **AND** minimum panel sizes SHALL be enforced

#### Scenario: Contextual emphasis
- **GIVEN** phase changes
- **WHEN** entering Movement phase
- **THEN** map panel SHALL be emphasized (larger)
- **WHEN** entering Attack phase
- **THEN** record sheet SHALL be emphasized
- **AND** transitions SHALL be smooth

### Requirement: Hex Map Display

The system SHALL render an interactive hex map.

#### Scenario: Grid rendering
- **GIVEN** game session with map configuration
- **WHEN** rendering hex map
- **THEN** hex grid SHALL be drawn with correct dimensions
- **AND** coordinate labels MAY be shown
- **AND** grid lines SHALL be visible

#### Scenario: Unit tokens
- **GIVEN** units on the map
- **WHEN** rendering units
- **THEN** each unit SHALL have a token at its hex
- **AND** token SHALL show facing direction
- **AND** selected unit SHALL be highlighted
- **AND** token color indicates side (player/opponent)

#### Scenario: Pan and zoom
- **GIVEN** hex map display
- **WHEN** user interacts
- **THEN** drag SHALL pan the view
- **AND** scroll/pinch SHALL zoom
- **AND** zoom limits SHALL be enforced

### Requirement: Movement Preview

The system SHALL preview movement before confirmation.

#### Scenario: Movement destination selection
- **GIVEN** Movement phase, unit selected
- **WHEN** user hovers over hex
- **THEN** if valid destination, hex SHALL highlight
- **AND** path to destination SHALL be shown
- **AND** MP cost SHALL be displayed

#### Scenario: Movement preview panel
- **GIVEN** movement destination selected
- **WHEN** displaying preview
- **THEN** MP used vs available SHALL be shown
- **AND** heat generated SHALL be shown
- **AND** TMM (target movement modifier) SHALL be shown
- **AND** any to-hit penalty SHALL be shown

#### Scenario: Facing selection
- **GIVEN** destination hex selected
- **WHEN** choosing facing
- **THEN** 6 facing options SHALL be available
- **AND** selected facing SHALL preview on map

### Requirement: Attack Preview

The system SHALL preview attacks with full modifier breakdown.

#### Scenario: Target selection
- **GIVEN** Weapon Attack phase
- **WHEN** clicking enemy unit
- **THEN** unit SHALL be selected as target
- **AND** range to target SHALL be shown
- **AND** arc (front/side/rear) SHALL be indicated

#### Scenario: Weapon selection
- **GIVEN** target selected
- **WHEN** selecting weapons
- **THEN** available weapons listed with checkboxes
- **AND** weapons out of range/arc shown disabled
- **AND** weapons without ammo shown disabled

#### Scenario: To-hit breakdown
- **GIVEN** weapon and target selected
- **WHEN** showing to-hit preview
- **THEN** base to-hit (gunnery) SHALL be shown
- **AND** each modifier SHALL be listed separately
- **AND** final to-hit number SHALL be calculated
- **AND** hit probability percentage SHALL be shown

#### Scenario: Damage and heat preview
- **GIVEN** attacks queued
- **WHEN** showing attack summary
- **THEN** potential damage per weapon SHALL be shown
- **AND** total heat generated SHALL be calculated
- **AND** post-attack heat level SHALL be predicted
- **AND** heat warnings SHALL display if over threshold

### Requirement: Record Sheet Display

The system SHALL display unit status in record sheet format.

#### Scenario: Armor diagram
- **GIVEN** unit selected
- **WHEN** displaying record sheet
- **THEN** armor diagram SHALL show all locations
- **AND** current armor values SHALL be displayed
- **AND** damaged locations SHALL be visually indicated
- **AND** destroyed locations SHALL be marked

#### Scenario: Heat scale
- **GIVEN** unit with heat tracking
- **WHEN** displaying heat
- **THEN** heat scale SHALL show current heat
- **AND** heat effects thresholds SHALL be marked
- **AND** current effects (if any) SHALL be highlighted

#### Scenario: Weapon status
- **GIVEN** unit with weapons
- **WHEN** displaying weapons
- **THEN** all weapons SHALL be listed
- **AND** destroyed weapons SHALL be crossed out
- **AND** ammo counts SHALL be shown
- **AND** recently fired weapons MAY be indicated

### Requirement: Event Log

The system SHALL display a chronological event log.

#### Scenario: Event display
- **GIVEN** game in progress
- **WHEN** events occur
- **THEN** events SHALL appear in log
- **AND** events SHALL be formatted as readable text
- **AND** newest events SHALL appear at top (or bottom, configurable)

#### Scenario: Event filtering
- **GIVEN** event log displayed
- **WHEN** filtering events
- **THEN** filter by event type SHALL be available
- **AND** filter by unit SHALL be available
- **AND** filter by turn SHALL be available

#### Scenario: Log collapse
- **GIVEN** event log panel
- **WHEN** user collapses log
- **THEN** log SHALL minimize to header only
- **AND** log can be expanded again

### Requirement: Phase Controls

The system SHALL provide phase-appropriate action controls.

#### Scenario: Movement phase controls
- **GIVEN** Movement phase active
- **WHEN** displaying controls
- **THEN** "Lock Movement" button SHALL be available
- **AND** "Undo" button available before lock
- **AND** "Skip" button to pass without moving

#### Scenario: Attack phase controls
- **GIVEN** Weapon Attack phase active
- **WHEN** displaying controls
- **THEN** "Lock Attacks" button SHALL be available
- **AND** attack queue summary SHALL be shown
- **AND** "Clear All" to remove all queued attacks

#### Scenario: Phase transition
- **GIVEN** phase ends
- **WHEN** transitioning to next phase
- **THEN** UI SHALL update for new phase
- **AND** appropriate controls SHALL appear
- **AND** map/sheet emphasis SHALL shift

### Requirement: Replay Controls

The system SHALL provide controls for replay mode.

#### Scenario: Replay navigation
- **GIVEN** replay mode active
- **WHEN** using controls
- **THEN** scrubber to select turn/event SHALL be available
- **AND** play/pause button SHALL be available
- **AND** step forward/back buttons SHALL be available

#### Scenario: Replay state display
- **GIVEN** replay at specific point
- **WHEN** displaying state
- **THEN** map SHALL show unit positions at that point
- **AND** record sheet SHALL show damage at that point
- **AND** event log SHALL show events up to that point
