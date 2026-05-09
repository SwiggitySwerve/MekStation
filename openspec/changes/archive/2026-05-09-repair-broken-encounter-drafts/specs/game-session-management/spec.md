# Game Session Management Spec Delta

## ADDED Requirements

### Requirement: Force-Deletion Cascade to Encounter References

The system SHALL clear orphaned force references in the `encounters` table when a force is deleted. The cascade SHALL run inside the same SQLite transaction as `ForceRepository.deleteForce`, MUST NULL the affected `player_force_json` and `opponent_force_json` columns, and MUST trigger the existing `recalculateStatus` ladder for every affected encounter id so encounters drop back to `Draft` atomically with the force deletion.

If any UPDATE in the cascade throws, the SQLite transaction MUST roll back AND the force row MUST remain present in the `forces` table. The cascade MUST NOT delete encounter rows — it only clears the dangling reference. Encounter deletion remains a separate user-initiated operation.

#### Scenario: Single encounter affected

- **GIVEN** a force `F` and an encounter `E` whose `player_force_json` references `F`
- **WHEN** `ForceRepository.deleteForce(F)` is called
- **THEN** the SQL transaction SHALL execute `DELETE FROM forces WHERE id = F` followed by `UPDATE encounters SET player_force_json = NULL WHERE json_extract(player_force_json, '$.forceId') = F`
- **AND** `recalculateStatus(E.id)` SHALL be called inside the same transaction
- **AND** after commit, `getForceById(F)` SHALL return `null`
- **AND** `getEncounterById(E.id).playerForce` SHALL be `null`
- **AND** `getEncounterById(E.id).status` SHALL be `EncounterStatus.Draft`

#### Scenario: Multiple encounters affected in one transaction

- **GIVEN** a force `F` referenced as the player force by encounter `E1`, as the opponent force by encounter `E2`, and as both player+opponent on encounter `E3`
- **WHEN** `ForceRepository.deleteForce(F)` is called
- **THEN** all three encounters SHALL have their respective `_force_json` columns set to `NULL` for the matching slot inside one transaction
- **AND** all three encounters SHALL have status recomputed
- **AND** `getForceById(F)` SHALL return `null`

#### Scenario: Cascade rollback on UPDATE failure

- **GIVEN** a force `F` and an encounter `E` whose `player_force_json` references `F`
- **AND** the cascade UPDATE statement is configured to throw mid-transaction (test injection)
- **WHEN** `ForceRepository.deleteForce(F)` is called
- **THEN** the transaction SHALL roll back
- **AND** `getForceById(F)` SHALL still return the original force record
- **AND** `getEncounterById(E.id).playerForce.forceId` SHALL still equal `F`

#### Scenario: No referencing encounters

- **GIVEN** a force `F` with zero encounter rows referencing it
- **WHEN** `ForceRepository.deleteForce(F)` is called
- **THEN** the cascade SHALL execute zero UPDATE statements against `encounters`
- **AND** the force deletion SHALL still commit normally

### Requirement: Hydration-Boundary Orphaned Reference Replacement

`EncounterService.hydrateEncounter` SHALL replace any unresolvable force reference with `null` in the returned `IEncounter` (instead of leaving the dangling embedded ref intact). When the resolver returns `null` for a stored `forceId`, the hydrated `playerForce` (or `opponentForce`) field SHALL be set to `null` AND the system SHALL emit a `logger.warn` exactly once per `${encounterId}:${forceId}:${side}` key per process lifetime.

The dedup Set SHALL be reset by `resetEncounterService()` so test isolation is preserved.

This requirement is the safety net for any orphan that escapes the force-deletion cascade (e.g. raw SQL inserts, future bugs, pre-cascade legacy rows). The cascade is the primary fix; this is the secondary fix.

#### Scenario: Player force unresolvable returns null

- **GIVEN** an encounter `E` whose stored `player_force_json` references force id `F`
- **AND** `forceRepository.getForceById(F)` returns `null`
- **WHEN** `EncounterService.getEncounter(E.id)` is called
- **THEN** the returned `IEncounter.playerForce` SHALL be `null`
- **AND** the returned `IEncounter.opponentForce` SHALL retain whatever resolution result it would otherwise have
- **AND** `logger.warn` SHALL be called once with the keys `encounterId`, `forceId`, and `side: 'player'`

