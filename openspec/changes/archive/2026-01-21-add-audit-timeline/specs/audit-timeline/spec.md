# Specification: Audit Timeline

## ADDED Requirements

### Requirement: Timeline View

The system SHALL display events in a chronological timeline.

#### Scenario: View campaign timeline

- **GIVEN** a campaign with completed missions
- **WHEN** viewing the campaign timeline
- **THEN** events are displayed in chronological order
- **AND** events are grouped by mission
- **AND** each event shows type, timestamp, and summary

#### Scenario: Filter timeline by category

- **GIVEN** a timeline with many events
- **WHEN** applying a category filter (e.g., "pilot" events only)
- **THEN** only matching events are shown
- **AND** the filter is clearly indicated in the UI

#### Scenario: Filter timeline by context

- **GIVEN** a timeline with events involving multiple pilots
- **WHEN** filtering by a specific pilot
- **THEN** only events involving that pilot are shown

#### Scenario: Virtual scrolling for performance

- **GIVEN** a timeline with thousands of events
- **WHEN** scrolling through the timeline
- **THEN** only visible events are rendered
- **AND** scrolling remains smooth

### Requirement: State Diff View

The system SHALL compare states at different points in time.

#### Scenario: Compare mission states

- **GIVEN** a campaign with multiple missions
- **WHEN** selecting "after mission 3" and "after mission 5"
- **THEN** a side-by-side diff is shown
- **AND** changed values are highlighted
- **AND** added/removed items are indicated

#### Scenario: Diff nested objects

- **GIVEN** two states with nested object changes
- **WHEN** viewing the diff
- **THEN** nested changes are expandable
- **AND** the path to changed values is shown

#### Scenario: No changes detected

- **GIVEN** two identical states
- **WHEN** viewing the diff
- **THEN** a message indicates no differences found

### Requirement: Event Query Builder

The system SHALL support searching and filtering events.

#### Scenario: Search by pilot

- **GIVEN** events involving multiple pilots
- **WHEN** searching for a specific pilot
- **THEN** all events where that pilot was involved are shown
- **AND** results include events where pilot was actor or target

#### Scenario: Search by time range

- **GIVEN** events spanning weeks
- **WHEN** filtering to a specific date range
- **THEN** only events within that range are shown

#### Scenario: Combine multiple filters

- **GIVEN** the query builder
- **WHEN** applying multiple filters (category + pilot + time)
- **THEN** results match all filter criteria
- **AND** active filters are shown as removable chips

#### Scenario: Export query results

- **GIVEN** a filtered set of events
- **WHEN** clicking "Export"
- **THEN** results can be downloaded as JSON or CSV

### Requirement: Replay Player

The system SHALL enable replay of completed games.

#### Scenario: Play replay

- **GIVEN** a completed game
- **WHEN** clicking "Play Replay"
- **THEN** the game state animates through events
- **AND** playback can be paused and resumed

#### Scenario: Scrub to position

- **GIVEN** a replay in progress
- **WHEN** dragging the timeline scrubber
- **THEN** the game state jumps to that point
- **AND** the hex map and record sheets update

#### Scenario: Step through events

- **GIVEN** a paused replay
- **WHEN** clicking "Next Event"
- **THEN** the state advances by one event
- **AND** the event details are highlighted

#### Scenario: Adjust playback speed

- **GIVEN** a replay in progress
- **WHEN** changing playback speed (0.5x, 1x, 2x)
- **THEN** events play at the selected speed

### Requirement: Causality Visualization

The system SHALL visualize cause-effect relationships between events.

#### Scenario: View causality chain

- **GIVEN** a pilot has 3 wounds
- **WHEN** clicking "Why?" on the wounds
- **THEN** a graph shows the chain of events leading to wounds
- **AND** each node links to its triggering event(s)

#### Scenario: Navigate causality graph

- **GIVEN** a causality graph is displayed
- **WHEN** clicking on a node
- **THEN** the event details panel shows that event
- **AND** the path from that event to root is highlighted

#### Scenario: Zoom and pan graph

- **GIVEN** a large causality graph
- **WHEN** using zoom/pan controls
- **THEN** the view adjusts smoothly
- **AND** node labels remain readable

### Requirement: Page Integration

The system SHALL integrate audit views into existing pages.

#### Scenario: Campaign audit tab

- **GIVEN** the campaign detail page
- **WHEN** clicking the "Audit" tab
- **THEN** the campaign timeline is displayed
- **AND** mission boundaries are marked

#### Scenario: Pilot career timeline

- **GIVEN** the pilot detail page
- **WHEN** viewing the pilot
- **THEN** a career timeline shows all pilot events
- **AND** events are grouped by campaign/mission

#### Scenario: Game replay access

- **GIVEN** a completed game in the game list
- **WHEN** clicking "Replay"
- **THEN** the replay player opens for that game
