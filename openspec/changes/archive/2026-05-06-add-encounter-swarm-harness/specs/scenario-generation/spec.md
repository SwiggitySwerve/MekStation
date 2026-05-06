# scenario-generation Spec Delta — Add Encounter Swarm Harness

## ADDED Requirements

### Requirement: Random Force Generator from Real Catalog

The scenario-generation system SHALL provide a `generateRandomForce` service that produces an `IForce` with `assignments[]` populated from the real 4,196-unit canonical catalog (`public/data/units/battlemechs/index.json`), filtered by configurable BV budget, tonnage range, era, and tech-base constraints.

The generator SHALL:

1. Filter the catalog index by all provided filters (BV bucket implied by budget, tonnage min/max, era, tech-base).
2. Use a `WeightedTable` weighted by inverse-BV (lower-BV chassis weighted higher within the filtered set, so a tight budget naturally prefers lighter mechs).
3. Use a `SeededRandom` instance derived from the per-run seed so the same seed produces the same force.
4. Greedy-fill — pick a unit, subtract its BV from the remaining budget, recompute the weighted table over remaining candidates that fit, repeat until force size reached or remaining budget is within ±5% tolerance.
5. Enforce a duplicate-chassis cap (`Math.ceil(count / 4)` by default) — when the cap is reached for a chassis, exclude it from the candidate set for the rest of the assembly.
6. Throw a `BudgetUnsatisfiableError` carrying the achievable BV range when greedy fill cannot satisfy the budget within tolerance — do NOT retry-loop.

#### Scenario: Generate force within BV tolerance

- **GIVEN** `bvBudget = 5000`, `count = 3`, `era = 3050`, `techBase = 'IS'`, `seed = 42`
- **WHEN** `generateRandomForce` is called
- **THEN** the returned `IForce.assignments[]` SHALL have exactly 3 entries
- **AND** the sum of BVs of the chosen units SHALL fall within [4750, 5250] (5000 ± 5%)
- **AND** every chosen unit SHALL be tagged with era `3050` (or earlier) and tech base `IS` per the catalog index

#### Scenario: Same seed produces same force

- **GIVEN** identical filter inputs and `seed = 42`
- **WHEN** `generateRandomForce` is called twice
- **THEN** both invocations SHALL return byte-identical `IForce.assignments[]` arrays
- **AND** the order of assignments SHALL be identical

#### Scenario: Duplicate chassis cap enforced

- **GIVEN** `count = 8`, default duplicate cap = `Math.ceil(8/4) = 2`
- **WHEN** force assembly proceeds
- **THEN** no chassis SHALL appear more than 2 times in the resulting `assignments[]`

#### Scenario: Unsatisfiable budget throws explicit error

- **GIVEN** `bvBudget = 1500`, `count = 2`, filters that yield only candidates in [800, 1200] BV
- **WHEN** `generateRandomForce` is called (no two-unit roster fits within ±5% of 1500)
- **THEN** `BudgetUnsatisfiableError` SHALL be thrown
- **AND** the error payload SHALL include the achievable BV range
- **AND** no retry SHALL be attempted

#### Scenario: Filter narrows candidate pool

- **GIVEN** `tonnageMin = 80`, `tonnageMax = 100`, era and tech-base unrestricted
- **WHEN** `generateRandomForce` is called
- **THEN** every chosen unit's tonnage SHALL fall in [80, 100]
- **AND** units outside that range SHALL NOT appear in the result

### Requirement: Pilot Synthesis from Skill Template

The scenario-generation system SHALL provide a pilot synthesis path that produces fresh `IPilot` instances from an `IPilotSkillTemplate` (the existing template type used by `IOpForConfig.pilotSkillTemplate`).

Synthesized pilots SHALL:

1. Have unique IDs (UUIDs) generated from the per-run `SeededRandom` so the same seed produces the same pilot IDs.
2. Have `skills.gunnery` drawn uniformly from the template's `gunneryRange` (inclusive both ends).
3. Have `skills.piloting` drawn uniformly from the template's `pilotingRange` (inclusive both ends).
4. NOT be persisted to the canonical pilot vault (`usePilotStore`); they live only for the swarm-run lifetime.

#### Scenario: Synthesized skills land in template band

- **GIVEN** `gunneryRange = [3, 5]`, `pilotingRange = [4, 6]`, `count = 100`, `seed = 42`
- **WHEN** `generateRandomPilots({ strategy: 'template', skillTemplate, count, random, … })` is called
- **THEN** every returned pilot's `skills.gunnery` SHALL fall in [3, 5]
- **AND** every returned pilot's `skills.piloting` SHALL fall in [4, 6]
- **AND** the distribution SHALL not be degenerate (every value in the range SHALL appear at least once for `count = 100` over the full range)

#### Scenario: Synthesized pilots have unique IDs

- **GIVEN** `count = 50` with template synthesis
- **WHEN** the generator returns
- **THEN** all 50 returned `IPilot.id` values SHALL be unique within the run

#### Scenario: Synthesized pilots not persisted to vault

- **GIVEN** the swarm harness has just synthesized 10 pilots for a run
- **WHEN** `usePilotStore.getState().pilots` is read after the run completes
- **THEN** none of the synthesized pilot IDs SHALL appear in the store
- **AND** the vault state SHALL be unchanged from before the run

### Requirement: Force/Pilot Pairing for Swarm Runs

The scenario-generation system SHALL pair generated forces with generated pilots in a deterministic 1:1 mapping (assignment[i] ↔ pilot[i]) and write `pilotId` on each `IForce.assignments[i]`.

The paired output SHALL flow through the existing `encounterToGameSession.buildGameUnitsForForce` function unchanged — random-generated `IForce` + synthesized or sampled `IPilot[]` are valid encounter inputs.

#### Scenario: Pairing is sequential and complete

- **GIVEN** a generated force with 4 assignments and 4 generated pilots
- **WHEN** pairing is applied
- **THEN** `assignments[0].pilotId` SHALL equal `pilots[0].id`
- **AND** `assignments[1].pilotId` SHALL equal `pilots[1].id`
- **AND** every assignment SHALL have a non-null `pilotId`

#### Scenario: Paired output drives existing encounter pipeline

- **GIVEN** a paired `IForce` from the random generator
- **WHEN** `encounterToGameSession.buildGameUnitsForForce(force, side, getPilotById)` is called
- **AND** `getPilotById` is wired to look up the synthesized pilots
- **THEN** the resulting `IGameUnit[]` SHALL carry the synthesized pilot's `gunnery` and `piloting` (not defaults)
- **AND** the existing encounter flow SHALL run end-to-end without code changes to `encounterToGameSession`
