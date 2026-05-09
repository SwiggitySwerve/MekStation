## Why

27 encounter rows at `/gameplay/encounters` are stuck in `Draft` forever. The user can't tell why, can't transition them, and gets no signal beyond "they're old and won't move." The list page is becoming a graveyard, which means a new user opening the app sees 27 broken-looking rows next to whatever they're trying to make work — terrible first-run experience.

Three concrete failure modes are causing the backlog (in decreasing order of population):

1. **Abandoned half-configurations** — most likely the dominant share. The user created an encounter, never finished assigning a player force / opponent force / opForConfig, and walked away. The encounter is correctly `Draft` but is functionally rubble.
2. **Orphaned force references** — `ForceRepository.deleteForce()` (`src/services/forces/ForceRepository.ts:195-221`) deletes the force row but leaves dangling `forceId`s embedded in the `encounters.player_force_json` / `opponent_force_json` columns. There is no cascade. Recovery is silent: `EncounterService.hydrateEncounter()` (`src/services/encounter/EncounterService.ts:415-452`) calls `getForceById()`, gets `null`, and *leaves the stored ref object untouched* — so the encounter still appears to have a force (with `forceName: ''`, `totalBV: 0`), passes `validateEncounter()`, may even sit in `Ready`, but explodes at launch with `Player force <forceId> could not be resolved` from `buildGameUnitsFromEncounter()`. No UI surface tells the user this.
3. **Status drift** — `recalculateStatus` only runs inside `updateEncounter`. If a force was deleted externally and the encounter wasn't touched again, status stays at whatever it last was — which can be `Ready` for an encounter that will fail to launch.

The user's brief: "27 drafts at /gameplay/encounters that just say Draft. Why can't I get them past Draft? I have no idea what's wrong with them."

## What Changes

- **NEW** one-time cleanup script (`scripts/cleanup-broken-encounters.ts`) that classifies every existing encounter into `abandoned-empty` / `orphaned-force-reference` / `still-valid`, writes the full classification + every deletion to `simulation-reports/cleanup-encounters-<ISO>.json` BEFORE any DELETE, then deletes only the `abandoned-empty` set. **Idempotent**: re-running on the same disk state writes a no-op log and deletes nothing.
- **NEW** force-deletion cascade rule on `ForceRepository.deleteForce()` — when a force is deleted, every encounter row whose `player_force_json` or `opponent_force_json` references that `forceId` SHALL have the affected reference column set to `NULL` AND its status recomputed via the existing `recalculateStatus()` ladder (so encounters re-drop to `Draft` automatically). All within the same SQLite transaction as the force delete.
- **NEW** "broken: force missing" badge on `/gameplay/encounters` list rows — when the hydrated encounter has a `playerForce`/`opponentForce` ref whose `forceName` is empty (the hydration miss signal), the list row SHALL render an explicit yellow "Force missing" pill in place of the silent zero-BV ref AND the row SHALL link to the encounter detail page where a banner SHALL explain the broken-ref recovery options (clear the ref, pick a new force, or delete the encounter).
- **NEW** orphan-detection at hydration boundary — `hydrateEncounter()` SHALL replace any unresolvable force reference with `null` (instead of leaving the dangling ref intact) AND emit a `logger.warn` with the encounter id + missing force id so future drift is observable.
- **NEW** repair flow on the encounter detail page — when an encounter has at least one missing force, the detail page SHALL render a top-of-page banner with a "Clear missing force" action that calls the existing `setPlayerForce` / `clearOpponentForce` endpoints with `null` to drop the orphan ref.
- **NEW** seed action — "Seed sample encounters" button on the empty-state of `/gameplay/encounters` (visible only when the list is empty after filtering). Click creates 4 starter encounters using the existing `SCENARIO_TEMPLATES` (Duel / Skirmish / Battle / Custom) so the new-user experience after cleanup is "0 broken" rather than "0 anything."

**OUT OF SCOPE** — replay persistence for encounters (separate change `link-encounters-to-replays`); a generic foreign-key cascade framework (one-off rule on the encounter table is sufficient for v1); soft-delete / undo of cleanup (the JSON log is the audit trail).

## Capabilities

### Modified Capabilities

- `game-session-management` — three additions: orphaned force-reference cascade on `deleteForce`, hydration-boundary orphan replacement (currently silently passes through), and the broken-encounter UI surface (badge + repair banner). The existing `Encounter Launch` requirement gets one new scenario explicitly for "force was deleted between Ready transition and launch click."

### New Capabilities

None — this change rides existing capabilities and the new behaviors slot under `game-session-management`.

## Impact

- **Code**: `src/services/forces/ForceRepository.ts` (`deleteForce` cascade), `src/services/encounter/EncounterService.ts` (`hydrateEncounter` orphan replacement), `src/pages/gameplay/encounters/index.tsx` (broken badge + seed button on empty state), `src/pages/gameplay/encounters/[id].tsx` (repair banner), `src/pages/api/encounters/index.ts` (new `POST /api/encounters/seed-samples`), new `scripts/cleanup-broken-encounters.ts`
- **Filesystem**: `simulation-reports/cleanup-encounters-<ISO>.json` — every classification + deletion log, never overwritten (timestamp suffix per run)
- **Database**: no schema change. `encounters.player_force_json` / `opponent_force_json` are already nullable; the cascade just sets them to NULL.
- **Tests**: `EncounterRepository.cascade.test.ts` (force-deletion cascade behavior, including transaction rollback on cascade failure), `EncounterService.hydration.test.ts` (orphan replacement + warn log), `cleanup-broken-encounters.test.ts` (classification fixture: abandoned + orphaned + still-valid + idempotent re-run), `EncountersListPage.test.tsx` (broken-pill render + seed-samples empty state), `[id].test.tsx` (repair-banner render + clear-action wiring)
- **Existing data**: the 27 stuck drafts get classified by the cleanup script. Expected output: ~20 abandoned-empty deleted, ~5 orphaned-force-reference repaired in place (force ref cleared), ~2 still-valid retained.
- **Out of scope (this change)**: encounter replay persistence (separate change), a generic FK-cascade framework, undo/restore of cleaned encounters (the JSON log is enough).
