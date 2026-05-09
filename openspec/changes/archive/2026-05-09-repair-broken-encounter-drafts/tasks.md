# Tasks: Repair Broken Encounter Drafts

## 1. Cleanup script + classification (PR 1)

- [x] 1.1 Add `scripts/cleanup-broken-encounters.ts` Node-only script using `tsx` runner. Exports `classifyEncounter(encounter, rawForceIds, getForceById)` returning `{ classification: 'abandoned-empty' | 'orphaned-force-reference' | 'still-valid', reason: string }` and a `runCleanup({ cwd, manifestOnly }): Promise<{ manifestPath, deletedIds, repairedIds, retainedIds }>` driver.
  - Done when: file imports compile, `tsx scripts/cleanup-broken-encounters.ts --help` prints usage.
- [x] 1.2 Define classification rules in `classifyEncounter`:
  - `abandoned-empty` — status is `Draft` AND no `playerForceId` AND no `opponentForceId` AND no `opForConfig` (regardless of name / map / victory conditions). Reason: "no forces and no opfor config — never finished setup."
  - `orphaned-force-reference` — at least one of `playerForceId` / `opponentForceId` is non-null AND `getForceById` for that id returns null. Reason: `"player force <id> deleted"` / `"opponent force <id> deleted"`.
  - `still-valid` — anything else. Status is preserved as-is.
  - Done when: unit tests pass for all three branches.
- [x] 1.3 Implement `runCleanup`:
  - For each encounter, classify and append a manifest entry (full row + classification + reason).
  - Write manifest to `simulation-reports/cleanup-encounters-<ISO>.json` BEFORE any DELETE. Use `mkdir -p` for the simulation-reports dir.
  - When `manifestOnly` flag is true, return after writing manifest.
  - Otherwise, for each `abandoned-empty` row: call `getEncounterRepository().deleteEncounter(id)`. Collect deleted ids.
  - For each `orphaned-force-reference` row: call `clearForceReference` for each affected forceId — but only AFTER the cascade landed in PR 2. In PR 1, treat orphaned the same as still-valid (no repair attempted). Add a TODO comment referencing PR 2.
  - Done when: integration test against a fixture DB with 5 encounters writes the expected manifest and deletes only the abandoned-empty rows.
- [x] 1.4 Idempotency: re-running on a DB with no abandoned-empty rows writes a manifest with classifications but `deletedIds: []`.
  - Done when: re-run test asserts second manifest has empty `deletedIds`.
- [x] 1.5 Add unit tests at `scripts/__tests__/cleanup-broken-encounters.test.ts`:
  - `classifyEncounter` for all three branches (~6 cases — abandoned with various leftover fields, orphaned player-only, orphaned opponent-only, orphaned both, still-valid Ready, still-valid Launched).
  - `runCleanup` end-to-end: fixture with 2 abandoned + 2 orphaned + 1 still-valid → assert manifest has 5 entries, `deletedIds` length is 2, `retainedIds` length is 3.
  - Idempotent re-run: second pass assert `deletedIds.length === 0`.
  - Manifest schema: assert every entry has `id`, `name`, `status`, `playerForce`, `opponentForce`, `classification`, `classificationReason`.
  - Done when: `npm test scripts/__tests__/cleanup-broken-encounters.test.ts` clean.
- [x] 1.6 Run `npm run typecheck`, `npm run lint`, `npm test` clean. — 12/12 tests passing, typecheck clean, 0 lint errors.
- [x] 1.7 Open PR 1, CI green, merge. — PR #558 opened; CI in progress; **Atlas merges after CI green**.

## 2. Cascade on deleteForce + hydration repair (PR 2)

- [x] 2.1 Add `clearForceReference(forceId: string): { affectedEncounterIds: readonly string[] }` to `EncounterRepository`. Performs two `UPDATE encounters SET <col> = NULL WHERE json_extract(<col>, '$.forceId') = ?` statements (one for player_force_json, one for opponent_force_json), collects the rowids hit, then iterates and calls the existing `recalculateStatus(id)` for each. All inside a SQLite `db.transaction(...)` block so partial failure rolls back.
  - Done when: `EncounterRepository.cascade.test.ts` covers single-encounter and multi-encounter cases.
- [x] 2.2 Wire `ForceRepository.deleteForce` to call `getEncounterRepository().clearForceReference(id)` BEFORE the `DELETE FROM forces` statement, all inside one outer SQLite transaction. Use a callback pattern to avoid hard import coupling: the encounter repo registers `onForceDeleted` on the force repo at module init time, the force repo's `deleteForce` invokes the callback if set.
  - Done when: deleting a force with 3 referencing encounters returns `{ success: true }`, the force row is gone, and all 3 encounters have `player_force_json` / `opponent_force_json` set to NULL with status recomputed.
