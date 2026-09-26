# Lane A review: U86

reviewedHead: e5bca95c92124017deaf7a86906bda82f0da2996
baseline: 8a025218e86abecba28138368d22975151a82422
reviewerModel: claude-sonnet (Agent model: sonnet, lean-worker)

Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` (ran; no error).
- Created a detached review worktree at the exact reviewed head: `git worktree add --detach E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u86-review e5bca95c92124017deaf7a86906bda82f0da2996` (HEAD confirmed `e5bca95c9` by `git rev-parse HEAD`).
- Junctioned `node_modules` from the root checkout via PowerShell `New-Item -ItemType Junction`.
- `npm_config_dry_run=true` exported for every npm/node invocation; no `npm install`/`ci`/`prune` run.
- Node 22 confirmed: `node --version` -> `v22.22.0`.
- `E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/PARENT-PROOF-HOLD` checked absent before every build and every Playwright run (7 checks total, all absent).
- `node scripts/qc/machine-idle.mjs --wait --timeout-ms 1800000` printed `MACHINE_IDLE` (exit 0) before the build and before each of the 5 Playwright runs.
- Never touched the root checkout or the implementer's `worktrees/u86`, `worktrees/u92`, `worktrees/u96` worktrees (verified only by not `cd`-ing into or writing to them; all edits were made under `worktrees/u86-review` and reverted with `git checkout --`, confirmed clean by `git status --short` with no output at the end).
- Cleanup performed at the end of this review (see final section).

## Files on the range

`git diff --numstat 8a025218e86abecba28138368d22975151a82422..e5bca95c92124017deaf7a86906bda82f0da2996`:

```
136  47  e2e/gm-two-player-performance.pack.spec.ts
2    0   e2e/types/window.d.ts
73   1   src/__tests__/api/e2ePerformanceProbeRoute.test.ts
40   4   src/pages-modules/api/e2ePerformanceProbeRoute.ts
```

One commit on the branch: `e5bca95c9 test(e2e): the performance pack waits for the authority own convergence answer through the probe route and names a CAMPAIGN_NOT_CONVERGED refusal`.

## Findings

1. **[info] Probe route guard, leak, matchId validation, null handling — src/pages-modules/api/e2ePerformanceProbeRoute.ts:64-101.** The `matchId`-driven `convergence` read sits inside the same `handler` after the same `isAuthorizedE2ERequest` check that gates the whole route (line ~64: `if (!isAuthorizedE2ERequest(req)) { res.status(404)...}` runs before `matchId`/`convergence` are computed) — same guard, no bypass. It answers exactly `entry.syncSession.evaluateScenarioLaunch()`'s own return value (type `CampaignProgressionGate`, `src/lib/multiplayer/server/CampaignProgressionGate.ts:101-119`), so it exposes participant ids and acknowledged revisions only because that IS the authority's own answer to the same question the AdvanceDay gate asks — it forwards, it does not compute anything additional. `matchId` is read via `firstQueryValue` (accepts any string; no format/shape validation) and used only as a `Map` key through `getCampaignHostRegistry().get(matchId)`, so an unknown or malformed id is a safe miss, not a crash or injection surface. Missing `matchId` -> `convergence` key entirely **omitted** from the response (confirmed by the `omits convergence when no match is named` test and by reading the `...(convergence === undefined ? {} : { convergence })` spread). Unknown `matchId` -> `convergence: null` (confirmed by the `answers null for a match the process holds no campaign session for` test). Ran the route suite; the "behind" row: `√ answers the AdvanceDay gate: behind until the participant acknowledges the head (56 ms)` (9/9 passed, see Gates).

2. **[info] converge() — e2e/gm-two-player-performance.pack.spec.ts:702-736 (head).** Polls `GET /api/e2e/performance-probe?matchId=<address.matchId>` with the run's e2e token, on intervals `[10, 10, 25, 50, 100]` (capped at the last value), timeout `FIXTURE.functionalWaitMs * 5` = `2_000 * 5` = `10_000` ms (confirmed `functionalWaitMs: 2_000` at `src/lib/multiplayer/performance/controlledLoopbackFixture.ts:79`). It asserts `response.status() === 200` on every poll and returns `gate.requiredRevision` only when `gate.ok === true` and `requiredRevision` is a number; on timeout it throws naming the wait and `JSON.stringify(last)` (the last answer). All three baseline `waitForSequence` call sites were converted to the new 4-arg signature `(page, sequence, gmPage, intentId)`: warm-up `:173-178`, measured `:211-216`, and the tail builder `:286` (`await waitForSequence(gm.page, before + 1, gm.page, intentId)`) — confirmed by `grep -n "waitForSequence"` showing 3 call sites, all 4-arg, and no remaining `waitForTimeout(25)` anywhere in the file (`grep` returned no match). The tail builder never called `converge()` in the baseline or the head (`AllocateSalvage` is never gated), so its `waitForSequence` call is not the same race as `converge()`'s — it is a functional paint-timeout wait that now additionally reads the GM transport's captured refusals, which is a strict improvement (a refused command in that loop now fails at once naming the refusal instead of only timing out).

3. **[info] Capture chain — file:line, confirmed end to end.** `bindCampaignSyncConnection.ts:748-758` gates `AdvanceDay` through `refuseUnconvergedProgression` (`:700-718`), which calls `entry.syncSession.evaluateScenarioLaunch()` (`CampaignSyncSession.ts:753-777`, the same function the probe route reads) and on refusal sends `errorFrame(matchId, 'CAMPAIGN_NOT_CONVERGED', formatCampaignProgressionRefusalReason(gate), correlationId)` where `correlationId` is `envelope.intent.intentId` (passed at `:754`). `errorFrame` (`:1550-1564`) puts that value into the frame's `intentId` field, matching `ErrorMessageSchema` (`src/types/multiplayer/Protocol.ts:806-849`, `intentId: z.string().min(1).optional()`). The GM's client transport (`src/lib/campaign/coop/campaignSyncTransport.ts`) parses every server message through `parseServerMessage` (`:354-361`, validated against `ServerMessageSchema` which includes `ErrorMessageSchema` at `Protocol.ts:1011`) and broadcasts it to every `onFrame` listener (`:228`, `listeners.forEach((handler) => handler(message))`) **before** it sends the frame's `CampaignAck` (`:244`, only reached for `CampaignEvent`/`CampaignSnapshot` kinds, never for `Error`). The pack's `observerScript` (`e2e/gm-two-player-performance.pack.spec.ts:477-496`) registers on `transport.onFrame` and, when `record.kind === 'Error'`, pushes `{code, reason, intentId}` into `refusals`. `installObserver` (called for every client, including the GM, at `:147`) runs **before** the warm-up loop (`:163+`), which runs before any measured command — confirmed by reading the test body: `for (const client of everyone) await installObserver(...)` at line 147 precedes the warm-up `for` loop that starts at line 163. `waitForSequence`'s `readRefusal` (`:668-680`) reads `window.__PERFORMANCE_OBSERVER_STATE__.refusals` by `intentId` between polls and throws `` `${intentId} refused on the GM transport: ${refusal.code} (${refusal.reason}); no delivery reached ${sequence}` `` — this is a real read of the captured frame, not a timeout classification.

4. **[info, non-blocking] Charter path inaccuracy.** The charter's context-reading list names `src/lib/multiplayer/client/campaignSyncTransport.ts:200-240`; the file actually lives at `src/lib/campaign/coop/campaignSyncTransport.ts` (confirmed by `find . -iname campaignSyncTransport.ts`). This is a stale path in the charter/instructions, not a defect in the PR; the onFrame/CampaignAck ordering the charter asks about is real and is at that file's lines 228 and 244 as quoted in Finding 3.

5. **[info] Scope, caps, comments, attribution — all clean.** Every changed file is under `e2e/` or is one of the two ownership-path route files (`src/pages-modules/api/e2ePerformanceProbeRoute.ts`, `src/__tests__/api/e2ePerformanceProbeRoute.test.ts`); no file outside those paths is touched (`git diff --numstat` above lists exactly 4 files, all in scope). Product lines: only the route file counts as product per the unit's cap note; `git diff --numstat` shows 40 added / 4 removed there = 44, well under the 500-line cap; 4 files total, under the 15-file cap. `git log` on the range shows one commit with no AI-attribution phrasing; `git diff | grep -iE "E:\\\\Projects|C:\\\\Users|/home/|/Users/"` returned nothing — no absolute machine paths. Every added/changed function-level comment I checked states what the code actually does and matches the code beneath it: the route's handler doc (`:57-63`, matches the guard/404/405/200 branches read), `firstQueryValue`'s doc (matches its 3-branch body), `converge()`'s doc (matches the poll/timeout/throw body, verified against the actual `functionalWaitMs` constant), `waitForSequence`'s updated doc (matches the refusal-check-then-paint-check loop), `readRefusal`'s doc, `issueCommand`'s updated doc (`returns its intent id`, matches `return String(intent.intentId);`), and the `refusals` field doc in `e2e/types/window.d.ts` (matches the `{code, reason, intentId}[]` the observer actually pushes).

## Runs (all under `worktrees/u86-review`, HOSTNAME=127.0.0.1 process-scoped, `NODE_ENV=production node scripts/qc/run-gm-two-player-campaign.mjs --group=performance`; run id `qc-performance`, port derived from the server log)

Build (once, ahead of all runs): `NEXT_PUBLIC_E2E_MODE=true NEXT_PUBLIC_E2E_TEST=true npm run build` — exit 1 at the standalone hydration guard by design (`"Unsafe hydration destination (runtime loader tsx) contains a symlink or junction: .next\standalone\node_modules"`), preceded by `Compiled successfully`; `__E2E_MODE__` confirmed present in `.next/static/chunks/pages/_app-57752df63578994c.js`; `BUILD_ID` `1790430542660`.

| # | Spec variant | Result | Port | Refusal named |
|---|---|---|---|---|
| 1 | head, unedited (sha256 `7ea387e6...`) | `1 passed (5.7m)` | 23319 | none |
| 2 | head, unedited | `1 passed (5.6m)` | 23319 | none |
| 3 | OLD wait restored from baseline's `converge(pages)` (`8a025218e86abecba28138368d22975151a82422:e2e/gm-two-player-performance.pack.spec.ts`), capture kept (sha256 `67aa9b21...`) | `1 passed (5.5m)` | 23319 | none |
| 4 | OLD wait, same variant | `1 passed (5.6m)` | 23319 | none |
| 5 | head's `converge()` forced to return the probe's first answer at once, without waiting for `ok: true` (sha256 `3fcc44af...`) — Q5 forced-red reproduction | `1 passed (5.8m)` | 23319 | **none — did not reproduce a refusal** |

The spec file was restored to the exact head content (sha256 `7ea387e6af71bc44dd3d04c7942af6d06ff5658da8a715afd70b5f0b067d490a`, matching the pre-edit hash) via `git checkout --` after runs 3-4 and again after run 5; `git status --short` and `git diff --stat` are empty at the end of the review.

**Question 4's answer, in three lines:**
1. Runs 1-2 (head, new probe-route wait): 2 of 2 passed. Runs 3-4 (baseline's client-side-applied-plus-25ms wait, capture kept): 2 of 2 passed too.
2. No refusal was captured or named in any of the 4 runs, on either wait.
3. My runs do **not** distinguish the two waits: both passed every time in this lane, matching the implementer's own non-claim (`nonClaims` in `evidence/u86-local-20260926.json`: "the green 3 of 3 cannot be attributed to the converge change by these runs alone") and their M1 mutant result (old wait, 2 of 2 passed on their machine too) — the race is timing-dependent, not something a small number of runs reliably exercises either way.

**Question 5's answer:** forcing `converge()` to return the probe's first answer immediately (skipping the poll for `ok: true`) and running once did **not** reproduce a CAMPAIGN_NOT_CONVERGED refusal — the run passed (`1 passed (5.8m)`). This differs from the implementer's own single forced run (`F-on-1` in their local receipt), which did name the refusal. I ran this exactly once as instructed and did not retry to chase the expected failure; I report it as measured. Read together with Question 4, this reinforces that the underlying race (mode 1 in `evidence/uat-r1-diagnosis-20260925.json`) is real but not reliably reproduced by a single forced or unforced run in either direction — the pack's own 3-of-3 green bar (recorded by the implementer, not re-run identically by me beyond the 2 head runs above) is the strongest evidence the new wait is at least not worse, and the jest suite (Finding 1) is the reliable, deterministic proof that the probe route answers the authority's own gate correctly.

## Gates (all run in `worktrees/u86-review` at the reviewed head)

| Gate | Command | Exit | Last line / counts |
|---|---|---|---|
| jest qc runner | `npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts` | 0 | `Test Suites: 1 passed, 1 total; Tests: 15 passed, 15 total` |
| jest probe route | `npx jest src/__tests__/api/e2ePerformanceProbeRoute.test.ts` | 0 | `Test Suites: 1 passed, 1 total; Tests: 9 passed, 9 total`; "behind" row: `√ answers the AdvanceDay gate: behind until the participant acknowledges the head (56 ms)` |
| tsc | `npx tsc --noEmit` | 0 | (no output) |
| oxlint | `npx oxlint` | 0 | `Found 84 warnings and 0 errors. Finished in 1.0s on 3819 files using 16 threads.` |
| oxfmt --check (4 changed files) | `npx oxfmt --check e2e/gm-two-player-performance.pack.spec.ts e2e/types/window.d.ts src/__tests__/api/e2ePerformanceProbeRoute.test.ts src/pages-modules/api/e2ePerformanceProbeRoute.ts` | 0 | `All matched files use the correct format. Finished in 26ms on 4 files using 16 threads.` |
| lint:units | `npm run --silent lint:units` | 0 | `LINT_UNITS_PASS 100/100` |
| qc:openspec-ci:validate | `npm run --silent qc:openspec-ci:validate` | 0 | `[qc:openspec-ci] workflowContracts=8/8 workflowJobContracts=1/1 aggregatorNeeds=19/19 protectedContexts=4 packageScripts=3/3 activeOpenSpecChanges=9 accountedActiveOpenSpecChanges=9 errors=0` |
| roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | 0 | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` |

