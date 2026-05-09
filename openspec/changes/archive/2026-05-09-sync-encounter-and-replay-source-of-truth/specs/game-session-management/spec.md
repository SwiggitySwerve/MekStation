# Game Session Management Spec Delta

## ADDED Requirements

### Requirement: Force-Deletion Cascade to Encounter References

The system SHALL clear orphaned force references in the `encounters`
table when a force is deleted. The cascade SHALL run inside the same
SQLite transaction as `ForceRepository.deleteForce`, MUST NULL the
affected `player_force_json` and `opponent_force_json` columns, and
MUST trigger the existing `recalculateStatus` ladder for every
affected encounter id so encounters drop back to `Draft` atomically
with the force deletion (within the constraints of the
**Encounter Status Lifecycle** requirement — `Launched` only demotes
when both forces are now `null`; `Completed` never demotes).

The cascade SHALL be wired via a callback registry at
`src/services/forces/ForceRepository.cascade.ts` exporting
`setEncounterCascadeHook(hook)` and `invokeEncounterCascadeHook(forceId)`.
The encounter repository's singleton factory SHALL register itself as
the hook on first creation. This decoupling SHALL prevent a circular
import between `ForceRepository` and `EncounterRepository`
(`EncounterService` already imports `ForceRepository` for hydration).

If any UPDATE in the cascade throws, the SQLite transaction MUST roll
back AND the force row MUST remain present in the `forces` table. The
cascade MUST NOT delete encounter rows — it only clears the dangling
reference. Encounter deletion remains a separate user-initiated
operation.

The cascade SHALL iterate affected encounters serially (not via
`forEach` — `forEach` is not async-safe with TypeORM/better-sqlite3
patterns; use `for...of` or batched single-statement UPDATEs).

#### Scenario: Single encounter affected

- **GIVEN** a force `F` and an encounter `E` whose `player_force_json`
  references `F`
- **WHEN** `ForceRepository.deleteForce(F)` is called
- **THEN** the SQL transaction SHALL execute
  `DELETE FROM forces WHERE id = F` followed by an UPDATE that NULLs
  `E.player_force_json`
- **AND** `recalculateStatus(E.id)` SHALL be called inside the same
  transaction
- **AND** after commit, `getForceById(F)` SHALL return `null`
- **AND** `getEncounterById(E.id).playerForce` SHALL be `null`
- **AND** `getEncounterById(E.id).status` SHALL be `EncounterStatus.Draft`

#### Scenario: Multiple encounters affected in one transaction

- **GIVEN** a force `F` referenced as the player force by encounter
  `E1`, as the opponent force by encounter `E2`, and as both
  player+opponent on encounter `E3`
- **WHEN** `ForceRepository.deleteForce(F)` is called
- **THEN** all three encounters SHALL have their respective
  `_force_json` columns set to `NULL` for the matching slot inside
  one transaction
- **AND** all three encounters SHALL have status recomputed
- **AND** `getForceById(F)` SHALL return `null`

#### Scenario: Cascade rollback on UPDATE failure

- **GIVEN** a force `F` and an encounter `E` whose
  `player_force_json` references `F`
- **AND** the cascade UPDATE statement is configured to throw
  mid-transaction (test injection)
- **WHEN** `ForceRepository.deleteForce(F)` is called
- **THEN** the transaction SHALL roll back
- **AND** `getForceById(F)` SHALL still return the original force record
- **AND** `getEncounterById(E.id).playerForce.forceId` SHALL still
  equal `F`

#### Scenario: No registered hook does not block force deletion

- **GIVEN** the `EncounterRepository` singleton has not yet been
  initialised (cold-start, no encounter module loaded)
- **WHEN** `ForceRepository.deleteForce(F)` is called
- **THEN** the cascade hook SHALL be skipped (no callback to invoke)
- **AND** the force deletion SHALL still commit
- **AND** any pre-existing encounter references to `F` SHALL remain
  on disk (the secondary safety net at hydration time covers them)

