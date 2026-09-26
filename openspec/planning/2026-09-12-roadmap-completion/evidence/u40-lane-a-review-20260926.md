# Lane A review: U40
reviewedHead: aa1b6b9ea6aa7220c2757c29ed3451281412cc5b
baseline: 738e5466fd934d01e8dfeb61f9faf15d7a291fa1
reviewerModel: claude-sonnet (Agent model: sonnet, lean-worker)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` — origin/main already carried U96 at fetch time: `5d19d95ad feat(campaign): a whole-campaign PUT from the live host is adopted by the host session and any other instance is refused; ...` (subject matches the charter's expected prefix).
- `git worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u40-review e344c2db942e5dc5267658bb89e82c3011136a2c` — succeeded, HEAD at e344c2db9.
- `New-Item -ItemType Junction ... node_modules -> E:\Projects\MekStation\node_modules` — succeeded.
- `npm_config_dry_run=true` exported before every npm invocation; Node 22.22.0 via the pinned PATH (`node -v` → `v22.22.0`).
- `node scripts/qc/machine-idle.mjs --wait --timeout-ms 1800000` → `MACHINE_IDLE`, exit 0, before every full-directory jest run.
- No `npm install/ci/prune`, no build, no Playwright, no real ladder group was run. Only a scratch `net.createServer`/child-process TCP listener was started and killed for the port/PID probes.
- Never touched the root checkout or the u40/u92/u96 worktrees (only read-only `cat`/`grep` on u40's evidence files).
- Worktree and junction removed at the end (see Cap/cleanup below).

## Files on the range

`git diff --numstat 738e5466f..e344c2db9`:
```
120  1  scripts/__tests__/gm-two-player-campaign-qc.test.ts
 96  1  scripts/__tests__/lint-units.test.ts
 60  7  scripts/qc/gm-two-player-campaign-core.cjs
  9  0  scripts/qc/lint-units-src-tests.ignore
  6  3  scripts/qc/lint-units.ceiling.json
 93 26  scripts/qc/lint-units.mjs
 38  0  scripts/qc/machine-idle.mjs
