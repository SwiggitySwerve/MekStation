# Deterministic CI budgets

`budget-config.mjs` owns the schema, canonical numeric IDs, units, deltas and
lowering API. `config/ci/budgets.json` declares the caps. Decimal MB means
1,000,000 bytes. Unknown/missing inputs fail; counts never substitute for missing
observations. `budget-metrics.mjs` owns collection and observed projections;
G2's `ci-metrics.mjs` owns timing statistics, run normalization and reporting.

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
exclusion or omission flag is accepted. PR pack mode does not produce an
installer; it cannot establish installer compliance or complete ratchet evidence.

G3 owns approval/weekly policy code; G1 owns all workflow wiring. Their workflow
integration is held until the independent policy/reporting changes are on main.
No PR in this lane is merge-ready while live-main counts exceed their caps.
The initial draft intentionally exposes those failures instead of raising caps.
