# Deterministic CI budgets

`budget-config.mjs` owns the schema, canonical numeric IDs, units, deltas and
lowering API. `config/ci/budgets.json` declares non-size limits. Package size
and memory growth are advisory observations, never acceptance or approval gates.
The byte fields `standaloneStaticBytes`, `webZipBytes` and `installerBytes` are
absent from `limits`, descriptors, raise detection and automatic ratchets.
Only base-config comparisons accept the complete legacy byte-limit shape;
new configurations reject obsolete byte fields. Decimal MB means
1,000,000 bytes. Unknown/missing inputs fail; counts never substitute for missing
observations. `budget-metrics.mjs` owns collection and observed projections;
G2's `ci-metrics.mjs` owns timing statistics, run normalization and reporting.

Optional `reporting:{jobMinutes,criticalPathMs}` supplies two finite positive
fractional aggregate display caps. Absence stays valid for older configs;
present objects require exactly both fields. Canonical IDs are
`reporting.jobMinutes` (minutes) and `reporting.criticalPathMs` (ms).
`reportingLimits` and `projectTimingLimits` expose configured values only.
First additions constrain previously unconstrained metrics and are initial
baselines, scoped solely to these IDs. Increases/removals require the existing
owner label and exact-head approval; other simultaneous relaxations still count.
Manual lowering may preserve positive fractions; automatic timing ratchets stay
disabled until a canonical complete comparable timing projection exists.
These display caps do not change runtime assertions, hard budgets or label
criteria. G2's report labels use actual per-job breaches or aggregate values
strictly over main p75 by 20% with at least five comparable main samples,
never test-file growth or display-cap crossings. Below five, aggregates are
informational with their sample count; missing data remains unavailable.
The minimum does not apply to per-job budget breaches. Report comments retain
the selector's exclusion reasons with run/attempt/head for each excluded sample.

Deploy compatible trusted schema support before adding populated config fields.
The first stage leaves the config unchanged. Only after a main push runs the
new Guard may the second stage initialize exact measured main R7 p75 times1.15;
retain raw cohort/run/head/attempt evidence and never reset a later cap upward.

The first enforced count baseline is 10 induced jobs, 57 unkeyable files and
93 repo-wide keys. Root authorized this bootstrap before any cap existed on
main. `targets` retains 9/55/80 as tracked goals, displayed through
`budgetTargetGaps`; missing observations remain unknown. Future relaxations
require G3's label and exact-head owner approval. Automated ratchets only lower.
The extra trusted Guard entered main in #2666 (597976eb3); including it corrects
9-to-10 job accounting. The 55-to-57 and 80-to-93 gaps use the full actual-keyer
census; no individual introducing merge has been established by cheap history.

Typical PR counts include detector, every matrix leg that runs, aggregator,
reporting and automatically induced trusted workflow jobs. Gated jobs remain
visible in the expanded census. Desktop/global-CI/budget-change profiles are
explicitly exceptional. Unknown secondary job conditions count as active.
`workflow_run` cycles and unsupported matrices/conditions fail closed. The
post-run guard has a separate trust boundary and counts toward the enforced ten.
The primary fan-out must exactly match the aggregator's `needs`; its runtime
boundary rejects empty/missing results and every unproved skip.

Cache counts come from native Jest selection (unit/corpus with the production
split/performance flags) and `scripts/jest/cached-tests.js`'s actual keyer.
Full sorted selected/unkeyable/repo-wide file lists accompany every count.
Neither gate changes keyer semantics, test selection or coverage.

Root and desktop lockfile v3 entries exclude the root package entry. Direct
dependencies are unique names across dependencies, devDependencies,
optionalDependencies and peerDependencies. Manifest/lock disagreement fails.
Growth requires `ci-dependency-growth`; raising the configured baseline is a
budget raise, subject to G3's separate exact-head owner approval policy.
`budget-dependencies.mjs` owns this count and label rule. Both the required
primary aggregator and the trusted live approval workflow call the same policy;
head, label or review changes are reread before publishing a status.

Timeouts are static configured minutes, ceil(twice the recorded median seconds
divided by 60), minimum one minute. Config retains actual GitHub run/job samples
and the measured median. No new elapsed-time assertion runs in tests. These are
initial hosted samples: three complete successful main runs for the ordinary
jobs and prior PR samples for Windows/macOS packaging. The schema recomputes
the declared median from these samples. Fresh execution may expose a need for
new evidence and an owner-approved change, never an automatic increase.

The complete web artifact has exactly four unfiltered input roots:
`.next/standalone`, `.next/static`, `desktop/dist`, `public/record-sheets`.
Hidden Next output is required; every source public file must appear with
identical bytes inside standalone. Both static copies count. The ZIP uses those
same complete files and verifies every archived path/hash. In-root symlinks are
stored as links without following their referents; their encoded target-path
bytes count as the link's own bytes, and their count/paths are reported separately.
Escaping links fail. Standalone+static
counts file bytes under the first two roots; ZIP counts its actual byte length.
Link targets resolve from each link's own parent. Escape errors include the raw
target, resolved target and artifact root. An internal missing target is reported
as `dangling-in-root`, with a separate count/path census; it is not an escape.
Successful web/installer censuses report zero escaping links only after every
link passes that boundary. A real escaping build-machine path remains a failure.
The release installer census measures every installer in the existing validated
release-upload inventory and reports its maximum, without a byte ceiling. No subset,
exclusion or omission flag is accepted. The existing PR Linux pack job now
produces its complete tar.gz installer as well as the unpacked application;
the exact installer bytes and SHA-256 are recorded. Other platform installers
remain measured by the release gate when produced. No catalog/public byte is
excluded from the web ZIP or Linux application. Valid measurements never fail
because of their magnitude. Missing roots, invalid inventories, escaped links
and public-byte/hash mismatches remain integrity failures.

The PR report shows all three package measurements, comparable main medians,
signed deltas and baseline run/attempt/head identities. Missing or invalid
telemetry is unavailable, never zero. Package rows do not affect report status,
review labels, budget approval or count ratchets. Historical package artifacts
remain readable. Weekly reports retain per-path byte contributors.

The screenshot evidence-quality minimum, defensive bounds on untrusted input,
GitHub summary clipping, CAMP observation protocol bound and Next build heap
allocation remain. Container health behavior and runtime performance proofs
are handled separately from this CI budget policy.

Generated budget reports and the measured web ZIP live under `RUNNER_TEMP`,
outside the checkout, so formatting, lint and source-cache keys cannot consume
them. The shared default-output boundary rejects a workspace-local temp root;
workflow contracts pin report arguments and artifact uploads to runner temp.

G3 owns approval/weekly policy code; G1 owns all workflow wiring. Read-only jobs
prepare source-head graph JSON and timing/census artifacts. The existing trusted
Guard pins its own default-branch SHA, executes no producer code, installs no
dependencies, and writes the final canonical observation and advisory report.
Its producer identity and completed PR Checks source identity remain distinct.
G2 owns canonical producer validation; G3 verifies live artifact/producer/source
provenance before a weekly observation can qualify. Weekly collection has read
permissions; a separate trusted job publishes the issue or a proven lowering.

The primary aggregator enforces live budget approval read-only. Trusted events
publish `CI Budget Raise Approval` and a policy status under the existing
`Lint and Test` required name. Approval first holds that status pending and
upgrades it only after the actual latest GitHub Actions aggregator check passed.
Missing/running checks cannot become green through approval alone. Label/review
revocation fails the existing required context without needing a new required
context setting. Default-branch trusted publishing begins after bootstrap lands;
the bootstrap PR itself runs the required primary policy check read-only.