```
All 7 files sit under `scripts/qc` or `scripts/__tests__` (the unit's `ownershipPaths` per origin/main `units.json`). Product added 206 / removed 36 = 242 changed lines (matches the receipt's claim exactly), under the 500-line cap.

## Findings

1. **[INFO] Q1 — HOSTNAME reaches every group and nothing overwrites it.**
   `scripts/qc/gm-two-player-campaign-core.cjs:223` sets `HOSTNAME: '127.0.0.1'` inside `buildRunPlan`'s returned `environment`. `runPlan` (core.cjs:296-299) spawns with `env: { ...process.env, ...plan.environment }`, so `plan.environment.HOSTNAME` wins over any shell-exported value. The child is `node scripts/playwright/run-playwright.mjs` (core.cjs:207-213); that script spawns the Playwright CLI with `env: { ...process.env, ...campIsolation.environment, ...campCollection.environment, ..., ...campCaptureEnvironment }` (`scripts/playwright/run-playwright.mjs:69-76`) — none of `campIsolation`/`campCollection`/`campDevServerEnv`/`prodEvidenceEnv`/`campCaptureEnvironment` set `HOSTNAME` (`grep -rn HOSTNAME` on those four modules: no output). Playwright's own webServer plugin spreads `{ ...DEFAULT_ENVIRONMENT_VARIABLES, ...process.env, ...this._options.env }` (`node_modules/playwright/lib/plugins/webServerPlugin.js:88-91`), and `playwright.config.ts`'s `webServer.env` block (`playwright.config.ts:296-322`) never sets `HOSTNAME` either, so `process.env.HOSTNAME` (already `127.0.0.1`) survives untouched into `server.js`. For `RESPAWNING_GROUPS`, `scripts/e2e/relaunching-server.mjs:22-24` spawns `node server.js` with `env: process.env` (unmodified pass-through). `server.js:71-78`'s `resolveListenerHostname()` exits the process unless `HOSTNAME` is `undefined`/`'localhost'`/`'127.0.0.1'` — confirmed by reading the guard directly. The authority-recovery pin test (`scripts/__tests__/gm-two-player-campaign-qc.test.ts:183-192`) asserts the *entire* `environment` object by `toEqual`, including `HOSTNAME: '127.0.0.1'`, and the new `plans HOSTNAME=127.0.0.1 for every implemented group` test (lines 850-871) iterates every `REGISTERED_GROUPS` key. Both pass (`npx jest ... -t "runPlan server announcement"` / `-t "plans HOSTNAME"`, see Gates).

2. **[INFO] Q2 — port/PID resolution correct; the exactly-two-listener case could not be provoked on this Windows machine.**
   Independent probe (own script, not from the diff): a `net.createServer` listening on an ephemeral port resolved via `listeningPortOwner(port)` to the exact same `process.pid` (`SERVER_PID 40896 PORT 55793` / `RESOLVED_PID 40896 MATCH true`). A port with no listener throws `MachineSnapshotError`/`SNAPSHOT_UNAVAILABLE` (`ERROR MachineSnapshotError SNAPSHOT_UNAVAILABLE port 58193 listeners: `). I attempted to provoke the "two owners" branch by spawning two separate Node processes each calling `net.createServer(...).listen({port, exclusive:false})` on the same port: the second process's `listen` call failed with `EADDRINUSE` (Windows does not let two independent processes share a listening socket the way `cluster` workers inside one process can), so **I could not provoke the two-listener state** — noting this per the charter's "if not, say so." The code path (`machine-idle.mjs:606-612`, `pids.size !== 1` check) does implement the guard; it is simply untested against real OS state here. Ordering: `runPlan` (core.cjs:294-317) uses `Promise.allSettled([exit, announceServer(...)])`, which by definition cannot resolve until *both* promises settle — so any `announceServer` rejection (e.g. `MachineSnapshotError`) is only observed by the caller after the `exit` promise has also settled, i.e. after the child has already exited. This is a structural guarantee, not a race, and it's corroborated empirically: the "missing enumeration tool" test's child process calls `setTimeout(() => {}, 1000)` before exiting, and the jest run of that test took 1147 ms (proportional to the ~1 s keep-alive), meaning `runPlan` genuinely waited for the child. Both new tests pass (`npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts -t "runPlan server announcement"`: `2 passed`). The printed line `GM2P_SERVER port=<n> pid=<n>` is matched by the test's own regex `/^GM2P_SERVER port=(\d+) pid=(\d+)$/gm`, and `announceServer` (core.cjs:327-337) returns immediately after its single `process.stdout.write`, so it is printed exactly once.

3. **[INFO] Q3 — lint:units reproduced exactly; the relative-vs-absolute ignore-path claim reproduced bit-for-bit.**
   `npm run lint:units` on the head:
   ```
   LINT_UNITS_PATH e2e files=194 findings=50 ceiling=50 PASS
   LINT_UNITS_PATH scripts files=186 findings=50 ceiling=50 PASS
   LINT_UNITS_PATH src/pages/api files=97 findings=16 ceiling=16 PASS
   LINT_UNITS_PATH src-tests files=3203 findings=17782 ceiling=17782 PASS
   LINT_UNITS_PASS 17898/17898
   ```
   Direct `node scripts/qc/lint-units.mjs` wall time: `real 0m0.987s` (well under any meaningful CI budget). Running from a different cwd (`cd ..`, invoking the script by absolute path) breaks the hardcoded `'src'` target in `LINT_ARGS_BY_PATH` (`scripts/qc/lint-units.mjs:439-447`) — reproduced: `LINT_UNITS_PATH src-tests files=0 findings=0 ceiling=17782 FAIL` / `LINT_UNITS_FAIL 0/17898`. Directly reproduced the receipt's relative-vs-absolute claim by invoking oxlint by hand with each ignore-path form (same config, same target): relative `--ignore-path` → `files 3203, diagnostics 17782`; absolute `--ignore-path` → `files 2670, diagnostics 10500` — matches the code comment (`scripts/qc/lint-units.mjs:430-437`) exactly. Also reproduced the comment's third claim: `--ignore-pattern` with the same negation patterns → `files 0, diagnostics 0`. `node scripts/qc/lint-units.mjs --path no-such-path` → `LINT_UNITS_PATH no-such-path files=0 findings=0 ceiling=none FAIL`, `LINT_UNITS_FAIL 0/17898`, exit 1.

4. **[INFO] Q4 — ratchet is at-or-under, not equality; CI cross-platform ignore-anchoring is UNVERIFIED.**
   `evaluateLintUnits`/`pathFails` (`scripts/qc/lint-units.mjs:466-486`) fail only when `findings > ceiling` (path or total); the pre-existing table test (`scripts/__tests__/lint-units.test.ts:129-140`) pins `[PASS,99,100]`, `[FAIL,101,100]`, `[PASS,0,0]`, `[FAIL,1,0]` — a lower finding count than the ceiling passes (raised-ceiling case), one over fails (lowered-ceiling case); there is no equality assertion. The jest ratchet row `holds every default path and the total at or under its ceiling` (lines 231-259) filters for `verdict !== 'PASS' || files===0 || findings>ceiling` and expects `[]`, which likewise never requires equality. Wall time measured twice: `944 ms` and `1874 ms` (`npx jest scripts/__tests__/lint-units.test.ts -t "holds every default path"`). `node_modules/oxlint/package.json` version is `1.43.0`, matching the comment. **UNVERIFIED**: whether oxlint's relative-`--ignore-path` anchoring behaves identically on Linux (CI's runner OS) — I only measured this on this Windows machine; I did not read oxlint's source for its path-anchoring implementation, so I cannot confirm or refute cross-platform parity here.

5. **[REQUIRED] Q5 — U96 (already on origin/main) breaks the src-tests ceiling; must be re-measured before/at this unit's merge.**
   Scratch-merged `origin/main` (which carries U96, commit `5d19d95a`) into the reviewed head via `git merge --no-commit --no-ff origin/main` — merged cleanly, no conflicts. On that scratch tree:
   ```
   LINT_UNITS_PATH e2e files=194 findings=50 ceiling=50 PASS
   LINT_UNITS_PATH scripts files=186 findings=50 ceiling=50 PASS
   LINT_UNITS_PATH src/pages/api files=97 findings=16 ceiling=16 PASS
   LINT_UNITS_PATH src-tests files=3205 findings=17783 ceiling=17782 FAIL
   LINT_UNITS_FAIL 17899/17898
   ```
   The jest ratchet row also fails on the merged tree: `expect(received).toEqual([])` receives `[{ target: "src-tests", files: 3205, findings: 17783, ceiling: 17782, verdict: "FAIL" }]` (`npx jest scripts/__tests__/lint-units.test.ts -t "holds every default path"`: `1 failed`). **U96's two new + two edited test files under `src/**/__tests__` and `src/__tests__` push src-tests from 3203→3205 files and 17782→17783 findings, one over the recorded ceiling.** Merge aborted immediately after (`git merge --abort`); confirmed back at `e344c2db9` with clean `git status --short`. **Required action, per the charter's own instruction: `scripts/qc/lint-units.ceiling.json`'s `src-tests` perPath value (and the total) must be re-measured against the post-U96 tree before or as part of merging this unit** — otherwise the very next `jest scripts` run on `main` after both units land goes red.

6. **[INFO] Q6 — red reproduced exactly.**
   Restored the baseline's 4 product files (`scripts/qc/gm-two-player-campaign-core.cjs`, `machine-idle.mjs`, `lint-units.mjs`, `lint-units.ceiling.json`) via `git checkout 738e5466f -- <paths>`; sha256 of each matched the receipt's stated baseline hashes exactly (`5547462...`, `436d862...`, `c20f52b...`, `0d2bf2f...` prefixes). Ran `node node_modules/jest/bin/jest.js scripts/__tests__/gm-two-player-campaign-qc.test.ts` → `Tests: 4 failed, 14 passed, 18 total`; `... lint-units.test.ts` → `Tests: 10 failed, 23 passed, 33 total` — both exactly matching the `u40-red-20260926.json` receipt's `totals`. Restored the head versions via `git checkout e344c2db9 -- <paths>`; sha256 of each matched the head-recorded values exactly, and `git status --short` was empty.

7. **[INFO] Q7 — independent mutant (M5, not M1-M4): dropping `src/pages/api` from `DEFAULT_PATHS`.**
   Saved a copy of `scripts/qc/lint-units.mjs`, sha256'd it, changed `DEFAULT_PATHS` (line 28) from `['e2e', 'scripts', 'src/pages/api', 'src-tests']` to `['e2e', 'scripts', 'src-tests']`. Direct CLI run: `LINT_UNITS_PASS 17882/17898` — **passes silently**, the CLI alone has no way to notice a whole path went missing since the total ceiling is unaffected by fewer findings. The jest ratchet row does catch it: `expect(rows.map(row => row.target).sort()).toEqual(Object.keys(recorded.perPath).sort())` fails, showing `- "src/pages/api"` missing from the received array (`npx jest ... -t "holds every default path"`: `1 failed`). Restored the file from the saved copy; sha256 after matched sha256 before (`c033e89a...`), and `git status --short` was empty. This confirms the target-list equality check is load-bearing — it, not the CLI's own total-ceiling logic, is what would catch a future edit that silently drops a default path.

8. **[INFO] Q9 — comments checked against the code beneath them; no overclaims found.**
   Every new/changed function comment in the diff (`runPlan`, `announceServer`, `isListening`, `listeningPortOwner`, the `DEFAULT_PATHS`/`LINT_ARGS_BY_PATH` block comments, `pathFails`, `evaluateLintUnits`, `runOxlint`, `main`, and the ceiling file's `"note"` field) was checked against the code and, where measurable, against a live run: the `DEFAULT_PATHS` comment's four measured counts (e2e 194/50, scripts 186/50, src/pages/api 97/16, src-tests 3203/17782) match `npm run lint:units`'s head output exactly; the `main` comment's claim "or of every path when only the total failed" was independently verified by forcing a total-only failure (`--ceiling 1`): all 4 paths individually PASS, `LINT_UNITS_FAIL 17898/1`, and `LINT_UNITS_ROW` count is 17898 (every path's diagnostics printed, not just a failing path's). No AI attribution in the commit message or diff; no absolute machine paths in the diff (`grep -iE "E:\\\\|C:\\\\Users|/e/Projects|/home/"` on the diff: no matches).

## Gates

| Gate | Command | Result |
|---|---|---|
| runPlan/HOSTNAME focused tests | `npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts -t "runPlan server announcement"` | `Tests: 16 skipped, 2 passed, 18 total`, exit 0 |
| HOSTNAME-plan focused test | `npx jest ... -t "plans HOSTNAME"` | `Tests: 17 skipped, 1 passed, 18 total`, exit 0 |
| `jest scripts` (full) | `npx jest scripts --ci` | `Test Suites: 80 passed, 80 total` / `Tests: 10 skipped, 1259 passed, 1269 total`, `Time: 177.531 s`, exit 0 |
| `jest src/__tests__/unit/evidence` | `npx jest src/__tests__/unit/evidence --ci` | `Test Suites: 2 passed, 2 total` / `Tests: 18 passed, 18 total`, exit 0 |
| `tsc --noEmit` | `npx tsc --noEmit` | no output, exit 0 (44.05 s wall) |
| `oxlint` | `npx oxlint` | `Found 84 warnings and 0 errors.`, exit 0 |
| `oxfmt --check` (6 changed tracked files) | `npx oxfmt --check <6 files>` | `All matched files use the correct format.`, exit 0 |
| `lint:units` | `npm run lint:units` | `LINT_UNITS_PASS 17898/17898`, exit 0 |
| `qc:openspec-ci:validate` | `npm run --silent qc:openspec-ci:validate` | `errors=0`, exit 0 |
| roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows`, exit 0 |

