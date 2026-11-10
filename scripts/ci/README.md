# CI observations and advisory reports

`ci-metrics.mjs` owns timing normalization and comparable main selection.
`ci-test-metrics.mjs` owns test-duration comparisons. `ci-observation.mjs` is
the public JSON artifact boundary; `ci-report-evaluate.mjs` evaluates soft
limits and renders Markdown. `ci-report-github.mjs` owns API operations and
`ci-report.mjs` is the trusted CLI. Deterministic budget schema, workflow
expansion, package measurement and numeric budget projections belong to
`budget-*` (G1). Weekly policy and ratchets belong to `garden-*` (G3).

## Measurement rules

- Package bytes are advisory. `ci-budget-web/web.json` retains the complete web
  census and `ci-budget-installers*/installers.json` retains installer metrics.
  The PR comment shows `standaloneStaticBytes`, `webZipBytes`, `installerBytes`,
  signed deltas against comparable successful main medians, and baseline
  run/attempt/head provenance. A missing measurement/baseline is unavailable.
  These rows never affect conclusions, review labels, approval or ratchets;
  configured `limits` contain only the existing non-size counts. Package
  integrity (complete roots, public bytes and archive hashes) remains enforced.

- Fetch `/runs/{id}/attempts/{attempt}` and its paginated `/jobs`. Never merge
  jobs from different attempts or heads. Partial reruns with carried jobs
  missing from the attempt census stay incomplete.
- Supply the workflow DAG from each source commit. `normalizeRun` accepts
  `{repository,run,jobs,jobGraph,matrixGroups}`. G1's graph contract supplies
  expanded names and declared matrix groups. A skipped literal matrix template
  replaces its declared expanded nodes; an unexpected job stays missing.
- Job time is `completed_at - started_at` for an acquired runner. Failed and
  cancelled acquired jobs retain their time. Never-acquired jobs stay unknown.
  Skipped jobs have zero execution cost. Job-minutes sum execution without
  per-job billing rounding; this is not an invoice estimate.
- Critical path is the longest execution-duration sum through the dependency
  DAG. Queue wait starts when all dependencies completed (or the attempt
  started for a root). Elapsed time includes queue delays. Queue waits are
  summed across jobs, so they can exceed elapsed time.
- `selectMainObservations` and `mainMedians` exclude duplicates, invalid or
  incomplete data, failures, cancellations, non-main pushes, different workflow
  graphs/runner labels/skip patterns, and samples completing after the current
  run was created. The PR comment lists every retained excluded sample's
  run/attempt/head and selector-owned reason, including comparability failures.
- Test-file growth is informational: duration must exceed main p75 by strictly
  more than 20%, increase at least 3 seconds, and have at least five comparable
  main samples. Other valid comparisons are `within noise`; absent/invalid
  evidence remains missing. Cached passes carry no new timing sample. Jest extraction reuses
  the scheduling updater's extractor. Playwright uses its existing JSON parser
  and sums test execution including retries per file; framework keys differ.

## Artifact contract

The filename is `ci-observation-{runId}-{attempt}.json`. Call
`observationEnvelope(observation, extra)` or `validateObservation(envelope)`.
Version 1 fields are:

| Field               | Value                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`     | `1`                                                                                                                             |
| `observation`       | `normalizeRun` result: `identity`, `comparableKey`, `jobs`, `metrics`, `complete`, `missing`                                    |
| `tests`             | null or `{schemaVersion:1,identity,comparableKey,framework,availability:'available',complete,files:{'repo/path':milliseconds}}` |
| `repositoryMetrics` | null or G1's raw collector result; G1 validates it                                                                              |
| `packages`          | null or `{web:null\|G1 artifact,installers:null\|G1 artifact}`; G1 validates each artifact                                      |
| `budgetConfigHash`  | null or SHA-256 of the exact budget config bytes                                                                                |
| `budgetValues`      | null or G1's complete canonical observed numeric map; never configured caps                                                     |
| `cache`             | null or `{availability:'available',attempts,hits}` with integer counts                                                          |
| `attribution`       | null or `{method:'github-associated-pulls',pullRequests:[{number,url,headSha}]}`; association alone does not establish cause    |

Identity contains `repository`, `workflowId`, `runId`, `attempt`, `headSha`,
`event`, `branch`, `createdAt`, `startedAt`, `completedAt` and `conclusion`.
`completedAt` is the latest job completion timestamp and may be null for an
incomplete sample. Metrics are `jobMinutes`, `criticalPathMs`, `elapsedMs`,
`queueMs`. Unknown values are null. `tests.files` includes every measured file,
including small files; `extractTestObservation` proves completeness against a
planned file census. G1's `observedBudgetValues` determines whether a complete
budget projection exists. Missing telemetry forbids a weekly ratchet.

The canonical `producer` field is null or
`{schema:'mekstation/ci-observation-producer/v1',repository,runId,attempt,headSha,sourceRunId,sourceAttempt}`.
New envelopes default it to null. Older v1 envelopes without the field remain
unstamped. `validateObservationProducer(producer, sourceIdentity)` is the sole
producer schema validator; G1 imports/reexports it rather than defining another
validator. `OBSERVATION_PRODUCER_SCHEMA` supplies the schema identifier.
The producer's repository and source run/attempt must match the observation;
its own run, attempt and head identify the uploader and may differ from the
source. The source identity and `ci-observation-SOURCE-RUN-SOURCE-ATTEMPT.json`
filename stay unchanged when Guard uploads the artifact.

Schema validation does not establish trust in an uploader. G3 separately checks
the stamp against live producer-run and artifact metadata, trusted Guard workflow,
default-head ancestry and the source tuple. A missing/null stamp cannot grant
the trusted Guard path. G1 owns stamping and workflow wiring; G3 owns acceptance.

## Trusted integration

The final reporter needs completed jobs. A report collected inside a running
job must remain incomplete for that job. G1 owns every workflow hunk and counts
all induced trusted jobs against the typical PR job budget.

Run only trusted default/base code with `actions:read` and narrowly scoped
`issues:write`/`pull-requests:write`. Never check out, import, install or execute
PR code with that write token. Read-only test jobs may upload JSON telemetry;
the writer validates it as data. Serialize publishers per repository/PR to
prevent concurrent creates of the same marker. Before every write the adapter
rechecks live PR head, associated source run, workflow and latest attempt.
Only this marker's `github-actions[bot]` comments can be updated/deleted;
duplicates collapse to the oldest owned comment. Human comments are untouched.

```sh
node scripts/ci/ci-report.mjs --repo owner/repo --run RUN --attempt ATTEMPT \
  --workflow-id WORKFLOW --graph graphs.json --limits soft-limits.json \
  --out REPORT_DIRECTORY --dry-run
```

`graphs.json` is `{repository,graphs:{HEAD_SHA:{jobGraph,matrixGroups}}}`;
populate entries from G1's `workflowGraphContract` using workflow YAML at each
immutable source head. A plain graph or one G1 contract works for a single
source head; historical baselines with different heads then remain unavailable.
The default baseline window is the ten latest main pushes, including every
attempt (up to 20 per run). The raw attempts and all exclusions are saved.
Soft limits are `{jobsMs:{'display name':milliseconds},jobMinutes,criticalPathMs}`;
G1 supplies their projection. Missing limits are reported explicitly.
`--observation` and `--baseline-observations` accept validated producer JSON
envelopes (an array for baselines). Source metadata must match fresh API data.

`ci-budget-review` applies only for an actual per-job budget breach or aggregate
job-minutes/critical path strictly more than 20% over comparable main p75,
with at least five distinct valid comparable earlier successful main samples.
Below five, aggregate rows show an informational result and the sample count;
per-job budget breaches still label regardless of baseline count. Missing
measurements/baselines remain unavailable. The sample floor is shared with
test-file comparisons through `MIN_TIMING_MAIN_SAMPLES` in `ci-metrics.mjs`.
All p75 values use the shared R7 linear-interpolated quantile; p50 preserves the
existing median. Aggregate configured caps are informational, and crossing a
display cap alone cannot label. Per-file growth never labels. When all
label-defining metrics are known and healthy an old label can clear even if
informational file telemetry is missing; unknown label-defining metrics retain it.
Weekly job investigations compare main-only cohorts and make no causal claim.
API/reporting errors emit diagnostics
and the CLI exits successfully, preserving the producer's test conclusion.
`--dry-run` performs API reads and records intended writes without mutation.