#### Scenario: Warn dedup across reads

- **GIVEN** the same orphaned encounter `E` referencing the deleted force `F`
- **WHEN** `EncounterService.getEncounter(E.id)` is called twice in the same process
- **THEN** `logger.warn` SHALL be called exactly once total — the second call SHALL be deduped

#### Scenario: Reset clears dedup Set

- **GIVEN** an orphaned encounter `E` already-warned for force `F`
- **WHEN** `resetEncounterService()` is called
- **AND** `EncounterService.getEncounter(E.id)` is then called
- **THEN** `logger.warn` SHALL be called again with the same keys (the Set was cleared)

### Requirement: Broken-Reference Detection Helper

The system SHALL provide a pure helper `encounterBrokenRefs(encounter, rawForceIds)` at `src/services/encounter/encounterBrokenRefs.ts` that returns `{ playerForceMissing: boolean; opponentForceMissing: boolean }`. The helper SHALL report `playerForceMissing: true` if and only if `rawForceIds.playerForceId !== null` AND `encounter.playerForce === null`. Same predicate for the opponent side. Pure function — no IO, no logging.

The helper SHALL NOT mutate either argument. The shape of `rawForceIds` SHALL be `{ playerForceId: string | null; opponentForceId: string | null }`.

#### Scenario: Player ref stored but unresolved → missing

- **GIVEN** an encounter with `playerForce: null` AND `rawForceIds: { playerForceId: 'F', opponentForceId: null }`
- **WHEN** `encounterBrokenRefs` is called
- **THEN** the result SHALL be `{ playerForceMissing: true, opponentForceMissing: false }`

#### Scenario: Both refs stored, both unresolved → both missing

- **GIVEN** an encounter with `playerForce: null` AND `opponentForce: null` AND `rawForceIds: { playerForceId: 'F1', opponentForceId: 'F2' }`
- **WHEN** `encounterBrokenRefs` is called
- **THEN** the result SHALL be `{ playerForceMissing: true, opponentForceMissing: true }`

#### Scenario: No refs stored → not missing

- **GIVEN** an encounter with `playerForce: null` AND `rawForceIds: { playerForceId: null, opponentForceId: null }`
- **WHEN** `encounterBrokenRefs` is called
- **THEN** the result SHALL be `{ playerForceMissing: false, opponentForceMissing: false }`

#### Scenario: Refs resolved → not missing

- **GIVEN** an encounter with `playerForce: { forceId: 'F', forceName: 'Alpha Lance', totalBV: 4500, unitCount: 4 }` AND `rawForceIds: { playerForceId: 'F', opponentForceId: null }`
- **WHEN** `encounterBrokenRefs` is called
- **THEN** the result SHALL be `{ playerForceMissing: false, opponentForceMissing: false }`

### Requirement: Encounter List Surfaces Broken-Reference State

The encounter list page at `/gameplay/encounters` SHALL render a yellow "Player force missing" pill (or "Opponent force missing" for the opponent slot) on any encounter card whose `encounterBrokenRefs` reports a missing reference. The pill SHALL replace the silent zero-name pill that today renders an empty `forceName`. The pill SHALL share the visual treatment of the existing yellow "No Player Force" / "No Opponent" pills so users scan the same warning slot.

The list page response from `GET /api/encounters` SHALL include the raw force ids alongside the hydrated encounters so the page can call `encounterBrokenRefs` without an extra round-trip.

#### Scenario: Broken-pill renders for missing player force

- **GIVEN** an encounter with `playerForce: null` AND `rawForceIds.playerForceId !== null`
- **WHEN** the list page renders the encounter card
- **THEN** the card SHALL render a yellow pill with text "Player force missing"
- **AND** the card SHALL NOT render an empty-name "Player: " pill

#### Scenario: Both sides broken renders both pills

