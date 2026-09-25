# Lane A review: U22a
reviewedHead: ea9fd0656bad05ea35a8ab7df3a9c2eec4bee4e8
baseline: f32ea5400f3a1282733180059e32d9169fb74204
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` (no output).
- `git -C E:/Projects/MekStation worktree add --detach E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u22a-review ea9fd0656bad05ea35a8ab7df3a9c2eec4bee4e8` — succeeded, `HEAD is now at ea9fd0656`.
- `git worktree list` beforehand confirmed `E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u22a` was a pre-existing, non-detached checkout on the same branch (the implementer's own worktree) — never touched; all work here happened in the new `u22a-review` worktree.
- node_modules junctioned via PowerShell: `New-Item -ItemType Junction -Path '...\u22a-review\node_modules' -Target '...\MekStation\node_modules'` — succeeded.
- Node 22.22.0 confirmed (`node --version` → `v22.22.0`) via `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH`; `npm_config_dry_run=true` set for every npm/npx call. No `npm install/ci/prune` was run. No build, no Playwright, no commit, no push.
- Every probe below was written under this review worktree, run, then deleted; every file I mutated for a probe was restored via `git checkout ea9fd0656... -- <path>` and its sha256 verified equal to the value recorded in `evidence/u22a-local-20260923.json`'s `finalFileHashes` before finishing. Final `git status --short` is clean.
- A repo hook fired repeatedly with a canned "GRPC/PROTO operation detected — load proto-as-dto" message whenever a command touched a path containing the substring `Protocol.ts` (or `--check` ran over it). This is a false positive: `src/types/multiplayer/Protocol.ts` is the multiplayer WebSocket message zod-schema file, not a protobuf/gRPC contract, and this repo is not the AstraBit microservices repo the hook is written for. Per the standing instruction that hook feedback is system metadata and never derails in-progress work, I disregarded it and proceeded with the charter each time.

## Files on the range (`git diff --stat` baseline..head)

15 files changed, 2573 insertions(+), 20 deletions(-): 3 evidence receipts (`evidence/u22a-{admission,local,red}-20260923.json`) plus 12 source files — all 12 fall inside U22a's amended `ownershipPaths` (units.json, main@2199b53f6):

Product (6 files, independently re-summed with `git diff --numstat`, total **207 changed lines**, matches the local receipt exactly):
- `src/lib/multiplayer/server/MatchHostRegistry.ts` (+52/-14)
- `src/lib/multiplayer/server/ServerMatchHost.ts` (+48/-0)
- `src/lib/multiplayer/server/ServerMatchHostRewindRebuild.ts` (+10/-1)
- `src/types/multiplayer/Protocol.ts` (+9/-0)
- `src/lib/multiplayer/client.ts` (+33/-2)
- `src/hooks/useMultiplayerSession.helpers.ts` (+36/-2)

Test (6 files, 2 new, total **1031 changed lines**, matches the local receipt exactly):
- `src/lib/multiplayer/server/__tests__/MatchHostRegistry.globalSlot.test.ts` (new, +78)
- `src/lib/multiplayer/server/__tests__/ServerMatchHost.rewindLiveReplay.test.ts` (new, +726)
- `src/lib/multiplayer/server/__tests__/ServerMatchHost.rewindRebuild.test.ts` (+18/-1, existing assertion changed — see Finding 6/Q6 below)
- `src/types/multiplayer/__tests__/Protocol.test.ts` (+22/-0)
- `src/lib/multiplayer/__tests__/client.test.ts` (+85/-0)
- `src/hooks/__tests__/useMultiplayerSession.test.tsx` (+101/-0)

## Findings

### Finding 1 — MAJOR (disclosure, not a defect in the diff): the shared registry silently activates a real close-the-live-match path in an unrelated, untested route (Q4)

`src/pages/api/multiplayer/matches/[id].ts:120` (`DELETE`) has always called `getMatchHostRegistry().closeMatch(id)`. Before U22a the registry was module-local, so this call — running in Next's API module graph — could only ever see hosts that graph's own `bootstrapMultiplayerServer()` recovered into its own private `MatchHostRegistry` instance; it could never reach a host with real attached sockets, because sockets are only ever attached by the WS upgrade handler, which runs in `server.js`'s separate tsx graph. `closeMatch` is a no-op when `this.hosts.get(matchId)` misses (`MatchHostRegistry.ts:203-206`), so on the baseline this endpoint's `host.closeMatch()` (which sends every attached socket a `Close` frame and detaches it — `ServerMatchHost.ts:1052-1076`) never actually reached a live player's socket.

U22a's clause (1) makes the registry (and its recovery flag) one globalThis-shared instance (`MatchHostRegistry.ts:219-264`). That is exactly the fix the unit is chartered to make, and it is correct and necessary for clause (2)/(3) to work at all. But it has an un-charted, un-tested side effect: `DELETE /api/multiplayer/matches/:id` now reaches the **real** live host and **really disconnects every attached socket**, cross-module-graph, for the first time.

**Probe (written under this worktree, deleted after, product file restored + sha256-verified):** `src/lib/multiplayer/server/__tests__/u22aLaneAProbe.deleteRouteCrossGraph.test.ts` — two `jest.isolateModules` graphs stand in for the API graph and the socket graph, exactly as `MatchHostRegistry.globalSlot.test.ts` does. Graph A (`getOrCreate` + `attachSocket`, simulating the WS upgrade) attaches a real mock socket to a real seeded match. Graph B calls `closeMatch(matchId)`, simulating the DELETE route.

- On **head** (`ea9fd0656`): `console.log` → `U22A_PROBE_RESULT {"kinds":["Close"],"closed":true}`. The socket attached in graph A received a `Close` frame issued from graph B, and `host.isClosed()` is `true`. `Tests: 1 passed, 1 total`.
- On **baseline** `MatchHostRegistry.ts` swapped in (sha256 `4df7c94c...`), same test, same file otherwise: `U22A_PROBE_RESULT {"kinds":[],"closed":false}`. `Tests: 1 failed, 1 total` — the socket received nothing and the host was never closed.
- File restored via `git checkout ea9fd0656... -- src/lib/multiplayer/server/MatchHostRegistry.ts`; sha256 back to `c2f91cf7...` (equal to `finalFileHashes`); probe file deleted; `git status --short` clean.

**Caller check (Q4):** `grep -rn "api/multiplayer/matches" src` and a read of `server.js` found no `DELETE` caller anywhere in the UI or server code — the one `fetch(..., {method:'DELETE'})` hit (`src/components/campaign/share/CampaignSharePanelConnected.tsx:142`) targets a completely different endpoint (`/api/campaigns/.../grants`, a share-grant revoke). So this is currently a dead path in the product's own UI; nothing wires up to trigger it today.

**Boot recovery still exactly once per process (Q4, third part):** confirmed both by the shipped test (`MatchHostRegistry process slot › boot recovery sweeps once per process, whichever graph asks`, passing on head, failing 2-vs-1 on baseline — I ran it myself, see Gates) and by my own baseline/head comparison above.

**Why this is MAJOR but not blocking:** the new capability is arguably the *correct* behavior — it's what the route's own doc comment ("host-only close") already claimed — and no fog-hidden, private, or authority-only data is in the `Close` frame. It is not reachable by any current caller, so there is no live production exposure today. But this unit's review classes are `authority` and `replay`, the side effect is a real, previously-dormant match-teardown capability now live across process boundaries, and it is mentioned nowhere in the admission, red, or local receipts, and pinned by no test. I recommend it be filed as a disclosed finding (parallel to the unit's own `findingsReportedNotFixed` F1-F3) before or immediately after merge, with at minimum one regression test pinning "DELETE now closes the live host, if one is attached," so a future change can't silently re-break or silently rely on it.

### Finding 2 — MINOR / informational: a sibling module-local registry remains, off the rewind path (Q1)

`src/lib/multiplayer/server/CampaignHostRegistry.ts:405` still declares `let _singleton: CampaignHostRegistry | null = null;` — a plain module-local singleton, not the globalThis pattern this unit installs for `MatchHostRegistry`. `CampaignHostRegistry.ts` sits inside U22a's ownership path (`src/lib/multiplayer/server`) but is not on the rewind path: I grepped `src` and `server.js` and confirmed the rewind-commit route (`src/pages/api/matches/[id]/rewind-commit.ts` and `src/pages-modules/api/rewindCommitDeps.ts`) import neither `CampaignHostRegistry` nor anything that reaches it; it is only reached from campaign co-op join/sync code (`authorizeCampaignParticipation.ts`, `bindCampaignSyncConnection.ts`, `handleCampaignGrantJoin.ts`, `handleRoomCodeGuestJoin.ts`, `src/pages/api/multiplayer/matches/index.ts`). Not a defect in U22a's own behavior sentence, which never claims to touch it; flagged for a future consistency pass (this registry would have exactly U22a's original bug if a campaign-hosting route were ever split the same way across the two module graphs).

### Finding 3 — MINOR / informational: the raw SQLite handle is still split across the two module graphs, outside this unit's ownership (Q1)

`getSQLiteService()` (`src/services/persistence/SQLiteService.ts:242-250`) is built on `createSingleton()` (`src/services/core/createSingleton.ts:48-66`), a plain `let instance` module closure — **not** globalThis-backed. `src/pages/api/matches/[id]/rewind-commit.ts:67` and `src/pages-modules/api/rewindCommitDeps.ts:42` both call it directly for the journal/branch/private-record stores the commit route writes through. Since `src/services/persistence` is outside U22a's `ownershipPaths`, correctly not touched by this unit, but it means Next's API graph and server.js's tsx graph do hold two separate `better-sqlite3` `Database` handles onto the same file. This is not new: `getDefaultMatchStore.ts:29-41` already uses the identical `Symbol.for(...)` globalThis pattern this unit copies for `MatchHostRegistry`, and the admission receipt's own "PRODUCTION REALM" risk item already names the cross-graph SQLite question as an unmeasured inference. I re-derived the exact root cause (`createSingleton`'s closure, not globalThis) by code reading; I did not find anything that changes the admission's own risk disclosure, and it is out of scope for U22a to fix.

### Finding 4 — informational: the changed assertion in `ServerMatchHost.rewindRebuild.test.ts` is a replacement, not a superset, of the old one (Q6)

Before:
```ts
expect(host.viewerDeliveryIssuedForTests('gm-1')).toBe(0);
```
After:
```ts
const pushedNumbers = socket.sent
  .slice(sentBeforeRebuild)
  .filter((frame) => frame.parsed.kind === 'ReplayChunk')
  .flatMap((frame) => (frame.parsed as { readonly deliverySequences?: number[] }).deliverySequences ?? []);