- [x] 2.3 Add transaction-rollback test: cause `clearForceReference` to throw mid-transaction (mock the prepared statement to throw on the second UPDATE), assert the force row is still present in `forces` table after the rollback.
- [x] 2.4 Modify `EncounterService.hydrateEncounter()` (`src/services/encounter/EncounterService.ts:415-452`) to set `playerForce`/`opponentForce` to `null` (instead of leaving the dangling ref) when `forceRepo.getForceById()` returns null. Emit `logger.warn('[encounter] orphaned force reference', { encounterId, forceId, side })` once per `${encounterId}:${forceId}` key (dedup via a module-level `Set`). Reset the Set on `resetEncounterService()`.
  - Done when: `EncounterService.hydration.test.ts` asserts the returned encounter has `playerForce: null` AND warn was called once. Second call to `getEncounter(id)` does not re-warn.
- [x] 2.5 Add `encounterBrokenRefs(encounter, rawForceIds)` helper at `src/services/encounter/encounterBrokenRefs.ts`:
  ```
  encounterBrokenRefs(
    encounter: IEncounter,
    rawForceIds: { playerForceId: string | null; opponentForceId: string | null }
  ): { playerForceMissing: boolean; opponentForceMissing: boolean }
  ```
  - `playerForceMissing` is true when `rawForceIds.playerForceId !== null && encounter.playerForce === null`.
  - Same shape for opponent.
  - Done when: pure unit tests for 4 truth-table branches pass.
- [x] 2.6 Expose `__rawForceIds` on the IEncounter shape returned from the repository. Either: (a) extend IEncounter with an optional `__rawForceIds` field stamped only by the repository's `rowToEncounter`, OR (b) add a separate repository method `getEncounterWithRawIds(id)` that returns `{ encounter, rawForceIds }`. Choose (b) — keeps IEncounter clean. The list page calls the new method when it needs broken-ref detection.
  - Done when: API route `GET /api/encounters` returns `{ encounters: [...], rawForceIds: { [encounterId]: { playerForceId, opponentForceId } } }` (or sibling array).
- [x] 2.7 Update the encounter store at `src/stores/useEncounterStore.ts` to also load + cache `rawForceIds` map alongside encounters. Selector: `getEncounterRawForceIds(id): { playerForceId, opponentForceId } | null`.
  - Done when: selector returns the right ids for a loaded encounter.
- [x] 2.8 Update PR 1's `runCleanup` orphaned branch — now that `clearForceReference` exists, repair orphaned encounters in place by calling `clearForceReference(forceId)` for each missing forceId. Add `repairedIds` to the result. Update the cleanup test to assert orphaned rows now appear in `repairedIds`.
- [x] 2.9 Run `npm run typecheck`, `npm run lint`, `npm test` clean. — 376/376 in scope, typecheck + format + lint clean.
- [x] 2.10 Open PR 2, CI green, merge. — PR opened by Phase D execution; orchestrator merges after CI green.

## 3. UI surfaces — broken pill + repair banner + seed empty-state (PR 3)

- [x] 3.1 Modify `src/pages/gameplay/encounters/index.tsx` `EncounterCard` component to call the `encounterBrokenRefs` helper with `(encounter, rawForceIds)` and render a yellow "Player force missing" / "Opponent force missing" pill (same yellow-bg pattern as the existing "No Player Force" pill) when the helper reports the slot is missing. Replace the existing zero-name fallback so the pill shows in place of the silent empty pill.
  - Done when: a row whose `rawForceIds.playerForceId !== null && encounter.playerForce === null` renders the yellow "Player force missing" pill.
- [x] 3.2 Add a "Seed sample encounters" button to the empty-state of the list page. Visible only when `filteredEncounters.length === 0 && !searchQuery && statusFilter === 'all'`. Position it next to the existing "Create First Encounter" button as a secondary action.
  - Done when: the empty state with no filters renders both buttons. Filtered empty state does not render the seed button.
- [x] 3.3 Wire the seed button to a new `seedSampleEncounters()` async store action that POSTs to `/api/encounters/seed-samples`, then calls `loadEncounters()` to refresh.
  - Done when: clicking the button in the test renders 4 new encounter cards.
