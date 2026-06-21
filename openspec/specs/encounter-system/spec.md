# encounter-system Specification

## Purpose

Defines Encounter System requirements for Encounter Entity Model, Encounter Status Lifecycle, Force-Reference Slot Semantics, and Force Configuration, preserving the source-of-truth scope introduced by archived change sync-encounter-and-replay-source-of-truth.

## Requirements
### Requirement: Encounter Entity Model

The system SHALL define an `IEncounter` entity that represents a
configured game-session setup. Every encounter MUST carry a unique
`id`, a human-readable `name`, a current `status` from the
`EncounterStatus` enum, a `mapConfig: IMapConfiguration`, a
non-empty-by-contract `victoryConditions: readonly IVictoryCondition[]`
array, an `optionalRules: readonly string[]` array, and ISO-8601
`createdAt` and `updatedAt` timestamps. The entity MAY carry an
optional `description: string`, an optional `template: ScenarioTemplateType`,
an optional `gameSessionId: string` (set after launch), an optional
`opForConfig: IOpForConfig`, and the two force-reference slots
(`playerForce` and `opponentForce`) which follow the
null-vs-undefined contract defined in the **Force-Reference Slot
Semantics** requirement.

The entity SHALL be defined in `src/types/encounter/EncounterInterfaces.ts`
and the type SHALL be exported as `IEncounter`.

#### Scenario: Required fields present on every encounter

- **GIVEN** an `IEncounter` value loaded from the encounter repository
- **WHEN** consumers read its fields
- **THEN** `id`, `name`, `status`, `mapConfig`, `victoryConditions`,
  `optionalRules`, `createdAt`, and `updatedAt` SHALL all be present
- **AND** `id` SHALL be a non-empty string
- **AND** `victoryConditions.length` SHALL be `>= 0` (at-least-one is
  enforced by validation, not by the type)

#### Scenario: Optional fields are typed as optional

- **GIVEN** an `IEncounter` declaration
- **WHEN** TypeScript checks the shape
- **THEN** `description`, `template`, `gameSessionId`, `opForConfig`
  SHALL all be `?:` optional
- **AND** `playerForce` and `opponentForce` SHALL be typed as
  `?: IForceReference | null` (optional with explicit-null support)

#### Scenario: Type guard recognises shape

- **GIVEN** an arbitrary `unknown` value with the encounter shape
- **WHEN** `isEncounter(value)` is called
- **THEN** the result SHALL be `true` only when `id`, `name`, `status`
  are strings AND `mapConfig` is an object AND `victoryConditions` is
  an array

### Requirement: Encounter Status Lifecycle

The system SHALL define an `EncounterStatus` enum with exactly four
values: `Draft = 'draft'`, `Ready = 'ready'`, `Launched = 'launched'`,
`Completed = 'completed'`. The enum SHALL be the single source of
truth for encounter lifecycle classification.

The repository's `recalculateStatus(encounterId)` operation SHALL
short-circuit on encounters whose stored status is `Launched` or
`Completed` — it MUST NOT demote a `Completed` encounter back to
`Draft` even if its forces become orphaned (history is fixed). It MUST
demote a `Launched` encounter back to `Draft` only when both
`playerForce` and `opponentForce` are `null` after the cascade has
run; otherwise the `Launched` status remains.

For encounters in `Draft` or `Ready`, `recalculateStatus` SHALL
recompute the status from the current configuration:

- `Draft` — at least one of `playerForce`, `opponentForce` (or
  `opForConfig`), or `victoryConditions` is missing or invalid.
- `Ready` — `validateEncounter(encounter).valid === true`.

#### Scenario: Status enum values are exactly four

- **GIVEN** the `EncounterStatus` enum
- **WHEN** `Object.values(EncounterStatus)` is computed
- **THEN** the result SHALL equal `['draft', 'ready', 'launched', 'completed']`
  in any order

#### Scenario: Completed never demotes

- **GIVEN** an encounter `E` in status `Completed` with
  `playerForce: null` AND `opponentForce: null`
- **WHEN** `recalculateStatus(E.id)` runs
- **THEN** `E.status` SHALL remain `Completed`

#### Scenario: Launched demotes to Draft only when both forces null

