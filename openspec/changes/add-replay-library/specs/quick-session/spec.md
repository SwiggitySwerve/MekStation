## ADDED Requirements

### Requirement: Quick Game Event Log Persistence

Every quick-game encounter that reaches a terminal state (a `GameEnded` event in its event store) SHALL persist its full chronological event log to disk in NDJSON format at the path `simulation-reports/quick/<gameId>.jsonl`. The persistence SHALL be triggered by the `QuickGameResults` page mount/finalize lifecycle and SHALL NOT block the user-visible results render.

The persisted file SHALL follow the same NDJSON conventions as swarm output: one `IGameEvent` per line encoded as JSON, `\n` separator, no trailing newline. Events SHALL be written in monotonically-increasing `IGameEvent.sequence` order. The persistence module MUST NOT re-sort, filter, or transform the event payloads.

After the file is written, the system SHALL append a corresponding `IQuickReplayManifestEntry` to the central `simulation-reports/replay-index.json`. The manifest entry SHALL be derived from the event log: `id`=`gameId`, `path`=`'quick/<gameId>.jsonl'`, `createdAt`=ISO 8601 timestamp at write time, `turns`=count of `turn_started` events (fallback `0`), `winner`=`GameEnded.payload.winner` (`null` for draws), `bvTotal`=sum of unit BVs from the `GameCreated` payload, `playerSide`=the player's `GameSide`, `aiVariant`=the AI variant identifier in use for that quick game.

#### Scenario: Quick game persists on completion

- **GIVEN** a quick-game encounter that has reached `GameEnded`
- **WHEN** the user navigates to `QuickGameResults`
- **THEN** a file SHALL be created at `simulation-reports/quick/<gameId>.jsonl`
- **AND** the file SHALL contain one JSON-encoded `IGameEvent` per line in `sequence` order
- **AND** the file SHALL NOT have a trailing newline

#### Scenario: Quick game manifest entry is appended

- **GIVEN** a successful quick-game persistence write
- **WHEN** the persistence module finishes
- **THEN** `simulation-reports/replay-index.json` SHALL contain one new entry with `replaySource: ReplaySource.Quick`
- **AND** the entry's `id` SHALL equal the `gameId`
- **AND** the entry's `path` SHALL equal `'quick/<gameId>.jsonl'`

#### Scenario: Persistence does not block results render

- **GIVEN** a quick-game completion with a slow disk
- **WHEN** the user navigates to `QuickGameResults`
- **THEN** the results page SHALL render its damage matrix and summary tabs without waiting for the persistence write to complete
- **AND** the persistence write SHALL be observable via promise/effect lifecycle but SHALL NOT throw a render-blocking error

#### Scenario: Quick game events carry replaySource=quick

- **GIVEN** a persisted `simulation-reports/quick/<gameId>.jsonl`
- **WHEN** any line is parsed
- **THEN** the parsed event SHALL have `replaySource: ReplaySource.Quick` (or `undefined` for events authored before this change shipped if the quick game was started under a legacy code path)

## MODIFIED Requirements

### Requirement: Per-Game Event Log Persistence

Every encounter executed by the CLI swarm runner SHALL persist its full chronological event log to disk in NDJSON format (one `IGameEvent` per line, encoded as JSON, `\n` separator, no trailing newline) at the path `simulation-reports/swarm/<gameId>.jsonl`. There SHALL NOT be an opt-out flag.

The swarm output JSON SHALL include an `eventLogDir` field whose value is the absolute path of `simulation-reports/swarm/`.

The events SHALL be written in the order returned by `result.events` (which the runner populates in monotonically-increasing `IGameEvent.sequence` order). The persistence module MUST NOT re-sort, filter, or transform the event payloads.

For every persisted file, the system SHALL append a corresponding `ISwarmReplayManifestEntry` to the central `simulation-reports/replay-index.json`. The entry SHALL be derived from the event log: `id`=`gameId`, `path`=`'swarm/<gameId>.jsonl'`, `replaySource`=`ReplaySource.Swarm`, `configName`=the swarm config file basename, `seed`=the run seed, `batchTimestamp`=the per-invocation timestamp (preserved as a metadata field on the entry; no longer used as a directory segment), `turns`/`winner`/`bvTotal` as derived from the event log per the central index conventions.

The legacy flat layout `simulation-reports/games/<run-timestamp>/<gameId>.jsonl` SHALL NOT be written by new runs. Pre-existing files at that legacy path SHALL remain readable by the backfill scan (see `replay-library` spec).

#### Scenario: Five-run swarm produces five NDJSON files under the swarm partition

- **GIVEN** the invocation `tsx scripts/run-simulation.ts --config scripts/swarm-configs/duel-3kbv-temperate.json --runs 5 --seed 42`
- **WHEN** the swarm completes
- **THEN** the directory `simulation-reports/swarm/` SHALL contain five new files matching `*.jsonl`
- **AND** each file's basename SHALL equal the corresponding `gameId` from `result.gameId`
- **AND** the swarm output JSON's `eventLogDir` field SHALL point at `simulation-reports/swarm/`
- **AND** for each file, the line count SHALL equal the corresponding `result.events.length`

#### Scenario: Persisted events round-trip via JSON.parse

- **GIVEN** a `simulation-reports/swarm/<gameId>.jsonl` file written by the runner
- **WHEN** the file is read and split on `\n`
- **THEN** every line SHALL be a non-empty string parseable by `JSON.parse` into a valid `IGameEvent`
- **AND** the `sequence` field SHALL strictly increase across consecutive lines within the same `gameId`
- **AND** every event's `gameId` SHALL equal the file's basename without the `.jsonl` extension

#### Scenario: Each swarm run appends one manifest entry

- **GIVEN** a five-run swarm
- **WHEN** all runs complete
- **THEN** `simulation-reports/replay-index.json` SHALL contain five new `ISwarmReplayManifestEntry` records (one per `gameId`)
- **AND** each entry's `replaySource` SHALL equal `ReplaySource.Swarm`
- **AND** each entry's `path` SHALL equal `'swarm/<gameId>.jsonl'`
- **AND** each entry's `seed` SHALL equal `42`
- **AND** each entry's `configName` SHALL equal `'duel-3kbv-temperate'`

#### Scenario: New runs do not write to legacy flat layout

- **GIVEN** a swarm invocation under this change
- **WHEN** the runner completes
- **THEN** no file SHALL be written under `simulation-reports/games/`
- **AND** any pre-existing `simulation-reports/games/<ts>/<id>.jsonl` files SHALL be left untouched
