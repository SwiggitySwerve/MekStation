# Game Session Management Spec Delta

## ADDED Requirements

### Requirement: Encounter Battle Replay Persistence

When an encounter battle launched via `EncounterService.launchEncounter` reaches a terminal state (winner / draw / aborted), the system SHALL persist the full event log to `simulation-reports/encounter/<gameId>.jsonl` AND append an `IEncounterReplayManifestEntry` to `simulation-reports/replay-index.json`. The persist hook SHALL fire from the same terminal-state boundary the campaign outcome publish hook uses.

The persist call SHALL go through `POST /api/replay-library/encounter` (Node-side filesystem write) — the React component cannot write directly. The component SHALL guard against double-fire on remount via the same useRef+effect pattern `QuickGameResults` uses for the quick persist.

The encounter metadata stamped onto the persist payload SHALL be a snapshot taken at launch time:

- `encounterId` — the source encounter row id
- `encounterName` — the encounter name as it was at launch
- `templateType` — the scenario template applied, or `null` for fully-custom encounters
- `playerForceSummary` — `"<forceName> (<totalBV> BV, <unitCount> units)"` when `playerForce` is non-null; `"<forceId> (missing force)"` if the player force was broken at launch time
- `opponentSummary` — same shape for explicit opponent forces; `"Generated <type> (~<targetBV> BV)"` for opForConfig-driven opponents

The metadata SHALL be embedded in the `GameCreated` event's payload AND in the persist call's request body — both copies stay in sync because the persist call derives from the event log.

#### Scenario: Persist on encounter terminal state

- **GIVEN** an encounter `E` with `playerForce.forceName='Alpha Lance'`, `playerForce.totalBV=4500`, `playerForce.unitCount=4`
- **AND** `E` was launched via `EncounterService.launchEncounter(E.id)` producing `gameSessionId='session-77'`
- **WHEN** the live session reaches terminal state
- **THEN** `POST /api/replay-library/encounter` SHALL be called with body containing `gameId='session-77'`, `encounterId=E.id`, `encounterName=E.name`, `playerForceSummary='Alpha Lance (4500 BV, 4 units)'`
- **AND** the file `simulation-reports/encounter/session-77.jsonl` SHALL exist on disk after the call returns
- **AND** the manifest entry in `replay-index.json` SHALL have `replaySource: 'encounter'`

#### Scenario: Custom encounter (no template) persists with null templateType

- **GIVEN** an encounter `E` with `template=undefined` (built from scratch without a template)
- **WHEN** `E` is launched and reaches terminal state
- **THEN** the persist call SHALL include `templateType: null` in its body
- **AND** the manifest entry SHALL have `templateType: null`

#### Scenario: opForConfig-driven encounter persists generated summary

- **GIVEN** an encounter `E` with `opForConfig` set and `opponentForce=undefined`
- **AND** `E.opForConfig.targetBV=3000`
- **WHEN** `E` is launched and reaches terminal state
- **THEN** the `opponentSummary` field on the persist body SHALL contain the literal substring `'Generated'` AND the literal substring `'3000'`

#### Scenario: Double-fire guard

- **GIVEN** an encounter that has already persisted to the Replay Library
- **WHEN** the React component remounts and the persist effect would re-fire
- **THEN** the second persist call SHALL hit the API route's dedup guard
- **AND** the response SHALL be `{ persisted: false, alreadyPersisted: true, ... }`
- **AND** no second NDJSON file SHALL be written
- **AND** the manifest SHALL NOT contain a duplicate entry for the same `gameId`

#### Scenario: ReplaySource post-stamp at persist boundary

- **GIVEN** a completed encounter session with events that do not have `replaySource` populated
- **WHEN** the persist pipeline runs
- **THEN** every event written to disk SHALL carry `replaySource: ReplaySource.Encounter`

#### Scenario: Explicit non-Encounter ReplaySource preserved

- **GIVEN** an event in the encounter session log that already has `replaySource: ReplaySource.Campaign` (a hypothetical campaign-bound emitter that pre-stamped its own source)
- **WHEN** the persist pipeline post-stamps the events
- **THEN** the existing `replaySource: ReplaySource.Campaign` value SHALL be preserved
- **AND** the post-stamp SHALL only add `ReplaySource.Encounter` to events whose `replaySource` is `undefined`

### Requirement: Encounter Metadata in GameCreated Event

The `GameCreated` event emitted at encounter launch SHALL carry the encounter metadata in its payload so the replay-library backfill scan can reconstruct the manifest entry from the event log alone (without relying on external state).

The `GameCreated.payload` SHALL include:

- `encounterId: string` — the source encounter row id
- `encounterName: string` — encounter name snapshot at launch
- `templateType: ScenarioTemplateType | null` — null for custom encounters
- `playerForceSummary: string` — pre-rendered player descriptor
- `opponentSummary: string` — pre-rendered opponent descriptor

These fields SHALL be set ONLY for encounters launched via `EncounterService.launchEncounter`. Quick-game and swarm `GameCreated` events SHALL NOT carry the encounter fields (they are TypeScript-narrowed via the source discriminator).

#### Scenario: Launch stamps metadata on GameCreated

- **GIVEN** an encounter `E` with `id='encounter-abc'`, `name='Foothold Strike'`, `template=ScenarioTemplateType.Skirmish`
- **WHEN** `EncounterService.launchEncounter(E.id)` is called
- **THEN** the first event emitted by the resulting session SHALL be a `GameCreated`
- **AND** that event's `payload` SHALL include `encounterId: 'encounter-abc'`, `encounterName: 'Foothold Strike'`, `templateType: 'Skirmish'`

#### Scenario: Backfill scan recovers metadata from GameCreated

- **GIVEN** an `simulation-reports/encounter/session-77.jsonl` whose first event is a `GameCreated` with the encounter metadata in its payload
- **WHEN** the backfill scan processes the file
- **THEN** the produced `IEncounterReplayManifestEntry` SHALL have all five encounter-specific fields populated from that single event
- **AND** the scan SHALL NOT call `EncounterRepository.getEncounterById` (the manifest is reconstructable from the file alone)