- **GIVEN** an encounter `E` in status `Launched` with
  `playerForce: null` AND `opponentForce: null`
- **WHEN** `recalculateStatus(E.id)` runs
- **THEN** `E.status` SHALL become `Draft`

#### Scenario: Launched with one force still present remains Launched

- **GIVEN** an encounter `E` in status `Launched` with
  `playerForce: null` AND `opponentForce: { forceId: 'F2', ... }`
- **WHEN** `recalculateStatus(E.id)` runs
- **THEN** `E.status` SHALL remain `Launched`

### Requirement: Force-Reference Slot Semantics

The `playerForce` and `opponentForce` slots on `IEncounter` SHALL
distinguish three states using `undefined`, `null`, and the
`IForceReference` shape:

- `undefined` — no force was ever stored for this slot. The user has
  not made a selection.
- `null` — a force WAS stored on the row, but the referenced force row
  has been deleted from the `ForceRepository`. The hydration boundary
  (`EncounterService.hydrateEncounter`) sets the slot to `null` when
  the resolver returns `null` for the stored `forceId`.
- `IForceReference` (a non-null object with `forceId`, `forceName`,
  `totalBV`, `unitCount`) — the force resolved successfully.

This three-state distinction SHALL persist through every read path so
downstream UI / helpers can distinguish "never set" from "set but
broken." The repair surfaces (broken pill + repair banner + cleanup
script) all key off the `null` state.

#### Scenario: Undefined slot for new encounter

- **GIVEN** an encounter `E` newly created via `createEncounter`
- **WHEN** consumers read `E.playerForce`
- **THEN** the slot SHALL be `undefined`

#### Scenario: Null slot after force deletion

- **GIVEN** an encounter `E` whose stored `playerForce.forceId` is `F`
  AND force `F` has been deleted from the `ForceRepository`
- **WHEN** `EncounterService.getEncounter(E.id)` is called
- **THEN** the returned `E.playerForce` SHALL be `null`
- **AND** consumers SHALL be able to distinguish this from `undefined`

#### Scenario: Resolved slot for valid reference

- **GIVEN** an encounter `E` whose stored `playerForce.forceId` is `F`
  AND force `F` exists with `forceName: 'Alpha'`, `totalBV: 4500`,
  `unitCount: 4`
- **WHEN** `EncounterService.getEncounter(E.id)` is called
- **THEN** `E.playerForce` SHALL be the `IForceReference` object with
  matching values

### Requirement: Force Configuration

The system SHALL support both explicit force selection and OpFor-based
opponent generation for an encounter. An encounter SHALL be valid for
launch when EITHER an explicit `opponentForce: IForceReference` is set
OR an `opForConfig: IOpForConfig` is set. The `playerForce` SHALL
always be required (the player must select a force; OpFor generation
is not available for the player side).

The `IOpForConfig` shape SHALL include a `pilotSkillTemplate` from the
`PilotSkillTemplate` enum (`Green`, `Regular`, `Veteran`, `Elite`,
`Mixed`) and MAY include `targetBV` (absolute), `targetBVPercent`
(percentage of player force), `era`, `faction`, and `unitTypes`
filters.

#### Scenario: Explicit-force encounter is valid

- **GIVEN** an encounter `E` with `playerForce`, `opponentForce`, and
  at least one victory condition
- **WHEN** `validateEncounter(E)` is called
- **THEN** the result `valid` SHALL be `true`

#### Scenario: OpFor-driven encounter is valid

- **GIVEN** an encounter `E` with `playerForce`, no `opponentForce`,
  `opForConfig.pilotSkillTemplate: PilotSkillTemplate.Regular`, and at
  least one victory condition
- **WHEN** `validateEncounter(E)` is called
- **THEN** the result `valid` SHALL be `true`

#### Scenario: Missing player force fails validation

- **GIVEN** an encounter `E` with no `playerForce` and an
  `opForConfig` set
- **WHEN** `validateEncounter(E)` is called
- **THEN** `valid` SHALL be `false`
- **AND** `errors` SHALL contain a string mentioning the player force

#### Scenario: Missing opponent and opForConfig fails validation

- **GIVEN** an encounter `E` with `playerForce` set but no
  `opponentForce` and no `opForConfig`
