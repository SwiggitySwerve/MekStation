# Learnings — repair-broken-encounter-drafts

## [2026-05-08 00:00] Session start
**Source-of-truth files**:
- `src/services/forces/ForceRepository.ts:195-221` — `deleteForce()`, currently does NOT cascade
- `src/services/encounter/EncounterService.ts:415-452` — `hydrateEncounter()`, currently leaves dangling refs intact
- `src/services/encounter/EncounterRepository.ts` — owns `recalculateStatus`, `rowToEncounter`
- `src/types/encounter/EncounterInterfaces.ts:61-69` — `ScenarioTemplateType` enum (Duel|Skirmish|Battle|Custom)
- `src/constants/scenario/templates.ts` — `SCENARIO_TEMPLATES` constant (6 entries; NOT what seed handler iterates)
- `src/__tests__/pages/gameplay/encounters/` — existing encounter UI test convention (NOT `src/__tests__/pages/encounters/`)
- `src/stores/useEncounterStore.ts` — `setPlayerForce` needs widening from `(id, string)` to `(id, string | null)`

## [2026-05-08 00:00] Patches already applied to tasks.md
- Task 3.4 — disambiguates `ScenarioTemplateType` (4 enum values) from `SCENARIO_TEMPLATES` (6-entry constant). Seed handler iterates the enum.
- Task 3.5 — explicit prerequisite: widen `useEncounterStore.setPlayerForce` signature + API handler branch for `forceId: null`.
- Task 3.6 — corrects test path to `src/__tests__/pages/gameplay/encounters/`.

## [2026-05-08 00:00] Cascade reachability rule
- **Cleanup-script DELETION** is gated to `Draft` AND `abandoned-empty` only.
- **Cascade NULLing** of force refs runs on encounters of ALL statuses (including Launched/Completed).
- For Launched encounters whose force is deleted: cascade clears the ref + `recalculateStatus` drops them back to Draft via the existing ladder. No special-case needed.

## [2026-05-08 00:00] recalculateStatus existing behavior
At `src/services/encounter/EncounterRepository.ts:484-489`, `recalculateStatus` short-circuits when status is `Launched` or `Completed`:
```
if (encounter.status === Launched || encounter.status === Completed) return;
```
For PR2, the cascade caller must NOT rely on `recalculateStatus` alone to drop a Launched encounter to Draft. Two options:
- (a) Widen `recalculateStatus` so a Launched encounter with NO playerForce drops to Draft (clean but changes existing semantic; there are no tests asserting "Launched stays Launched after force cleared because that situation never existed").
- (b) Cascade caller writes status=Draft directly when it cleared a ref AND the encounter was Launched/Ready, then calls recalculateStatus to re-evaluate Ready.
Pick (a) — narrower change in caller, predictable semantics, test the new branch with cascade tests.

## [2026-05-08 00:00] Existing setPlayerForce API
- PUT `/api/encounters/[id]/player-force` requires non-null `forceId` (returns 400 on null/empty).
- DELETE `/api/encounters/[id]/player-force` already exists and uses `updateEncounter({ playerForceId: undefined })` to clear.
- Easiest path for PR3 task 3.5: store `setPlayerForce(id, null)` calls the existing DELETE endpoint when `forceId === null`. NO server-side widening needed if we route through DELETE. Consider this — task 3.5 prerequisite mentions widening but DELETE already does the same job. Safer: store routes null → DELETE; saves a server change.

## [2026-05-08 00:00] EncounterRepository.createEncounter signature
At `src/services/encounter/EncounterRepository.ts:160-209`. Takes `ICreateEncounterInput` with optional `template: ScenarioTemplateType | undefined`. Already wires SCENARIO_TEMPLATES lookup for defaults. Seed handler can call this 4 times — once per ScenarioTemplateType enum value.

## [2026-05-08 00:00] Tests location
- `src/services/encounter/__tests__/EncounterService.test.ts` exists (~1000+ lines) — extends here for hydration test.
- `src/__tests__/pages/gameplay/encounters/[id]/` exists for detail-page tests (currently only `pre-battle.effect.test.tsx`).
- No `src/__tests__/pages/gameplay/encounters/index.test.tsx` yet — PR3 creates it.
- `src/__tests__/api/encounters/encounters.test.ts` is the API test pattern reference.

## [2026-05-08 18:00] PR1 surfaced learnings (gotchas)
- **`scripts/` is gitignored** — must `git add -f` for new script files. Existing scripts were force-added historically. The same trick is needed for any script in PR1/PR2/PR3. (`scripts/__tests__/` falls under the same rule.)
- **User-level Claude `auto-format.sh` PostToolUse hook runs `npx prettier --write` on every Edit** — but this project uses `oxfmt` with single quotes (prettier defaults to double quotes). The hook reformats the WHOLE file with double quotes, so every Edit needs an immediate `npx oxfmt --write <file>` chaser to repair. Inserting whole new files via Write triggers the same hook but only on the new file, so the cost is bounded.
- **`recalculateStatus` short-circuits Launched/Completed** at `EncounterRepository.ts:484-489`. PR2 cascade caller must handle this — design says "drop to Draft via existing recalculate" but the existing function won't. Either widen recalculate or set status=Draft directly in the cascade caller before calling recalculate.
- **EncounterRepository was already over the 400-line `max-lines` warning threshold** (524 lines on main). Adding `getAllEncountersWithRawIds` pushed it to 569. Pre-existing warning, not a new violation. PR2 will push it further; consider extracting `recalculateStatus` + cascade methods to a `EncounterRepository.cascade.ts` helper file if PR2 PR review pushes back.
- **Pre-commit hook runs FULL Next.js build (~5min)** when TS files are staged. Plan time budget accordingly. Skips for openspec-only / docs-only / Python-only commits.
- **GH_TOKEN env var pollution** — `gh pr create` fails with `HTTP 401` if `GH_TOKEN` is set to an old token. Fix: `unset GH_TOKEN` (or `GH_TOKEN= gh pr create ...` inline) so it falls back to the keyring auth.