All figures match the implementer's `u40-local-20260926.json` receipt exactly.

## Cap

- Files touched: 7, all under `scripts/qc/` or `scripts/__tests__/` — within `ownershipPaths` and the unit's `maxFiles: 15`.
- Product lines changed: 242 (206 added, 36 removed) — under `maxNonGeneratedLines: 500`.
- No AI attribution, no absolute machine paths (checked in Finding 8).
- Cleanup: `[System.IO.Directory]::Delete('...\\worktrees\\u40-review\\node_modules')` then `git worktree remove --force .../worktrees/u40-review` — run at the end of this session (see final commands below); root checkout and the u40/u92/u96 worktrees were never touched.

## Verdict rationale

The unit's own code is correct and narrowly scoped: the HOSTNAME chain is airtight end-to-end (Finding 1), the port/PID announcement and its typed-error path behave as documented and as independently probed (Finding 2), the lint:units widening and its ignore-path anchoring reproduce bit-for-bit (Finding 3), the ratchet is genuinely at-or-under rather than equality (Finding 4), red and a from-scratch mutant both reproduce cleanly (Findings 6-7), every gate is green and matches the receipt (Gates table), and every changed comment holds up against the code and live measurement (Finding 8). That alone would be APPROVE.

However, Finding 5 is a real, reproduced integration hazard exactly where the charter said to look: U96, which is already on `origin/main`, pushes `src-tests` findings from 17782 to 17783 (one over the recorded ceiling) and files from 3203 to 3205. A scratch merge of `origin/main` into this unit's head fails both the CLI (`LINT_UNITS_FAIL 17899/17898`) and the jest ratchet row. Because U40's own ceiling file is silent about this and the unit does not touch it as part of resolving it, merging U40 as-is, once U96 is already on `main`, will turn `jest scripts` red on `main` the moment both are present together — this is not a hypothetical, it's a reproduced fact on this exact pairing of heads. Per the charter's explicit instruction ("If over, the ceiling must be re-measured before this unit merges: say so as a REQUIRED edit"), this is called out as a REQUIRED edit, hence APPROVE-WITH-REQUIRED-EDITS rather than a plain APPROVE.