- **WHEN** `validateEncounter(E)` is called
- **THEN** `valid` SHALL be `false`
- **AND** `errors` SHALL contain a string mentioning opponent / OpFor

#### Scenario: BV imbalance produces warning, not error

- **GIVEN** an encounter `E` with `playerForce.totalBV = 1000` and
  `opponentForce.totalBV = 5000`
- **WHEN** `validateEncounter(E)` is called
- **THEN** `valid` SHALL be `true`
- **AND** `warnings` SHALL contain a string about BV imbalance

### Requirement: Map Configuration

The system SHALL define an `IMapConfiguration` shape with `radius`
(hex radius from centre, e.g. 5 = 11×11 hex grid), `terrain` (a value
from the `TerrainPreset` enum), `playerDeploymentZone`, and
`opponentDeploymentZone` (each one of `'north' | 'south' | 'east' | 'west'`).

The `TerrainPreset` enum SHALL include `Clear`, `LightWoods`,
`HeavyWoods`, `Urban`, and `Rough`. The shipped game runtime fully
supports `Clear`; non-`Clear` terrain presets are recognised by the
type system but their full battlefield generation is implementation-
forward.

#### Scenario: Default scenario template populates valid map config

- **GIVEN** the `Skirmish` template is applied to a new encounter
- **WHEN** the encounter's `mapConfig` is read
- **THEN** `radius` SHALL equal `8`
- **AND** `terrain` SHALL equal `TerrainPreset.Clear`
- **AND** `playerDeploymentZone` SHALL equal `'south'`
- **AND** `opponentDeploymentZone` SHALL equal `'north'`

#### Scenario: Deployment zones must be opposites

- **GIVEN** a scenario template's `defaultMapConfig`
- **WHEN** the deployment zones are inspected
- **THEN** `playerDeploymentZone` and `opponentDeploymentZone` SHALL
  be on opposite map edges (north/south pair OR east/west pair)

### Requirement: Victory Conditions

The system SHALL define an `IVictoryCondition` shape carrying a
`type: VictoryConditionType` and optional `description`, `turnLimit`,
and `threshold` fields. The `VictoryConditionType` enum SHALL include
`DestroyAll`, `Cripple`, `Retreat`, `TurnLimit`, and `Custom`.

`Cripple` MAY carry an explicit `threshold` percentage (default `50`).
`TurnLimit` MUST carry a positive `turnLimit` integer; validation
SHALL surface an error otherwise.

#### Scenario: DestroyAll has no extra fields

- **GIVEN** a victory condition `{ type: VictoryConditionType.DestroyAll }`
- **WHEN** the encounter is validated
- **THEN** the condition SHALL pass validation

#### Scenario: TurnLimit requires positive turnLimit

- **GIVEN** a victory condition
  `{ type: VictoryConditionType.TurnLimit, turnLimit: 0 }`
- **WHEN** `validateEncounter(encounter)` runs
- **THEN** `valid` SHALL be `false`
- **AND** an error SHALL mention "turn limit" with a positivity
  requirement

#### Scenario: Cripple defaults threshold

- **GIVEN** a victory condition `{ type: VictoryConditionType.Cripple }`
  on an otherwise valid encounter
- **WHEN** the encounter is validated
- **THEN** `valid` SHALL be `true`
- **AND** the condition SHALL be treated as `threshold: 50` by the
  game-runtime consumers

### Requirement: Scenario Templates

The system SHALL define a `ScenarioTemplateType` enum with exactly
four values: `Duel = 'duel'`, `Skirmish = 'skirmish'`,
`Battle = 'battle'`, `Custom = 'custom'`. The `SCENARIO_TEMPLATES`
constant SHALL export exactly four `IScenarioTemplate` entries — one
per enum value — covering name, description, default map config,
default victory conditions, suggested unit count, and suggested BV
range.

The seed-samples API and the encounter-list empty-state seed button
both iterate `SCENARIO_TEMPLATES` to create one starter encounter per
template.

#### Scenario: Enum has exactly four values

- **GIVEN** the `ScenarioTemplateType` enum
- **WHEN** `Object.values(ScenarioTemplateType)` is computed
- **THEN** the result SHALL equal `['duel', 'skirmish', 'battle', 'custom']`
  in any order