- **GIVEN** an encounter with both `playerForce: null` AND `opponentForce: null` AND both raw force ids non-null
- **WHEN** the list page renders the encounter card
- **THEN** the card SHALL render one yellow "Player force missing" pill AND one yellow "Opponent force missing" pill

#### Scenario: API exposes raw force ids

- **GIVEN** the list page is loaded
- **WHEN** the page issues `GET /api/encounters`
- **THEN** the response body SHALL include `rawForceIds: Record<encounterId, { playerForceId: string | null; opponentForceId: string | null }>` keyed by encounter id

### Requirement: Encounter Detail Repair Banner

The encounter detail page at `/gameplay/encounters/[id]` SHALL render a top-of-page banner above the existing form when the loaded encounter has at least one broken force reference. The banner SHALL display:

- Header text: `"This encounter has a broken force reference"`
- Body text: explaining the dangling forceId(s) — `"The force <forceId> referenced as the player force was deleted."` (and/or the opponent equivalent)
- One action button per affected slot: "Clear missing player force" and/or "Clear missing opponent force"

Clicking a clear-action button SHALL call the existing `setPlayerForce(encounterId, null)` (for player) or `clearOpponentForce(encounterId)` (for opponent) store action AND SHALL reload the encounter so the banner disappears on success.

#### Scenario: Banner renders when player force is broken

- **GIVEN** an encounter with `playerForce: null` AND `rawForceIds.playerForceId === 'F'`
- **WHEN** the detail page renders
- **THEN** a banner SHALL be visible above the form
- **AND** the banner SHALL contain the literal text `"The force F referenced as the player force was deleted."`
- **AND** a button labeled `"Clear missing player force"` SHALL be present

#### Scenario: Clear-action wires through to existing setPlayerForce

- **GIVEN** the detail page is rendered with a broken player force
- **WHEN** the user clicks "Clear missing player force"
- **THEN** the `setPlayerForce(encounterId, null)` store action SHALL be called
- **AND** the encounter SHALL be reloaded after success
- **AND** the banner SHALL no longer be visible

#### Scenario: Both sides broken renders two action buttons

- **GIVEN** an encounter with both player and opponent forces broken
- **WHEN** the detail page renders
- **THEN** the banner SHALL contain both `"Clear missing player force"` AND `"Clear missing opponent force"` buttons

### Requirement: Sample Encounter Seeding

The system SHALL provide a `POST /api/encounters/seed-samples` endpoint that creates one encounter per `SCENARIO_TEMPLATES` entry (Duel, Skirmish, Battle, Custom — currently four) inside a single SQLite transaction. The endpoint SHALL return `{ success: true, ids: readonly string[] }` containing the four created encounter ids. On any creation failure mid-transaction, the entire seed operation SHALL roll back AND the response SHALL be `{ success: false, error: string }` with HTTP 500.

The encounter list page SHALL render a "Seed sample encounters" button alongside the existing "Create First Encounter" button on the empty-state, visible only when the filtered list is empty AND no search query AND no status filter is active. Clicking the button SHALL POST to the endpoint, then call `loadEncounters()` to refresh the page.

The seeded encounters SHALL be auto-named with a date-and-template suffix (e.g. `"Sample Duel - 2026-05-08"`). Repeated invocations SHALL use a numeric suffix on collisions (e.g. `"Sample Duel - 2026-05-08 (2)"`) so the operation is repeatable without unique-name conflicts. Seed encounters SHALL NOT have forces or opForConfigs auto-assigned — the user wires those manually.

#### Scenario: Seed endpoint creates four encounters

- **GIVEN** an empty encounters table
- **WHEN** `POST /api/encounters/seed-samples` is called
- **THEN** the response SHALL be `{ success: true, ids: [<4 strings>] }`
- **AND** `getAllEncounters()` SHALL return four rows
- **AND** the four rows SHALL have templates `Duel`, `Skirmish`, `Battle`, `Custom` exactly once each

#### Scenario: Repeated seed creates four more with suffixed names

