# Replay Library Spec Delta

## ADDED Requirements

### Requirement: IEncounterReplayManifestEntry Variant

The `IReplayManifestEntry` discriminated union SHALL include a fifth member `IEncounterReplayManifestEntry` whose `replaySource` discriminant is `ReplaySource.Encounter`. The interface SHALL extend `IReplayManifestEntryBase` and add the source-specific fields:

- `encounterId: string` — the source encounter row id
- `encounterName: string` — snapshot of the encounter name at launch time
- `templateType: ScenarioTemplateType | null` — the scenario template applied (Duel / Skirmish / Battle / Custom), or `null` for fully-custom encounters
- `playerForceSummary: string` — already-rendered text describing the player force (e.g. `"Lance Alpha (4500 BV, 4 units)"`)
- `opponentSummary: string` — already-rendered text describing the opponent (`"Lance Bravo (3800 BV, 4 units)"` for explicit forces; `"Generated Lance (~3000 BV)"` for opForConfig-driven)

The summaries SHALL be stored as strings (not structured objects) so the Library row can render them without resolving any external state. The encounter row in `EncounterRepository` MAY have been deleted by the time the user reads the manifest entry; the manifest SHALL remain self-contained.

`bvTotal` (inherited from the base) SHALL be computed at write time from the first `GameCreated` event's `payload.units` summed `.bv` fields, identical to the swarm and quick variants.

#### Scenario: Encounter manifest entry has source-specific fields

- **GIVEN** an encounter battle with `encounterId='encounter-abc'`, `encounterName='Foothold Strike'`, `templateType=ScenarioTemplateType.Skirmish`, completed `gameId='session-77'`
- **WHEN** the writer produces the manifest entry
- **THEN** the entry SHALL be an `IEncounterReplayManifestEntry`
- **AND** `entry.replaySource` SHALL equal `ReplaySource.Encounter`
- **AND** `entry.encounterId` SHALL equal `'encounter-abc'`
- **AND** `entry.encounterName` SHALL equal `'Foothold Strike'`
- **AND** `entry.templateType` SHALL equal `ScenarioTemplateType.Skirmish`
- **AND** `entry.id` SHALL equal `'session-77'`

#### Scenario: Custom encounter has null templateType

- **GIVEN** an encounter created without a scenario template (the user built it from scratch)
- **WHEN** the writer produces the manifest entry
- **THEN** `entry.templateType` SHALL be `null`
- **AND** the Library row SHALL render the fallback label `"Custom"` for the template column

#### Scenario: Discriminated union narrows on Encounter

- **GIVEN** a value of type `IReplayManifestEntry`
- **WHEN** code reads `entry.replaySource === ReplaySource.Encounter` inside a TypeScript narrowing branch
- **THEN** within the narrowed branch, accessing `entry.encounterId` SHALL compile without further type assertion

#### Scenario: Force summary survives source-force deletion

- **GIVEN** an encounter manifest entry with `playerForceSummary='Lance Alpha (4500 BV, 4 units)'`
- **AND** the source force `'Alpha'` has been deleted from the `ForceRepository` after the manifest entry was written
- **WHEN** the Library row renders the entry
- **THEN** the row SHALL display the literal text `'Lance Alpha (4500 BV, 4 units)'`
- **AND** the render SHALL NOT call `getForceById` or any other resolution function

## MODIFIED Requirements

### Requirement: ReplaySource Enum

The system SHALL define a `ReplaySource` enum with exactly the values `Swarm`, `Quick`, `PvP`, `Campaign`, and `Encounter`. The serialized string values SHALL be `'swarm'`, `'quick'`, `'pvp'`, `'campaign'`, and `'encounter'` respectively. The enum SHALL be the single source of truth for replay-source discrimination at every layer (envelope field, manifest entry discriminant, filesystem partition directory name, library page filter values).

#### Scenario: Enum has exactly five values

- **GIVEN** the `ReplaySource` enum
- **WHEN** `Object.values(ReplaySource)` is computed
- **THEN** the result SHALL equal `['swarm', 'quick', 'pvp', 'campaign', 'encounter']` in any order

#### Scenario: Enum value matches partition directory name