#### Scenario: Template constant covers every enum value exactly once

- **GIVEN** the `SCENARIO_TEMPLATES` constant
- **WHEN** the entries' `type` fields are collected into a set
- **THEN** the set SHALL equal the set of `ScenarioTemplateType` values

#### Scenario: Applying template populates encounter defaults

- **GIVEN** a freshly created encounter `E` with the `Duel` template
  applied
- **WHEN** `E.mapConfig` and `E.victoryConditions` are read
- **THEN** they SHALL match the `SCENARIO_TEMPLATES[Duel]` defaults
- **AND** the user MAY override either field via subsequent updates

### Requirement: Encounter Launch Snapshot Metadata

The system SHALL stamp an `IEncounterMeta` snapshot onto the
resulting `IGameSession`'s configuration when
`EncounterService.launchEncounter(encounterId)` succeeds, so the
eventual `GameCreated` event carries it on its
`payload.encounterMeta` field. The snapshot SHALL
be derived from the encounter row at launch time and SHALL be
immutable thereafter — later mutations to the source encounter (or
its forces) MUST NOT propagate into the persisted event log.

The `IEncounterMeta` shape SHALL contain:

- `encounterId: string` — the source `IEncounter.id`.
- `encounterName: string` — `IEncounter.name` snapshot.
- `templateType: string | null` — the encounter's `template` value as
  a string (e.g. `'duel'`), or `null` for fully-custom encounters.
- `playerForceSummary: string` — pre-rendered player descriptor.
- `opponentSummary: string` — pre-rendered opponent descriptor.

The `playerForceSummary` derivation SHALL be:

- `IEncounter.playerForce` non-null → `"<forceName> (<totalBV> BV, <unitCount> units)"`
- `IEncounter.playerForce === null` → `"<storedForceId> (missing force)"`
  (broken-encounter snapshot text)

The `opponentSummary` derivation SHALL be:

- `IEncounter.opponentForce` non-null → same shape as
  `playerForceSummary` for explicit forces
- `IEncounter.opForConfig` set (and no explicit opponent) →
  `"Generated <type> (~<targetBV> BV)"` substring derived from the
  config's filters and target BV

The `encounterMeta` field SHALL be optional on `IGameCreatedPayload` so
non-encounter sessions (swarm CLI runs, hot-seat quick games, raw
`createGameSession` callers) write nothing in the slot.

#### Scenario: Launch stamps encounterMeta

- **GIVEN** an encounter `E` with `id='enc-abc'`, `name='Foothold Strike'`,
  `template=ScenarioTemplateType.Skirmish`, `playerForce={forceName:'Alpha',totalBV:4500,unitCount:4}`,
  `opponentForce={forceName:'Bravo',totalBV:3800,unitCount:4}`
- **WHEN** `EncounterService.launchEncounter('enc-abc')` is called
- **THEN** the resulting session's first emitted `GameCreated` event
  SHALL have `payload.encounterMeta` populated
- **AND** `encounterMeta.encounterId` SHALL equal `'enc-abc'`
- **AND** `encounterMeta.encounterName` SHALL equal `'Foothold Strike'`
- **AND** `encounterMeta.templateType` SHALL equal `'skirmish'`
- **AND** `encounterMeta.playerForceSummary` SHALL equal `'Alpha (4500 BV, 4 units)'`
- **AND** `encounterMeta.opponentSummary` SHALL equal `'Bravo (3800 BV, 4 units)'`

#### Scenario: Custom encounter snapshots templateType as null

- **GIVEN** an encounter `E` with `template === undefined`
- **WHEN** `EncounterService.launchEncounter(E.id)` is called
- **THEN** the stamped `encounterMeta.templateType` SHALL be `null`

#### Scenario: opForConfig-driven opponent stamps Generated summary

- **GIVEN** an encounter `E` with `opponentForce: undefined` and
  `opForConfig: { targetBV: 3000, pilotSkillTemplate: PilotSkillTemplate.Regular }`
- **WHEN** `EncounterService.launchEncounter(E.id)` is called
- **THEN** `encounterMeta.opponentSummary` SHALL contain the literal
  substring `'Generated'`
