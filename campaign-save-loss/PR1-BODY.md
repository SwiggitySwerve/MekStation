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
- Add 13 `@campaign` browser cases: 40 ms twice; 1800, 1900 and 2000 ms three
  times each; 2100 ms once; and a clean reload with zero PUTs. Each test waits
  for worker control and three reloads before measuring, uses a 55 second
  budget, and reads the server record without a further edit. The existing
  crash-window spec remains the tab-close control. Fault-injected adoption is
  deliberately omitted until PR 2.

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
`public/service-worker.js`; that map is absent on base `73ef85c97`. The existing
nightly full Chromium command discovers this spec automatically. Do not add it
to every PR shard. C4 must run production red/green and flow proofs, then record
observed timings using `scripts/playwright/record-ci-e2e-durations.mjs`; no
unmeasured values were added to the generated duration index.

## Validation

- `npm run typecheck`: passed (root and scripts projects).
- Focused Jest `--selectProjects unit --runTestsByPath ... --maxWorkers=2
--silent`: **10 suites, 151 tests passed**, covering worker routes/cache,
  useServiceWorker, crash window, save-state reducer, and persistence store.
- Changed-source oxlint: **0 warnings, 0 errors**. Repository ignore rules
  exclude tests/E2E; the lint command reports two source files.
- `npx --no-install oxfmt --check` on all seven changed JS/TS files: passed,
  including `public/service-worker.js`.
- `npx --no-install openspec validate fix-campaign-save-sw-network-route
--strict`: passed.
- `npx --no-install playwright test e2e/campaign-unload-adoption.spec.ts
--project=chromium --list`: **13 tests in 1 file**; collection only.
- Worktree hook copy/check: `HOOKED`; commit must pass lint-staged normally.

No build, server, browser execution, install, push or merge was performed by
this implementation worker. Production red/green proof remains with C4.
