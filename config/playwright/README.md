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
The workflow's concurrent invocation collects the census once and runs the two
longest suites first. At most two suite processes run at once. Each owns a port,
readiness runId and absolute application/multiplayer SQLite paths, with server
reuse disabled. A single production build serves both processes. Gate/library
worker counts and native retry/trace policies stay unchanged.

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
`e2e-timings/listing-all.json` records the single census and each suite's native
selection preflight, including total listing wall time. `execution.json`
records suite start/end times, ports and database paths, so hosted proof can
check overlap and isolation. Each native report must confirm those runtime
settings. All suites settle even if another fails; a failure, timeout, runtime
mismatch or changed test census fails the job. Interruption kills only owned
process trees and stops the queue from starting another suite.