- **AND** SHALL contain the literal substring `'3000'`

#### Scenario: Broken player force stamps missing-force snapshot

- **GIVEN** an encounter `E` whose stored `playerForce.forceId` is
  `'F-deleted'` AND the force has been deleted (slot is `null` after
  hydration)
- **WHEN** `EncounterService.launchEncounter(E.id)` is called and the
  service decides to launch anyway (or this is the snapshot used by a
  pre-launch persist test)
- **THEN** `encounterMeta.playerForceSummary` SHALL equal
  `'F-deleted (missing force)'` exactly

#### Scenario: Non-encounter session has no encounterMeta

- **GIVEN** a raw `createGameSession(config, units)` call with no
  encounter context
- **WHEN** the resulting `GameCreated` event is read
- **THEN** `payload.encounterMeta` SHALL be `undefined`

### Requirement: Broken-Reference Detection Helper

The system SHALL provide a pure helper at
`src/services/encounter/encounterBrokenRefs.ts` exporting the
function:

```
encounterBrokenRefs(
  encounter: IEncounter,
  rawForceIds: { playerForceId: string | null; opponentForceId: string | null }
): { playerForceMissing: boolean; opponentForceMissing: boolean }
```

The helper SHALL report `playerForceMissing: true` if and only if
`rawForceIds.playerForceId !== null` AND `encounter.playerForce === null`.
The opponent predicate SHALL mirror this shape. The helper SHALL be a
pure function — no IO, no logging, no mutation of either argument.
The repository's `getEncounterWithRawIds` (and the list variant) SHALL
expose the raw stored force ids alongside the hydrated encounter so
the helper can be invoked without an extra round-trip.

#### Scenario: Player ref stored but unresolved → missing

- **GIVEN** an encounter with `playerForce: null` AND
  `rawForceIds: { playerForceId: 'F', opponentForceId: null }`
- **WHEN** `encounterBrokenRefs(encounter, rawForceIds)` is called
- **THEN** the result SHALL be `{ playerForceMissing: true, opponentForceMissing: false }`

#### Scenario: Both refs unresolved → both missing

- **GIVEN** an encounter with `playerForce: null` AND `opponentForce: null`
  AND `rawForceIds: { playerForceId: 'F1', opponentForceId: 'F2' }`
- **WHEN** the helper is called
- **THEN** the result SHALL be `{ playerForceMissing: true, opponentForceMissing: true }`

#### Scenario: No refs stored → not missing

- **GIVEN** an encounter with `playerForce: null` (or `undefined`) AND
  `rawForceIds: { playerForceId: null, opponentForceId: null }`
- **WHEN** the helper is called
- **THEN** the result SHALL be `{ playerForceMissing: false, opponentForceMissing: false }`

#### Scenario: Refs resolved → not missing

- **GIVEN** an encounter with `playerForce: { forceId: 'F', forceName: 'Alpha', totalBV: 4500, unitCount: 4 }`
  AND `rawForceIds: { playerForceId: 'F', opponentForceId: null }`
- **WHEN** the helper is called
- **THEN** the result SHALL be `{ playerForceMissing: false, opponentForceMissing: false }`

### Requirement: Encounter List Broken-Pill Render

The encounter list view at `/gameplay/encounters` SHALL render a
yellow `"Player force missing"` pill (or `"Opponent force missing"`
for the opponent slot) on any encounter card whose
`encounterBrokenRefs` reports a missing reference. The pill SHALL
replace the silent zero-name pill that the legacy render produced for
encounters with hydrated force-ref objects carrying empty
`forceName`. The pill SHALL share the visual treatment of the existing
yellow `"No Player Force"` / `"No Opponent"` pills so users scan the
same warning slot.

The encounter card SHALL be implemented in
`src/components/gameplay/encounters/EncounterCard.tsx` (or a co-located
helper) and SHALL receive both the hydrated encounter and the raw
force ids so it can call `encounterBrokenRefs`.

#### Scenario: Broken pill renders for missing player force

- **GIVEN** an encounter card prop with `encounter.playerForce === null`
  AND `rawForceIds.playerForceId !== null`
- **WHEN** the card renders
- **THEN** a yellow pill with text `"Player force missing"` SHALL be
  visible
