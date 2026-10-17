## MODIFIED Requirements

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
- **AND** `npm run typecheck` SHALL type-check the harness against the real schema.

#### Scenario: Missing reference is counted, never silently excluded

- **GIVEN** a unit has no reference BV in the committed dataset and the index
  carries no `bv` field
- **WHEN** the harness resolves reference BV for that unit
- **THEN** the unit SHALL be recorded in an explicit "no reference available"
  count
- **AND** that count SHALL contribute to the coverage-floor and missing-reference
  fail-loud checks rather than producing a silently-excluded unit that still lets
  the gate pass.
