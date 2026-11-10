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

C4 runs the same harness first against the production build at `16cee68ee`
(main plus guard only), then against the PR 1 branch build. Each side reports
app trials, losses/unproven flushes, accepted flushes, values present/lost,
counts per delay, and control trials, losses and loss rate. These counts are
measurements; no minimum main loss rate becomes a new test threshold. The
assertion remains **control loses >=50% and app loses zero**. An incomplete
sample, invalid probe/timing or control below 50% is INCONCLUSIVE and fails.

`MEKSTATION_UNLOAD_TRIALS` defaults to 100; the proof must use at least 100.
Nightly may explicitly use a smaller sample (for example 30) with the same
assertions and the smaller denominator reported. `MEKSTATION_UNLOAD_PROOF_SIDE`
labels each side in the output. There are 13 trials at each of the first four
delays and 12 at each of the last four for a 100-trial run. Expected runtime is
12–17 minutes per side, unmeasured here; the report records actual elapsed
milliseconds. The timeout scales to 60 seconds plus 15 seconds per trial.

**Zero lost requires acceptance of the unload flush itself.** A test-only
browser observer records unmodified fetch arguments, including keepalive,
raw body and baseVersion, across document replacement. After the existing
3-second observation interval, a real uncached API GET must show the row
advanced to that flush's `baseVersion + 1`, with its entire document body and
its envelope `savedAt`. A competing captured PUT with the same base, body and
savedAt makes attribution unproven. No flush, multiple flushes, a later row
version, or a mismatching body/timestamp also cannot count as accepted.
Unproven acceptance counts against zero lost, even if the date is present;
values present/lost are counted separately. Browser request capture is payload
evidence only, never evidence of arrival or acceptance.

The real API exposes no request receipt ID. GET cannot distinguish identical
competing PUTs or prove historical acceptance after a later row replaces the
flushed revision. The report states those limits explicitly and keeps such
trials unproven. Fresh unique campaign rows and capture of all campaign PUTs
in the sole app page bound the competing-writer check. No server code or
test-mode server receipt log was added.

PR 2's pending-write adoption changes are absent from this branch. The existing
base has visibility-return flush reconciliation, which is separate from PR 2.
Even if another write restores the values, it cannot satisfy this sweep's
flush-acceptance check. This worker has not run the production measurement;
no observed branch loss count or runtime is claimed.

## Root cause and prior evidence

The service worker's fetch listener introduces a worker dispatch before network
delivery. Chromium loses pagehide keepalive requests during document replacement
on that path. The exact Chromium-internal cancellation mechanism is unproven.
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

- Guard unit tests and generated direction property: **2 suites, 25 tests
  passed**, Jest `--maxWorkers=2 --silent`.
- The prior implementation's worker-route, reload and persistence tests passed
  before this follow-up (11 suites / 175 tests); they were not rerun here.
- Follow-up typecheck through `mem-guard.mjs`: passed (root and scripts);
  peak private bytes 1.39 GB. Formatting passed on all four changed files.
  Oxlint with only the temporary config's ignore patterns removed checked
  all three changed TypeScript files: 0 warnings, 0 errors.
- Playwright collection: **2 tests in 1 file**; no browser execution. Exact
  commands and the mem-guard peak line are recorded in `PR1-IMPLEMENTATION.md`
  outside the repository.

No build, server, browser execution, install, push or merge was performed by
this implementation worker. Production red/green proof remains with C4.