- **GIVEN** the encounters table contains one prior seed batch (4 rows)
- **WHEN** `POST /api/encounters/seed-samples` is called again
- **THEN** the response SHALL be `{ success: true, ids: [<4 new strings>] }`
- **AND** `getAllEncounters()` SHALL return eight rows
- **AND** the four new rows SHALL have names ending with the `(2)` suffix

#### Scenario: Empty-state button visibility

- **GIVEN** the encounter list is empty AND there is no search query AND `statusFilter === 'all'`
- **WHEN** the list page renders
- **THEN** the empty-state SHALL display both "Create First Encounter" AND "Seed sample encounters" buttons

#### Scenario: Empty-state button hidden under filters

- **GIVEN** the encounter list is empty AND a non-default search query is active
- **WHEN** the list page renders
- **THEN** the empty-state SHALL NOT display the "Seed sample encounters" button (only the "Create First Encounter" button)

### Requirement: One-Time Cleanup Script for Existing Broken Drafts

The system SHALL provide a one-time CLI cleanup tool at `scripts/cleanup-broken-encounters.ts` (Node-only via the `tsx` runner) that classifies every encounter in the database into one of `'abandoned-empty'`, `'orphaned-force-reference'`, or `'still-valid'`. The script SHALL write the full classification manifest to `simulation-reports/cleanup-encounters-<ISO>.json` BEFORE performing any deletes. The manifest SHALL contain the full encounter row (id, name, description, status, playerForce, opponentForce, opForConfig, victoryConditions, mapConfig, createdAt, updatedAt) plus the `classification` and `classificationReason` for each encounter.

The script SHALL delete only encounters classified as `'abandoned-empty'` AND only when their status is `Draft`. Encounters classified as `'orphaned-force-reference'` SHALL be repaired in place via `EncounterRepository.clearForceReference` (NULLing the dangling slot). Encounters classified as `'still-valid'` SHALL be left untouched.

The script SHALL be idempotent — re-running on a database that no longer contains any abandoned-empty rows SHALL write a manifest with classifications but `deletedIds: []` AND SHALL not throw.

The script SHALL accept a `--manifest-only` flag that writes the manifest but skips deletes and repairs, AND a `--cwd <path>` flag that overrides the working directory for the manifest output (used by tests).

Classification rules:

- `'abandoned-empty'` — `status === EncounterStatus.Draft` AND `playerForce === null` AND `opponentForce === null` AND `opForConfig === null`. Reason text: `"no forces and no opfor config — never finished setup"`.
- `'orphaned-force-reference'` — at least one of the stored `playerForceId` / `opponentForceId` is non-null AND the corresponding `getForceById` lookup returns `null`. Reason text: `"player force <id> deleted"` and/or `"opponent force <id> deleted"`.
- `'still-valid'` — anything else. Status MUST NOT be modified by the cleanup.

#### Scenario: Manifest written before any DELETE

- **GIVEN** a database with 5 encounters (2 abandoned-empty, 2 orphaned, 1 still-valid)
- **WHEN** the cleanup script runs
- **THEN** the file `simulation-reports/cleanup-encounters-<ISO>.json` SHALL exist before any DELETE statement is executed
- **AND** the file SHALL contain 5 manifest entries with the correct classification for each
- **AND** the script SHALL return `{ deletedIds: [<2 ids>], repairedIds: [<2 ids>], retainedIds: [<1 id>] }`

#### Scenario: Idempotent re-run on cleaned database

- **GIVEN** the cleanup script has already been run once and there are no abandoned-empty rows remaining
- **WHEN** the cleanup script is run a second time
- **THEN** a new manifest file SHALL be written with the new ISO suffix
- **AND** `deletedIds` SHALL be an empty array
- **AND** the second manifest SHALL still classify every encounter

#### Scenario: manifest-only flag skips deletes

- **GIVEN** the database has 2 abandoned-empty encounters
- **WHEN** the cleanup script runs with `--manifest-only`
- **THEN** the manifest SHALL be written
- **AND** `deletedIds` SHALL be an empty array
- **AND** all encounters SHALL still be present in the database after the run

#### Scenario: Status-gated deletion