## Delta review (head aa1b6b9ea6aa7220c2757c29ed3451281412cc5b)

reviewedHeadDelta: aa1b6b9ea6aa7220c2757c29ed3451281412cc5b

### Setup

- `git -C E:/Projects/MekStation fetch origin` — no new output (already current).
- `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u40-review2 aa1b6b9ea6aa7220c2757c29ed3451281412cc5b` — succeeded, HEAD at `aa1b6b9ea chore(qc): lint:units ceilings re-measured on the merge base (src tests 17783 after U96); the DEFAULT_PATHS comment points at the ceiling file instead of carrying counts`.
- `New-Item -ItemType Junction ... node_modules -> E:\Projects\MekStation\node_modules` — succeeded.
- `npm_config_dry_run=true` exported before every npm invocation; Node 22.22.0 via the pinned PATH (`node -v` → `v22.22.0`).
- `node scripts/qc/machine-idle.mjs --wait --timeout-ms 1800000` → `MACHINE_IDLE`, exit 0, run before the full `npx jest scripts` invocation.
- No `npm install/ci/prune`, no build, no Playwright, no other worktree touched (u40's own worktree, u92, u96 untouched). Only the same lowered-ceiling mutation-and-restore probe from Q4 (sha256-verified restore) was performed on this worktree's copy of `scripts/qc/lint-units.ceiling.json`.
- Worktree and junction removed at the end of this session (see Cleanup below).

### Q1 — diff scope

`git diff e344c2db942e5dc5267658bb89e82c3011136a2c..aa1b6b9ea6aa7220c2757c29ed3451281412cc5b -- scripts` (full diff, no truncation):

```diff
diff --git a/scripts/qc/lint-units.ceiling.json b/scripts/qc/lint-units.ceiling.json
index 44874bdd9..21c2b45f5 100644
--- a/scripts/qc/lint-units.ceiling.json
+++ b/scripts/qc/lint-units.ceiling.json
@@ -1,11 +1,11 @@
 {
-  "ceiling": 17898,
-  "measuredAt": "738e5466fd934d01e8dfeb61f9faf15d7a291fa1",
+  "ceiling": 17899,
+  "measuredAt": "1f11f4055419c998ff097144480af740efeacfc6",
   "note": "Ceilings, not pins: each perPath value is the finding count measured at measuredAt on 2026-09-26; lint:units fails above it and passes at or below it.",
   "perPath": {
     "e2e": 50,
     "scripts": 50,
     "src/pages/api": 16,
-    "src-tests": 17782
+    "src-tests": 17783
   }
 }
diff --git a/scripts/qc/lint-units.mjs b/scripts/qc/lint-units.mjs
index 7dcc22444..c53417307 100644
--- a/scripts/qc/lint-units.mjs
+++ b/scripts/qc/lint-units.mjs
@@ -20,10 +20,9 @@ const UNITS_CONFIG = path.join(moduleDirectory, 'oxlint-units.json');
 const CEILING_FILE = path.join(moduleDirectory, 'lint-units.ceiling.json');
 /**
  * The paths linted by default, each hidden from `npm run lint` by the root
- * config's ignorePatterns. The perPath ceilings in lint-units.ceiling.json
- * are the counts measured on 2026-09-26 at 738e5466f: e2e 50 findings
- * (194 files), scripts 50 (186), src/pages/api 16 (97), src-tests 17782
- * (3203).
+ * config's ignorePatterns. The perPath ceilings live in lint-units.ceiling.json
+ * with the commit they were measured at (`measuredAt`); this comment carries
+ * no counts, so it cannot drift from that file.
  */
 const DEFAULT_PATHS = ['e2e', 'scripts', 'src/pages/api', 'src-tests'];
```

This is exactly the two changes the charter names: `scripts/qc/lint-units.ceiling.json`'s `ceiling` → 17899, `measuredAt` → `1f11f4055419c998ff097144480af740efeacfc6`, `src-tests` → 17783; and the `DEFAULT_PATHS` comment in `scripts/qc/lint-units.mjs` reworded to drop the stale counts and point at the ceiling file. No other file under `scripts` is touched (`git diff ... -- scripts` above is the complete output — two files only).

Rebase-carried-unchanged check, `git diff 1f11f4055419c998ff097144480af740efeacfc6..aa1b6b9ea6aa7220c2757c29ed3451281412cc5b --stat`:

```
 .../__tests__/gm-two-player-campaign-qc.test.ts    | 121 ++++++++++++++++++++-
 scripts/__tests__/lint-units.test.ts               |  97 ++++++++++++++++-
 scripts/qc/gm-two-player-campaign-core.cjs         |  67 ++++++++++--
 scripts/qc/lint-units-src-tests.ignore             |   9 ++
 scripts/qc/lint-units.ceiling.json                 |   9 +-
 scripts/qc/lint-units.mjs                          | 118 +++++++++++++++-----
 scripts/qc/machine-idle.mjs                        |  38 +++++++
 7 files changed, 421 insertions(+), 38 deletions(-)
```

Same 7 files as the original review's `git diff --numstat 738e5466f..e344c2db9` list, and nothing else — the rebase carried the earlier product change unchanged, then this delta's two files were layered on top of it. (Note: `git diff e344c2db9..aa1b6b9ea` with no path filter also shows the U96 files and roadmap/evidence JSON, because `e344c2db9` predates the rebase onto `main` and `aa1b6b9ea` postdates it — those are U96's own already-merged files riding along on the rebase, not new edits by this unit; the `-- scripts` filtered diff above is the actual U40 delta.)

### Q2 — gates on the head

`npm run lint:units`:
```
LINT_UNITS_PATH e2e files=194 findings=50 ceiling=50 PASS
LINT_UNITS_PATH scripts files=186 findings=50 ceiling=50 PASS
LINT_UNITS_PATH src/pages/api files=97 findings=16 ceiling=16 PASS
LINT_UNITS_PATH src-tests files=3205 findings=17783 ceiling=17783 PASS
LINT_UNITS_PASS 17899/17899
```

| Gate | Command | Result |
|---|---|---|
| `jest scripts` (full) | `npx jest scripts --ci` | `Test Suites: 80 passed, 80 total` / `Tests: 10 skipped, 1259 passed, 1269 total`, `Time: 169.75 s` (wall `real 2m54.274s`), exit 0 |
| `tsc --noEmit` | `npx tsc --noEmit` | no output, exit implied by empty output; `real 0m44.594s` |
| `oxlint` | `npx oxlint` | `Found 84 warnings and 0 errors.` (matches the charter's expected 84) |
| `oxfmt --check` (2 changed files) | `npx oxfmt --check scripts/qc/lint-units.ceiling.json scripts/qc/lint-units.mjs` | `All matched files use the correct format.` |
| `qc:openspec-ci:validate` | `npm run --silent qc:openspec-ci:validate` | `[qc:openspec-ci] workflowContracts=8/8 workflowJobContracts=1/1 aggregatorNeeds=19/19 protectedContexts=4 packageScripts=3/3 activeOpenSpecChanges=9 accountedActiveOpenSpecChanges=9 errors=0` |
| roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` |

All figures match the head's `lint:units` output and the charter's expectations exactly.

### Q3 — the one new src-test finding (rules-of-hooks, U96's file)

`npx oxlint -c scripts/qc/oxlint-units.json --ignore-path scripts/qc/lint-units-src-tests.ignore src` (the same argv `lint-units.mjs` uses for `src-tests`) reproduces exactly one finding at the cited location:

```
x eslint-plugin-react-hooks(rules-of-hooks): React Hook "useCampaignStore" is called in function "advanceOnce" that is neither a React function component nor a custom React Hook function. React component names must start with an uppercase letter. React Hook names must start with the word "use".
   ,-[src/stores/campaign/__tests__/useCampaignStore.coopDayAdvanceOrder.test.ts:195:17]
193 |  */
194 | async function advanceOnce(answer: 'commit' | 'refuse') {
     :                ^^^^^|^^^^^
     :                     `-- Outer function
195 |   const store = useCampaignStore();
     :                 ^^^^^^^^|^^^^^^^^
     :                         `-- Hook is called here
196 |   store.getState().createCampaign('U96 Day Co.', 'mercenary', undefined, {
```

**False positive, not a real defect.** Read `src/stores/campaign/useCampaignStore.ts:171-183`: `useCampaignStore` is not a React hook at all — it is a plain memoized singleton accessor (`export function useCampaignStore(): StoreApi<CampaignStore> { if (!campaignStoreInstance) { campaignStoreInstance = createCampaignStore(); ... } return campaignStoreInstance; }`) that returns a vanilla `StoreApi` object (with `.getState()`/`.setState()`), calling no React hook internally (no `useState`/`useEffect`/`useSyncExternalStore` in its body). It only trips `eslint-plugin-react-hooks`'s name-based heuristic because it starts with `use`. Calling it inside the test helper `advanceOnce` (a plain async function, not a component) is exactly how the rest of the test file uses it (`store.getState().createCampaign(...)`, `store.getState().advanceDay()`) and is safe at runtime — there is no React dispatcher/render context involved. This is U96's file (`src/stores/campaign/__tests__/useCampaignStore.coopDayAdvanceOrder.test.ts`), not this unit's, so per the charter it is reported as a finding, not an edit.

### Q4 — ratchet row still passes; lowered-ceiling failure still names the path

`npx jest scripts/__tests__/lint-units.test.ts -t "holds every default path"`:
```
√ holds every default path and the total at or under its ceiling (976 ms)
Tests:       32 skipped, 1 passed, 33 total
Time:        1.632 s, estimated 11 s
```
(`real 0m3.925s` wall including jest startup.) The row passes on this head.

Lowered-ceiling mutation: sha256 of `scripts/qc/lint-units.ceiling.json` before mutation: `fb68b3759ce5a5f03cc95476e5300553411c9fcaedbd6121b575bdd937a85219`. Set `src-tests` back to 17782 and `ceiling` back to 17898 (the pre-U96 values), then `npm run lint:units`:
```
LINT_UNITS_PATH e2e files=194 findings=50 ceiling=50 PASS
LINT_UNITS_PATH scripts files=186 findings=50 ceiling=50 PASS
LINT_UNITS_PATH src/pages/api files=97 findings=16 ceiling=16 PASS
LINT_UNITS_PATH src-tests files=3205 findings=17783 ceiling=17782 FAIL
...
LINT_UNITS_FAIL 17899/17898
```
exit 1. The failure line names the path explicitly: `LINT_UNITS_PATH src-tests files=3205 findings=17783 ceiling=17782 FAIL`. Restored `scripts/qc/lint-units.ceiling.json` from the pre-mutation copy; sha256 after restore: `fb68b3759ce5a5f03cc95476e5300553411c9fcaedbd6121b575bdd937a85219` (matches exactly); `git status --short` on the worktree is empty.

### Cleanup

- `git status --short` and `git diff --stat` on the worktree: both empty before teardown.
- `[System.IO.Directory]::Delete('E:\Projects\MekStation\.sisyphus\roadmap-completion-20260912\worktrees\u40-review2\node_modules')` then `git -C E:/Projects/MekStation worktree remove --force .sisyphus/roadmap-completion-20260912/worktrees/u40-review2` — run at the end of this session; root checkout and the u40/u92/u96 worktrees were never touched.

### Verdict rationale (delta)

The delta is exactly the two-file re-measure the charter described: the ceiling file's `ceiling`/`measuredAt`/`src-tests` values now match the post-rebase (post-U96) tree, and the stale `DEFAULT_PATHS` comment no longer carries counts that could drift. `npm run lint:units` now passes 17899/17899 with `src-tests` at its new 17783/17783, closing the exact gap Finding 5 identified (the prior head's `LINT_UNITS_FAIL 17899/17898` no longer reproduces on this head — it now reads `LINT_UNITS_PASS 17899/17899`). Every gate from the original review reproduces green again (`jest scripts` 1259 passed/10 skipped, `tsc --noEmit` clean, `oxlint` 84 warnings/0 errors, `oxfmt --check` clean, openspec validator 0 errors, roadmap validator PASSED). The ratchet row still enforces at-or-under (not equality) and the lowered-ceiling mutation still fails naming the exact path, confirming the ratchet's behavior is unchanged by this delta. The one new src-test lint finding (rules-of-hooks on `useCampaignStore`) is a false positive in U96's own file, out of scope for this unit, and does not block this review. With the required edit from the prior review now satisfied and no new defect introduced by the delta itself, the unit as a whole is APPROVE.

Verdict (delta): APPROVE
