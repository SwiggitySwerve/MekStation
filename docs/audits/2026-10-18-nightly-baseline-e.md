# Nightly baseline E: replay cursor and wizard diagnostics

Baseline: `8fcd311d5`, fetched from `origin/main` into the fresh
`E:/Projects/Personal/MekStation-wt/baseline-e-20261018` worktree. Dependencies
were installed with `npm ci` using Node 22.22.0. The root checkout was not edited.

## CI diagnosis

Artifacts were downloaded with `gh run download` for verification run
[39171555118](https://github.com/SwiggitySwerve/MekStation/actions/runs/39171555118)
at `28032229f`, and the Playwright artifacts for earlier nightlies
[39129982940](https://github.com/SwiggitySwerve/MekStation/actions/runs/39129982940)
at `1b8558625` and
[39033900424](https://github.com/SwiggitySwerve/MekStation/actions/runs/39033900424)
at `0ba167f32`. Evidence inspected: extracted HTML report JSON, error-context
snapshots, Playwright trace snapshots/network/action logs, failure PNGs, and
frames from the retained retry video. Original downloads and local logs remain
under `E:/Projects/Personal/MekStation-wt/baseline-e-evidence-20261018`.

### Quick-game replay: latent product defect

The earlier nightlies passed the same complete journey in 22,041 ms and
11,420 ms respectively. Their replay screenshots took 8,644 ms and 2,693 ms.
This failure was not hidden behind earlier assertions in those runs. The latest
run reached the Replay tab in all three attempts; the screenshot then failed at
the unchanged 15-second limit. The retry video shows a completed battle with
the replay still stopped at its initial event throughout capture.

The trace's initial replay snapshot (`after@call@105`) contains 250
`attack-effect-event-*` groups and 600 `attack-effect-instance-*` elements even
though the cursor is at the initial event. Its serialized DOM is about 3.7 MB,
with 3,823 SVG groups. `QuickGameReplayPanel` projects tokens at the cursor but
passes the full future history to `HexMapDisplay`, whose attack and persistent
effect layers consume that history. Future attacks therefore animate at the
start of the replay and make screenshot animation/style processing expensive.
The trace's last message, "waiting for fonts to load", is not evidence of a
missing font: the action also competes with that rendering work.

Introducing commit: `db2e0f178d` (#544, quick-game replay panel), which supplied
`events={events}` to the already effect-enabled map. `f2ed4cf49e` (#568) later
added replay-scoped animation wiring. This is a pre-existing, history-size-
dependent product defect exposed by this run, not a new defect introduced by
#2278's recorded quickMeta schema change. That change concerns persistence;
the initial replay effect input remained the same. The failed screenshot is
of a normal-sized results view, not evidence of an enormous page height.

Repair: bound map effect input to the selected replay cursor while keeping the
full history for the player and timeline. Keep the original full-page capture,
redaction, timeouts and journey assertions. Add an initial-frame browser
assertion and a real attack-effects renderer test that advances and rewinds.

### Wizard save diagnostic: test-helper race

The failed attempt expected the HTTP status/body but received
`Campaign create failed: server responded 404`. The retry passed. The
`name-error` DOM snapshot confirms this is the inline UI diagnostic.

Introducing commit: `be59197c8` (merged by #2279). In
`submitCampaignWizard`, `Promise.race` races the inline error against a branch
that first awaits `response.text()`. The inline error can win after the PUT
has already started, but before Playwright finishes reading its response body.

Repair: observe the save request before clicking. Once that PUT starts, the
HTTP response and body own the diagnostic; an inline-only failure still fails
promptly. Remove the request listener on exit. The existing strict expected
404/body assertion remains unchanged.

## Collision census and carry-forward

Open PRs at initial census: #2296 (match recovery and its tests/receipts), #2297
(seat credential services and their tests/receipts), #2113 (parked documentation
archive), and #1886 (parked privacy pack and its QC helper). None changes a
literal leaf in this repair. No L1 path, campaign synchronization, ledger state,
or known-red campaign economy test is changed.

The refreshed census also includes #2298 (B14-HEAD closure documentation),
again with no literal overlap.

The live ledger has no active ownership-path reservation for the quick-game
panel or its new unit test. Its broad `e2e` reservations cover the two edited
E2E leaves: U2, U2b, LSC-2P, U25, U27, U28, U51, U52, U53, U30, U31, U54,
U55, U57, FOG-X and COOP-PACK-GEN. U3 is already main-verified. The parked #1886
has a different literal privacy-pack manifest; its reserved leaf is untouched.

CARRY-FORWARD: Those E2E owners must re-baseline `e2e/helpers/campaignFlow.ts`
and `e2e/ux-walkthrough-audit.spec.ts` at their next admission. The former makes
HTTP diagnostic precedence deterministic; the latter asserts that the initial
replay frame contains no future attacks. Each foreign leaf changes fewer than
40 lines, adds no export/schema/event shape, and preserves its existing
contract. Review classes retain the union of authority, privacy, replay,
idempotency and concurrency. Independent Claude review and any required
OWNER-RULING remain with Root; this repair supplies no owner-unit acceptance.

## Validation

- Red renderer test on the original product: fails because the real laser
  effect for `future-attack` is present at event 1, before advancing the cursor.
- Red standalone browser test on the original product: fails because the
  initial replay frame contains 161 attack-effect events instead of zero.
  Artifacts are retained in `local-browser-red` beside the downloaded CI data.
- The original and repaired `npm run build` both passed, with
  `NEXT_PUBLIC_E2E_MODE=true`. The repaired build was served by
  `node .next/standalone/server.js` on loopback port 3697, not a dev server.
- Three targeted replay suites passed: 10 tests, including the real renderer's
  initial-frame, advance, and rewind assertions.
- Both complete affected Playwright specs passed with
  `--project=chromium --repeat-each=5 --workers=1 --retries=0`: **40 passed,
  0 failed, 0 flaky, 0 skipped** in 336.7 seconds. Each repaired case passed
  5/5. Quick-game journey times were 8.876, 12.655, 11.945, 9.605 and 18.236
  seconds; the original 15-second screenshot timeout remained unchanged.
- Heavy validation ran through
  `node E:/Projects/Personal/MekStation-wt/_locks/heavy-run.mjs --lane base-e
--class playwright --cwd E:/Projects/Personal/MekStation-wt/baseline-e-20261018
-- node E:/Projects/Personal/MekStation-wt/baseline-e-evidence-20261018/run-green.cjs`.
  That driver runs the targeted Jest suites, production build and repeated
  Playwright invocation sequentially under one queue lease.
- Targeted product lint and five-file formatting passed. The regular commit
  hook runs the full root and scripts TypeScript checks.
- `repeat-proof.json`, `validation-summary.json`, `green-{unit,build,playwright}.log`
  and `tested-source-hashes.json` retain the command results and tested source
  binding. The four code/test files matched their recorded hashes after proof.
