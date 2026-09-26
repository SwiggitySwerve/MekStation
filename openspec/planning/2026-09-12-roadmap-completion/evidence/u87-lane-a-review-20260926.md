# Lane A review: U87
reviewedHead: fc615f0385f29e0fd829835ab57195bad94a8e0a
baseline: 70f15077ac229eb1e6bac78fe226aac62244f8a3
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

Detached review worktree at `E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u87-review`, HEAD `fc615f038` (verified via `git worktree add --detach ... fc615f0385f29e0fd829835ab57195bad94a8e0a`). `node_modules` junctioned from the root checkout. Node 22.22.0 confirmed (`node --version` -> `v22.22.0`). `npm_config_dry_run=true` set for every npm/npx call. `node scripts/qc/machine-idle.mjs --wait --timeout-ms 1800000` run before the build and before every Playwright group, each returning `MACHINE_IDLE`.

Build: `NEXT_PUBLIC_E2E_MODE=true NEXT_PUBLIC_E2E_TEST=true npm run build` exited 1 with `"error": "Unsafe hydration destination (runtime loader tsx) contains a symlink or junction: .next\\standalone\\node_modules"` — the designed failure for a junctioned worktree. `__E2E_MODE__` confirmed present in `.next/static/chunks/pages/_app-57752df63578994c.js` (`grep -rl "__E2E_MODE__" .next/static/chunks/pages/`).

## Files on the range

`git diff --stat 70f15077a..fc615f038`:
- `e2e/gm-two-player-lifecycle.pack.spec.ts` | 38 ++++++++++++++++++++++++++++++++ (38 added, 0 removed)
- `e2e/ux-walkthrough-audit.spec.ts` | 24 +++++++++++++++----- (19 added, 5 removed)

No other paths touched (`git diff --numstat` lists exactly these two files).

## Findings

1. **[info] The wait's signal is the best one already exposed; the disclosed one-read-early window is real and not overstated.** Read `src/lib/multiplayer/server/ServerMatchHostReplay.ts:319-351` (`handleSessionJoin`): a rejoining socket gets `sendReplay`, then (if seats exist) a `LobbyUpdated` carrying `meta.status`, then `ctx.maybeResume()`. `maybeResume` (`ServerMatchHostReconnectLifecycle.ts:65-80`) only flips `setPaused(false)` and broadcasts `MatchResumed` once `pendingPeers.size() === 0` — i.e. after the *last* pending seat's socket has joined. `IMatchStore.ts:51` defines `MatchStatus = 'lobby' | 'active' | 'completed'` — there is no `'paused'` value, so `LobbyUpdated.status` cannot carry pause state, and no ack/data-attribute exists on the wire that would tell the client the exact moment `setPaused(false)` ran. The host's `tactical-lifecycle-state` banner reading `live` is therefore driven by the client's own replay-derived state (`tacticalLifecycleState.ts:166-186`), not by an event tied to `maybeResume`, so a read of "host live" can land one poll tick before the server-side unpause actually completes. This is exactly what FN-u87-rejoin-window-before-pause-lift discloses ("read from the code, not hit in 3 runs"); I found no stronger already-exposed signal the wait could read instead. Fixing it would need a protocol addition (e.g. an ack in `LobbyUpdated`/`MatchResumed` keyed to the joining socket) — out of scope for an e2e-only unit that owns no `src/` paths.
2. **[info] The overlay alone is confirmed unreliable after a reload pair.** `ServerMatchHostReconnectLifecycle.ts:85-100` (`broadcastPauseSnapshot`) sends `MatchPaused` only when a seat is newly marked pending (called from `maybeMarkPlayerPending`, i.e. at drop time). `handleSessionJoin` (`ServerMatchHostReplay.ts:319-351`) never sends `MatchPaused`. So a page that reloads after a peer already dropped never receives the pause message and never renders `match-pause-overlay` (`NetworkedGameSurface.overlays.tsx:151`), matching the receipted probe ("the overlay stayed absent for 30 s with the host held away"). `waitForRejoin`'s overlay checks (`gm-two-player-lifecycle.pack.spec.ts:591-593`) correctly do not rely on the overlay as the primary signal; they only add a floor for the case where a page *did* receive the pause. This is consistent with the implementer's own stated rationale, verified independently by reading the same code paths.
3. **[info] Label robustness for the heat-sink field is sound.** `grep -rn "Heat sink count" src/components/customizer/` returns exactly one hit: `src/components/customizer/tabs/StructureTabHeatSinkControls.tsx:133`, an `<input type="number" aria-label="Heat sink count">` (role `spinbutton`). The sibling `<label htmlFor="heat-sink-count">Installed</label>` does not compete for the accessible name because `aria-label` takes precedence. No other field on the structure page shares that name.
4. **[info] "New blank unit" reaches the same downstream state the journey's later steps expect.** `MultiUnitTabs.tsx:154-157`: `createBlankUnit` calls `createNewUnit(50)` — the same call the old "Create Unit" button made — then closes the dialog. Confirmed empirically: the head journey run navigates to `/customizer/<id>/structure` and finds `structure-heat-sink-count`'s replacement (the `Heat sink count` spinbutton) in the same 9-step pass (see Ladder runs).
5. **[residual, already filed, not a defect in this diff] My own mutant did not empirically fail on plain runs.** See Ladder runs #3 below — this reproduces the same "unmeasured window" character the implementer already disclosed (FN-u87-rejoin-window-before-pause-lift) rather than exposing something new.

