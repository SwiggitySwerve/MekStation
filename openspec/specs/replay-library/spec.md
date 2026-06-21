# replay-library Specification

## Purpose

Defines Replay Library requirements for ReplaySource Enum, IReplayManifestEntry Discriminated Union, Filesystem Partition Layout, and Central Replay Index Reader, preserving the source-of-truth scope introduced by archived change add-replay-library.

## Requirements
### Requirement: ReplaySource Enum

The system SHALL define a `ReplaySource` enum with exactly the values
`Swarm`, `Quick`, `PvP`, `Campaign`, and `Encounter`. The serialized
string values SHALL be `'swarm'`, `'quick'`, `'pvp'`, `'campaign'`,
and `'encounter'` respectively. The enum SHALL be the single source
of truth for replay-source discrimination at every layer (envelope
field, manifest entry discriminant, filesystem partition directory
name, library page filter values).

#### Scenario: Enum has exactly five values

- **GIVEN** the `ReplaySource` enum
- **WHEN** `Object.values(ReplaySource)` is computed
- **THEN** the result SHALL equal
  `['swarm', 'quick', 'pvp', 'campaign', 'encounter']` in any order

#### Scenario: Enum value matches partition directory name

- **GIVEN** any `ReplaySource` value `s`
- **WHEN** the writer derives the filesystem partition path for `s`
- **THEN** the partition directory name SHALL equal the string value
  of `s` (e.g. `ReplaySource.Encounter` → `simulation-reports/encounter/`)

#### Scenario: Exhaustive switch fails compilation if a variant is missed

- **GIVEN** a `switch (entry.replaySource)` statement that omits one
  of the five cases
- **WHEN** TypeScript compilation runs in strict mode
- **THEN** compilation SHALL fail with a
  `Type 'ReplaySource' is not assignable to type 'never'` error or
  equivalent exhaustiveness error

### Requirement: IReplayManifestEntry Discriminated Union

The system SHALL define an `IReplayManifestEntry` discriminated union
with exactly five member interfaces — one per `ReplaySource` value.
Every member SHALL extend a base interface with the fields
`id: string` (the `gameId`), `replaySource: ReplaySource`,
`path: string` (relative to `simulation-reports/`),
`createdAt: string` (ISO 8601), `turns: number`,
`winner: GameSide | null`, and `bvTotal: number`.

Each member SHALL add source-specific fields:

- `ISwarmReplayManifestEntry` (`replaySource: ReplaySource.Swarm`):
  `configName: string`, `seed: number`, `batchTimestamp: string`
- `IQuickReplayManifestEntry` (`replaySource: ReplaySource.Quick`):
  `playerSide: GameSide`, `aiVariant: string`
- `IPvPReplayManifestEntry` (`replaySource: ReplaySource.PvP`):
  `opponentName: string`, `matchId: string`
- `ICampaignReplayManifestEntry` (`replaySource: ReplaySource.Campaign`):
  `campaignId: string`, `missionId: string`, `difficulty: string`
- `IEncounterReplayManifestEntry` (`replaySource: ReplaySource.Encounter`):
  `encounterId: string`, `encounterName: string`,
  `templateType: ScenarioTemplateType | null`,
  `playerForceSummary: string`, `opponentSummary: string`

`bvTotal` SHALL be computed at manifest-write time from unit data —
consumers SHALL NOT lazy-recompute on read.

The `playerForceSummary` and `opponentSummary` fields on the
encounter variant SHALL be stored as strings (not structured objects)
so the Library row can render them without resolving any external
state. The encounter row in `EncounterRepository` MAY have been
deleted by the time the user reads the manifest entry; the manifest
entry SHALL remain self-contained.

#### Scenario: Swarm manifest entry has source-specific fields

- **GIVEN** a `SimulationRunner` invocation with
  `configName='duel-3kbv-temperate'`, `seed=42`, completed `gameId='sim-7'`
