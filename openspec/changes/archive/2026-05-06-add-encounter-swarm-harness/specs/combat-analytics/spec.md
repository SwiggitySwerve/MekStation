# combat-analytics Spec Delta — Add Encounter Swarm Harness

## ADDED Requirements

### Requirement: Per-Chassis Win/Loss Matrix

`MetricsCollector` SHALL produce a `chassisMatrix` rollup from a batch of `ISimulationRunResult` instances when each result carries `schemaVersion >= 2` and a `participants` payload.

The matrix SHALL be shaped `{ [chassisA: string]: { [chassisB: string]: { wins: number; losses: number; draws: number } } }`, where:

- `chassisA` is a chassis ID that participated on the winning side (or either side, in the draw case).
- `chassisB` is a chassis ID that participated on the losing side (or other side, in the draw case).
- For each run, every (chassisA, chassisB) pair where one participated on each side SHALL be incremented in the appropriate cell.

The matrix SHALL omit self-vs-self entries (a chassis on side A facing the same chassis on side B is recorded as `wins`/`losses` for that single chassis ID with itself as both keys).

#### Scenario: Single-unit-per-side matrix populated correctly

- **GIVEN** a 100-run batch where side A always fields chassis "ATL-D-A" and side B always fields chassis "LCT-1V"
- **AND** side A wins 65 runs, side B wins 30, 5 draws
- **WHEN** `MetricsCollector.aggregateBatchOutcomes` produces `chassisMatrix`
- **THEN** `chassisMatrix['ATL-D-A']['LCT-1V']` SHALL equal `{ wins: 65, losses: 30, draws: 5 }`
- **AND** `chassisMatrix['LCT-1V']['ATL-D-A']` SHALL equal `{ wins: 30, losses: 65, draws: 5 }` (mirror of A's record)

#### Scenario: Matrix row sums equal total runs

- **GIVEN** any 100-run batch with one unit per side
- **WHEN** the matrix is produced
- **THEN** for each chassis, sum(wins + losses + draws across all opponents) SHALL equal the number of runs that chassis participated in

#### Scenario: Multi-unit forces produce N×M cells per run

- **GIVEN** a single run where side A fielded 3 units (chassis [`ATL-D-A`, `ATL-D-A`, `LCT-1V`]) and side B fielded 2 units (chassis [`MAD-3R`, `MAD-3R`]) and side A won
- **WHEN** the matrix is updated for that run
- **THEN** each pair (`ATL-D-A` vs `MAD-3R`, `LCT-1V` vs `MAD-3R`) SHALL increment its cell — duplicate chassis on the same side count once per chassis pairing, not once per pair-of-units, OR alternatively count once per pair-of-units; the chosen counting rule SHALL be documented in the implementation and consistently applied
- **AND** the total of incremented cells SHALL be reproducible from the documented rule given the participants

### Requirement: Gunnery Bracket Performance Rollup

`MetricsCollector` SHALL produce a `gunneryBracket` rollup that buckets each participant's `gunnery` into one of four brackets (`'1-2'`, `'3-4'`, `'5-6'`, `'7+'`) and accumulates wins, losses, and average damage dealt within each bracket.

The result shape SHALL be `{ [bracket: string]: { wins: number; losses: number; draws: number; avgDamageDealt: number } }`.

`avgDamageDealt` SHALL be computed as `totalDamageDealtAcrossAllRunsByPilotsInBracket / countOfRunsByPilotsInBracket`. Damage attribution SHALL be sourced from the existing `damageMatrix` projection (see "Damage Matrix Projection" requirement).

#### Scenario: Bracket boundaries are inclusive at both ends

- **GIVEN** a participant with `gunnery: 2`
- **WHEN** bracket lookup runs
- **THEN** the participant SHALL fall in the `'1-2'` bracket

- **GIVEN** a participant with `gunnery: 3`
- **WHEN** bracket lookup runs
- **THEN** the participant SHALL fall in the `'3-4'` bracket

#### Scenario: Bracket totals reconcile with participant count

- **GIVEN** a 100-run batch with 1 unit per side (200 total participants across all runs)
- **WHEN** the gunnery-bracket rollup is produced
- **THEN** the sum of (wins + losses + draws) across all four brackets SHALL equal 200
- **AND** every participant SHALL be classified into exactly one bracket

#### Scenario: avgDamageDealt is finite when brackets see participation

- **GIVEN** a 100-run batch where the `'5-6'` bracket has at least one participant per run
- **WHEN** `gunneryBracket['5-6'].avgDamageDealt` is read
- **THEN** the value SHALL be a finite non-negative number
- **AND** the value SHALL NOT be `NaN` or `Infinity`

#### Scenario: Empty bracket produces zeroed entry

- **GIVEN** a batch where no participant falls in the `'1-2'` bracket
- **WHEN** the gunnery-bracket rollup is produced
- **THEN** `gunneryBracket['1-2']` SHALL be `{ wins: 0, losses: 0, draws: 0, avgDamageDealt: 0 }`

### Requirement: AI Variant Head-to-Head Matrix

`MetricsCollector` SHALL produce an `aiVariantHeadToHead` rollup keyed by canonical-ordered variant pair (e.g., `'aggressive_vs_defensive'`, NOT both `'aggressive_vs_defensive'` and `'defensive_vs_aggressive'`).

The shape SHALL be `{ [pairKey: string]: { wins: number; losses: number; draws: number; avgTurns: number } }`, where `wins` is from the perspective of the alphabetically-first variant in the pair.

#### Scenario: Canonical ordering avoids double-counting

- **GIVEN** a 200-run batch of `aggressive` (side A) vs `defensive` (side B)
- **AND** another 200-run batch of `defensive` (side A) vs `aggressive` (side B)
- **WHEN** both batches feed into the same rollup
- **THEN** there SHALL be exactly one key `'aggressive_vs_defensive'` (alphabetically first)
- **AND** `wins` SHALL count `aggressive`'s wins from both batches
- **AND** `losses` SHALL count `defensive`'s wins from both batches

#### Scenario: avgTurns reflects actual turn counts

- **GIVEN** an `aggressive_vs_defensive` rollup over 100 runs
- **WHEN** the average is computed
- **THEN** `avgTurns` SHALL equal `sum(run.turnCount) / 100`
- **AND** the value SHALL be greater than zero
- **AND** the value SHALL be less than the configured turn limit (battles that hit the limit are still counted, but they cap at limit)

#### Scenario: Mixed-variant per-side runs are excluded or grouped explicitly

- **GIVEN** a run where side A had two units, one driven by `aggressive` and one driven by `defensive`
- **WHEN** the rollup is updated for that run
- **THEN** the run SHALL be tagged `mixedVariantSide: true` in the result envelope
- **AND** SHALL NOT contribute to any single-pair `aiVariantHeadToHead` cell
- **AND** SHALL be aggregated separately under a `mixedVariantRuns: number` field on the rollup envelope

### Requirement: Per-Pilot Performance Rollup (Vault-Strategy Only)

When the swarm harness uses the vault pilot strategy, `MetricsCollector` SHALL produce a `pilotPerformance` rollup keyed by real `pilotId` (matching `IPilot.id` in `usePilotStore`).

The shape SHALL be `{ [pilotId: string]: { runs: number; wins: number; kills: number; takenWounds: number } }`.

When the swarm harness uses the template-synthesis pilot strategy, `pilotPerformance` SHALL be an empty object `{}` (synthesized pilots have ephemeral IDs that do not correspond to vault pilots, so per-pilot career tracking is not meaningful).

#### Scenario: Vault strategy populates per-pilot stats

- **GIVEN** a 50-run batch with `--pilots vault`, sampling from a 5-pilot vault
- **WHEN** the rollup is produced
- **THEN** `pilotPerformance` SHALL contain entries for each sampled pilot ID
- **AND** the sum of `runs` across all entries SHALL equal `50 × pilotsPerSide × 2`
- **AND** `wins` SHALL be the count of runs where that pilot's side won
- **AND** `kills` SHALL be the count of `UnitDestroyed` events attributed to that pilot's unit (from the existing damage matrix)
- **AND** `takenWounds` SHALL be the count of `PilotHit` events targeting that pilot's unit

#### Scenario: Template strategy emits empty pilot performance

- **GIVEN** a 50-run batch with `--pilots template`
- **WHEN** the rollup is produced
- **THEN** `pilotPerformance` SHALL equal `{}` (empty object)
- **AND** no synthesized pilot ID SHALL appear in any rollup key

### Requirement: Schema-Version-Gated Rollups

`MetricsCollector.aggregateBatchOutcomes` SHALL inspect each `ISimulationRunResult.schemaVersion`. When `schemaVersion === 1` or `participants` is absent, the rollups added in this change (`chassisMatrix`, `gunneryBracket`, `aiVariantHeadToHead`, `pilotPerformance`) SHALL be omitted from the result envelope. When `schemaVersion >= 2` for at least one input, the rollups SHALL be produced.

Existing `damageMatrix`, `killCredits`, and `unitPerformance` rollups (pre-existing in this spec) SHALL continue to be produced regardless of `schemaVersion`. The new rollups are additive.

#### Scenario: Backward compatibility for schemaVersion 1 inputs

- **GIVEN** a 100-run batch where every input result has `schemaVersion: 1`
- **WHEN** `aggregateBatchOutcomes` is called
- **THEN** the existing `damageMatrix` / `killCredits` / `unitPerformance` rollups SHALL be present
- **AND** the new `chassisMatrix` / `gunneryBracket` / `aiVariantHeadToHead` / `pilotPerformance` rollups SHALL NOT be present
- **AND** no error SHALL be thrown

#### Scenario: Mixed-schema-version inputs

- **GIVEN** a 100-run batch where 60 inputs are `schemaVersion: 1` and 40 are `schemaVersion: 2`
- **WHEN** `aggregateBatchOutcomes` is called
- **THEN** the new rollups SHALL be produced from the 40 v2 inputs only
- **AND** the existing rollups SHALL be produced from all 100 inputs
- **AND** the result envelope SHALL note `schemaVersion2RunCount: 40` for transparency
