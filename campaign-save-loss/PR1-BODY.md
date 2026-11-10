Campaign edits made inside the two second debounce can disappear from the
server on a worker-controlled reload. This change routes API writes directly
to the network in browsers that support service-worker static routing and
prevents the updated page's automatic worker-update reload from discarding a
dirty campaign.

## Changes

- In the install handler, feature-detect `event.addRoutes` and register only
  PUT, POST, PATCH and DELETE under `/api/*` with source `network`. GET caching
  and offline fallback stay as they are; unsupported browsers use the existing
  worker behavior.
- On controller replacement, wait for the existing ordinary campaign save to
  clear `dirty`. A stale `saveState: 'saved'` never overrides `dirty`. After an
  acknowledgement, reload once. A save error, conflict, 10 second timeout or
  unmount cancels the automatic reload and removes its subscription/timer.
  Pending edits stay in the open page; the existing Save now/conflict UI remains
  available. Ten seconds allows the two second debounce plus response time;
  delayed application of new page assets is preferable to discarding work.
- Add install/fallback unit tests and reload-policy coverage. Extract existing
  campaign flow helpers and correct the tab-close control's diagnosis.
- Add a warm, same-context sweep with 100 measured app/control pairs and two
  discarded real warm-up pairs. Cycle edit-to-unload delays of 40, 100, 250,
  500, 1000, 1500, 1900 and 2000 ms. The separate bare-worker positive control
  shares the context and run. Retain the clean-reload zero-PUT check and the
  existing crash-window tab-close control.

## Guard direction

The receipt-based guard narrows the fatal-event set: **new-fatal implies
old-fatal** for any event list. Redundant or reflected aborted API writes may
now pass; previously benign events remain benign. Missing predecessors,
malformed payloads and unsupported write contracts fail closed only within
the already-fatal aborted API write class. Page errors, console diagnostics
and non-abort failures retain the old behavior.

The unit property pins a copy of the old predicate from base origin/main
`c4b9f7a0c`, independently generates 28,082 events, and checks singleton and
mixed ordered lists. It covers method case, API URL boundaries, failure and
resource types, successful/missing/failed receipts, malformed bodies and
predecessors, unsupported writes and DELETE. No newly fatal event was found;
previously fatal events becoming benign are required as witnesses.

## Measurement plan and meaning of zero lost

C4 runs this harness against the production build at `16cee68ee` (main plus
guard only), then against the new PR 1 head built. Both use 100 measured
app/control pairs and report four classes per delay and in totals:

- **delivered-observed:** the runner's API poll saw flush base + 1 with exactly
  its entire envelope body and savedAt, even if a later PUT replaced it.
- **delivered-by-chain:** no direct observation, but one keepalive starts an
  unbroken captured CAS chain through the final row; final version equals the
  initial version plus the number of PUTs, final body/savedAt match its last
  PUT, expected values remain, and polling saw no unexplained revision.
- **undelivered:** row never advanced or expected values are absent at the end.
- **unattributable:** gaps, duplicate bases, multiple keepalives, unexplained
  context writes/revisions, unreadable payloads or other attribution failures.

Acceptance requires **undelivered = 0 and unattributable = 0 over at least 100
measured trials**, and the bare control must still lose at least 50%. Missing
trials, failed/empty polls, invalid controller/timing probes, invisible warm
SW-owned GETs, and samples below 100 are INCONCLUSIVE and fail. The same
classification is reported on the control-build and branch-build sides. The
bare positive control retains its independent completed-body arrival counter.

`MEKSTATION_UNLOAD_TRIALS` defaults to 100; smaller diagnostic samples cannot
pass. `MEKSTATION_UNLOAD_PROOF_SIDE` labels the build side. At 100 there are 13
trials for each of 40/100/250/500 ms and 12 for each of 1000/1500/1900/2000 ms.
Runtime is measured by C4; the previous 12-17 minute estimate is unverified
for the added polling. The timeout is 60 seconds plus 15 seconds per trial.

The runner's own APIRequestContext starts uncached GET polling before the
edit/reload timer is armed, at 75 ms between request starts when response time
permits, and continues through the existing three-second settling window and
final GET. Requests do not overlap. The JSON retains first records of distinct
versions, every record transition, all sample start/completion times, errors,
and the first exact flush revision's observation time. Polling never writes.
Any chain-only trial lists the versions polling missed and its full trace;
C4 must explain those misses if more than a handful rely on chain inference.

The original page fetch observer retains raw PUT bodies and keepalive flags.
A new context observer captures campaign PUT/POST/PATCH/DELETE from frame and
Chromium service-worker requests, with request.serviceWorker(), resource type,
response/failure and completion timing. It does not install routes. Context
writes must match page PUTs one for one; any extra SW, XHR or beacon write is
unattributable. A SW-owned copy is never assumed to be the page request's
forwarding leg. Each trial checks context visibility with the existing warm
GET, which the worker forwards using fetch. Lifecycle, visibility, document
identity, stack and edit/pagehide-relative issue times are test-only markers.

**Capture limits:** the old page observer alone was incomplete. Playwright
1.57 Chromium exposes SW-owned requests in context events, as confirmed in its
installed source; actual visibility in this run is still C4's proof. The new
capture covers this isolated page/worker writer topology if the probes pass,
but is not a universal server request log: it cannot see external clients,
unreported browser-internal requests, or revisions that arise and disappear
between polls. The API has no request receipt ID. Chain inference remains
conditional on those explicit limits; it is reported separately from direct
observation. Missing context matches and extra writes fail closed.