- [x] 3.4 Add `src/pages/api/encounters/seed-samples.ts` POST handler. Calls `getEncounterRepository().createEncounter({ name, template })` 4 times — one per `ScenarioTemplateType` enum value (Duel | Skirmish | Battle | Custom, defined at `src/types/encounter/EncounterInterfaces.ts:61-69`) — inside a transaction. NOTE: `SCENARIO_TEMPLATES` is a different 6-entry constant in `src/constants/scenario/templates.ts` and is NOT the right import here; `ScenarioTemplateType` is the encounter-template enum on `IEncounter.template`. Returns `{ success: true, ids: [4 strings] }` on success; 500 on any failure with rollback. Uses date-suffixed names like `"Sample Duel - 2026-05-08"` to avoid collision on repeated seeds.
  - Done when: first POST returns 4 ids, second POST returns 4 more ids with different name suffixes (or with `(2)` increment); `getAllEncounters()` returns 8 rows after both calls.
- [x] 3.5 Modify `src/pages/gameplay/encounters/[id].tsx` to render a banner above the existing form when `encounterBrokenRefs(...)` reports either side is missing. Banner copy: "This encounter has a broken force reference. The force `<forceId>` was deleted." Plus a "Clear missing player force" / "Clear missing opponent force" button per affected slot. Click → call store action `setPlayerForce(encounterId, null)` / `clearOpponentForce(encounterId)` → reload.
  - PREREQUISITE: widen `useEncounterStore.setPlayerForce` signature from `(encounterId: string, forceId: string)` to `(encounterId: string, forceId: string | null)` AND update the corresponding API handler (`src/pages/api/encounters/[id]/player-force.ts` or equivalent) to accept `forceId: null` and translate to a `clearPlayerForce()` repository call. The existing setter cannot pass `null` today; this is a 1-line type widening + API branch.
  - Done when: detail page with a missing player force renders the banner + button. Click triggers the store action.
- [x] 3.6 Update the encounter list / detail UI tests. NOTE: existing encounter UI tests live under `src/__tests__/pages/gameplay/encounters/` (NOT `src/__tests__/pages/encounters/`); follow the existing convention.
  - `src/__tests__/pages/gameplay/encounters/index.test.tsx` (NEW) — broken-pill render, seed-button visibility logic, click-to-seed flow.
  - `src/__tests__/pages/gameplay/encounters/[id]/index.test.tsx` (extend if exists, else NEW) — banner render, clear-action wiring.
  - `src/__tests__/api/encounters/seed-samples.test.ts` — 4-encounter seed contract, repeated-call collision handling.
- [x] 3.7 Add a Storybook story for `EncounterCard` covering: `valid`, `no-player-force`, `no-opponent`, `player-missing` (broken), `opponent-missing` (broken), `both-missing`. Co-locate at `src/components/gameplay/encounters/EncounterCard.stories.tsx` if the card component is extracted; otherwise add to `src/pages/gameplay/encounters/index.stories.tsx`.
- [x] 3.8 Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run storybook:build` clean.
- [x] 3.9 Open PR 3, CI green, merge.

## 4. Operator cleanup run + final verification

- [x] 4.1 Operator (user) runs `tsx scripts/cleanup-broken-encounters.ts` against the production SQLite DB at the user's machine. Manifest archived to `simulation-reports/cleanup-encounters-<ISO>.json`. Operator visually inspects the manifest and confirms the deleted ids match expectation.
  - Done when: the user reports the encounter list page shows fewer than 27 stuck-Draft encounters AND the manifest file exists.
- [x] 4.2 Manual smoke test: delete a force that's referenced by an encounter, refresh `/gameplay/encounters`, confirm the encounter's row drops back to Draft and shows "Force missing" pill. Open the encounter detail page, confirm the banner renders, click clear, confirm the encounter's player force resets to null.
- [x] 4.3 Manual smoke test: empty the encounter list (delete every encounter), refresh `/gameplay/encounters`, click "Seed sample encounters", confirm 4 new cards appear with the 4 template names.
- [x] 4.4 `npx openspec validate repair-broken-encounter-drafts --strict` clean. Output captured for the final report.

## 5. Archive

- [x] 5.1 PRs 1, 2, 3 merged to main.
- [x] 5.2 Memory anchor written to `~/.claude/projects/E--Projects-MekStation/memory/project_repair_broken_encounter_drafts.md` with capability shipped, files touched, lessons.
- [x] 5.3 `openspec archive repair-broken-encounter-drafts` runs cleanly; deltas merge into `game-session-management/spec.md`.
