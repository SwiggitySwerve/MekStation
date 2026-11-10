# PR E2E duration allocation

`scripts/playwright/ci-e2e-plan.mjs` owns the eight PR specs and their worker,
retry and trace policies. The workflow continues to name those specs explicitly;
the runner rejects an invocation that changes any of those policies.

Every invocation collects the live Chromium census. First-attempt passing
durations in `ci-durations.json` are scheduling weights, never cached test
results. A new test without a weight still runs and gets the largest recorded
weight. Missing specs, duplicates, collection errors or invalid weights fail.

The planner assigns the longest groups first to the lighter of two shards,
across suite boundaries. Gate files and the tactical-map smoke file stay intact,
including the smoke file's serial describe. The library has no serial describes;
its independent tests are already split by the previous native shard strategy
and still run on one worker per invocation. If a library flow acquires a serial
dependency, keep its whole group together before introducing that dependency.

Before execution, the runner verifies its generated native `--test-list` against
Playwright's actual selection. After execution it verifies the JSON report
against the same plan. The original gate retries remain zero with retained
failure traces; library and smoke retain their existing configured retries.
The three suites still run sequentially in this slice.

CI uploads each shard's plan and JSON reports for three days. Refresh weights
from downloaded reports, then review and format the generated JSON:

```sh
node scripts/playwright/record-ci-e2e-durations.mjs RUN_ID path/to/gates.json path/to/library.json path/to/smoke.json > config/playwright/ci-durations.json
```

Include all suite reports from both shards; multiple runs use comma-separated
run ids and median observations. `--plan-only` appended to a workflow invocation
checks its complete native selection without starting a server or browser.

The wrapper overrides step-level `PLAYWRIGHT_HTML_OUTPUT_DIR` and
`PLAYWRIGHT_JSON_OUTPUT_FILE`: each suite owns `playwright-report-SUITE` and
`e2e-timings/SUITE.json`. The failure upload includes the smoke HTML folder.
`e2e-timings/listing-SUITE.json` records each census/selection collection and its
total wall time, so after-run samples count the listing overhead (up to six
collections per shard) as well as browser/server time and job setup.

## Shared-flow map schema

`shared-flows.json` records the C3/C4-reviewed flow inventory. It does not feed
`CI_SUITES`, Detect Changes or PR E2E selection yet. `tier` describes the
intended selection policy when the folded suite is enabled in step 5.
All mapped specs remain part of nightly coverage. `multiplayer-session` is
nightly by default, with its full set intended for PRs changing its narrow
server paths; `multiplayer-session-pr` is the five-spec subset for broader
multiplayer changes.

The top-level object has two arrays: `flows` and `nightly-only-by-design`.

| Flow field     | Contract                                                                                                                                                                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | Unique, non-empty flow identifier.                                                                                                                                                                 |
| `owner`        | One of `C1`, `C2`, `C3`, `C4`; joint responsibility goes in `notes`.                                                                                                                               |
| `paths`        | Non-empty array of repository-relative picomatch globs, including shared components. Each must match a file from `git ls-files`; dotfiles are included.                                            |
| `specs`        | Exact `e2e/**/*.spec.ts` paths; files must exist. A spec may serve multiple flows.                                                                                                                 |
| `pendingSpecs` | Optional array of `{ spec, owner, reason }` for named specs not written yet. Owner is C1-C4 and reason is non-empty. Each path must be absent; when it lands, move it into `specs` in the same PR. |
| `tier`         | `pr` or `nightly`. Future selection intent; no scheduling effect today.                                                                                                                            |
| `notes`        | Non-empty rationale, review decisions and exceptions.                                                                                                                                              |

A flow may have empty `specs` only while it has at least one `pendingSpecs`
entry. The campaign-persistence entry reserves C4's unload/adoption sweep for
its campaign save-loss fix PR 1/2. Its complete save and service-worker paths
remain mapped while the spec is pending.

Each by-design entry is `{ spec, reason }`, with an existing exact spec path
and a non-empty reason. This list accounts for every spec outside the shared
flows. Its historical name does not remove existing fixed PR coverage: entries
already in PR gates/smoke say so explicitly. A spec cannot be both mapped and
by-design. `customizer-layout-workbench` stays here per C3's review.

Two env-gated tooling specs are excluded explicitly by the guard:
`e2e/flow-audits.spec.ts` (`MEKSTATION_FLOW_ID`) and
`e2e/scenario-pack-minting.spec.ts` (`MEKSTATION_MINT_PACK_ID`). They require
explicit tooling invocations and are outside default nightly/PR selection.

`scripts/playwright/shared-flows.mjs` owns the guard. Its tests live in
`ci-e2e-plan.test.mjs`, which the existing "Test E2E shard planning and coverage
guards" CI step already runs. The guard reads tracked paths and discovers spec
files directly, including untracked specs, without a browser or census:

```sh
node --test scripts/playwright/*.test.mjs
```

<!-- Future rule (step 5): a PR changing this map or the by-design list must run
every affected spec, using both the base and head maps so removals are covered.
Documented here only; enforcement starts when folded selection is enabled. -->

Step 5 must enforce that a PR changing the map or by-design list runs every
affected spec, using both the base and head maps to cover removals. This is
documented here and marked `TODO(step 5)` in the guard; it is not enforced yet.
The C3 fail-open rule for shared customizer, stores and unit services also
belongs to that selection step.