No blocking findings. No product path is touched, so FN-u87-pause-overlay-not-a-pause-signal-after-rejoin and FN-u87-rejoin-window-before-pause-lift are correctly left as findings recorded for a future unit (U50) rather than folded into U87 as a product change — folding them in would have widened this unit's caps beyond its `e2e`-only ownership path.

## Ladder runs

**1. Baseline spec (`70f15077a`) restored, lifecycle-pack x3** (spec hash confirmed `6ce8fe2d3bd65cc0940940ad671849e1d8f94c8ee935b43b1dbe5bbc35ff7557` == receipted `specSha256AtBaseline`):
- run 1: exit 0, `2 passed (18.1s)`
- run 2: exit 1, `1 failed, 1 passed (1.3m)` — row A: `Expected: "sealed"`, `Received: "live"` (spec.ts:179, the same assertion and failure mode the red/diagnosis receipts recorded)
- run 3: exit 0, `2 passed (17.1s)`
- Summary: **1 of 3 failed** in this worktree (row A). This is weaker than the implementer's 3-of-3 and stronger than the diagnosis's 0-of-2 (2/2 pass) — all three measurements are consistent with the disclosed FN-u87-row-a-fails-3-of-3-in-lane-worktree ("the race's outcome depends on timing the environment sets"), not with each other exactly, which is expected for a timing race.
- File restored to head; hash confirmed `d9384819e463554be621dc1083060baec68bb864a4c7372cd025b8786c01340c` (matches pre-mutation head hash).

**2. Head spec (`fc615f038`), lifecycle-pack x3:**
- run 1: exit 0, `2 passed (24.8s)`
- run 2: exit 0, `2 passed (19.9s)`
- run 3: exit 0, `2 passed (18.1s)`
- Summary: **3 of 3 passed** (6 of 6 rows), matching the local receipt's "lifecycle-pack 3 of 3 (2 passed each, both players rejoined before GoProne)".

**3. My own mutant (not one of the receipts' three): `waitForRejoin` narrowed to check only `host: 'live'`, dropping the `hostPaused`/`guestPaused` overlay checks** (i.e. "accept a paused host" as long as the host's banner reads live):
- run 1: exit 0, `2 passed (31.2s)`
- run 2: exit 0, `2 passed (19.3s)`
- Result: the mutant survived 2 of 2 plain runs — it did not empirically break, matching the already-disclosed characterization that the residual window (FN-u87-rejoin-window-before-pause-lift) is narrow and was not hit in the implementer's 3 runs either. I did not find a deterministic probe to force it in the time budget (unlike the guest-only mutant, which the implementer's own receipts note "survives plain runs and is caught only with the host held away" — this mutant's failure mode is a single-database-read race, not a held-away-page scenario, so the same probe technique does not apply).
- File restored to head; hash confirmed `d9384819e463554be621dc1083060baec68bb864a4c7372cd025b8786c01340c`.

**4. Baseline audit spec (`70f15077a`) restored, journey run** (spec hash confirmed `5e573a13782672ab326cf6e3211ac3579946380e94ae20051aa7d9d0132fdee2` == receipted baseline hash):
- `MEKSTATION_E2E_SERVER_COMMAND="node server.js" NODE_ENV=production HOSTNAME=127.0.0.1 node scripts/qc/run-ux-walkthrough.mjs -g "journey: build a new unit in the customizer"` -> exit 1, failed at step 2: `getByRole('heading', { name: 'Create New Unit' })` timed out, `1 failed`, `journeys=1 (1 failed) steps=2 (1 failed, 0 with console errors)`. Reproduces the red receipt exactly.
- File restored to head; hash confirmed `524cbfb44efbf17b3d0f667614ebc8d2d02145dc9fb0724e5fe0f1d4bcd4be4f`.

