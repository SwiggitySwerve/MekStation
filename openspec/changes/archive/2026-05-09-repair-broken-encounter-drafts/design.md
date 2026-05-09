# Design: Repair Broken Encounter Drafts

## Technical approach

Three coupled fixes, ordered so each is shippable on its own and the next builds on the previous:

1. **Cleanup-first** — write a script that classifies every encounter row and emits a JSON manifest BEFORE deleting anything. Run it once against the user's machine, archive the manifest, then delete the abandoned set. Reversible: the manifest contains the full pre-deletion state of every dropped row, so a developer can reconstruct the SQL to undo if a row was wrongly classified.
2. **Cascade-second** — wire `ForceRepository.deleteForce()` to also clear references in the `encounters` table within the same SQLite transaction. Idempotent: a force that has already been deleted (or has no encounter references) cleans up zero rows, no error.
3. **UI-third** — surface the broken state visibly. The list page gets a yellow "Force missing" pill where the silent empty-name pill is today; the detail page gets a banner that explains the situation and offers a one-click clear; the empty-state gets a "Seed samples" button so a new user post-cleanup can get to a working scenario in one click.

The cleanup is one-time + manual (operator runs it). The cascade is permanent + automatic (future force deletions are clean by construction). The UI is the safety net for the gap between a force being deleted and the cascade running — and for any future drift.

## Architecture decisions

### Decision: One-time cleanup + permanent cascade, NOT migration-only

**Choice**: Two artifacts — a one-time script (idempotent, classification-first, JSON-logged) AND a permanent cascade rule on `deleteForce`.

**Rationale**: A single migration script would clean up the existing 27 rows but wouldn't prevent the next 27. The user is actively iterating on forces (Cluster E IPerson hard-cutover landed `IPilot` deletions, `wire-encounter-to-campaign-round-trip` lifecycle is in flight), so the failure mode is going to keep recurring. The cascade is the prevention; the cleanup is the one-time recovery. Both are needed.

**Alternatives considered**:

- **Cleanup script only** — leaves the prevention gap; the user files this same OpenSpec change again in two weeks.
- **Cascade only** — doesn't help the existing 27 rows because they were created before the cascade existed.
- **Soft-delete forces (set `deleted_at` instead of DELETE)** — bigger refactor; touches force lifecycle semantics; not needed for the bug we're fixing.

### Decision: Classification-first, manifest-before-delete

**Choice**: The cleanup script reads every encounter, classifies it, writes the full manifest (every row, every classification, every reason) to `simulation-reports/cleanup-encounters-<ISO>.json`, THEN deletes. The user can read the file before re-running with a `--commit` flag if we want a two-phase mode — but v1 keeps it single-phase + reversible-via-log.

**Rationale**: The user MUST be able to look at the JSON file and see exactly what got deleted and why. Per the change brief: "the cleanup migration MUST be reversible (or at minimum MUST log every deletion to a file)." We choose log-as-receipt. Each entry contains: `id`, `name`, `description`, `status`, `playerForce`, `opponentForce`, `opForConfig`, `victoryConditions`, `mapConfig`, `createdAt`, `updatedAt`, `classification`, `classificationReason` — i.e. the full encounter row plus the verdict. Restoring is a SQL INSERT with the JSON values.

**Alternatives considered**:

- **Two-phase: dry-run + commit** — overkill for a one-time cleanup; the JSON manifest is easier to inspect than a dry-run console dump.
- **Soft-delete instead of hard-delete** — adds a `deleted_at` column to the encounters table; the user can restore via SQL. Considered; rejected because: (a) would require schema migration, (b) the JSON log already provides reversibility, (c) keeping the encounters table free of soft-delete semantics keeps `getAllEncounters()` queries simple.

### Decision: Cascade on `deleteForce`, NOT on hydration

**Choice**: The cascade lives in `ForceRepository.deleteForce()` — when a force is deleted, the encounters table is updated in the same transaction. `hydrateEncounter()` ALSO replaces unresolvable refs with `null` as a defensive secondary, but the cascade is the source-of-truth fix.

