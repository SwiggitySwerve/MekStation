# D-6 verification

## Scope and callers

The existing interventions package owns the rule. The campaign GM control plane
creates all campaign previews through `createGmCascadePreview` and prepares every
approval before its apply callback. A changed campaign ID, updatedAt or date now
blocks repair, salvage, funds, inventory, base-unit reconciliation and time
projections before domain application or either ledger append. The reducer's
existing blocked transition handles both initial approval and refusal/retry.

The local GM page therefore writes nothing for stale approval. Its co-op funds
path sends no host intent for a stale caller-state preview; successful approval
still waits for host acceptance before recording. Host-side journal-version
comparison and local-only co-op time approval remain unchanged.

The tactical surface also uses the cascade pipeline. Combat and tactical unit
reload state use the existing `hashState` fingerprint. A stale tactical preview
cannot call the live engine. GameEngine phases/runToCompletion, QuickResolve,
quick games, pre-battle resolution, campaign fast-forward, AI, P2P translation
and the standalone simulation runner have no direct cascade-pipeline callers.

## Test-first evidence

- Behavior-preserving extraction: commit `abfda6a50`, 16 intervention suites /
  140 tests passed, including exact legacy time reasons and missing-field cases.
  Both TypeScript configs passed in the commit hook.
- Before behavior changes: 31 replay/checkpoint/digest/determinism suites /
  755 tests passed (`d6-replay-before.log`).
- Red: the new tests failed on campaign identity/version/date changes, generic
  state changes, missing tokens, tactical overlays, control-plane state changes
  and retry after refusal (`d6-red-serial.log`). Two co-op assertions initially
  used a disabled DOM matcher; after correction both cases failed because stale
  solo/host approvals were applied rather than blocked (`d6-coop-red.log`).
- Green: full intervention, campaign GM component, campaign page and tactical
  page-module directories passed: 31 suites / 291 tests (`d6-green.log`).
- Full ledger browser spec: 8/8 passed on port 3617 (`d6-e2e.log`). The new
  scenario rejects all five stale controls, saves no rejected history, then
  approves a regenerated preview and verifies the saved record has no new
  freshness field. Existing seven journeys remain green.

Browser command (PowerShell):

```powershell
$env:MEKSTATION_E2E_PORT = '3617'
$env:MEKSTATION_E2E_SERVER_COMMAND = 'node server.js'
$env:MEKSTATION_E2E_REUSE_EXISTING_SERVER = 'false'
$env:MEKSTATION_E2E_SERVER_TIMEOUT_MS = '600000'
node scripts/playwright/run-playwright.mjs test --project=chromium e2e/gm-campaign-ledger-control-plane.spec.ts --workers=1
```

The longer allowance covers cold server startup on the shared machine; test
timeouts are unchanged. An initial 120-second startup attempt reached no tests.

## Persistence and status compatibility

The new `freshness` property belongs only to transient preview objects. Tests
assert it is absent from intervention records, action records, campaign effects,
resulting campaign state, co-op funds intents and the actual server save.
Existing time-correction payload fields retain their previous shape.

`previewed` and `cancelled` had no repository record writers. The append boundary
already rejected both; it still rejects invalid external records after the type
is narrowed to `approved | manual`. Cancellation results and reducer preview
states retain their existing names. No database migration, record rewrite, event
payload change or replay schema change is needed. Externally fabricated
historical data cannot be ruled out by repository analysis.

## Static checks completed

- Both TypeScript configs passed (`d6-typecheck.log`).
- Root lint: 63 warnings, zero errors; no increase (`d6-lint.log`).
- Unit lint: all path ceilings passed, 17079/17085 (`d6-lint-units.log`).
- Budget: 57 unkeyable tests; no increase (`d6-budget.log`). The first attempt
  timed out during Jest discovery; the subsequent full check passed.
- Strict OpenSpec: 283 items passed; campaign-ledger QC, time-cascade QC and
  OpenSpec CI accounting passed (`d6-openspec-all.log`, `d6-openspec-qc.log`).

## Mutation and combat proof

An isolated copy of the production freshness helper returned success immediately
after the legacy time check. Jest's module mapper directed the existing campaign
suite to that copy, without modifying the source used by concurrent gates. All
15 campaign identity/version/date cases failed with approved/appended results
instead of blocked results (`d6-mutant.log`). The normal source remains intact.

`npm run validate:combat` passed: 79 suites / 2107 tests, exact zero-gap inventory
and the strict combat specification checks (`d6-combat.log`).

## Full regression and final checks

The full integration and simulation runner directories, replay/checkpoint suites,
engine determinism suites, command digest suite and unit-lint Jest suite passed:
244 suites / 3026 tests passed, 32 existing skips (`d6-regression.log`). Together
with the pre-change run, this preserves the replay/digest baseline. No committed
digest, golden or fixture changed; no fixtures were regenerated.

The whole-repository formatting check passed (`d6-format-final.log`). Both test
files flagged by the first formatting check were formatted with oxfmt. No lint,
unit-lint or cache-budget ceiling was raised.

A fetched main update after the initial branch was limited to an unrelated E2E
source-scan race test. The lane merges main rather than rebasing or force-pushing.
Hosted CI and draft-to-ready status are reported in the PR, outside this local
verification receipt.