- **GIVEN** any `ReplaySource` value `s`
- **WHEN** the writer derives the filesystem partition path for `s`
- **THEN** the partition directory name SHALL equal the string value of `s` (e.g. `ReplaySource.Encounter` → `simulation-reports/encounter/`)

#### Scenario: Exhaustive switch fails compilation if a variant is missed

- **GIVEN** a `switch (entry.replaySource)` statement that omits one of the five cases
- **WHEN** TypeScript compilation runs in strict mode
- **THEN** compilation SHALL fail with a `Type 'ReplaySource' is not assignable to type 'never'` error or equivalent exhaustiveness error

### Requirement: IReplayManifestEntry Discriminated Union

The system SHALL define an `IReplayManifestEntry` discriminated union with exactly five member interfaces — one per `ReplaySource` value. Every member SHALL extend a base interface with the fields `id: string` (the `gameId`), `replaySource: ReplaySource`, `path: string` (relative to `simulation-reports/`), `createdAt: string` (ISO 8601), `turns: number`, `winner: GameSide | null`, and `bvTotal: number`.

Each member SHALL add source-specific fields:

- `ISwarmReplayManifestEntry` (`replaySource: ReplaySource.Swarm`): `configName: string`, `seed: number`, `batchTimestamp: string`
- `IQuickReplayManifestEntry` (`replaySource: ReplaySource.Quick`): `playerSide: GameSide`, `aiVariant: string`
- `IPvPReplayManifestEntry` (`replaySource: ReplaySource.PvP`): `opponentName: string`, `matchId: string`
- `ICampaignReplayManifestEntry` (`replaySource: ReplaySource.Campaign`): `campaignId: string`, `missionId: string`, `difficulty: string`
- `IEncounterReplayManifestEntry` (`replaySource: ReplaySource.Encounter`): `encounterId: string`, `encounterName: string`, `templateType: ScenarioTemplateType | null`, `playerForceSummary: string`, `opponentSummary: string`

`bvTotal` SHALL be computed at manifest-write time from unit data — consumers SHALL NOT lazy-recompute on read.

#### Scenario: Swarm manifest entry has source-specific fields

- **GIVEN** a `SimulationRunner` invocation with `configName='duel-3kbv-temperate'`, `seed=42`, completed `gameId='sim-7'`
- **WHEN** the writer produces the manifest entry
- **THEN** the entry SHALL be an `ISwarmReplayManifestEntry`
- **AND** `entry.replaySource` SHALL equal `ReplaySource.Swarm`
- **AND** `entry.configName` SHALL equal `'duel-3kbv-temperate'`
- **AND** `entry.seed` SHALL equal `42`
- **AND** `entry.id` SHALL equal `'sim-7'`

#### Scenario: Quick manifest entry has source-specific fields

- **GIVEN** a quick-game completion with `playerSide=GameSide.Player`, `aiVariant='aggressive-v2'`
- **WHEN** the writer produces the manifest entry
- **THEN** the entry SHALL be an `IQuickReplayManifestEntry`
- **AND** `entry.replaySource` SHALL equal `ReplaySource.Quick`
- **AND** `entry.aiVariant` SHALL equal `'aggressive-v2'`

#### Scenario: bvTotal is stored at write time not derived on read

- **GIVEN** a manifest entry written with `bvTotal=4500`
- **WHEN** the entry is read from the index
- **THEN** `entry.bvTotal` SHALL equal `4500`
- **AND** the read path SHALL NOT execute any BV-recomputation code path

#### Scenario: Discriminated union narrows on replaySource

- **GIVEN** a value of type `IReplayManifestEntry`
- **WHEN** code reads `entry.replaySource === ReplaySource.Swarm` inside a TypeScript narrowing branch
- **THEN** within the narrowed branch, accessing `entry.configName` SHALL compile without further type assertion

#### Scenario: Encounter manifest entry has source-specific fields

