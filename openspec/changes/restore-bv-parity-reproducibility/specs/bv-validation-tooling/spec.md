# bv-validation-tooling Delta — restore-bv-parity-reproducibility

## ADDED Requirements

### Requirement: Reproducible Committed Reference Dataset

The BV validation harness (`scripts/validate-bv.ts`) SHALL resolve per-unit
reference BV from a reference dataset that is committed to the repository, so a
clean checkout reproduces the documented mech-BV parity number without any
externally generated artifact. The reference dataset SHALL be either the full
MegaMek/MUL BV cache(s) under `scripts/data-migration/`, or a committed fixture
subset anchored by the units the tooling already names (including `atlas-as7-d`),
with the harness defaulting to the committed artifact in CI.

#### Scenario: Clean checkout reproduces parity without external data

- **GIVEN** a fresh clone of the repository with no externally generated cache
- **WHEN** `npm run validate:bv` runs the harness
- **THEN** the harness SHALL resolve reference BV for the represented units from
  the committed reference dataset
- **AND** the within-1% / within-2% / within-3% accuracy percentages SHALL be
  computed over a non-zero validated-unit count.

#### Scenario: Absent reference dataset is a hard error, not silent exclusion

- **GIVEN** the committed reference dataset is missing or empty at runtime
- **WHEN** the harness attempts to resolve reference BV
- **THEN** the harness SHALL print an explicit reference-data error
- **AND** the harness SHALL NOT silently exclude every unit and report
  computed-but-empty accuracy gates.

### Requirement: Fail-Loud Validation Exit Codes

The BV validation harness SHALL exit with a non-zero status code whenever the
parity gate cannot be honestly satisfied: when the reference dataset is
missing or empty, when the count of units with a resolved reference BV falls
below a committed minimum-coverage floor, or when any accuracy gate (within-1% ≥
95.0%, within-2% ≥ 99.0%, within-3% ≥ 99.5%) reports FAIL. The harness SHALL
exit zero only when the reference dataset is present, coverage is at or above the
floor, and all three accuracy gates pass.

#### Scenario: Zero coverage exits non-zero

- **GIVEN** the reference dataset yields no reference BV for any unit
- **WHEN** the harness finishes computing the summary and accuracy gates
- **THEN** the harness SHALL exit with a non-zero status code
- **AND** the harness SHALL NOT exit zero while printing the accuracy gates as
  FAIL.

#### Scenario: Below-floor coverage exits non-zero

- **GIVEN** only a partial reference dataset loads so the validated-unit count is
  below the committed minimum-coverage floor
- **WHEN** the harness computes the validated-unit count
- **THEN** the harness SHALL print the coverage shortfall against the floor
- **AND** the harness SHALL exit with a non-zero status code.

#### Scenario: Accuracy gate failure exits non-zero

- **GIVEN** the reference dataset is present and coverage is at or above the floor
- **WHEN** any of the within-1% / within-2% / within-3% accuracy gates evaluates
  to FAIL
- **THEN** the harness SHALL exit with a non-zero status code distinct from the
  missing-data and below-floor codes.

#### Scenario: Full parity passes and exits zero

- **GIVEN** the committed reference dataset is present, coverage is at or above
  the floor, and all three accuracy gates pass
- **WHEN** the harness completes
- **THEN** the harness SHALL exit with status code zero.

### Requirement: Index Schema Fidelity and No Silent Exclusion

The harness `IndexUnit` interface SHALL match the actual
`public/data/units/battlemechs/index.json` schema, and reference-BV resolution
SHALL NOT depend on an index field that the index no longer provides. A unit for
which no reference BV can be resolved SHALL be routed into an explicit, counted
"no reference available" tally that feeds the fail-loud guards, rather than
collapsing to an undefined value that silently excludes the unit and leaves the
gate green.

#### Scenario: IndexUnit interface matches the real index schema

- **GIVEN** `index.json` units carry the keys `id, chassis, model, tonnage,
  techBase, year, role, rulesLevel, path` and no `bv` field
- **WHEN** the harness types the index entries via the `IndexUnit` interface
- **THEN** the interface SHALL NOT declare a required `bv: number` field that the
  data does not provide
- **AND** `npx tsc --noEmit` SHALL type-check the harness against the real schema.

#### Scenario: Missing reference is counted, never silently excluded

- **GIVEN** a unit has no reference BV in the committed dataset and the index
  carries no `bv` field
- **WHEN** the harness resolves reference BV for that unit
- **THEN** the unit SHALL be recorded in an explicit "no reference available"
  count
- **AND** that count SHALL contribute to the coverage-floor and missing-reference
  fail-loud checks rather than producing a silently-excluded unit that still lets
  the gate pass.
