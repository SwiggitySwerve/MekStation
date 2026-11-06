# CI gardening rules and integration

G3's `scripts/ci/garden-*` modules own weekly evidence selection, issue/ratchet
publication and budget-raise approval. G1 owns all workflow wiring, budget
definitions, metric projections and budget serialization. G2 owns observation
validation, run normalization, comparison populations and median arithmetic.

## Weekly invocation

Run weekly on a UTC schedule and through manual dispatch, from the default
branch only. G1 supplies the combined public APIs to `prepareGarden`:

```js
const api = {
  ...budgetConfig, // budgetDescriptors, ratchetBudgets, serializeBudgets
  ...budgetMetrics, // validateRepositoryMetrics, observedBudgetValues, packageContributors
  ...budgetWorkflow, // workflowGraphFromSource
  ...ciMetrics, // median, selectMainObservations
  ...ciReportGithub, // collectRun
  ...ciObservation, // validateObservation
  ...ciTestMetrics, // compareTestFiles
};
const prepared = await prepareGarden({
  github,
  owner,
  repo,
  now: new Date().toISOString(),
  config,
  budgetConfigHash,
  expectedBaseSha,
  api,
  projectEvidence: (envelope, budgets) =>
    projectGardenEvidence(envelope, budgets, api),
});
```

`config`, its exact-byte digest and `expectedBaseSha` must describe the same
trusted main checkout. `prepareGarden` collects only canonical observation
artifacts produced by PR Checks main pushes and binds their metadata to the
live run attempt. For each source head it fetches the immutable PR Checks YAML,
calls G1's `workflowGraphFromSource(text)`, then G2's `collectRun` with fresh
attempt/jobs API data. The artifact observation must equal that normalization,
including `identity.completedAt`, timing values and comparison key. A historical
baseline cannot reuse another head's graph. Archives contain exactly one bounded JSON member; extraction
and PR code execution are unnecessary. Raw failed/cancelled observations remain
available to G2's comparator, which excludes them from the successful baseline.
`packages` and `budgetConfigHash` default to null in G2's envelope.
G1 validates repository/package evidence and recomputes observed budget values;
configured caps never substitute for observations.

Use separate permission scopes: collection needs `contents: read` and
`actions: read`; `updateGardenIssue` needs `issues: write` and `contents: read`;
`proposeRatchet` needs `contents: write` and `pull-requests: write`. All adapters
default to `dryRun: true`. Pass `dryRun: false` explicitly to publish. Serialize
weekly publications with one repository concurrency group. Never execute PR
scripts, install PR dependencies, or execute downloaded artifacts with a write
token. Preserve the prepared report and its source manifest as run evidence.

`updateGardenIssue({github,owner,repo,body:prepared.body,dryRun})` reuses one
marker-identified issue authored by the live repository owner or GitHub Actions
bot, reopening it if necessary. Multiple authoritative copies fail visibly.

Call `proposeRatchet` only when `prepared.ratchetContent !== null`, with
`budgetPath: 'config/ci/budgets.json'`, `expectedBaseSha`, the prepared content
and `prepared.ratchetBody`. It creates one draft PR from current main through
the Git data API. It preserves existing proposals/branches, never force-pushes,
and refuses to write after main moves. A failed PR creation leaves a branch for
explicit recovery; reruns report that branch instead of overwriting it. Root
alone merges. Link each created PR in the orchestration thread.

## Weekly evidence and ratchets

The report covers the seven full UTC days ending before today and compares
them with the preceding seven days. G2's `selectMainObservations` selects complete, successful, comparable
main observations; runner/DAG changes never pool into a common baseline. Only
the latest attempt of each run counts. Test timings use actual execution data,
with unknown baselines and incomplete censuses preserved. PR associations are
reported as associations; they do not prove causality. Cache rates divide
observed hits by observed attempts and include coverage. Package members use
G1's complete census and G2's median.

A lower limit requires three distinct complete runs on every one of the seven
days, the same current budget digest, and more than 15% headroom on each daily
median. The proposed integer cap is the ceiling of the largest observed value
divided by 0.85, so it retains 15% headroom over every included observation.
No change is proposed when rounding leaves no safe lowering. Any malformed or
unreadable source blocks proposals. Missing complete budget projection, days,
or observations cannot authorize a change. G1 descriptors disable timeout
ratchets until comparable measured replacement samples are available.

## Budget raises

G1's `budgetRaises(base,head)` alone validates/detects budget relaxations,
including removed limits/profile bypasses. `checkBudgetRaise` reads both exact
PR blobs as JSON and calls that API. It requires the `ci-budget-raise` label
and the latest live human repository owner's explicit `APPROVED` review on
the exact current PR head. The owner comes from GitHub's repository API, not
an allowlist. A self-authored PR, bot/nonowner review, stale head, later owner
comment/change request/dismissal, malformed delta or missing metadata fails.
The approval and review contexts must be reread when labels/head/base/reviews
change. G1's trusted workflow must rerun those events and make the approval
status required through repository policy; these modules alone do not install
workflow or branch-protection enforcement.

The adapter writes `CI Budget Raise Approval` to the live head. Only trusted
base/default code may hold `statuses: write`. Review signals can be read-only;
a trusted verifier independently reads live PRs/reviews, without consuming
untrusted code or artifacts. Count every automatically induced job, including
post-run verifiers, in the typical-PR census. Any separate budget-change
profile must be explicitly declared by G1.

## Focused proof

```sh
node --test scripts/ci/garden-*.test.mjs
```

These Node tests cover G3's policies/adapters with G1/G2 ports as boundaries.
The ZIP boundary also runs Python without extracting paths. They do not claim
that historical real seven-day observations exist, that workflows are wired,
or that branch protection requires the status. G1/G2 integration and CI at the
published PR head are separate required evidence before enabling automation.
