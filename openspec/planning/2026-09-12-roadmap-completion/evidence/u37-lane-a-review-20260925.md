# Lane A review: U37
reviewedHead: e1a2ee5420a69a83fd0aea17b240214bd90fdf99
baseline: 0ac5767ebca7abbb18d26b5cfb0083729b21b929
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- Fetched `origin` and created a detached worktree at the exact PR head: `git worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u37-review e1a2ee5420a69a83fd0aea17b240214bd90fdf99`. Confirmed with `git log --oneline -1` -> `e1a2ee542 fix(replay): networked tokens are seeded at the engine's deploy hex and facing on GameCreated through one shared placement function`.
- Junctioned `node_modules` from the repo root (PowerShell `New-Item -ItemType Junction`). No install/ci/prune/build was run; `npm_config_dry_run=true` was set for every npm/npx call.
- Node 22 confirmed: `node --version` -> `v22.22.0`.
- Read: `openspec/planning/2026-09-12-roadmap-completion/GOAL.md`, `DELIVERY.md` step 5 (the Lane A/Lane B paragraph), the U37 and U25 entries in `units.json` on `origin/main`, the three staged receipts (`u37-admission-20260925.json`, `u37-local-20260925.json`, `u37-red-20260925.json`), `openspec/specs/game-state-management/spec.md:102-121`, the full diff, and the read-only context files named in the charter.
- Never touched the implementer's `worktrees/u37` or `worktrees/u86`; all commands ran with an explicit `cd` into `worktrees/u37-review`.
- Ran `node scripts/qc/machine-idle.mjs --wait --timeout-ms 1800000` before every full-directory jest run and before `tsc`; each printed `MACHINE_IDLE` before the run proceeded.
- Before finishing: deleted both scratch probe test files, restored every product file I mutated to its head sha256, and confirmed `git diff --stat HEAD` and `git status --short` are both empty (worktree exactly matches the reviewed head). Deleted the `node_modules` junction and removed the worktree per the charter's cleanup sequence (final step, after writing this file).

## Files on the range

`git diff 0ac5767eb..e1a2ee542 --stat` (7 files, matches the local receipt):

| file | +/- | kind |
|---|---|---|
| src/utils/gameplay/gameState/initialization.ts | +32/-0 | product |
| src/utils/gameplay/gameState/lifecycle.ts | +10/-19 | product |
| src/hooks/replay/useHexMapStateFromEvents.ts | +14/-3 | product |
| src/hooks/replay/__tests__/useHexMapStateFromEvents.core.test.ts | +6/-4 | test |
| src/hooks/replay/__tests__/useReplayMovementAnimations.integration.test.tsx | +2/-2 | test |
| src/hooks/replay/__tests__/useHexMapStateFromEvents.deployPlacement.test.tsx | +117/-0 | test, new |
| src/utils/gameplay/gameState/__tests__/initialization.deployPlacement.test.ts | +46/-0 | test, new |