- **AND** no empty-name `"Player: "` pill SHALL render

#### Scenario: Both sides broken renders both pills

- **GIVEN** an encounter card prop with both `playerForce: null` AND
  `opponentForce: null` AND both raw force ids non-null
- **WHEN** the card renders
- **THEN** the card SHALL render exactly one `"Player force missing"`
  pill AND exactly one `"Opponent force missing"` pill

#### Scenario: Resolved sides render the green name pill

- **GIVEN** an encounter card with `playerForce: { forceName: 'Alpha', ... }`
- **WHEN** the card renders
- **THEN** a non-yellow pill displaying the force name SHALL render
  for the player slot
- **AND** no broken pill SHALL render for the player slot

### Requirement: Encounter Detail Repair Banner

The encounter detail view at `/gameplay/encounters/[id]` SHALL render
a top-of-page banner above the existing form when the loaded
encounter has at least one broken force reference. The banner SHALL
display:

- Header text: `"This encounter has a broken force reference"`
- Body text explaining the dangling forceId(s) — e.g. `"The force <forceId> referenced as the player force was deleted."`
  (and/or the opponent equivalent).
- One action button per affected slot:
  `"Clear missing player force"` and/or `"Clear missing opponent force"`.

Clicking a clear-action button SHALL call the existing
`setPlayerForce(encounterId, null)` (for the player slot) or
`clearOpponentForce(encounterId)` (for the opponent slot) store
action AND SHALL reload the encounter so the banner disappears on
success. The banner module SHALL be implemented in
`src/components/gameplay/pages/EncounterDetailPage.repairBanner.tsx`
(or co-located on the page module).

#### Scenario: Banner renders when player force is broken

- **GIVEN** the detail page is rendering an encounter with
  `playerForce: null` AND `rawForceIds.playerForceId === 'F'`
- **WHEN** the page mounts
- **THEN** a banner SHALL be visible above the form
- **AND** the banner body SHALL contain the literal text
  `"The force F referenced as the player force was deleted."`
- **AND** a button labelled `"Clear missing player force"` SHALL be
  present

#### Scenario: Clear-action wires through to existing setPlayerForce

- **GIVEN** the detail page is rendered with a broken player force
- **WHEN** the user clicks `"Clear missing player force"`
- **THEN** the `setPlayerForce(encounterId, null)` store action SHALL
  be called
- **AND** the page SHALL reload the encounter after success
- **AND** the banner SHALL no longer be visible

#### Scenario: Both sides broken renders two action buttons

- **GIVEN** an encounter with both player and opponent forces broken
- **WHEN** the detail page renders
- **THEN** the banner SHALL contain both
  `"Clear missing player force"` AND
  `"Clear missing opponent force"` buttons

#### Scenario: No broken refs hides banner

- **GIVEN** an encounter with both forces resolved (or both slots
  `undefined`)
- **WHEN** the detail page renders
- **THEN** no repair banner SHALL be visible

### Requirement: Sample Encounter Seeding

The system SHALL provide a `POST /api/encounters/seed-samples`
endpoint at `src/pages/api/encounters/seed-samples.ts` that creates
one encounter per `SCENARIO_TEMPLATES` entry inside a single SQLite
transaction. The endpoint SHALL return
`{ success: true, ids: readonly string[] }` containing the created
encounter ids on success, or `{ success: false, error: string }` with
HTTP 500 on any creation failure mid-transaction (the entire seed
operation MUST roll back).

The encounter list page SHALL render a
`"Seed sample encounters"` button alongside the existing
`"Create First Encounter"` button on the empty-state, visible only
when the filtered list is empty AND no search query AND
`statusFilter === 'all'`. Clicking the button SHALL POST to the
endpoint, then call `loadEncounters()` to refresh the page.

The seeded encounters SHALL be auto-named with a date-and-template
suffix (e.g. `"Sample Duel - 2026-05-08"`). Repeated invocations SHALL
use a numeric suffix on collisions (e.g. `"Sample Duel - 2026-05-08 (2)"`)
so the operation is repeatable without unique-name conflicts. Seeded
encounters SHALL NOT have forces or `opForConfig` auto-assigned —
the user wires those manually after the seed.

#### Scenario: Seed endpoint creates one encounter per template