**5. Head audit spec, journey run:**
- Same command -> exit 0, `1 passed (14.5s)`, `journeys=1 (0 failed) steps=9 (0 failed, 1 with console errors) findings=0`. Matches the local receipt's "1 journey, 9 steps, 0 failed".

## Gates

| Gate | Command | Last line | Exit |
|---|---|---|---|
| Jest QC pin | `npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts` | `Tests: 15 passed, 15 total` | 0 |
| Typecheck | `npx tsc --noEmit` | (no output) | 0 |
| Lint | `npx oxlint` | `Found 84 warnings and 0 errors.` | 0 |
| Format | `npx oxfmt --check e2e/gm-two-player-lifecycle.pack.spec.ts e2e/ux-walkthrough-audit.spec.ts` | `All matched files use the correct format.` | 0 |
| OpenSpec CI quality | `npm run qc:openspec-ci:validate` | `[qc:openspec-ci] ... errors=0` | 0 |
| Roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

All counts match the local receipt (`jest qc pin 15`, `oxlint 84 warnings 0 errors`, `oxfmt clean`, `qc:openspec-ci errors=0`, `validator PASSED`) and the validator's node/package/task/triage counts match the admission receipt's baseline snapshot unchanged.

## Cap

- Files touched: exactly `e2e/gm-two-player-lifecycle.pack.spec.ts` and `e2e/ux-walkthrough-audit.spec.ts` (`git diff --stat`), both under the unit's declared `ownershipPaths: ["e2e"]`. 2 files, well under the 15-file cap.
- Lines: 38+0 and 19+5 = 57 added / 5 removed, all spec lines (0 product lines per the local receipt and confirmed by the diff touching no `src/` path), well under the 500-line cap (which counts non-generated product lines only).
- No product change: confirmed, diff touches only `e2e/`.
- No AI attribution: `git log 70f15077a..fc615f038` shows one commit, `test(e2e): the lifecycle pack waits for both surfaces to rejoin before GoProne; the audit's customizer journey follows the Add unit dialog`, no trailers.
- No absolute machine paths: `git diff ... | grep -iE "E:[\\/]|C:[\\/]|/c/Users|/mnt/|Anthropic|Claude|Co-Authored|opus|sonnet"` returned no matches.
- The helper's comment states what it actually does. Quoted from `e2e/gm-two-player-lifecycle.pack.spec.ts:558-572`:
  > "Polls, every 100 ms for up to 60 s, until the host's banner reads `live` and neither page renders `match-pause-overlay`, all three read in the same poll round. Throws on timeout naming the last values read."

  This matches the implementation directly below it: `expect.poll(async () => ({ host, hostPaused, guestPaused }), { timeout: 60_000, intervals: [100] }).toEqual({ host: 'live', hostPaused: false, guestPaused: false })`. The rest of the docstring ("The host's banner is the signal that carries the rejoin... The overlay alone is not one") is the design rationale, independently verified true against `ServerMatchHostReplay.ts:319-351`, `ServerMatchHostReconnectLifecycle.ts:31-100`, and `NetworkedGameSurface.tsx:234-242` in Finding 1 and 2 above — the comment does not claim a guarantee the code does not implement.

## Verdict rationale

Both rows' fix and the journey fix reproduce red on the exact baseline (spec hashes verified against the receipted `specSha256AtBaseline`) and pass green on the exact head across 3 lifecycle-pack runs (6/6 rows) and the journey run (9/9 steps). The wait's signal (host banner `live` plus both-page overlay-absent) is the strongest signal already exposed by the wire protocol; no stronger ack/attribute exists without a protocol change, which is correctly out of scope for an `e2e`-only unit. The one disclosed residual (a single-database-read race between the banner going live and the server's `maybeResume`) is honestly filed as FN-u87-rejoin-window-before-pause-lift with a named successor (U50) rather than glossed over, and my independent mutant attempt neither disproved nor newly exposed anything beyond what is already disclosed. All gates pass with counts matching the local receipt. Scope is exactly the two e2e files, no product change, no AI attribution, no absolute paths, and the helper's comment is accurate. APPROVE.