Product changed lines: 32+29+17 = 78 (matches receipt's `productChangedLines: 78`). All 7 files are under `src/hooks` or `src/utils/gameplay/gameState`, the unit's ownership paths.

## Findings

1. **[INFO] The engine's rule was moved, not changed.** Diff-read of `lifecycle.ts` vs the new `deployPlacementsFor` in `initialization.ts`: the arithmetic (`col - 2`, `PLAYER_DEPLOY_ROW`/`OPPONENT_DEPLOY_ROW`, `Facing.North`/`Facing.South`, the per-side counters) is character-identical, only extracted into an exported function. `GameSide` has exactly two members (`Player`, `Opponent`; `src/types/gameplay/GameSessionCoreTypes.ts:355-358`), so the `isPlayer ? ... : ...` ternary is exhaustive and behaves identically to the old two-armed logic for every side value that exists.

2. **[INFO, probed] Engine output is byte-identical between baseline and head for 1v1/2v2/3v3.** Probe: added a scratch test calling `deriveState('u37-probe', [rosterEvent(p,o)])` for (1,1), (2,2), (3,3) rosters, logged the resulting `{id, side, position, facing}` for every unit, ran it against the head files, then `git checkout <baseline> -- initialization.ts lifecycle.ts useHexMapStateFromEvents.ts`, reran the identical probe file unmodified, and diffed the two console outputs by eye — they are identical:
   - Head 3v3: `player-1 {q:-2,r:5} North, player-2 {q:-1,r:5} North, player-3 {q:0,r:5} North, opponent-1 {q:-2,r:-5} South, opponent-2 {q:-1,r:-5} South, opponent-3 {q:0,r:-5} South`
   - Baseline 3v3: identical output, same values for every unit and every roster size (1v1, 2v2 also identical).
   Restored the head files afterward; `sha256sum` matched the receipt's recorded head hashes exactly (`c099189d...`, `73b63826...`, `fead4615...`).

3. **[INFO, probed] The projection now agrees with the engine; it did not before.** Same probe technique applied to `deriveHexMapStateFromEvents`: with the baseline files swapped in, the projection seeded `player-1` at `{q:0,r:0}` while the engine (via `deriveState`) placed it at `{q:-2,r:5}` — a real, reproduced mismatch. With the head files restored, both agree (also independently proven by the shipped test `useHexMapStateFromEvents.deployPlacement.test.tsx` "agrees with the engine state for every unit of a mirrored 2v2").

4. **[INFO, answers Q2] Per-side index order is stable for every viewer and across reconnect.** `deployPlacementsFor` derives each unit's column purely from its position in `payload.units`.
   - **Fog**: `src/lib/multiplayer/server/fogOfWar.ts:123-137` — for `GameCreated`, `filterEventForPlayer` only ever strips a non-owned unit's `customUnitDefinition` field via `.map`, which never reorders or removes array entries; when no unit carries `customUnitDefinition` the event is returned unchanged. Every viewer (host, guest, spectator, fogged or not) sees `payload.units` in the same order.
   - **Wire audience**: `src/lib/multiplayer/server/projection/MatchWireAudienceCatalog.ts:73` marks `GameEventType.GameCreated: PUBLIC` with `project: projectMatchWirePayloadUnchanged` — no per-viewer projection is applied at all.
   - **Construction**: `src/utils/gameplay/gameEvents/lifecycle.ts:78` (`createGameCreatedEvent`) sets `units: input.units` verbatim — insertion-ordered, never sorted.
   - **Reconnect/recovery**: `src/utils/gameplay/gameSessionCore.ts:132-159` (`hydrateGameSessionFromEvents`) sorts events by `sequence` and rehydrates `currentState` via `deriveState(matchId, orderedEvents)` from the **persisted** `GameCreated` event (`orderedEvents[0]`) — it never rebuilds `payload.units` from a live/current roster query, so a reconnect cannot reorder the roster; the frozen event log is replayed byte-for-byte.
   Conclusion: no viewer or reconnect path can see a different per-side index. No edit required for this question.

5. **[INFO, probed, answers Q3] No jump on the first move.** Probe: built a `GameCreated` (1v1), read the projection at cursor 0 (`seeded.position === {q:-2,r:5}`), then a `MovementDeclared` whose `from` was set to that same seeded position (mirroring what a real engine event carries — see below), applied it, and confirmed cursor 1's position equals `payload.to` and `payload.from === seeded.position` (console output: `PROBE_NOJUMP {"cursor0":{"q":-2,"r":5},"animationFrom":{"q":-2,"r":5}}`). Traced why a real event's `from` will actually equal the seeded hex: `src/engine/InteractiveSession.actions.movement.ts:73-76` sets `const unit = input.session.currentState.units[input.unitId]; const from = unit.position;` — i.e., `from` is read from the engine's own live state, which (per findings 1-2) now starts at the deploy hex instead of `{0,0}`. The animation path builder (`src/hooks/replay/useReplayMovementAnimations.ts:161`, `path: [payload.from, payload.to]`) draws directly from the event's own `from`/`to`, so for a genuine engine-produced log the drawn path starts exactly where the token was rendered. `applyMovementDeclaredEvent` (`useHexMapStateFromEvents.ts:228-239`) sets `acc.position = payload.to` and never reads `payload.from`, confirming the design note that reading is unaffected.
   Note: the pre-existing fixture `useHexMapStateFromEvents.core.test.ts`'s `MovementDeclared` test still hardcodes `from: {q:0,r:0}`, which is now unrealistic for a real match's first move, but that test only exercises the reducer's `to`/`facing` handling in isolation and does not assert path continuity, so this is not a defect — flagged for completeness only.

6. **[INFO, out of scope, independently confirmed] Two pre-existing gaps the implementer reported but correctly left unfixed.**
   - `src/lib/multiplayer/server/matchUnitBootstrap.ts:35-50` / `src/lib/multiplayer/matchRosterPresets.ts:124-139` each compute their own `startHexFor` that reaches only the adapted-unit object (not `IGameUnit`, not `GameCreated`, never read by the engine state) — confirmed by grep; genuinely outside `src/hooks` / `src/utils/gameplay/gameState`.
   - `src/hooks/replay/useHexMapStateFromEvents.ts`'s `REPLAY_EVENT_HANDLERS` map (lines 71-88) has no entry for a physical-attack-displacement event, while the engine's `applyPhysicalDisplacements` (`src/utils/gameplay/gameState/physicalAttackResolution.ts:38,158-169`) does move displaced units — confirmed by reading the handler map (no `PhysicalAttackResolved` key). This gap predates U37 (U37 only added the `GameCreated` seeding change) and is not this unit's ownership.
   Neither is a regression introduced by this PR; both are correctly reported-not-fixed rather than silently absorbed.

7. **[INFO, answers Q4 — reproduce red] Baseline product files reproduce all 6 failing rows the receipts claim, plus the new pure-function suite.** `git checkout 0ac5767eb -- initialization.ts lifecycle.ts useHexMapStateFromEvents.ts`, then ran the changed+new hooks suites: `Test Suites: 3 failed, 3 total / Tests: 6 failed, 12 passed, 18 total`. The 6 failing rows, verified by name:
   - `core.test.ts > places fresh tokens at the engine deploy hex and facing`
   - `core.test.ts > does not affect other units' positions`
   - `useReplayMovementAnimations.integration.test.tsx > rewinding the cursor flushes the queue while the projection still ground-truths the earlier position`
   - `deployPlacement.test.tsx > seeds a mirrored 2v2 at players r=+5 North, opponents r=-5 South, q = per-side index - 2`
   - `deployPlacement.test.tsx > agrees with the engine state for every unit of a mirrored 2v2`
   - `deployPlacement.test.tsx > the board renders each unit at its deploy hex before any MovementDeclared`
   Also ran `initialization.deployPlacement.test.ts` against the baseline `initialization.ts`: all 3 rows fail with `TypeError: (0 , _initialization.deployPlacementsFor) is not a function` (the function does not exist on baseline), matching the receipt's "not writable" claim. Restored the head files (`git checkout e1a2ee542 -- <paths>`); `sha256sum` matched the head hashes exactly (`c099189d...`, `73b63826...`, `fead4615...`).

8. **[INFO, answers Q5 — independent mutant] A 4th mutant, distinct from M1-M3, is caught.** M1-M3 (per the receipts) mutate the shared function or delete the projection's assignment entirely. I instead targeted the projection's per-unit indexing: in `useHexMapStateFromEvents.ts:208`, changed `acc.position = placements[index].position;` to `acc.position = placements[0].position;` (every unit's position collapses onto the first unit's placement; facing untouched). Ran `npx jest src/hooks/replay src/utils/gameplay/gameState src/components/multiplayer --ci`: `5 failed, 242 passed, 247 total`, caught by:
   - `core.test.ts > places fresh tokens at the engine deploy hex and facing`
   - `core.test.ts > does not affect other units' positions`
   - `deployPlacement.test.tsx > seeds a mirrored 2v2 ...`
   - `deployPlacement.test.tsx > agrees with the engine state for every unit of a mirrored 2v2`
   - `deployPlacement.test.tsx > the board renders each unit at its deploy hex before any MovementDeclared`
   Restored the file; `sha256sum` back to `fead4615...` (head).

9. **[INFO, answers Q7 — comment accuracy] The 3 new/changed function comments were checked against the code beneath them and are accurate, not aspirational.**
   - `initialization.ts` `deployPlacementsFor` docstring claims: player units on `PLAYER_DEPLOY_ROW` facing North, others on `OPPONENT_DEPLOY_ROW` facing South, `q` = per-side index minus 2, pure (reads only `side` and list position). Matches the body exactly (finding 1).
   - `lifecycle.ts` `applyGameCreated` docstring claims it seeds units via `deployPlacementsFor` then copies objectives/ground objects/minefields/C3 network onto state. Matches (the function body calls `deployPlacementsFor`, `createInitialUnitState`, then spreads the payload's other fields — read directly).
   - `useHexMapStateFromEvents.ts` `applyGameCreatedEvent` docstring claims it reads `mapRadius`, seeds `hexTerrain`, and seeds each token at the `deployPlacementsFor` result, replacing the old origin/North default. Matches the body line-for-line (`context.mapRadius = payload.config.mapRadius`, the `hexTerrain` loop, then the `placements`/`forEach` block).

## Gates (on the exact head, after restoring)

| gate | result | exit |
|---|---|---|
| `npx jest src/hooks --ci` | 51 Suites, 480 Tests passed (50/477 is the implementer's count; the extra suite/3 tests were my own scratch probe present during this specific run) | 0 |
| `npx jest src/utils/gameplay --ci` | 264 Suites, 4962 Tests passed — matches receipt exactly | 0 |
| `npx jest src/engine --ci` | 30 Suites, 414 Tests passed — matches receipt exactly | 0 |
| `npx jest src/components/gameplay --ci` | 217 Suites, 1223 Tests passed — matches receipt exactly | 0 |
| `npx jest src/components/multiplayer --ci` | 13 Suites, 141 Tests passed — matches receipt exactly | 0 |
| `npx tsc --noEmit` | no output | 0 |
| `npx oxlint` | "Found 84 warnings and 0 errors" — matches receipt's 84; grep of output for the 3 changed product files/4 changed test files: no hits | 0 |
| `npx oxfmt --check <7 changed files>` | "All matched files use the correct format." | 0 |
| `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| `npm run qc:openspec-ci:validate` | `errors=0`, matches receipt line exactly | 0 |
| `node .../validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` — matches receipt exactly | 0 |

All gate outputs were re-run independently in my own detached worktree, not read from the receipts, and match the receipts row for row (the one intentional exception being the `src/hooks` count while my own scratch probe file was present, explained above and removed before finishing).

## Cap

- Files touched: 7 (cap 15). Product changed lines: 78 (cap 500, non-generated product lines only). All files under `src/hooks` or `src/utils/gameplay/gameState`, the unit's declared ownership paths — no file outside scope.
- No AI attribution anywhere in the range: `git log --format='%H %an %ae %s' 0ac5767eb..e1a2ee542` shows one commit, author "Wes Rollings <wrollings@gmail.com>"; `git diff` grepped for `anthropic|claude|co-authored|generated with` returned nothing.
- No absolute machine paths in the diff (grepped for `C:\Users`, `/home/`, `/Users/wroll`, `E:\Projects` — no hits).
- Function comments checked in finding 9 — all accurate.

## Verdict rationale

The change is exactly what the unit sentence and the governing spec clause (`openspec/specs/game-state-management/spec.md:102-121`) describe: one exported pure function, used identically by the engine reducer and the replay projection, with no behavior change to the engine (finding 2, independently probed baseline-vs-head) and a real, independently-reproduced correction to the projection (finding 3). Per-side indexing is provably stable across every viewer and reconnect path (finding 4, cites fog filter, audience catalog, event construction and hydration code directly). The first move after seeding does not jump (finding 5, probed and traced to the engine's own `from = unit.position`). Reproduce-red independently confirms all 6 receipted failing rows plus the 3 rows for the new pure function (finding 7). An independent 4th mutant, targeting the projection's index mapping rather than the shared function, is caught (finding 8). All 11 required gates were re-run independently in a fresh detached worktree and match the receipts exactly. Scope, caps, attribution and comment-accuracy checks all pass (finding 9, Cap section). Two out-of-scope gaps are correctly reported-not-fixed rather than silently absorbed or hidden (finding 6). No edit is required of this head.