- **GIVEN** an encounter that classifies as `'abandoned-empty'` BUT has status `EncounterStatus.Launched`
- **WHEN** the cleanup script runs
- **THEN** the encounter SHALL NOT be deleted
- **AND** the manifest SHALL classify it as `'still-valid'` with reason `"non-draft encounter retained even though configuration is empty"`

## MODIFIED Requirements

### Requirement: Encounter Launch

The store SHALL launch encounters and return the resulting game session ID. Launching SHALL fail cleanly with a user-actionable error message when the encounter has a broken force reference (the stored `playerForceId` or `opponentForceId` no longer resolves to a force in the `ForceRepository`). The error message SHALL name the missing force id so the user can correlate it with their force list.

#### Scenario: Launch an encounter

- **GIVEN** an encounter ID
- **WHEN** `launchEncounter(id)` is called
- **THEN** a POST request SHALL be made to `/api/encounters/{id}/launch`
- **AND** on success, the response SHALL contain a `gameSessionId`
- **AND** `loadEncounters()` SHALL be called to refresh the list
- **AND** the `gameSessionId` SHALL be returned

#### Scenario: Launch fails validation

- **GIVEN** an encounter that fails validation
- **WHEN** `launchEncounter(id)` is called
- **THEN** the API SHALL return success=false with an error message
- **AND** the error message SHALL be set in the store's `error` field
- **AND** null SHALL be returned

#### Scenario: Launch fails with broken force reference

- **GIVEN** an encounter `E` whose stored `playerForceId` is `F` AND `forceRepository.getForceById(F)` returns null
- **WHEN** `launchEncounter(E.id)` is called via the API
- **THEN** the API SHALL return `{ success: false, error: "Cannot launch: Player force F could not be resolved" }`
- **AND** the error message SHALL contain the literal forceId `F`
- **AND** the encounter status SHALL NOT be changed

### Requirement: Force Assignment

The store SHALL provide methods to assign player and opponent forces to encounters. The clear-action methods (`setPlayerForce(encounterId, null)` for player; `clearOpponentForce(encounterId)` for opponent) SHALL accept the explicit clear path used by the encounter detail page's broken-reference repair banner. The clear-action SHALL set the corresponding `_force_json` column to NULL AND SHALL trigger `recalculateStatus` so an encounter with the cleared slot drops back to `Draft` if it was previously `Ready`.

#### Scenario: Set player force

- **GIVEN** an encounter ID and a force ID
- **WHEN** `setPlayerForce(encounterId, forceId)` is called
- **THEN** a PUT request SHALL be made to `/api/encounters/{encounterId}/player-force` with `{forceId}` as JSON
- **AND** on success, `loadEncounters()` SHALL be called to refresh the list
- **AND** true SHALL be returned

#### Scenario: Set opponent force

- **GIVEN** an encounter ID and a force ID
- **WHEN** `setOpponentForce(encounterId, forceId)` is called
- **THEN** a PUT request SHALL be made to `/api/encounters/{encounterId}/opponent-force` with `{forceId}` as JSON
- **AND** on success, `loadEncounters()` SHALL be called to refresh the list
- **AND** true SHALL be returned

#### Scenario: Clear opponent force

- **GIVEN** an encounter ID
- **WHEN** `clearOpponentForce(encounterId)` is called
- **THEN** a DELETE request SHALL be made to `/api/encounters/{encounterId}/opponent-force`
- **AND** on success, `loadEncounters()` SHALL be called to refresh the list
- **AND** true SHALL be returned

#### Scenario: Clear player force via repair banner

- **GIVEN** an encounter `E` with a broken player force reference
- **WHEN** `setPlayerForce(E.id, null)` is called from the detail-page repair banner
- **THEN** a PUT request SHALL be made to `/api/encounters/{E.id}/player-force` with `{forceId: null}` as JSON
- **AND** the encounter's `player_force_json` column SHALL be set to NULL on the server side
- **AND** `recalculateStatus(E.id)` SHALL run before the response returns
- **AND** the response SHALL include the refreshed encounter object with `playerForce: null`