**Rationale**: Cleaning at write-time (delete) is one transaction, observable, and prevents the dangling state from existing on disk. Cleaning at read-time (hydration) requires every read path to do the orphan check forever, performance-wise it adds a `getForceById` per encounter row on the list page (already present, good), but it doesn't fix the database — the dangling JSON sits there until something hydrates and writes the encounter. The hydration replacement is the secondary safety net for any drift that escapes the cascade (e.g. raw SQL inserts, future bugs in `deleteForce`).

**Alternatives considered**:

- **Hydration-only repair** — leaves the database dirty; complicates every future query; performance penalty on every list-page render.
- **Defer cascade to a nightly job** — encounters look broken between the force-delete and the next cron tick; users get a confused state window. Inline cascade is simpler.
- **SQLite foreign-key constraints** — would require a schema migration to add explicit FK columns (the current schema stores forces as embedded JSON, not as proper FKs). Out of scope; the cascade rule covers the same ground without a schema change.

### Decision: "Force missing" badge in the existing yellow-pill slot, not a new column

**Choice**: The list-row UI already has a yellow pill for "No Player Force" / "No Opponent". We extend the same component to render "Player force missing" / "Opponent force missing" when the hydrated ref has an empty `forceName` (the hydration-miss signal). Same visual treatment, different text.

**Rationale**: Visual real-estate is tight on the encounter card; users already scan the yellow pills as the warning slot. Reusing that slot avoids adding a new column and keeps the discriminator simple: `playerForce === null` → "No Player Force"; `playerForce` exists with empty `forceName` → "Player force missing"; `playerForce` exists with non-empty `forceName` → green pill with name. Adding a third state to a known affordance is cheaper than adding a new affordance.

**Alternatives considered**:

- **Dedicated "broken" status row in the status filter** — the status filter is an enum (`Draft | Ready | Launched | Completed`); shoehorning a non-status into it confuses the data model. Encounters with missing forces should still classify as `Draft` (which they will, after the cascade + recalc).
- **Toast notification on list mount** — disrupts the page; not addressable; can't tell which encounter is broken.

### Decision: Hydration-boundary orphan replacement returns `null`, not the empty-name ref

**Choice**: Inside `hydrateEncounter()`, when `getForceById` returns null, the hydrated `playerForce` / `opponentForce` field is set to `null` — not left as the original embedded ref with empty name. The ref-with-empty-name is the buggy intermediate state today and we replace it with the explicit absence signal.

**Rationale**: The "broken" pill in the UI keys off "ref exists but `forceName` is empty" today. After hydration is fixed, the hydrated value will be `null`, and the pill is detected by reading the `__broken` flag we add to the IEncounter shape OR by the list page calling a new helper `encounterBrokenRefs(encounter)` that compares the stored row's `forceId`s against the hydrated values. We choose the helper approach to keep IEncounter clean.

The helper signature: `encounterBrokenRefs(encounter: IEncounter): { playerForceMissing: boolean; opponentForceMissing: boolean }`. It needs access to the raw row (to know if a `forceId` was stored) AND the hydrated value (to know if it resolved). Implementation: the repository's `rowToEncounter` exposes the raw `playerForceId` / `opponentForceId` separately on a sibling field `__rawForceIds: { playerForceId: string | null; opponentForceId: string | null }` that the UI consumes.

**Alternatives considered**:

- **Add `playerForceBroken: boolean` to IEncounter** — leaks repository-internal concerns into the type. The helper is cleaner.
- **Throw on hydration miss** — breaks every callsite that reads encounters; the UX gets worse, not better.

### Decision: Empty-state seed action, NOT auto-seed-on-empty-DB

**Choice**: When the list page is empty after filtering, render a "Seed sample encounters" button alongside "Create First Encounter". Click → calls `POST /api/encounters/seed-samples` → creates 4 encounters using `SCENARIO_TEMPLATES` (Duel / Skirmish / Battle / Custom). Manual; explicit; clearly labeled "samples"; user can delete them.

**Rationale**: Auto-seeding on first DB open conflicts with developer workflows (fresh test DBs need to stay empty). An explicit button keeps the user in control. The 4-template seed gives the user a working scenario shape to copy from — they're not configured with forces (we'd need to invent forces too) but they have valid map / victory conditions / template metadata, so the user immediately has something they can fill in.

**Alternatives considered**:

- **Auto-seed on first run** — surprises developers running fresh test DBs.
- **No seed action** — leaves the post-cleanup empty-state as the same "create from scratch" flow that the user just walked away from on 27 drafts. The seed button is the "I want a starting point" shortcut.
- **Seed includes player+opponent forces** — would need to also seed forces, which means seeding pilots, which means seeding units. Way out of scope. Templates only.

## Data flow

**Today (broken):**

```
deleteForce(F)
   └→ DELETE FROM forces WHERE id = F
   └→ encounters.player_force_json STILL contains {forceId: F, ...}
   └→ next read: hydrateEncounter -> getForceById(F) -> null -> ref left as-is
   └→ next launch: buildGameUnitsFromEncounter -> getForceById(F) -> null -> ERROR
```

**After this change:**

```
deleteForce(F)
   └→ BEGIN TXN
      └→ DELETE FROM forces WHERE id = F
      └→ UPDATE encounters SET player_force_json = NULL WHERE
              player_force_json IS NOT NULL
              AND json_extract(player_force_json, '$.forceId') = F
      └→ UPDATE encounters SET opponent_force_json = NULL WHERE
              opponent_force_json IS NOT NULL
              AND json_extract(opponent_force_json, '$.forceId') = F
      └→ for each affected encounter id: recalculateStatus(id)
   └→ COMMIT
```

The recalculate inside the same transaction means an affected encounter that had been Ready drops to Draft atomically with the force delete.

## File changes

- **NEW**: `scripts/cleanup-broken-encounters.ts` — Node script using `tsx` runner. Reads every encounter via `getEncounterRepository().getAllEncounters()`, classifies, writes manifest, deletes abandoned. Has CLI flags `--manifest-only` (skip deletes) and `--cwd <path>` (test injection).
- **NEW**: `src/services/encounter/encounterBrokenRefs.ts` — pure helper exporting `encounterBrokenRefs(encounter, rawForceIds)` returning `{ playerForceMissing, opponentForceMissing }`.
- **NEW**: `src/pages/api/encounters/seed-samples.ts` — `POST` handler creating 4 template-derived encounters in a single transaction; returns `{ success: true, ids: [4 ids] }`.
- **MODIFIED**: `src/services/forces/ForceRepository.ts` — `deleteForce` wraps existing logic in a SQLite transaction and adds the encounters-table cascade UPDATE statements + per-affected-encounter `recalculateStatus` call (delegated to the encounter repo via a callback to avoid hard import coupling — the force repo accepts an optional `onForceDeleted: (forceId: string) => void` injected at construction time, default a no-op; the encounter repo subscribes via a singleton wiring step).
- **MODIFIED**: `src/services/encounter/EncounterService.ts:415-452` — `hydrateEncounter` returns `playerForce: null` when `getForceById` returns null AND emits `logger.warn` once per missing force (no spamming on every read — uses a Set keyed on the encounter id + force id, reset on next process boot). Returns the same shape; consumers that read `encounter.playerForce?.forceName` already null-check via the optional chain.
- **MODIFIED**: `src/services/encounter/EncounterRepository.ts` — adds `clearForceReference(forceId: string): { affectedEncounterIds: readonly string[] }` method that performs the JSON-extract UPDATE statements and triggers `recalculateStatus` for each affected encounter. Used by the cascade wiring.
- **MODIFIED**: `src/pages/gameplay/encounters/index.tsx` — list page renders the new "Force missing" yellow pill when `encounterBrokenRefs(...)` returns true; empty-state gets the "Seed sample encounters" button when the list is empty AND no filters/search are active.
- **MODIFIED**: `src/pages/gameplay/encounters/[id].tsx` — when the loaded encounter has `playerForceMissing` or `opponentForceMissing`, render a banner above the form with a "Clear missing force" button per missing side. Click calls `setPlayerForce(null)` / `clearOpponentForce()` via the existing store actions.

## Test strategy