#### Scenario: No referencing encounters

- **GIVEN** a force `F` with zero encounter rows referencing it
- **WHEN** `ForceRepository.deleteForce(F)` is called
- **THEN** the cascade SHALL execute zero UPDATE statements against
  `encounters`
- **AND** the force deletion SHALL still commit normally

### Requirement: Hydration-Boundary Orphaned Reference Replacement

`EncounterService.hydrateEncounter` SHALL replace any unresolvable
force reference with `null` in the returned `IEncounter` (instead of
leaving the dangling embedded ref intact). When the resolver
(`ForceRepository.getForceById`) returns `null` for a stored
`forceId`, the hydrated `playerForce` (or `opponentForce`) field
SHALL be set to `null` AND the system SHALL emit a `logger.warn`
exactly once per `<encounterId>:<forceId>:<side>` key per process
lifetime. The warn dedup Set SHALL be reset by
`resetEncounterService()` so test isolation is preserved.

This requirement is the safety net for any orphan that escapes the
force-deletion cascade (e.g. raw SQL inserts, future bugs, pre-cascade
legacy rows). The cascade is the primary fix; this is the secondary
fix.

#### Scenario: Player force unresolvable returns null

- **GIVEN** an encounter `E` whose stored `player_force_json`
  references force id `F`
- **AND** `forceRepository.getForceById(F)` returns `null`
- **WHEN** `EncounterService.getEncounter(E.id)` is called
- **THEN** the returned `IEncounter.playerForce` SHALL be `null`
- **AND** the returned `IEncounter.opponentForce` SHALL retain
  whatever resolution result it would otherwise have
- **AND** `logger.warn` SHALL be called once with the keys
  `encounterId`, `forceId`, and `side: 'player'`

#### Scenario: Warn dedup across reads

- **GIVEN** the same orphaned encounter `E` referencing the deleted
  force `F`
- **WHEN** `EncounterService.getEncounter(E.id)` is called twice in
  the same process
- **THEN** `logger.warn` SHALL be called exactly once total — the
  second call SHALL be deduped

#### Scenario: Reset clears dedup Set

- **GIVEN** an orphaned encounter `E` already-warned for force `F`
- **WHEN** `resetEncounterService()` is called
- **AND** `EncounterService.getEncounter(E.id)` is then called
- **THEN** `logger.warn` SHALL be called again with the same keys
  (the Set was cleared)

### Requirement: Encounter Game Event Log Persistence

The system SHALL persist the full event log of every encounter battle
to `simulation-reports/encounter/<gameId>.jsonl` AND append an
`IEncounterReplayManifestEntry` to
`simulation-reports/replay-index.json` when an encounter session
launched via `EncounterService.launchEncounter` reaches a terminal
state (winner / draw / aborted).
The persist call SHALL go through the
`POST /api/replay-library/encounter` API route (Node-side filesystem
write); the React client cannot write directly. The persist pipeline
SHALL be implemented at `src/components/encounter/persistEncounterGame.ts`
(Node-only) and SHALL mirror the proven
`src/components/quickgame/persistQuickGame.ts` shape line-for-line —
same `shouldPersistToDisk` three-gate guard, same boundary
post-stamp via `stampEncounterReplaySource`, same NDJSON file write
followed by `appendManifestEntry`.

The persist pipeline SHALL post-stamp every event missing a
`replaySource` field with `ReplaySource.Encounter`. Events that
already carry an explicit `replaySource` value (e.g. a hypothetical
campaign-bound emitter that pre-stamped its own source) SHALL be
preserved unchanged — the post-stamp SHALL only fill in `undefined`
slots.

The API route SHALL implement a dedup guard via `readReplayIndex` +
`id` set check; on duplicate `gameId` it SHALL return
`{ persisted: false, alreadyPersisted: true, manifestEntry: <built fresh>, path: 'encounter/<gameId>.jsonl' }`
with HTTP 200. The route SHALL return HTTP 405 on non-POST, HTTP 400
on body validation failure (with explicit error codes for `BAD_GAME_ID`,
`BAD_BODY`, `BAD_WINNER`), and HTTP 500 on `persistEncounterGame`
throw.

