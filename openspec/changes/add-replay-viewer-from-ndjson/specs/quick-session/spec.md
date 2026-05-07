## ADDED Requirements

### Requirement: Replay Viewer Consumes Persisted NDJSON Files

The application SHALL ship a client-side `JsonlFileLoader` component (mounted on the replay page at `src/pages/gameplay/games/[id]/replay.tsx`) that accepts a swarm-produced `<gameId>.jsonl` event-log file via drag-and-drop OR file-picker, parses it line-by-line, validates each line as an `IGameEvent`, and promotes the resulting `readonly IGameEvent[]` to the replay player as the event source. Users with a persisted NDJSON event log from any prior CLI swarm run SHALL be able to watch the encounter back in the browser without server-side upload, account creation, or DB seeding.

The loader's parse pipeline SHALL be:

1. Read the file as UTF-8 text.
2. Split on `\n`, strip empty lines (trailing newline tolerated).
3. For each non-empty line, attempt `JSON.parse(line)`. On failure, record `{ line: <1-indexed-line-number>, error: 'not valid JSON' }`.
4. For each parsed object, apply the `isGameEvent` type guard exported from `src/types/gameplay/GameSessionInterfaces.ts`. On failure, record `{ line: <1-indexed-line-number>, error: 'not a valid IGameEvent' }`.
5. If zero errors are recorded, promote the parsed events as the new event source and call the host page's `onEventsLoaded(events, filename)` callback.
6. If one or more errors are recorded, the loader SHALL display the per-line error list AND SHALL NOT promote the events. The page's prior event source remains unchanged.

The loader SHALL render a "loaded `<filename>` (`N` events, turns `<minTurn>`–`<maxTurn>`)" status pill while uploaded events are active. The pill SHALL include a "clear upload" affordance that reverts the page to its prior (DB-backed) event source.

The loader SHALL NOT transmit the file or any of its contents over the network. The file's bytes SHALL be processed entirely in-browser via `FileReader`.

When uploaded events are promoted, the replay page's existing `useReplayPlayer` and `ReplayTimeline` SHALL drive the scrubber and playback controls against the uploaded events with no behavioral difference from the DB-event flow.

#### Scenario: Drag-drop of a valid 50-event NDJSON file populates the replay player

- **GIVEN** a swarm-produced `<gameId>.jsonl` file with 50 valid `IGameEvent` lines
- **AND** the replay page is open
- **WHEN** the user drops the file onto the loader's drop zone
- **THEN** the loader SHALL parse and validate all 50 lines
- **AND** the page SHALL replace its DB event source with the 50 uploaded events
- **AND** the timeline scrubber SHALL show 50 events
- **AND** the loader SHALL display `loaded <filename> (50 events, turns <min>–<max>)`

#### Scenario: A file with one malformed JSON line is rejected with a per-line error

- **GIVEN** a `<gameId>.jsonl` file where line 47 is `{this is not json}`
- **WHEN** the user drops the file onto the loader
- **THEN** the loader SHALL record `{ line: 47, error: 'not valid JSON' }`
- **AND** SHALL NOT promote any events to the replay player
- **AND** SHALL render the error list visibly so the user knows which line to fix

#### Scenario: A file where one line parses as JSON but is not an IGameEvent is rejected

- **GIVEN** a `<gameId>.jsonl` file where line 12 is `{"foo":"bar"}` (valid JSON but not an `IGameEvent`)
- **WHEN** the user drops the file onto the loader
- **THEN** the loader SHALL record `{ line: 12, error: 'not a valid IGameEvent' }`
- **AND** SHALL NOT promote any events
- **AND** the page's prior event source SHALL remain unchanged

#### Scenario: Clearing the upload reverts the replay page to its DB event source

- **GIVEN** the replay page has uploaded events active
- **WHEN** the user clicks the "clear upload" affordance
- **THEN** the page SHALL revert to its DB event source (via `useGameTimeline(gameId)`)
- **AND** the loader's status pill SHALL be hidden
- **AND** the timeline scrubber SHALL reflect the DB event count

#### Scenario: Loaded events drive the existing useReplayPlayer scrubber

- **GIVEN** uploaded events are active in the replay page
- **WHEN** the user clicks "step forward" on `ReplayControls`
- **THEN** `useReplayPlayer.currentSequence` SHALL advance to the next uploaded event's `sequence`
- **AND** the page's existing event-detail panel SHALL render the new event