- **WHEN** the writer produces the manifest entry
- **THEN** the entry SHALL be an `ISwarmReplayManifestEntry`
- **AND** `entry.replaySource` SHALL equal `ReplaySource.Swarm`
- **AND** `entry.configName` SHALL equal `'duel-3kbv-temperate'`
- **AND** `entry.seed` SHALL equal `42`
- **AND** `entry.id` SHALL equal `'sim-7'`

#### Scenario: Quick manifest entry has source-specific fields

- **GIVEN** a quick-game completion with `playerSide=GameSide.Player`,
  `aiVariant='aggressive-v2'`
- **WHEN** the writer produces the manifest entry
- **THEN** the entry SHALL be an `IQuickReplayManifestEntry`
- **AND** `entry.replaySource` SHALL equal `ReplaySource.Quick`
- **AND** `entry.aiVariant` SHALL equal `'aggressive-v2'`

#### Scenario: Encounter manifest entry has source-specific fields

- **GIVEN** an encounter battle with `encounterId='encounter-abc'`,
  `encounterName='Foothold Strike'`,
  `templateType=ScenarioTemplateType.Skirmish`, completed
  `gameId='session-77'`
- **WHEN** the writer produces the manifest entry
- **THEN** the entry SHALL be an `IEncounterReplayManifestEntry`
- **AND** `entry.replaySource` SHALL equal `ReplaySource.Encounter`
- **AND** `entry.encounterId` SHALL equal `'encounter-abc'`
- **AND** `entry.encounterName` SHALL equal `'Foothold Strike'`
- **AND** `entry.templateType` SHALL equal `ScenarioTemplateType.Skirmish`
- **AND** `entry.id` SHALL equal `'session-77'`

#### Scenario: Custom encounter entry has null templateType

- **GIVEN** an encounter created without a scenario template
- **WHEN** the writer produces the manifest entry
- **THEN** `entry.templateType` SHALL be `null`

#### Scenario: bvTotal is stored at write time not derived on read

- **GIVEN** a manifest entry written with `bvTotal=4500`
- **WHEN** the entry is read from the index
- **THEN** `entry.bvTotal` SHALL equal `4500`
- **AND** the read path SHALL NOT execute any BV-recomputation code path

#### Scenario: Discriminated union narrows on replaySource

- **GIVEN** a value of type `IReplayManifestEntry`
- **WHEN** code reads `entry.replaySource === ReplaySource.Encounter`
  inside a TypeScript narrowing branch
- **THEN** within the narrowed branch, accessing `entry.encounterId`
  SHALL compile without further type assertion

#### Scenario: Encounter summary strings survive source-force deletion

- **GIVEN** an encounter manifest entry with
  `playerForceSummary='Lance Alpha (4500 BV, 4 units)'`
- **AND** the source force `'Alpha'` has been deleted from the
  `ForceRepository` after the manifest entry was written
- **WHEN** the Library row renders the entry
- **THEN** the row SHALL display the literal text
  `'Lance Alpha (4500 BV, 4 units)'`
- **AND** the render SHALL NOT call `getForceById` or any other
  resolution function

### Requirement: Filesystem Partition Layout

The repository SHALL persist replay event logs under partition
directories at `simulation-reports/<source>/<gameId>.jsonl`, where
`<source>` is the string value of one of the five `ReplaySource`
enum variants. Writers SHALL NOT write swarm logs to the legacy flat
path `simulation-reports/games/<run-timestamp>/<gameId>.jsonl` after
this layout is in effect.

The `simulation-reports/` directory SHALL also contain a single
`replay-index.json` file at its top level, alongside the five
partition directories.

#### Scenario: Swarm runner writes under simulation-reports/swarm/

- **GIVEN** a swarm invocation that produces `gameId='sim-1'`
- **WHEN** the runner writes the event log
- **THEN** the file SHALL exist at `simulation-reports/swarm/sim-1.jsonl`
- **AND** no file SHALL be written under `simulation-reports/games/`

#### Scenario: Quick game persists under simulation-reports/quick/