#### Scenario: Persist on encounter terminal state

- **GIVEN** an encounter `E` launched via
  `EncounterService.launchEncounter(E.id)` producing
  `gameSessionId='session-77'`
- **AND** `E.playerForce` had `forceName='Alpha Lance'`, `totalBV=4500`,
  `unitCount=4` at launch
- **WHEN** the live session reaches terminal state
- **THEN** `POST /api/replay-library/encounter` SHALL be called with
  body containing `gameId='session-77'`, `encounterId=E.id`,
  `encounterName=E.name`,
  `playerForceSummary='Alpha Lance (4500 BV, 4 units)'`
- **AND** the file `simulation-reports/encounter/session-77.jsonl`
  SHALL exist on disk after the call returns
- **AND** the manifest entry in `replay-index.json` SHALL have
  `replaySource: 'encounter'`

#### Scenario: ReplaySource post-stamp at persist boundary

- **GIVEN** a completed encounter session with events that do not
  have `replaySource` populated
- **WHEN** the persist pipeline runs
- **THEN** every event written to disk SHALL carry
  `replaySource: ReplaySource.Encounter`

#### Scenario: Explicit non-Encounter ReplaySource preserved

- **GIVEN** an event in the encounter session log that already has
  `replaySource: ReplaySource.Campaign` (a hypothetical campaign-bound
  emitter that pre-stamped its own source)
- **WHEN** the persist pipeline post-stamps the events
- **THEN** the existing `replaySource: ReplaySource.Campaign` value
  SHALL be preserved
- **AND** the post-stamp SHALL only add `ReplaySource.Encounter` to
  events whose `replaySource` is `undefined`

#### Scenario: Dedup guard rejects duplicate gameId

- **GIVEN** a manifest entry for `gameId='session-77'` already exists
  in the replay index
- **WHEN** `POST /api/replay-library/encounter` is called again with
  the same `gameId`
- **THEN** the response SHALL be HTTP 200 with body
  `{ persisted: false, alreadyPersisted: true, manifestEntry: <entry>, path: 'encounter/session-77.jsonl' }`
- **AND** no second NDJSON file SHALL be written
- **AND** the manifest SHALL NOT contain a duplicate entry for
  `session-77`

#### Scenario: API route validates body shape

- **GIVEN** a `POST /api/replay-library/encounter` call with
  `gameId: 'foo/../bar'` (regex mismatch)
- **WHEN** the route handler runs
- **THEN** the response SHALL be HTTP 400 with an explicit error code
  matching `BAD_GAME_ID`

#### Scenario: API route rejects non-POST methods

- **GIVEN** a `GET /api/replay-library/encounter` call
- **WHEN** the route handler runs
- **THEN** the response SHALL be HTTP 405

#### Scenario: persistEncounterGame throw bubbles to 500

- **GIVEN** a `POST /api/replay-library/encounter` call where
  `persistEncounterGame` throws (test injection)
- **WHEN** the route handler runs
- **THEN** the response SHALL be HTTP 500 with error code
  `PERSIST_FAILED`

### Requirement: Encounter Metadata in GameCreated Event Payload

The `GameCreated` event emitted at encounter launch SHALL carry an
`encounterMeta: IEncounterMeta` snapshot in its payload so the
replay-library backfill scan can reconstruct the manifest entry from
the event log alone (without relying on external state).

The `IGameCreatedPayload.encounterMeta` SHALL be optional (`?:`) so
non-encounter sessions (swarm CLI runs, hot-seat quick games, raw
`createGameSession` callers) write nothing in the slot. Encounter
sessions launched via `EncounterService.launchEncounter` SHALL stamp
the field with the snapshot derived per the **Encounter Launch
Snapshot Metadata** requirement in the encounter-system spec.

