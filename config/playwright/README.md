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