- **GIVEN** an empty encounters table
- **WHEN** `POST /api/encounters/seed-samples` is called
- **THEN** the response body SHALL be
  `{ success: true, ids: <one id per ScenarioTemplateType value> }`
- **AND** `getAllEncounters()` SHALL return one row per
  `ScenarioTemplateType` value
- **AND** each row's `template` field SHALL match the corresponding
  enum value exactly once

#### Scenario: Repeated seed appends with suffixed names

- **GIVEN** the encounters table contains one prior seed batch
- **WHEN** `POST /api/encounters/seed-samples` is called again
- **THEN** the response SHALL succeed with as many new ids as there
  are templates
- **AND** the new rows SHALL have names ending with the `(2)` suffix

#### Scenario: Empty-state button visibility

- **GIVEN** the encounter list is empty AND there is no search query
  AND `statusFilter === 'all'`
- **WHEN** the list page renders
- **THEN** the empty-state SHALL display both
  `"Create First Encounter"` AND `"Seed sample encounters"` buttons

#### Scenario: Empty-state button hidden under filters

- **GIVEN** the encounter list is empty AND a non-default search query
  is active (or `statusFilter !== 'all'`)
- **WHEN** the list page renders
- **THEN** the empty-state SHALL NOT display the
  `"Seed sample encounters"` button

#### Scenario: Mid-transaction failure rolls back

- **GIVEN** a database-level error injected on the second template
  insert
- **WHEN** `POST /api/encounters/seed-samples` runs
- **THEN** the response SHALL be
  `{ success: false, error: <string> }` with HTTP 500
- **AND** zero encounters SHALL be present in the database after the
  failed call (no partial seed)

### Requirement: One-Time Cleanup Script for Broken Drafts

The system SHALL provide a one-time CLI cleanup tool at
`scripts/cleanup-broken-encounters.ts` (Node-only via the `tsx` runner)
that classifies every encounter in the database into one of:

- `'abandoned-empty'` — `status === EncounterStatus.Draft` AND
  `playerForce === null/undefined` AND
  `opponentForce === null/undefined` AND
  `opForConfig === null/undefined`. These rows are deleted.
- `'orphaned-force-reference'` — at least one stored
  `playerForceId` / `opponentForceId` is non-null AND the
  corresponding `getForceById` lookup returns `null`. These rows are
  repaired in place via `EncounterRepository.clearForceReference`
  (NULLing the dangling slot).
- `'still-valid'` — anything else. Status MUST NOT be modified.

The script SHALL write the full classification manifest to
`simulation-reports/cleanup-encounters-<ISO>.json` BEFORE performing
any deletes. The manifest SHALL contain every encounter (full row
plus the classification verdict and a `classificationReason` string)
so the operator can audit what changed before re-running.

The script SHALL gate deletion to encounters whose status is `Draft`
even when the row otherwise classifies as `'abandoned-empty'`. Rows
with status `Launched` or `Completed` SHALL be reclassified as
`'still-valid'` with a reason explaining the status gate.

The script SHALL be idempotent — re-running on a database that no
longer contains any abandoned-empty rows SHALL still write a manifest
classifying every encounter, but the `deletedIds` array SHALL be
empty.

The script SHALL accept two CLI flags:

- `--manifest-only` — write the manifest but skip all deletes and
  repairs. Used for pre-flight audits.
- `--cwd <path>` — override the working directory for the manifest
  output (used by tests).

#### Scenario: Manifest written before any DELETE

- **GIVEN** a database with 5 encounters (2 abandoned-empty,
  2 orphaned, 1 still-valid)
- **WHEN** the cleanup script runs without flags
- **THEN** the file `simulation-reports/cleanup-encounters-<ISO>.json`
  SHALL exist before any DELETE statement is executed
- **AND** the file SHALL contain 5 manifest entries with the correct
  classification for each
- **AND** the script SHALL return
  `{ deletedIds: <2 ids>, repairedIds: <2 ids>, retainedIds: <1 id> }`

#### Scenario: Idempotent re-run on cleaned database

- **GIVEN** the cleanup script has already been run once and there
  are no abandoned-empty rows remaining