All gate counts and exit codes match the implementer's `evidence/u86-local-20260926.json` `gates` array exactly.

## Cap

4 files, all within the unit's ownership paths (`e2e`, `src/pages-modules/api/e2ePerformanceProbeRoute.ts`, `src/__tests__/api/e2ePerformanceProbeRoute.test.ts`); product lines 44 (40 added + 4 removed in the route file only) against a 500-line cap; 4 files against a 15-file cap. `reviewClasses: ["routine"]` — no Lane B owner ruling required (not authority/privacy/migration/replay/idempotency/concurrency class, not owner-gated).

## Verdict rationale

The probe route change is narrow, stays behind the pre-existing E2E guard, forwards the authority's own `evaluateScenarioLaunch` answer verbatim (no new leak), and is proven by a real registry-backed jest test (9/9, including the exact "behind" row). Every prior `waitForSequence` call site was converted to read the GM-transport refusal capture, and the capture chain from `refuseUnconvergedProgression`'s `errorFrame` through the client transport's `onFrame`-before-`CampaignAck` ordering to the pack's `observerScript` is verified file:line and installed before the first command of the run. All 7 requested gates pass with counts matching the implementer's own receipts exactly. Every changed function-level comment matches its code. Scope, caps, commit hygiene, and absolute-path checks are clean.

My own live measurement is weaker than the implementer's: my 2 head runs and 2 old-wait runs all passed (no run in this lane distinguished the two waits), and my single forced-refusal run did not reproduce CAMPAIGN_NOT_CONVERGED where the implementer's did. I report this as a genuine limit of a small number of runs against a timing-dependent race, not as a defect — the deterministic evidence (the jest suite's real registry-backed "behind" test, the unchanged AdvanceDay gate code path, and the capture chain traced end to end) independently proves the code does what the unit and the PR claim, without needing a live race to be caught. Nothing in the diff, the gates, or my reading contradicts the behavior sentence or the caveat measurement in the admission receipt (the shared-registry finding). This is APPROVE, not APPROVE-WITH-REQUIRED-EDITS, because there is no concrete edit I can name that the evidence calls for: the non-reproduction is a property of the race's timing dependence (already documented as such in the implementer's own non-claims), not a gap in this PR's code.
