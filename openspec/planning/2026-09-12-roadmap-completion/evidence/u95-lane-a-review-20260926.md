# Lane A review: U95

reviewedHead: f0bd8f0adb795fd21b8d39e595508c4d6426ab32
baseline: 23e93dcef3bd4ea34e797c3c35728b5ae6f51cb7
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` — completed (no output; branch already local).
- `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u95-review f0bd8f0adb795fd21b8d39e595508c4d6426ab32` — `HEAD is now at f0bd8f0ad ...` (exit 0).
- `New-Item -ItemType Junction -Path ...\u95-review\node_modules -Target ...\node_modules` — junction created (PowerShell `Mode: d----l`).
- `export npm_config_dry_run=true; export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH; node --version` → `v22.22.0`.
- No `npm install`/`ci`/`prune`, no build, no Playwright, no standalone server was run by this lane. `node scripts/qc/machine-idle.mjs --wait --timeout-ms ...` printed `MACHINE_IDLE` before every full-directory jest run.

## Files on the range

`git diff --numstat 23e93dce..f0bd8f0a`:
```
31  7   src/lib/multiplayer/server/CampaignHostRegistry.ts
74  0   src/lib/multiplayer/server/__tests__/CampaignHostRegistry.globalSlot.test.ts
144 0   src/lib/multiplayer/server/__tests__/campaignProgressionReaders.durable.crossGraph.test.ts
13  3   src/lib/multiplayer/server/campaignProgressionReaders.durable.ts
```
All 4 files sit under `src/lib/multiplayer/server` (unit's sole ownership path). Product added+deleted = 31+7+13+3 = 54 lines (matches the receipt's "54").

## Findings

1. **[Info] Slot correctness (Q1) — matches the MatchHostRegistry.ts:218-262 precedent.** `getCampaignHostRegistry` (CampaignHostRegistry.ts:426-433) reads `globalThis[Symbol.for('mekstation.multiplayer.campaignHostRegistry')]`, creates on miss, stores back; `_resetCampaignHostRegistry` (:436-440) calls `._reset()` then `delete`s the slot key. `grep -rln "getCampaignHostRegistry\|_resetCampaignHostRegistry" src` → 7 files. Every non-test importer (`bindCampaignSyncConnection.ts:220` default-parameter `registry = getCampaignHostRegistry()`, `src/pages/api/multiplayer/matches/index.ts:325`) calls the function at call time — none caches the return value in a module-scope `const`, so no importer can hold a stale reference across a slot reset. `grep -rn "new CampaignHostRegistry(" src` → 24 hits, all in `__tests__/` files, all used as explicit dependency-injected fixtures passed directly into the function under test (never touching the global slot) — pre-existing pattern, unaffected by this diff. No second-instance path found.
2. **[Info] Reset leak check (Q2).** `npx jest --detectOpenHandles src/lib/multiplayer/server/__tests__/CampaignHostRegistry.test.ts src/lib/multiplayer/server/__tests__/CampaignHostRegistry.globalSlot.test.ts` → exit 0, `Test Suites: 2 passed, 2 total`, `Tests: 20 passed, 20 total`; no "open handle" lines in the output (`grep -i "open handle"` on the captured log → "no open handle lines found"). `CampaignHostRegistry.ts:399-402` `_reset` calls `entry.close()` on every entry before `.clear()`, so nothing is left listening.
3. **Q3 answer (semantics decision), three lines:**
   - The created-not-rebuilt semantics win, and that is the code's own stated design: `CampaignSyncSession.ts:312-315` — "A freshly CREATED session does not call this... starting that case paused would refuse a guest who arrives in between" — matches `CampaignHostRegistry.ts:333-340`, which only calls `pauseUntilGmReturns()` when `options.rebuilt === true` (the create route at `src/pages/api/multiplayer/matches/index.ts:325-331` registers with no options).
   - Nothing the GM/guest branches depend on differs between a created and a rebuilt entry: `bindCampaignSyncConnection.ts:957-1017` (GM branch: `noteGmConnected`/`noteGmDisconnected`) and `:1022`/`:1044` (guest rejoin/room-code join) all operate on `entry` uniformly — durable readers, arbiter, and journal writer are set once in `register` (CampaignHostRegistry.ts:287-321) regardless of which branch built the entry; the one visible difference is the pause state itself, as `refusedWhilePaused` (`:652-668`) gates only on `entry.syncSession.isPaused()`.
   - `openspec/specs/coop-campaign-sync/spec.md:127-165` ("Requirement: Campaign Sync Session Lifecycle" / "Scenario: Host disconnect pauses the session") governs GM-loss-then-return pausing but says nothing about the window before the GM's first connection to a freshly created session — the spec is silent on that window, not overridden by it.
4. **Q4 answer — the rider is the least-change fix; no other cross-graph `instanceof` was found to remain broken.**
   - `campaignProgressionReaders.durable.ts:99-107` swaps `store instanceof DurableMatchStore` for `typeof store.getDatabase !== 'function'`, which is narrower than a shared symbol brand or an exported `isDurableMatchStore` helper (neither exists anywhere else in the codebase, so introducing one would be a second concept for a single call site) — this is the minimal in-path fix.
   - `grep -rn "instanceof DurableMatchStore\|instanceof.*MatchStore\|instanceof CampaignHostRegistry\|instanceof MatchHostRegistry" src/lib/multiplayer/server src/pages-modules/api` → one hit, `src/lib/multiplayer/server/__tests__/DurableMatchStore.supersede.test.ts:93`, which constructs the store itself in the same (single) test graph — not a cross-graph read, out of scope.
   - Broader `grep -rn "instanceof" src/lib/multiplayer/server --include="*.ts" | grep -v __tests__` and the same over `src/pages-modules/api` → every remaining hit is `instanceof Error`/a custom error subclass, or `instanceof Buffer`/`ArrayBuffer` — none of these are globalThis-slot-held singleton classes constructed independently per module graph; they are error/binary-type guards local to a single call stack. `src/lib/multiplayer/server/history/CoordinatedOutcomeCorrectionSaga.ts:292` (`journal instanceof SQLiteEventHistoryArtifactManifestStore`) is a function-parameter type-narrowing guard on a value passed directly by its one caller (`CoordinatedOutcomeCorrectionRun.ts:148`, a raw `Database.Database`), not a value read from a shared globalThis slot — no cross-graph identity mismatch is possible there.
   - `src/pages-modules/api/campaignLaunchAuthorityRoute.ts:180-195` calls `createDurableCampaignProgressionReaders()` in Next's API graph (confirms F1 in the receipts: this route's saga read was silently always-null on the baseline and is fixed by the same rider, though not driven live by this unit).

## Reproduce red

- Restored baseline blobs: `git show 23e93dce...:.../CampaignHostRegistry.ts` → sha256 `9aa560ea...` and `.../campaignProgressionReaders.durable.ts` → sha256 `e40aff11...` — both equal `sourceHashesAtBaseline` in the admission receipt.
- `npx jest src/lib/multiplayer/server/__tests__/CampaignHostRegistry.globalSlot.test.ts` → `Tests: 3 failed, 3 total` (all three rows fail with the same assertions/messages as `u95-red-20260926.json`).
- `npx jest src/lib/multiplayer/server/__tests__/campaignProgressionReaders.durable.crossGraph.test.ts` → `Tests: 1 failed, 1 passed, 2 total` ("reads ... this graph constructed" passes; "reads ... another graph constructed" fails with `Expected: "outcome-cross-graph" Received: undefined"`) — matches the red receipt exactly.
- Restored head blobs with `git checkout --`; `sha256sum` → `da6f1c40...` and `10cc7c4e...`, matching `finalHashes` in the local receipt; `git status --short` → clean.