- **Cleanup script** (`scripts/__tests__/cleanup-broken-encounters.test.ts`) — fixture DB with 5 encounters: 2 abandoned-empty (no playerForceId, no opponentForceId, no opForConfig), 2 orphaned (forceId stored but force deleted), 1 still-valid. Assert: classification matches, manifest contains all 5 entries, only the 2 abandoned-empty get deleted, re-running on the now-3-row DB writes a no-op manifest and deletes nothing.
- **Cascade** (`src/services/forces/__tests__/ForceRepository.cascade.test.ts`) — create force F, create encounter E referencing F as player force, delete F, assert E's player_force_json is NULL after the delete and E's status is Draft. Multi-encounter: create 3 encounters all referencing F, assert all 3 are repaired in one transaction. Negative: delete F when no encounters reference it, assert no encounters table writes.
- **Hydration** (`src/services/encounter/__tests__/EncounterService.hydration.test.ts`) — create encounter referencing force F, delete F via raw SQL (bypassing cascade), call `getEncounter(id)`, assert `playerForce === null` AND a `logger.warn` was emitted once. Re-call `getEncounter(id)`, assert no second warn (deduped).
- **List UI** (`src/__tests__/pages/encounters/index.test.tsx`) — render with one encounter having a missing player force, assert "Player force missing" pill is visible AND has yellow background. Empty state: render with empty list and no filters, assert "Seed sample encounters" button is visible. Click → mock fetch, assert POST to `/api/encounters/seed-samples`, assert `loadEncounters()` called after success.
- **Detail UI** (`src/__tests__/pages/encounters/[id].test.tsx`) — render with encounter having missing player force, assert banner is visible with "Clear missing player force" button. Click → assert `setPlayerForce` called with `null`.
- **Seed-samples API** (`src/__tests__/api/encounters/seed-samples.test.ts`) — POST to handler, assert 4 encounters created with the 4 template types, assert IDs are returned. POST again → assert this is allowed (idempotency NOT required — user can seed multiple sample sets if they want; each call adds 4 new ones with auto-generated names like "Sample Duel (2)").

## Test infrastructure

Existing — Jest + better-sqlite3 in-memory test DB pattern is already established (see `EncounterRepository.test.ts:912 lines`). Cleanup script tests use the same pattern with a tmpdir-backed DB.

## Rollout

1. **Land Tier 1** — cleanup script + manifest format + cleanup tests (no production behavior change yet; script is opt-in CLI). PR #1.
2. **Land Tier 2** — cascade + hydration replacement + helper + tests. Behavior change: `deleteForce` now also writes to encounters table. PR #2.
3. **Land Tier 3** — UI surfaces (broken pill + repair banner + seed empty-state + API route) + UI tests. PR #3.
4. **Operator runs cleanup once** — `tsx scripts/cleanup-broken-encounters.ts` against the user's actual DB. Manifest archived. PR #4 if the manifest review surfaces any false-positive deletions (would expand classification rules).

Each tier is independently releasable. Tier 1 alone ships a useful tool. Tier 1+2 ships the full prevention. Tier 1+2+3 ships the visible recovery affordance.

## Risk + mitigation

- **Risk**: cleanup-script false positives delete a row the user wanted to keep. **Mitigation**: manifest log is the audit trail; user reviews and re-inserts via SQL if needed; classification rules are conservative (only delete when EVERY field besides `id`/`name`/`status`/`createdAt` is null/empty).
- **Risk**: cascade transaction rollback leaves force deleted but encounters not updated. **Mitigation**: SQLite transactions are atomic; if any UPDATE in the cascade fails, the force delete is also rolled back. Test covers this.
- **Risk**: hydration-boundary `logger.warn` floods the console on a DB with hundreds of orphans. **Mitigation**: dedup Set keyed on `${encounterId}:${forceId}`, reset only on process boot. First read warns; subsequent reads silent.
- **Risk**: the existing 27 drafts are NOT actually broken (just abandoned), so the cascade fix is overkill. **Mitigation**: cleanup classification covers both abandoned and orphaned; we ship both fixes because the orphaned case definitely exists per the source-code audit (`deleteForce` doesn't touch encounters), even if the current 27 happen to all be abandoned.

## Open questions

- **Q**: Should the cleanup script delete `Launched` / `Completed` encounters that reference orphan forces? **A**: NO. Those encounters were live games at some point and may have a `gameSessionId` worth preserving. Orphan ref repair (NULLing the json) is fine; deletion is gated to `Draft` only.
- **Q**: Should the seed action include encounters wired to existing forces from `ForceRepository.getAllForces()`? **A**: NO for v1. The seeded encounters are template-only; the user wires forces themselves. This keeps the seed predictable across user environments. Wire-up automation is a follow-on.
