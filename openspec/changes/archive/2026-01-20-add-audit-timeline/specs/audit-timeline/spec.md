# Specification: Audit Timeline

## ADDED Requirements

### Requirement: Timeline View

The system SHALL display events in a chronological, filterable timeline.

#### Scenario: View campaign timeline

- **GIVEN** a campaign with multiple completed missions
- **WHEN** viewing the campaign's audit timeline
- **THEN** events are displayed in chronological order
- **AND** events are visually grouped by mission
- **AND** each event shows icon, type, timestamp, and summary text

#### Scenario: Filter by category

- **GIVEN** a timeline with Game, Campaign, and Pilot events
- **WHEN** selecting "Pilot" category filter
- **THEN** only Pilot events are displayed
- **AND** the active filter is clearly shown

#### Scenario: Filter by time range

- **GIVEN** events spanning multiple days
- **WHEN** selecting a date range
- **THEN** only events within that range are shown

#### Scenario: Search events

- **GIVEN** a timeline with many events
- **WHEN** searching for "critical hit"
- **THEN** events containing that text are highlighted/filtered
- **AND** search matches in type, description, or payload

#### Scenario: Infinite scroll

- **GIVEN** a campaign with thousands of events
- **WHEN** scrolling the timeline
- **THEN** events load progressively (pagination)
- **AND** performance remains smooth via virtualization

### Requirement: State Diff View

The system SHALL compare states at different points in time.

#### Scenario: Select comparison points

- **GIVEN** a campaign with checkpoints after each mission
- **WHEN** selecting "After Mission 3" and "After Mission 7"
- **THEN** both states are loaded for comparison

#### Scenario: View diff

- **GIVEN** two states selected for comparison
- **WHEN** viewing the diff
- **THEN** a side-by-side view shows both states
- **AND** changed values are highlighted in yellow
- **AND** added values are highlighted in green
- **AND** removed values are highlighted in red

#### Scenario: Nested diff expansion

- **GIVEN** a diff with nested objects (e.g., unit damage)
- **WHEN** expanding a nested section
- **THEN** child properties are diffed recursively
- **AND** unchanged nested values can be collapsed

### Requirement: Query Builder

The system SHALL provide a visual interface for complex event queries.

#### Scenario: Build query with multiple filters

- **GIVEN** the query builder interface
- **WHEN** adding filters for category=Pilot, pilotId=X, type=xp_gained
- **THEN** filters appear as removable chips
- **AND** results update to show matching events

#### Scenario: Save query

- **GIVEN** a useful query configuration
- **WHEN** clicking "Save Query" and naming it
- **THEN** the query is saved for later use
- **AND** appears in the saved queries list

#### Scenario: Export results

- **GIVEN** query results displayed
- **WHEN** clicking "Export JSON"
- **THEN** matching events are downloaded as JSON file
- **AND** the file includes query parameters used

### Requirement: Replay Player

The system SHALL enable animated replay of completed games.

#### Scenario: Start replay

- **GIVEN** a completed game
- **WHEN** clicking "Watch Replay"
- **THEN** the game loads at turn 1
- **AND** the hex map and record sheets show initial state
- **AND** replay controls are visible

#### Scenario: Play/pause

- **GIVEN** a replay loaded
- **WHEN** clicking Play
- **THEN** events animate at the selected speed
- **AND** the hex map updates to show movement/attacks
- **AND** clicking Pause stops playback

#### Scenario: Step through

- **GIVEN** a paused replay
- **WHEN** clicking Step Forward
- **THEN** the next event is applied
- **AND** the event description is shown
- **AND** Step Back reverses to previous event

#### Scenario: Scrub timeline

- **GIVEN** a replay with 200 events
- **WHEN** dragging the scrubber to 50%
- **THEN** state jumps to event ~100
- **AND** the hex map updates immediately

#### Scenario: Playback speed

- **GIVEN** replay playing
- **WHEN** selecting 2x speed
- **THEN** events play twice as fast
- **AND** available speeds are 0.5x, 1x, 2x, 4x

### Requirement: Causality Graph

The system SHALL visualize cause-effect relationships between events.

#### Scenario: Open causality view

- **GIVEN** viewing a pilot's current state showing 3 wounds
- **WHEN** clicking "Why?" next to the wounds count
- **THEN** a causality graph opens
- **AND** the graph shows events that caused the wounds

#### Scenario: Graph layout

- **GIVEN** a causality chain of 5 events
- **WHEN** viewing the graph
- **THEN** events are arranged left-to-right by time
- **AND** arrows show causedBy relationships
- **AND** the selected event is highlighted

#### Scenario: Explore graph

- **GIVEN** a causality graph displayed
- **WHEN** clicking a node
- **THEN** that event's details are shown
- **AND** the graph can be panned and zoomed
- **AND** clicking "Expand" loads additional ancestors

#### Scenario: Trace to root

- **GIVEN** a causality graph
- **WHEN** clicking "Trace to Root"
- **THEN** the full chain back to originating event is loaded
- **AND** the path is highlighted

### Requirement: Analytics Views

The system SHALL provide aggregate statistics from events.

#### Scenario: Pilot career stats

- **GIVEN** a pilot with history across campaigns
- **WHEN** viewing the pilot's stats card
- **THEN** aggregates are shown: total kills, damage dealt, missions, wounds, XP
- **AND** stats are computed from events, not stored separately

#### Scenario: Campaign stats

- **GIVEN** a campaign with completed missions
- **WHEN** viewing campaign stats
- **THEN** aggregates are shown: missions won/lost, units destroyed, resources spent
- **AND** per-mission breakdown is available

### Requirement: Export & Verification

The system SHALL support data export and integrity verification.

#### Scenario: Export audit log

- **GIVEN** a campaign's event history
- **WHEN** clicking "Export Audit Log"
- **THEN** all events are exported as JSON
- **AND** chunk hashes are included for verification

#### Scenario: Verify integrity

- **GIVEN** an exported audit log (or active campaign)
- **WHEN** clicking "Verify Integrity"
- **THEN** the hash chain is validated
- **AND** result shows "Verified" or identifies broken links
