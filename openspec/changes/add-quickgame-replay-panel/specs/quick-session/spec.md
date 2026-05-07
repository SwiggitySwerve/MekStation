# quick-session Specification — Delta

## ADDED Requirements

### Requirement: Quick-Game Results Page Renders Hex-Map Replay

The Quick-Game Results page SHALL expose a "Replay" tab that mounts a hex-map replay panel driven by `useHexMapStateFromEvents` over the in-memory `game.events` array, with playback driven by `useSharedReplayPlayer`.

#### Scenario: Replay tab is visible alongside existing tabs

- **GIVEN** a completed quick-game encounter with a populated `game.events` log
- **WHEN** the user lands on `QuickGameResults`
- **THEN** the tab list contains five tabs: `Summary`, `Units`, `Damage`, `Timeline`, and `Replay`
- **AND** the `Replay` tab is keyboard-navigable via the existing `useTabKeyboardNavigation` hook
- **AND** the four pre-existing tab panels (`Summary`/`Units`/`Damage`/`Timeline`) render unchanged when their tab is active

#### Scenario: Replay panel projects hex-map state from in-memory events

- **GIVEN** the user activates the `Replay` tab on a completed encounter
- **WHEN** `QuickGameReplayPanel` mounts with `events={game.events}` and `gameId={game.id}`
- **THEN** the panel renders `<HexMapDisplay>` with `tokens`, `hexTerrain`, `radius`, and `events` derived from `useHexMapStateFromEvents(events, currentSequence)`
- **AND** the panel does NOT render a `JsonlFileLoader` (events come from the in-memory store, not a file upload)
- **AND** the panel reuses the shared `<ReplayTimeline>` and `<ReplayControls>` components

#### Scenario: Scrubber state is owned by useSharedReplayPlayer

- **GIVEN** the `Replay` tab is active
- **WHEN** the user clicks Play / Pause / Step / Stop or drags the timeline scrubber
- **THEN** all playback state transitions flow through `useSharedReplayPlayer({ gameId, events })`
- **AND** the panel does NOT instantiate a separate replay state machine
- **AND** switching to another tab unmounts the panel; switching back remounts the panel and reinitialises the player at sequence 0 (preserving scrubber position across tab switches is explicitly out of scope)