The `IEncounterMeta` shape SHALL contain:

- `encounterId: string` — the source encounter row id
- `encounterName: string` — encounter name snapshot at launch
- `templateType: string | null` — null for custom encounters
- `playerForceSummary: string` — pre-rendered player descriptor
- `opponentSummary: string` — pre-rendered opponent descriptor

#### Scenario: Launch stamps encounterMeta on GameCreated payload

- **GIVEN** an encounter `E` with `id='encounter-abc'`,
  `name='Foothold Strike'`,
  `template=ScenarioTemplateType.Skirmish`
- **WHEN** `EncounterService.launchEncounter(E.id)` is called
- **THEN** the first event emitted by the resulting session SHALL be
  a `GameCreated`
- **AND** `event.payload.encounterMeta` SHALL be defined
- **AND** `event.payload.encounterMeta.encounterId` SHALL equal
  `'encounter-abc'`
- **AND** `event.payload.encounterMeta.encounterName` SHALL equal
  `'Foothold Strike'`
- **AND** `event.payload.encounterMeta.templateType` SHALL equal
  `'skirmish'`

#### Scenario: Non-encounter session has no encounterMeta

- **GIVEN** a quick-game `GameCreated` event
- **WHEN** consumers read its payload
- **THEN** `payload.encounterMeta` SHALL be `undefined`

#### Scenario: Backfill scan recovers metadata from GameCreated

- **GIVEN** an `simulation-reports/encounter/session-77.jsonl` whose
  first event is a `GameCreated` with `payload.encounterMeta` populated
- **WHEN** the backfill scan processes the file
- **THEN** the produced `IEncounterReplayManifestEntry` SHALL have
  all five encounter-specific fields populated from that single event
- **AND** the scan SHALL NOT call
  `EncounterRepository.getEncounterById`

### Requirement: Browser-Side Encounter Persist Hook

The system SHALL guard the encounter-persist call against double-fire
on component remount via a `useRef`+`useEffect` pattern in the live
game-session viewer at `src/pages/gameplay/games/[id].tsx`, identical
to the pattern `QuickGameResults` uses for quick-game persistence. The hook
SHALL distinguish encounter-originated sessions from other session
types by checking for the presence of `event.payload.encounterMeta`
on the session's `GameCreated` event — only sessions that carry
encounter metadata SHALL trigger the encounter persist call. The
persist call body shape derivation SHALL live in
`src/components/encounter/persistEncounterFromSession.ts` so unit
tests can pin the contract without mounting the full gameplay page.

Quick-game and skirmish-direct sessions SHALL NOT trigger the
encounter persist hook (they have their own pipelines or are
intentionally non-persistent).

#### Scenario: Encounter session triggers persist exactly once

- **GIVEN** a live game-session view mounted on
  `/gameplay/games/<encounterGameSessionId>` whose `GameCreated`
  event carries `encounterMeta`
- **WHEN** the session reaches terminal state
- **THEN** `POST /api/replay-library/encounter` SHALL be called
  exactly once

#### Scenario: Component remount does not re-persist

- **GIVEN** the same session has already triggered the encounter
  persist call
- **WHEN** the React component remounts (and the persist effect
  re-runs)
- **THEN** the second persist effect SHALL short-circuit on the
  `useRef` guard
- **AND** no second POST SHALL be issued from the client

#### Scenario: Quick-game session does not trigger encounter persist

- **GIVEN** a live game-session view mounted for a quick-game session
  whose `GameCreated` event has no `encounterMeta`
- **WHEN** the session reaches terminal state
- **THEN** the encounter persist hook SHALL NOT fire
- **AND** the quick-game persist pipeline SHALL run via its own
  effect

#### Scenario: Persist failure logs but does not crash the page

- **GIVEN** the encounter persist call returns a non-OK response
  (network error, server 500)
- **WHEN** the live view's effect handles the result
- **THEN** the error SHALL be surfaced via `logger.warn`
- **AND** the page SHALL remain mounted and interactive