## Independent mutant (not M1-M5)

- Mutated `matchStoreDbOrNull` (campaignProgressionReaders.durable.ts) so the guard still checks `typeof store.getDatabase !== 'function'` but the call site returns the **function reference** instead of invoking it (`return store.getDatabase as unknown as Database.Database;`).
- `npx jest src/lib/multiplayer/server/__tests__/campaignProgressionReaders.durable.crossGraph.test.ts` → `Tests: 2 failed, 2 total` — both rows fail now (the "this graph constructed" control row fails too, because `readCoordinatedCorrectionSagaByOutcomeId`'s own try/catch swallows the `matchDb.prepare is not a function` TypeError and returns null). Mutant caught.
- Restored the file from a pre-mutation copy; `sha256sum` → `10cc7c4e...`, matching head; `git status --short` → clean.

## Gates (head, product files restored)

| Gate | Command | Exit | Last/key line |
|---|---|---|---|
| jest multiplayer/server | `npx jest src/lib/multiplayer/server` | 0 | `Test Suites: 163 passed, 163 total` / `Tests: 1185 passed, 1185 total` |
| jest campaign/api | `npx jest src/lib/campaign src/lib/api src/__tests__/api` | 0 | `Test Suites: 262 passed, 262 total` / `Tests: 3780 passed, 3780 total` |
| jest other consumers | `npx jest src/__tests__/unit/api/multiplayerCoopCreationCheckpoint.test.ts src/pages-modules/api src/lib/api/__tests__/coopMatchRosterSourceVersion.test.ts` | 0 | `Test Suites: 10 passed, 10 total` / `Tests: 79 passed, 79 total` |
| tsc | `npx tsc --noEmit` | 0 | (no output) |
| oxlint | `npx oxlint` | 0 | `Found 84 warnings and 0 errors.` (matches receipt's warning baseline of 84) |
| oxfmt --check (changed files) | `npx oxfmt --check <4 changed files>` | 0 | `All matched files use the correct format.` |
| lint:units | `npm run lint:units` | 0 | `LINT_UNITS_PASS 100/100` |
| qc:openspec-ci:validate | `npm run qc:openspec-ci:validate` | 0 | `...errors=0` |
| roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | 0 | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` |
| open-handles (registry suites) | `npx jest --detectOpenHandles CampaignHostRegistry.test.ts CampaignHostRegistry.globalSlot.test.ts` | 0 | `Tests: 20 passed, 20 total`, no open-handle warning |

All counts reproduce the implementer's `u95-local-20260926.json` gate rows exactly.

## Cap

- Scope: `git diff --stat` → all 4 touched files under `src/lib/multiplayer/server` (unit's sole ownershipPath). No file outside it.
- Product lines: 54 (< 500 cap; matches receipt).
- `grep -iE "claude|anthropic|co-authored|generated by|E:\\\\Projects|E:/Projects|C:\\\\Users|/c/Users"` over the diff → NONE FOUND (no AI attribution, no absolute machine paths). Commit subject also carries no attribution.
- Every added/changed function comment verified against the code beneath it: `getCampaignHostRegistry`'s doc comment (lazy-create + shared-slot claim) matches the implementation and the read `MatchHostRegistry.ts:218-262` precedent it cites; `_resetCampaignHostRegistry`'s comment ("close every entry ... delete the slot") matches `_reset` (`entries.forEach(close); entries.clear()`) plus `delete`; `matchStoreDbOrNull`'s comment (cross-graph `instanceof` failure, method-based read) matches the `typeof store.getDatabase !== 'function'` guard beneath it. No comment claims a property the code does not implement.

## Verdict rationale

Both product edits are exact, minimal, and each backed by a red-first jest row that fails on the restored baseline and passes at head (both independently reproduced here, with an additional independently-authored mutant also caught). The slot pattern is a faithful, byte-level match to the already-shipped `MatchHostRegistry.ts` precedent, and every importer of the two touched functions was grepped and confirmed to call them at use-time rather than caching a stale reference. The one behavior change a user can observe (a guest's command is processed instead of refused `MATCH_PAUSED campaign-paused-gm-absent` in the narrow window before a freshly-created session's GM first connects) is exactly what the pre-existing `CampaignSyncSession.ts:312-315` design comment already stated the created-session path was supposed to do, and the spec is silent on that specific window rather than contradicting it. The rider fix is the narrowest available correction for the cross-graph `instanceof` failure, and a full-repo grep found no remaining `instanceof` on a globalThis-slot-held class anywhere in the ownership path or `src/pages-modules/api`. All required gates pass with counts matching the implementer's receipts bit-for-bit, scope stays entirely inside `src/lib/multiplayer/server`, and the diff carries no AI attribution or absolute machine paths.

Review file: `E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/u95-lane-a-review-20260926.md`