The pure helper was fed the prior control's 100 measured trials without
committing its JSON: **83 undelivered, 17 delivered-by-chain, zero observed**.
All historical results are ineligible for new acceptance because poll/context
data are absent; they do not establish the absence of uncaptured versions.
The old strict final-row diagnostic remains in each trial for comparison and
no longer controls acceptance.

PR 2's pending-write adoption changes are absent. This worker ran no browser
proof and claims no measured branch delivery rate.

## Root cause and prior evidence

The service worker's fetch listener introduces a worker dispatch before network
delivery. Chromium loses pagehide keepalive requests during document replacement
on that path. The exact Chromium-internal cancellation mechanism is unproven. In C4's
100-trial control, 11/13 keepalives landed at 40 ms versus 6/87 at longer delays.
All 100 captured the same keepalive base 1 shape; only the 17 landed cases had
a later ordinary base 2 PUT from the replacement document. No old-document
ordinary PUT was captured. The delay-specific delivery mechanism is still
unexplained; the new test-only lifecycle markers are intended to distinguish
pagehide/visibility/timer issue points and document overlap. PR 1's method/path
route covers the PUT in both regimes regardless of timer or lifecycle source;
that is route coverage, not a measured per-delay delivery guarantee.
Behind the logging proxy, none of 36 lost writes arrived; all captured bodies
replayed successfully. Bare navigation controls delivered 80/80 without a
worker, 0/80 with a fetch-listener worker, and 20/20 with a listener-free worker.
The previously validated static-route patch delivered 36/36 in the app and
60/60 in bare controls. These are prior audit results, not this branch's sweep.

Evidence root: `E:/Projects/Personal/_scratch/sm-audit-reports/campaign-save-loss/`.

- `PROPOSAL.md`, sections 0-2 and Root rulings.
- `evidence/SUMMARY.md` and `evidence/proxy1.jsonl` (arrival/replay evidence).
- `evidence/e3-shell-reload-40.jsonl`, `evidence/e7-sametick-shell-reload-2000.jsonl`
  (warm and debounce-edge failures).
- `evidence/ctl-sw-listener-*.jsonl`, `evidence/ctl-sw-nolistener-*.jsonl`,
  `evidence/e6-swpatched-*.jsonl`, and `evidence/ctl-sw-route-*.jsonl`.
- Validated patch: `scripts/sw-patched.js`. Prior sweep harness:
  `E:/Projects/Personal/_scratch/sm-audit-reports/validation-3e96c2283/o1-sweep/specs/o1-sweep.spec.ts`.

## Worker lifecycle and C5 #3315

**Installing the replacement does not change what an already-installed OLD
worker does before the replacement activates.** `addRoutes` belongs to the
installing worker version; it does not mutate the old active worker's routing
table or fetch listener. The existing `skipWaiting()` in install requests early
activation after installation completes. The existing `clients.claim()` in
activate then brings in-scope clients under the new controller, which triggers
`controllerchange`. Once controlled by the replacement, writes use its static
routes, including requests from an old document.

The reload guard is page JavaScript. An already-loaded document running the old
hook does not acquire the guard when the worker changes. C5 must retain this
distinction in #3315's old-tab check, rebase after F1, and rerun that check.

## Desktop and remaining work

The packaged Electron page loads the same Next app at
`http://127.0.0.1:3001` (`desktop/electron/main.window.ts`). `_app.tsx` calls
`useServiceWorker` without a desktop exclusion, and loopback is a trustworthy
origin. The packaged app therefore attempts registration where Chromium exposes
the API; there is no desktop registration opt-out. The same window-to-embedded-
server loss can leave backups/restores with the stale server row. Packaged
runtime behavior was not exercised in this worker.

The issue stays open until PR 2 supplies pending-write adoption. Offline writes,
crashes, failed saves without automatic retry, and rare multi-tab conflicts
remain outside PR 1. Firefox and WebKit loss rates are untested here.

C5 owns the shared-flows map entry for campaign persistence paths and
`public/service-worker.js`; that map is absent on base `c4b9f7a0c`. The existing
nightly full Chromium command discovers this spec automatically. Do not add it
to every PR shard. C4 must run production red/green and flow proofs, then record
observed timings using `scripts/playwright/record-ci-e2e-durations.mjs`; no
unmeasured values were added to the generated duration index.

## Validation

- Delivery classifier, poll helper and external 100-trial history check:
  **30 tests passed**, Jest `--maxWorkers=2 --silent`.
- Root and scripts typecheck through `mem-guard.mjs`: passed; initial peak
  private bytes 1.18 GB. The required immediately-before-commit run and hook
  peak are recorded in the external `PR1-IMPLEMENTATION.md`.
- Formatting, explicit oxlint on changed TypeScript files, and Playwright
  collection (2 tests / 1 file) are recorded in that report. No browser ran.
- Prior guard property (2 suites / 25 tests) and product checks are prior
  evidence, not rerun by this worker. Product code and receipt guard unchanged.

No build, server, browser execution, install, push or merge was performed.
Production red/green proof remains with C4.