- **GIVEN** a quick-game completion with `gameId='quick-99'`
- **WHEN** the QuickGameResults page completes its persist effect
- **THEN** the file SHALL exist at
  `simulation-reports/quick/quick-99.jsonl`

#### Scenario: Encounter battle persists under simulation-reports/encounter/

- **GIVEN** an encounter battle that reaches terminal state with
  `gameId='session-77'`
- **WHEN** the persist pipeline completes
- **THEN** the file SHALL exist at
  `simulation-reports/encounter/session-77.jsonl`
- **AND** the `replay-index.json` SHALL contain a manifest entry with
  `replaySource: 'encounter'` and `path: 'encounter/session-77.jsonl'`

#### Scenario: Index file lives next to partitions

- **GIVEN** the populated `simulation-reports/` directory
- **WHEN** its top-level entries are listed
- **THEN** `replay-index.json` SHALL be present alongside the
  partition directories

### Requirement: Central Replay Index Reader

The system SHALL provide a reader that loads `simulation-reports/replay-index.json` and returns a typed `readonly IReplayManifestEntry[]`. The reader SHALL skip entries whose `replaySource` is not a recognized `ReplaySource` enum value (forward-compatibility for future variants written by newer code) and SHALL log skipped entries via the engine logger at debug level.

If `replay-index.json` does not exist, the reader SHALL invoke the backfill scan (see Backfill Scan requirement) and return its result.

#### Scenario: Reader returns typed entries

- **GIVEN** a `replay-index.json` containing one swarm entry and one quick entry
- **WHEN** the reader loads it
- **THEN** the result SHALL be a `readonly IReplayManifestEntry[]` of length 2
- **AND** entry types SHALL discriminate correctly via `replaySource`

#### Scenario: Reader skips unrecognized variants

- **GIVEN** a `replay-index.json` containing one entry with `replaySource: 'lan-coop'` (a future variant unknown to this build)
- **WHEN** the reader loads it
- **THEN** the result SHALL omit that entry
- **AND** the reader SHALL emit a debug log naming the skipped entry's `id`

#### Scenario: Missing index triggers backfill

- **GIVEN** `simulation-reports/replay-index.json` does not exist
- **WHEN** the reader is invoked
- **THEN** the reader SHALL invoke the backfill scan
- **AND** SHALL return the manifest produced by the scan

### Requirement: Central Replay Index Writer

The system SHALL provide a writer that accepts a single new `IReplayManifestEntry`, atomically appends it to the existing `replay-index.json` (or creates the file if absent), and SHALL preserve all existing entries. The append SHALL be atomic: a temporary file SHALL be written and renamed into place so a partial write cannot leave the index in a corrupt state.

#### Scenario: Append preserves existing entries

- **GIVEN** an index containing 100 entries
- **WHEN** the writer appends one new entry
- **THEN** the resulting index SHALL contain 101 entries
- **AND** the original 100 entries SHALL be present unchanged

#### Scenario: Atomic write survives mid-write crash

- **GIVEN** an existing index
- **WHEN** the writer is interrupted between the temp-file write and the rename
- **THEN** the original `replay-index.json` SHALL still exist with its original 100 entries
- **AND** the temp file SHALL be discoverable for cleanup but SHALL NOT be loaded by the reader

#### Scenario: Writer creates index if absent

- **GIVEN** `simulation-reports/replay-index.json` does not exist
- **WHEN** the writer is called with one new entry
- **THEN** the file SHALL be created with that single entry

### Requirement: Backfill Scan

The system SHALL provide a backfill scan that produces a
`readonly IReplayManifestEntry[]` from the contents of
`simulation-reports/`. The scan SHALL examine both the partition
layout (`simulation-reports/<source>/*.jsonl`) AND the legacy flat
layout (`simulation-reports/games/<timestamp>/*.jsonl`).

For each NDJSON file discovered, the scan SHALL stream-read enough
lines to extract:

- The first event (which SHALL be `GameCreated`) — used to derive
  `bvTotal` from `payload.units` summed `.bv` fields and source-specific
  metadata as available. For encounter partitions, the scan SHALL
  extract `encounterId`, `encounterName`, `templateType`,
  `playerForceSummary`, and `opponentSummary` from the
  `GameCreated.payload.encounterMeta` field.
- The last `GameEnded` event (if present) — used to derive `winner`
  and `turns`. If `GameEnded.turns` is absent or undefined, `turns`
  SHALL fall back to the count of `turn_started` events in the file,
  then to `0` if no `turn_started` events exist.

For legacy flat-layout files, the scan SHALL infer
`replaySource = ReplaySource.Swarm` (legacy directory only contained
swarm output) and SHALL set `batchTimestamp` from the parent directory
name.

The scan SHALL be idempotent: re-running on the same disk state SHALL
produce the same manifest array.

#### Scenario: Scan covers new partition layout

- **GIVEN** `simulation-reports/swarm/sim-1.jsonl`,
  `simulation-reports/quick/quick-9.jsonl`,
  `simulation-reports/encounter/session-77.jsonl` exist
- **WHEN** the backfill scan runs
- **THEN** the result SHALL contain one `ISwarmReplayManifestEntry`
  for `sim-1`
- **AND** SHALL contain one `IQuickReplayManifestEntry` for `quick-9`
- **AND** SHALL contain one `IEncounterReplayManifestEntry` for `session-77`

#### Scenario: Scan covers legacy flat layout

- **GIVEN** `simulation-reports/games/2026-05-01T10-00-00-000Z/sim-77.jsonl`
  exists
- **WHEN** the backfill scan runs
- **THEN** the result SHALL contain an `ISwarmReplayManifestEntry`
  for `sim-77`
- **AND** the entry's `batchTimestamp` SHALL equal
  `'2026-05-01T10-00-00-000Z'`

#### Scenario: GameEnded.turns optionality fallback

- **GIVEN** a `<gameId>.jsonl` whose `GameEnded` event is missing the
  `turns` field
- **WHEN** the backfill scan processes it
- **THEN** `entry.turns` SHALL equal the count of `turn_started`
  events in the file
- **AND** if no `turn_started` events exist, `entry.turns` SHALL
  equal `0`

#### Scenario: Scan is idempotent

- **GIVEN** an unchanged `simulation-reports/` directory
- **WHEN** the backfill scan is run twice
- **THEN** the two resulting manifest arrays SHALL be deep-equal

#### Scenario: Encounter scan recovers metadata from GameCreated payload

- **GIVEN** `simulation-reports/encounter/session-77.jsonl` whose
  first event is a `GameCreated` carrying
  `payload.encounterMeta = { encounterId: 'enc-abc', encounterName: 'Foothold Strike', templateType: 'skirmish', playerForceSummary: 'Lance Alpha (4500 BV, 4 units)', opponentSummary: 'Generated Lance (~3000 BV)' }`
- **WHEN** the backfill scan processes the file
- **THEN** the produced `IEncounterReplayManifestEntry` SHALL have
  `encounterId === 'enc-abc'`
- **AND** `encounterName === 'Foothold Strike'`
- **AND** `templateType === ScenarioTemplateType.Skirmish`
- **AND** `playerForceSummary === 'Lance Alpha (4500 BV, 4 units)'`
- **AND** `opponentSummary === 'Generated Lance (~3000 BV)'`
- **AND** the scan SHALL NOT call `EncounterRepository.getEncounterById`
  (the manifest is reconstructable from the file alone)

### Requirement: Replay Library Page

The system SHALL provide a Replay Library page accessible from the
primary navigation. The page SHALL load the replay index on mount,
display every manifest entry as a list row with source-appropriate
metadata visible (e.g. swarm rows show `configName`/`seed`; quick
rows show `aiVariant`; encounter rows show `encounterName` and
`templateType` and force summaries), and SHALL provide a source
filter that limits the displayed list to a chosen `ReplaySource`.