## [2026-05-08 18:30] PR1 outcome
- Branch: `feat/repair-encounters-pr1-cleanup`
- Commit: `7a428127`
- PR: https://github.com/SwiggitySwerve/MekStation/pull/558
- Tests: 12/12 passing
- Lint: 0 errors (46 pre-existing warnings)
- Format: clean
- Files: scripts/cleanup-broken-encounters.ts (NEW), scripts/__tests__/cleanup-broken-encounters.test.ts (NEW), src/services/encounter/EncounterRepository.ts (MOD), src/services/encounter/EncounterRepository.helpers.ts (MOD)

## [2026-05-08 22:00] PR2 outcome
- Branch: `feat/repair-encounters-pr2-cascade`
- Phase A commit (cascade infrastructure): `e116e605`
- Phase B commit (wiring): `4936a79e`
- Phase C commit (API rawForceIds): `ed42cf4d`
- Phase D commit (tests + store + back-patch + small Phase E test fix): TBD on push
- PR: TBD on open
- Tests in scope (relevant suites): **376/376 passing across 14 suites**
  - encounterBrokenRefs.test.ts (NEW): 6/6
  - EncounterRepository.cascade.test.ts (NEW): 7/7
  - EncounterService.hydration.test.ts (NEW): 5/5
  - ForceRepository.test.ts +deleteForce cascade describe block: 67 total (3 new + 64 pre-existing)
  - encounters.test.ts (MOD): 60 total (3 GET tests rewritten for new shape + rawForceIds repository mock)
  - useEncounterStore.test.ts (NEW): 4/4
  - cleanup-broken-encounters.test.ts (MOD): 12/12 (orphan branch now repaired via cascade)
  - EncounterService.test.ts (MOD): 49/49 — fixed stale "should handle deleted force gracefully" assertion to match Phase B contract (playerForce becomes null, not passed-through)
- Lint: 0 errors (4 pre-existing max-lines warnings, one in repo lifted by 100 LOC due to Phase A)
- Format: clean
- Typecheck: clean
- Phase E fix (in same PR): `EncounterService.test.ts` line 1011 was checking the old "dangling ref preserved" behavior, updated to assert null-replacement.

### Gotchas/learnings for PR3
- **`encountersHandler` GET shape changed** to `{ encounters, count, rawForceIds }`. Any consumer test (or new test) that mocks the handler or asserts the response MUST mock `getEncounterRepository().getAllEncountersWithRawIds()` — otherwise it returns 500 because the handler reads it. The pattern in `encounters.test.ts` uses `jest.requireActual` to keep `EncounterErrorCode` enum live.
- **`logger.warn` spying works fine** via `jest.spyOn(logger, 'warn')` — since logger is an exported plain object, the spy replaces `.warn` cleanly even though the underlying `shouldLog('warn')` returns false in test env. The spy intercepts BEFORE `shouldLog` runs.
- **`resetEncounterService()` clears the orphan-warn dedup Set** — required for hydration test isolation. Tests that load the same orphan ID across `beforeEach` boundaries WILL re-warn after reset; tests that don't reset within a single `it()` get dedup behavior.
- **Cascade test isolation** uses a separate test-DB filename (`./data/test-encounter-repository-cascade.db`) so concurrent runs don't collide on file locks.
- **`getEncounterById` returns `IEncounter` with `playerForce: undefined`** AFTER cascade NULL'd the column — `rowToEncounter` reads null JSON as undefined. The cleanup back-patch test asserts `encounter?.playerForce` is `undefined` (NOT null) post-repair. PR3 broken-pill detection uses `rawForceIds[id] !== null && encounter.playerForce === null` — but post-cleanup-repair the row's `playerForceId` AND `playerForce` are both null/undefined, so the broken-pill predicate cleanly reports "not missing" (which is correct: the repair erased the dangling state).
- **`encounter.playerForce` interface widened** to `IForceReference | null | undefined`. The `null` value is the explicit "force was deleted" signal from Phase B's hydration boundary. Existing UI code that uses `!encounter.playerForce` already handles this correctly (both null and undefined are falsy). UI code that uses `encounter.playerForce !== undefined` will need updating in PR3 — search for that pattern.
- **Auto-formatter (postToolUse hook) reformats with double-quotes**, project uses single quotes. Run `npx oxfmt --write <file>` after every Write/Edit on a TS/JS file.