- **GIVEN** an encounter battle with `encounterId='encounter-abc'`, `encounterName='Foothold Strike'`, `templateType=ScenarioTemplateType.Skirmish`, completed `gameId='session-77'`
- **WHEN** the writer produces the manifest entry
- **THEN** the entry SHALL be an `IEncounterReplayManifestEntry`
- **AND** `entry.replaySource` SHALL equal `ReplaySource.Encounter`
- **AND** `entry.encounterName` SHALL equal `'Foothold Strike'`
- **AND** `entry.templateType` SHALL equal `ScenarioTemplateType.Skirmish`

### Requirement: Filesystem Partition Layout

The repository SHALL persist replay event logs under partition directories at `simulation-reports/<source>/<gameId>.jsonl`, where `<source>` is the string value of one of the five `ReplaySource` enum variants. Writers SHALL NOT write swarm logs to the legacy flat path `simulation-reports/games/<run-timestamp>/<gameId>.jsonl` after this change ships.

The `simulation-reports/` directory SHALL also contain a single `replay-index.json` file at its top level, alongside the five partition directories.

#### Scenario: Swarm runner writes under simulation-reports/swarm/

- **GIVEN** a swarm invocation that produces `gameId='sim-1'`
- **WHEN** the runner writes the event log
- **THEN** the file SHALL exist at `simulation-reports/swarm/sim-1.jsonl`
- **AND** no file SHALL be written under `simulation-reports/games/`

#### Scenario: Quick game persists under simulation-reports/quick/

- **GIVEN** a quick-game completion with `gameId='quick-99'`
- **WHEN** the QuickGameResults page completes its persist effect
- **THEN** the file SHALL exist at `simulation-reports/quick/quick-99.jsonl`

#### Scenario: Encounter battle persists under simulation-reports/encounter/

- **GIVEN** an encounter battle that reaches terminal state with `gameId='session-77'`
- **WHEN** the persist pipeline completes
- **THEN** the file SHALL exist at `simulation-reports/encounter/session-77.jsonl`
- **AND** the `replay-index.json` SHALL contain a manifest entry with `replaySource: 'encounter'` and `path: 'encounter/session-77.jsonl'`

#### Scenario: Index file lives next to partitions

- **GIVEN** the populated `simulation-reports/` directory
- **WHEN** its top-level entries are listed
- **THEN** `replay-index.json` SHALL be present alongside the partition directories

### Requirement: Backfill Scan

The system SHALL provide a backfill scan that produces a `readonly IReplayManifestEntry[]` from the contents of `simulation-reports/`. The scan SHALL examine both the new partition layout (`simulation-reports/<source>/*.jsonl`) AND the legacy flat layout (`simulation-reports/games/<timestamp>/*.jsonl`).

For each NDJSON file discovered, the scan SHALL stream-read enough lines to extract:

- The first event (which SHALL be `GameCreated`) — used to derive `bvTotal` from `payload.units` and source-specific metadata as available. For encounter partitions, the scan SHALL extract `encounterId`, `encounterName`, `templateType`, `playerForceSummary`, and `opponentSummary` from the `GameCreated.payload`.
- The last `GameEnded` event (if present) — used to derive `winner` and `turns`. If `GameEnded.turns` is absent or undefined, `turns` SHALL fall back to the count of `turn_started` events in the file, then to `0` if no `turn_started` events exist.

For legacy flat-layout files, the scan SHALL infer `replaySource = ReplaySource.Swarm` (legacy directory only contained swarm output) and SHALL set `batchTimestamp` from the parent directory name.

The scan SHALL be idempotent: re-running on the same disk state SHALL produce the same manifest array.

#### Scenario: Scan covers new partition layout

- **GIVEN** `simulation-reports/swarm/sim-1.jsonl`, `simulation-reports/quick/quick-9.jsonl`, `simulation-reports/encounter/session-77.jsonl` exist
- **WHEN** the backfill scan runs
- **THEN** the result SHALL contain one `ISwarmReplayManifestEntry` for `sim-1`
- **AND** SHALL contain one `IQuickReplayManifestEntry` for `quick-9`
- **AND** SHALL contain one `IEncounterReplayManifestEntry` for `session-77`

#### Scenario: Scan covers legacy flat layout