expect(pushedNumbers.length).toBeGreaterThan(0);
expect(pushedNumbers).toEqual(pushedNumbers.map((_number, index) => index));
expect(host.viewerDeliveryIssuedForTests('gm-1')).toBe(pushedNumbers.length);
```
These are not "equal or stronger" in the sense of one implying the other — the old assertion is now **false** by design (the whole point of clause (2)/(3) is that something *is* now sent right after a rebuild), so it had to be replaced, not strengthened. Taken on its own terms the new version is a meaningful, non-tautological assertion: it pins that the pushed chunk's delivery numbers restart at exactly `0..n-1` (not an arbitrary or reused range) and that the durable per-viewer delivery count matches the pushed count exactly (ruling out both "old count kept" and "count off by one"). I ran this row against the baseline product code (see Q5/Finding 5) and confirmed it fails there for the right reason (nothing was pushed, so `pushedNumbers.length` is 0, failing `toBeGreaterThan(0)`).

### Finding 5 — informational: Q7 mutant is equivalent for the failure mode I chose, revealing a pre-existing second safety layer

I mutated `src/lib/multiplayer/server/ServerMatchHost.ts`'s `replayRebuiltStreamToAttachedViewers` to remove its `try { ... } catch (error) { logger.warn(...) }` wrapper around the per-socket `handleSessionJoin` call (a mutant not in the local receipt's M1-M6). Positive control: I added a temporary test to `ServerMatchHost.rewindLiveReplay.test.ts` that attaches a socket whose `.send()` throws, attached *before* a normal `joinedViewer(fixture.host, GUEST)` in iteration order, then asserts the guest still receives its full `ReplayStart`/`ReplayChunk`/`ReplayEnd` push after `rebuild(fixture)`. This passes on unmutated head (confirming the isolation the code claims). After removing the try/catch, **the same test still passed** — the mutant is equivalent for a socket-`send()` throw, because `ServerMatchHost.ts:1411`'s `safeSend` ("Send to a single socket, swallowing send errors... we don't want a single bad socket to throw out of the upgrade handler") already swallows exactly this failure mode one layer down, independent of the try/catch this unit added. This means the new catch block's own reachable failure surface is narrower than its doc comment implies (only a non-send throw inside `handleSessionJoin` — e.g. a `resolveJoinViewer` failure unrelated to sending — would exercise it), and nothing in this unit's suite exercises that narrower path either. This matches the local receipt's own disclosed non-claim ("Not tested: ... a push that throws (the catch path)"); I'm independently corroborating it, not raising new risk. Test file and product file both restored and sha256-verified afterward.

## Gates (charter list, run on `ea9fd0656` in the review worktree)

| Gate | Result | Exit |
|---|---|---|
| `npx jest src/lib/multiplayer/server` | `Test Suites: 160 passed, 160 total` / `Tests: 1178 passed, 1178 total` | 0 |
| `npx jest src/__tests__/api/matches` | `Test Suites: 3 passed, 3 total` / `Tests: 47 passed, 47 total` | 0 |
| `npx jest src/pages-modules/api` | `Test Suites: 8 passed, 8 total` / `Tests: 62 passed, 62 total` | 0 |
| `npx jest src/lib/multiplayer/__tests__ src/types/multiplayer/__tests__ src/hooks/__tests__/useMultiplayerSession*` (charter's literal globs) | `Test Suites: 18 passed, 18 total` / `Tests: 226 passed, 226 total` | 0 |
| same, with `src/lib/multiplayer/client` added (the local receipt's fuller glob — `src/lib/multiplayer/client/__tests__/` is a separate directory the narrower glob misses) | `Test Suites: 22 passed, 22 total` / `Tests: 295 passed, 295 total` — matches the local receipt exactly | 0 |
| `npx jest src/components/multiplayer` | `Test Suites: 12 passed, 12 total` / `Tests: 132 passed, 132 total` | 0 |
| cross-check: `npx jest src/pages-modules/multiplayer` (the local receipt's "extra" addend) | `Test Suites: 3 passed, 3 total` / `Tests: 23 passed, 23 total`; 12+3=15 suites, 132+23=155 tests — matches the local receipt's combined total exactly | 0 |
| `npx tsc --noEmit` | no output | 0 |
| `npx oxlint` | `Found 84 warnings and 0 errors.` | 0 |
| `npx oxfmt --check` (the 12 changed source+test files) | `All matched files use the correct format.` | 0 |
| `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| `npm run qc:openspec-ci:validate` | `[qc:openspec-ci] workflowContracts=8/8 workflowJobContracts=1/1 aggregatorNeeds=19/19 protectedContexts=4 packageScripts=3/3 activeOpenSpecChanges=9 accountedActiveOpenSpecChanges=9 errors=0` | 0 |
| `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

Every number above reproduces the local receipt's own claims exactly; I ran each command myself rather than trusting the receipt.

### Q1 — registry probe

`npx jest src/lib/multiplayer/server/__tests__/MatchHostRegistry.globalSlot.test.ts` on head: `PASS`, 3/3 (`two module graphs get one registry`, `boot recovery sweeps once per process, whichever graph asks`, `_resetMatchHostRegistry clears the shared slot for every graph`). I then swapped `MatchHostRegistry.ts` to the baseline blob (`git show f32ea540...:...> MatchHostRegistry.ts`, sha256 `4df7c94c...`) and reran the identical test file unmodified: `FAIL`, 3/3 failed — `Received number of calls: 2` (two recovery sweeps) and two distinct registry object identities, i.e. exactly "two instances on the baseline" as the charter asked me to show. Restored via `git checkout ea9fd0656... -- MatchHostRegistry.ts`; sha256 back to `c2f91cf7...`. "Anything else module-local on the rewind path" is answered by Findings 2 and 3 above: `CampaignHostRegistry.ts` (module-local, but off the rewind path) and `getSQLiteService`/`createSingleton` (module-local, on the write path but outside this unit's ownership, pre-existing, already disclosed as a risk).

### Q5 — red reproduction

Reverted all six product files to baseline (`git checkout f32ea5400... -- <6 product paths>`; sha256 of each matched the receipt's `finalFileHashes` before the revert). Ran the new+changed suites:
```
npx jest src/lib/multiplayer/server/__tests__/MatchHostRegistry.globalSlot.test.ts src/lib/multiplayer/server/__tests__/ServerMatchHost.rewindLiveReplay.test.ts src/lib/multiplayer/server/__tests__/ServerMatchHost.rewindRebuild.test.ts src/lib/multiplayer/__tests__/client.test.ts src/types/multiplayer/__tests__/Protocol.test.ts src/hooks/__tests__/useMultiplayerSession.test.tsx
```
Result: `Test Suites: 6 failed, 6 total` / `Tests: 12 failed, 77 passed, 89 total`. The 12 failing rows are exactly the red receipt's 11 (registry ×3, client marker row, Protocol schema row, hook mirror row, M1/M2/M4/privacy/route-reason rows) plus one additional row in `ServerMatchHost.rewindRebuild.test.ts` ("viewer past N is resynced from the new head and its cursor discarded" — the row Q6 is about), which fails against baseline product code because its *test* file is new/changed even though I reverted only product files, exactly as expected. Each failure is for its stated reason (schema strips the field, client ignores the marker, nothing is pushed, etc.) — not an import/fixture error. Restored all six files via `git checkout ea9fd0656... -- <6 paths>`; sha256 of each verified equal to `finalFileHashes`; `git status --short` clean.

## Cap

- Files: 12 product+test files, all inside U22a's amended `ownershipPaths` (units.json main@2199b53f6) + 3 evidence receipts = 15 total, at the charter's "at most 15." Product+test files alone (the cap-relevant count per the local receipt's own accounting) = 12, well inside.
- Product lines: 207 (independently re-summed via `git diff --numstat`), inside the 500 cap.
- Test lines: 1031, reported separately per `OD-line-cap-product-lines` and not counted against the cap.
- No AI attribution: commit message is `feat(multiplayer): a committed GM rewind reaches the live match and its connected players (U22a)` with no attribution line; grepped the full diff for `claude|anthropic|co-authored|generated with` — the only hits are inside the three evidence JSON receipts' own `implementerModel`/scratchpad-log fields, which is what those receipts are supposed to record, not inside any `src/` file.
- No absolute machine paths in product or test files: grepped the `src/` diff for `E:\Projects`, `C:\Users`, `/e/Projects`, `wroll`, `AppData` — no hits.
- Every added or changed function carries a comment describing what it does, and I checked each one against the code beneath it rather than trusting the prose: `matchHostRegistrySlot`/`getMatchHostRegistry`/`bootstrapMultiplayerServer`/`_resetMatchHostRegistry` (MatchHostRegistry.ts), `replayToAttachedViewers` (the `IRewindRebuildHost` port) and the `rebuildHostFromActivatedBranch` doc addition (ServerMatchHostRewindRebuild.ts), `rewindRebuildPort`/`replayRebuiltStreamToAttachedViewers` (ServerMatchHost.ts), the `replacesStream` schema field (Protocol.ts), `forgetAppliedStream` and the `ReplayStart` handler's inline comment (client.ts), and `connectMultiplayerSession`/`appendGameEvent`/the `mirrorReplacement` field (useMultiplayerSession.helpers.ts) all have comments, and I did not find one that claims a guarantee the code doesn't implement — in particular the `replayRebuiltStreamToAttachedViewers` doc's "Resync marks are left as they are" and the ServerMatchHostRewindRebuild.ts doc's ordering both match the shipped (not the originally-planned) behavior, which is the harder case to get right after a documented mid-implementation deviation.

## Verdict rationale

The core mechanism is correct and I verified it independently rather than trusting the receipts: the registry-and-recovery-flag sharing is the same `Symbol.for` globalThis pattern already proven for the match store (`getDefaultMatchStore.ts`), and I reproduced both the "one instance, one recovery sweep" behavior on head and the "two instances, two sweeps" behavior on baseline myself (Q1). The per-socket push never uses a broadcast — every attached socket, GM or player, goes through the same `handleSessionJoin` per-viewer join path (viewer resolution, fog filter, `MATCH_WIRE_PUBLICATION_BOUNDARY` guard) that a fresh join already uses, and the shipped test proves the pushed frames equal that viewer's own fresh join byte-for-byte modulo replay stamps, that a fog-hidden movement reaches only its owner, and that a GM-private rewind reason committed through the real HTTP route never appears on any player's wire. The marker is stamped by a `safeSend` wrapper applied only to `ReplayStart`, after `sendReplay`'s guard-and-stamp pipeline has already run — the right place, and the reason the implementer moved away from threading a parameter through the projector. The client and hook reset exactly to `connect()`'s initial values and swap (not empty) the mirror, verified against the literal `connect()` initializer in `client.ts`. The no-marker control path is unchanged by construction (the new logic is entirely inside an `if (start.replacesStream === true)` branch) and I ran that control test myself. Every one of the eleven gates reproduces exactly; my own red reproduction (reverting the six product files) fails the twelve rows I'd expect, each for its stated reason; the one changed pre-existing assertion is a legitimate replacement forced by the new, opposite invariant, not a weakened tautology. Caps, attribution, absolute paths and per-function comments all check out.

The one thing that gives me pause is Finding 1: a real, verified, previously-inert authority-adjacent capability (DELETE closing a truly live match across the module-graph split) is switched on as a side effect of the exact change this authority+replay-class review is here to check, and it appears in none of the three receipts and is pinned by no test. On the evidence I could gather — no current caller anywhere in the UI or server, no privacy-sensitive content in the frame it now sends, and the new behavior being the *documented* behavior of that route rather than a regression — I don't think it rises to blocking severity, but it should not go unrecorded. I am not filing a pending-task or FN-* entry myself (out of my read-only mandate); I'm surfacing it here for the owner ruling this authority-class unit requires, and recommend a one-row regression test plus an explicit disclosure entry before or immediately after merge.

Verdict: **APPROVE**.