The source filter button strip SHALL contain exactly six buttons in
order: `All`, `Swarm`, `Quick`, `PvP`, `Campaign`, `Encounter`. The
button keys SHALL be `'all'` plus the five `ReplaySource` enum string
values. The encounter row SHALL render `templateType ?? 'Custom'`
when the value is `null` (custom encounters get the literal `'Custom'`
label in the template column).

Clicking a list row SHALL open the existing replay viewer with the
chosen entry's events loaded — without requiring the user to drag a
file.

#### Scenario: Page loads and lists all entries

- **GIVEN** the index contains 3 swarm entries, 2 quick entries, and
  1 encounter entry
- **WHEN** the user navigates to the Replay Library page
- **THEN** the page SHALL render exactly 6 list rows
- **AND** each row SHALL show the entry's `id`, `createdAt`, `turns`,
  `winner`, and `bvTotal`

#### Scenario: Source filter restricts list

- **GIVEN** the index contains 3 swarm entries, 2 quick entries, and
  1 encounter entry
- **WHEN** the user selects the Quick filter
- **THEN** only 2 rows SHALL be visible
- **AND** both rows SHALL display the source-specific `aiVariant` field

#### Scenario: Encounter filter shows encounter entries

- **GIVEN** the index contains 3 swarm entries, 2 quick entries, and
  1 encounter entry
- **WHEN** the user selects the Encounter filter
- **THEN** exactly 1 row SHALL be visible
- **AND** the row SHALL display `encounterName`, the template label
  (or `'Custom'` when `templateType === null`), and the player vs
  opponent summaries

#### Scenario: Filter button strip has six buttons

- **GIVEN** the Replay Library page is rendered
- **WHEN** the user inspects the source filter button strip
- **THEN** the strip SHALL contain exactly six buttons in order:
  `All`, `Swarm`, `Quick`, `PvP`, `Campaign`, `Encounter`

#### Scenario: Click opens replay viewer with events loaded

- **GIVEN** a list row for an encounter entry with
  `path='encounter/session-77.jsonl'`
- **WHEN** the user clicks the row
- **THEN** the replay viewer SHALL mount with the events from that
  file already loaded
- **AND** the user SHALL NOT be prompted to drag a file

### Requirement: Tactical Replay Timeline Controls

The replay system SHALL provide tactical timeline controls that synchronize map state, combat feed, turn rail, and unit inspectors.

#### Scenario: Replay cursor updates tactical shell
- **GIVEN** a tactical replay is loaded
- **WHEN** the user moves the replay cursor to a specific event
- **THEN** the map SHALL show unit positions and overlays for that event time
- **AND** the combat feed SHALL highlight the event
- **AND** the turn rail and inspectors SHALL reflect replay cursor state rather than live session state

#### Scenario: Playback controls are deterministic
- **GIVEN** the same replay event log and terrain source
- **WHEN** playback advances from start to end twice
- **THEN** unit positions, destroyed/withdrawn states, heat, visible pins, and feed highlights SHALL match between runs

### Requirement: Tactical Replay Map Fidelity

Replay data SHALL carry or deterministically derive the map radius, terrain/elevation grid, objective locations, pins with replay scope, and projection-relevant settings.

#### Scenario: Encounter replay restores battlefield
- **GIVEN** an encounter replay was captured from a non-clear terrain map
- **WHEN** the replay is loaded
- **THEN** the tactical map SHALL restore the same map radius, terrain/elevation visuals, objective locations, and initial unit deployments
- **AND** replay rendering SHALL not fall back to a clear placeholder grid unless the original match did

#### Scenario: Missing terrain source is explicit
- **GIVEN** a legacy replay lacks terrain source data
- **WHEN** the replay viewer loads it
- **THEN** the viewer SHALL label terrain as reconstructed or unavailable
- **AND** it SHALL not imply terrain fidelity that cannot be proven from the replay payload