- **GIVEN** `simulation-reports/games/2026-05-01T10-00-00-000Z/sim-77.jsonl` exists (legacy)
- **WHEN** the backfill scan runs
- **THEN** the result SHALL contain an `ISwarmReplayManifestEntry` for `sim-77`
- **AND** the entry's `batchTimestamp` SHALL equal `'2026-05-01T10-00-00-000Z'`

#### Scenario: GameEnded.turns optionality fallback

- **GIVEN** a `<gameId>.jsonl` whose `GameEnded` event is missing the `turns` field
- **WHEN** the backfill scan processes it
- **THEN** `entry.turns` SHALL equal the count of `turn_started` events in the file
- **AND** if no `turn_started` events exist, `entry.turns` SHALL equal `0`

#### Scenario: Scan is idempotent

- **GIVEN** an unchanged `simulation-reports/` directory
- **WHEN** the backfill scan is run twice
- **THEN** the two resulting manifest arrays SHALL be deep-equal (same length, same entries, same field values)

#### Scenario: Encounter scan recovers encounter metadata

- **GIVEN** `simulation-reports/encounter/session-77.jsonl` whose first event is a `GameCreated` carrying `payload.encounterId='enc-abc'`, `payload.encounterName='Foothold Strike'`, `payload.templateType='Skirmish'`, `payload.playerForceSummary='Lance Alpha (4500 BV, 4 units)'`, `payload.opponentSummary='Generated Lance (~3000 BV)'`
- **WHEN** the backfill scan processes the file
- **THEN** the produced `IEncounterReplayManifestEntry` SHALL have `encounterId === 'enc-abc'`
- **AND** `encounterName === 'Foothold Strike'`
- **AND** `templateType === ScenarioTemplateType.Skirmish`
- **AND** `playerForceSummary === 'Lance Alpha (4500 BV, 4 units)'`
- **AND** `opponentSummary === 'Generated Lance (~3000 BV)'`

### Requirement: Replay Library Page

The system SHALL provide a Replay Library page accessible from the primary navigation. The page SHALL load the replay index on mount, display every manifest entry as a list row with source-appropriate metadata visible (e.g. swarm rows show `configName`/`seed`; quick rows show `aiVariant`; encounter rows show `encounterName` and `templateType` and force summaries), and SHALL provide a source filter that limits the displayed list to a chosen `ReplaySource`.

The source filter button strip SHALL include exactly six buttons: All, Swarm, Quick, PvP, Campaign, Encounter. The button keys SHALL be `'all'` plus the five `ReplaySource` enum string values.

Clicking a list row SHALL open the existing replay viewer with the chosen entry's events loaded — without requiring the user to drag a file.

#### Scenario: Page loads and lists all entries

- **GIVEN** the index contains 3 swarm entries, 2 quick entries, and 1 encounter entry
- **WHEN** the user navigates to the Replay Library page
- **THEN** the page SHALL render exactly 6 list rows
- **AND** each row SHALL show the entry's `id`, `createdAt`, `turns`, `winner`, and `bvTotal`

#### Scenario: Source filter restricts list

- **GIVEN** the index contains 3 swarm entries, 2 quick entries, and 1 encounter entry
- **WHEN** the user selects the Quick filter
- **THEN** only 2 rows SHALL be visible
- **AND** both rows SHALL display the source-specific `aiVariant` field

#### Scenario: Encounter filter shows encounter entries

- **GIVEN** the index contains 3 swarm entries, 2 quick entries, and 1 encounter entry
- **WHEN** the user selects the Encounter filter
- **THEN** exactly 1 row SHALL be visible
- **AND** the row SHALL display `encounterName` and `templateType` (or `'Custom'` when `null`) and the player vs opponent summaries

#### Scenario: Filter button strip has six buttons

- **GIVEN** the Replay Library page is rendered
- **WHEN** the user inspects the source filter button strip
- **THEN** the strip SHALL contain exactly six buttons in order: `All`, `Swarm`, `Quick`, `PvP`, `Campaign`, `Encounter`

#### Scenario: Click opens replay viewer with events loaded

- **GIVEN** a list row for an encounter entry with `path='encounter/session-77.jsonl'`
- **WHEN** the user clicks the row
- **THEN** the replay viewer SHALL mount with the events from that file already loaded
- **AND** the user SHALL NOT be prompted to drag a file
