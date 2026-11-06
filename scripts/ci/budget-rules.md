# Deterministic CI budgets

`budget-config.mjs` owns the schema, canonical numeric IDs, units, deltas and
lowering API. `config/ci/budgets.json` declares the caps. Decimal MB means
1,000,000 bytes. Unknown/missing inputs fail; counts never substitute for missing
observations. `budget-metrics.mjs` owns collection and observed projections;
G2's `ci-metrics.mjs` owns timing statistics, run normalization and reporting.

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
post-run guard has a separate trust boundary and still counts toward nine.
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
initial hosted samples, mostly warm-cache PRs; fresh execution may expose a
need for new evidence and an owner-approved change, never an automatic increase.

The complete web artifact has exactly four unfiltered input roots:
`.next/standalone`, `.next/static`, `desktop/dist`, `public/record-sheets`.
Hidden Next output is required; every source public file must appear with
identical bytes inside standalone. Both static copies count. The ZIP uses those
same complete files and verifies every archived path/hash. Standalone+static
counts file bytes under the first two roots; ZIP counts its actual byte length.
The release installer gate measures every installer in the existing validated
release-upload inventory; the maximum must fit 170,000,000 bytes. No subset,
exclusion or omission flag is accepted. The existing PR Linux pack job now
produces its complete tar.gz installer as well as the unpacked application;
the exact installer bytes and SHA-256 are recorded. Other platform installers
remain measured by the release gate when produced. No catalog/public byte is
excluded from the web ZIP or Linux application to meet the limits.

G3 owns approval/weekly policy code; G1 owns all workflow wiring. Read-only jobs
prepare source-head graph JSON and timing/census artifacts. The existing trusted
Guard pins its own default-branch SHA, executes no producer code, installs no
dependencies, and writes the final canonical observation and advisory report.
Its producer identity and completed PR Checks source identity remain distinct.
G2 owns canonical producer validation; G3 verifies live artifact/producer/source
provenance before a weekly observation can qualify. Weekly collection has read
permissions; a separate trusted job publishes the issue or a proven lowering.

The primary aggregator enforces live budget approval read-only. The Guard and
approval events also publish `CI Budget Raise Approval` for repository policy
and Root's all-green merge gate; making that status a required branch context
is a separate repository setting and must follow bootstrap default-code landing.
No claim of that settings enforcement is made by these files alone.