- **WHEN** the cleanup script is run a second time
- **THEN** a new manifest file SHALL be written with the new ISO
  suffix
- **AND** `deletedIds` SHALL be an empty array

#### Scenario: manifest-only flag skips deletes

- **GIVEN** the database has 2 abandoned-empty encounters
- **WHEN** the cleanup script runs with `--manifest-only`
- **THEN** the manifest SHALL be written
- **AND** `deletedIds` SHALL be an empty array
- **AND** all encounters SHALL still be present in the database

#### Scenario: Status-gated deletion preserves Launched and Completed rows

- **GIVEN** an encounter `E` that classifies as `'abandoned-empty'`
  by content BUT has status `EncounterStatus.Launched`
- **WHEN** the cleanup script runs
- **THEN** `E` SHALL NOT be deleted
- **AND** the manifest SHALL classify `E` as `'still-valid'` with a
  reason mentioning the status gate

#### Scenario: Orphan rows repaired in place

- **GIVEN** an encounter `E` whose stored `playerForceId` is `F` AND
  `getForceById(F)` returns `null`
- **WHEN** the cleanup script runs
- **THEN** `E` SHALL be reclassified as `'orphaned-force-reference'`
- **AND** `E.playerForce` SHALL be set to `null` via
  `clearForceReference('F')`
- **AND** `E` SHALL remain present in the database

### Requirement: Encounter Detail Watch Replay Link

The encounter detail page SHALL render a "Watch Replay" navigation control linking to `/gameplay/games/<gameSessionId>/replay` whenever the loaded `IEncounter` has a populated `gameSessionId` (i.e. the encounter has been launched and `EncounterRepository.linkSession` has stamped the launched session id onto the row). The page module is at `src/pages/gameplay/encounters/[id].tsx`. The control SHALL be hidden when `gameSessionId` is `undefined`.

The control SHALL be implemented as a button that uses the
existing `Button` component from `@/components/ui` for styling
parity with the surrounding `EncounterActionsFooter`. The button
SHALL invoke `router.push('/gameplay/games/' + gameSessionId +
'/replay')` on click — it SHALL NOT use a raw `<a href>` because
the navigation needs to flow through Next.js's client-side router
to preserve the encounter store state for back-navigation.

The button SHALL be discoverable on the page without scrolling
past the existing forces / map / validation cards. The placement
SHALL be co-located with the existing encounter action surfaces
(`EncounterActionsFooter`) so the user finds replay-related
actions in the same visual region as launch / quick-resolve / delete.

The button label SHALL be the literal text `"Watch Replay"`. The
button SHALL carry a `data-testid` of `'encounter-watch-replay-link'`
so test specs can target it deterministically.

#### Scenario: Launched encounter with gameSessionId shows the link

- **GIVEN** an encounter loaded into the detail page with
  `status: EncounterStatus.Launched` and
  `gameSessionId: 'session-abc-123'`
- **WHEN** the page mounts
- **THEN** a button labelled `"Watch Replay"` SHALL be visible
- **AND** the button SHALL carry the test id
  `'encounter-watch-replay-link'`

#### Scenario: Draft encounter without gameSessionId hides the link

- **GIVEN** an encounter loaded into the detail page with
  `status: EncounterStatus.Draft` and `gameSessionId: undefined`
- **WHEN** the page mounts
- **THEN** no button with the test id
  `'encounter-watch-replay-link'` SHALL be present in the
  rendered DOM

#### Scenario: Click navigates to the replay route

- **GIVEN** the Watch Replay button is visible for an encounter
  with `gameSessionId: 'session-abc-123'`
- **WHEN** the user clicks the button
- **THEN** `router.push` SHALL be called with the literal
  string `'/gameplay/games/session-abc-123/replay'`
- **AND** the call SHALL go through `next/router`, not a raw
  `<a href>` browser navigation

#### Scenario: Button hides immediately when encounter is unlaunched

- **GIVEN** an encounter that was previously launched and then
  had its `gameSessionId` cleared (e.g. a test scenario or a
  future un-launch flow)
- **WHEN** the page re-renders with `gameSessionId: undefined`
- **THEN** the Watch Replay button SHALL no longer be visible
- **AND** the page SHALL NOT throw or warn about a missing
  `gameSessionId`

