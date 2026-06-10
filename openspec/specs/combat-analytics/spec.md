# Combat Analytics Specification

## Purpose

The Combat Analytics system provides post-battle statistical analysis and performance metrics for units engaged in combat. It aggregates game events into three complementary views: a damage matrix showing damage dealt and received between units, kill credit tracking for determining unit destruction attribution, and individual unit performance summaries combining damage, kills, and survival status. These analytics enable players to review battle outcomes, analyze unit effectiveness, and track pilot performance across campaigns.
## Requirements
### Requirement: Damage Matrix Projection

The system SHALL project a complete damage matrix from game events, tracking damage dealt and received between all units.

#### Scenario: Damage matrix with single attacker and target

- **GIVEN** events containing a DamageApplied event where unit "mech-1" deals 15 damage to "mech-2"
- **WHEN** `projectDamageMatrix` is called
- **THEN** the matrix SHALL contain an entry for "mech-1" → "mech-2" with value 15
- **AND** totalDealt for "mech-1" SHALL be 15
- **AND** totalReceived for "mech-2" SHALL be 15

#### Scenario: Damage matrix accumulates multiple attacks

- **GIVEN** events containing three DamageApplied events: "mech-1" → "mech-2" (10 damage), "mech-1" → "mech-2" (5 damage), "mech-1" → "mech-2" (8 damage)
- **WHEN** `projectDamageMatrix` is called
- **THEN** the matrix entry for "mech-1" → "mech-2" SHALL be 23
- **AND** totalDealt for "mech-1" SHALL be 23
- **AND** totalReceived for "mech-2" SHALL be 23

#### Scenario: Damage matrix handles multiple attackers and targets

- **GIVEN** events containing: "mech-1" → "mech-2" (10), "mech-1" → "mech-3" (8), "mech-2" → "mech-1" (12), "mech-3" → "mech-1" (5)
- **WHEN** `projectDamageMatrix` is called
- **THEN** totalDealt for "mech-1" SHALL be 18
- **AND** totalDealt for "mech-2" SHALL be 12
- **AND** totalDealt for "mech-3" SHALL be 5
- **AND** totalReceived for "mech-1" SHALL be 17
- **AND** totalReceived for "mech-2" SHALL be 10
- **AND** totalReceived for "mech-3" SHALL be 8

#### Scenario: Damage matrix handles self/environment damage

- **GIVEN** events containing a DamageApplied event with sourceUnitId=null (self/environment damage) dealing 6 damage to "mech-1"
- **WHEN** `projectDamageMatrix` is called
- **THEN** the matrix SHALL contain an entry for "Self/Environment" → "mech-1" with value 6
- **AND** totalDealt for "Self/Environment" SHALL be 6
- **AND** totalReceived for "mech-1" SHALL be 6

#### Scenario: Damage matrix ignores non-DamageApplied events

- **GIVEN** events containing DamageApplied, UnitDestroyed, and other event types
- **WHEN** `projectDamageMatrix` is called
- **THEN** only DamageApplied events SHALL be processed
- **AND** the matrix SHALL not contain entries for non-damage events

#### Scenario: Damage matrix returns immutable structures

- **GIVEN** a damage matrix returned from `projectDamageMatrix`
- **WHEN** attempting to modify the matrix, totalDealt, or totalReceived maps
- **THEN** the operation SHALL fail (ReadonlyMap prevents mutation)
- **AND** the original matrix data SHALL remain unchanged

### Requirement: Kill Credit Tracking

The system SHALL track unit destruction events and attribute kill credits to responsible units.

#### Scenario: Kill credit with identified killer

- **GIVEN** events containing a UnitDestroyed event where "mech-1" kills "mech-2" on turn 5
- **WHEN** `projectKillCredits` is called
- **THEN** the credits array SHALL contain an entry with killerId="mech-1", victimId="mech-2", turn=5

#### Scenario: Kill credit with environment kill

- **GIVEN** events containing a UnitDestroyed event where killerUnitId=undefined (environment kill) destroys "mech-3" on turn 8
- **WHEN** `projectKillCredits` is called
- **THEN** the credits array SHALL contain an entry with killerId=undefined, victimId="mech-3", turn=8

#### Scenario: Kill credits accumulate multiple destructions

- **GIVEN** events containing three UnitDestroyed events: "mech-1" kills "mech-2" (turn 3), "mech-1" kills "mech-3" (turn 5), "mech-2" kills "mech-4" (turn 6)
- **WHEN** `projectKillCredits` is called
- **THEN** the credits array SHALL have length 3
- **AND** credits[0] SHALL have killerId="mech-1", victimId="mech-2", turn=3
- **AND** credits[1] SHALL have killerId="mech-1", victimId="mech-3", turn=5
- **AND** credits[2] SHALL have killerId="mech-2", victimId="mech-4", turn=6

#### Scenario: Kill credits ignores non-UnitDestroyed events

- **GIVEN** events containing UnitDestroyed, DamageApplied, and other event types
- **WHEN** `projectKillCredits` is called
- **THEN** only UnitDestroyed events SHALL be processed
- **AND** the credits array SHALL not contain entries for non-destruction events

#### Scenario: Kill credits returns immutable array

- **GIVEN** kill credits returned from `projectKillCredits`
- **WHEN** attempting to modify the returned array
- **THEN** the operation SHALL fail (readonly array prevents mutation)
- **AND** the original credits data SHALL remain unchanged

### Requirement: Unit Performance Aggregation

The system SHALL aggregate combat statistics for a specific unit, combining damage dealt, damage received, kills, and survival status.

#### Scenario: Unit performance with damage dealt only

- **GIVEN** events containing a DamageApplied event where "mech-1" deals 25 damage to "mech-2"
- **WHEN** `projectUnitPerformance` is called with unitId="mech-1"
- **THEN** the performance object SHALL have damageDealt=25, damageReceived=0, kills=0, survived=true

#### Scenario: Unit performance with damage received only

- **GIVEN** events containing a DamageApplied event where "mech-2" deals 18 damage to "mech-1"
- **WHEN** `projectUnitPerformance` is called with unitId="mech-1"
- **THEN** the performance object SHALL have damageDealt=0, damageReceived=18, kills=0, survived=true

#### Scenario: Unit performance with kills

- **GIVEN** events containing two UnitDestroyed events where "mech-1" kills "mech-2" and "mech-3"
- **WHEN** `projectUnitPerformance` is called with unitId="mech-1"
- **THEN** the performance object SHALL have kills=2, survived=true

#### Scenario: Unit performance with unit destroyed

- **GIVEN** events containing a UnitDestroyed event where "mech-1" is destroyed
- **WHEN** `projectUnitPerformance` is called with unitId="mech-1"
- **THEN** the performance object SHALL have survived=false

#### Scenario: Unit performance aggregates all metrics

- **GIVEN** events containing: "mech-1" deals 30 damage, receives 22 damage, kills 2 units, and is destroyed on turn 7
- **WHEN** `projectUnitPerformance` is called with unitId="mech-1"
- **THEN** the performance object SHALL have damageDealt=30, damageReceived=22, kills=2, survived=false, unitId="mech-1"

#### Scenario: Unit performance with no events

- **GIVEN** events containing no DamageApplied or UnitDestroyed events for "mech-1"
- **WHEN** `projectUnitPerformance` is called with unitId="mech-1"
- **THEN** the performance object SHALL have damageDealt=0, damageReceived=0, kills=0, survived=true, unitId="mech-1"

#### Scenario: Unit performance ignores other units' events

- **GIVEN** events containing damage between "mech-2" and "mech-3" (not involving "mech-1")
- **WHEN** `projectUnitPerformance` is called with unitId="mech-1"
- **THEN** the performance object SHALL have damageDealt=0, damageReceived=0, kills=0, survived=true

### Requirement: Event Payload Extraction

The system SHALL use type-safe event payload extractors from the game-event-system to safely extract damage and destruction data.

#### Scenario: Damage matrix uses getDamageAppliedPayload

- **GIVEN** events containing DamageApplied events with valid payloads
- **WHEN** `projectDamageMatrix` is called
- **THEN** it SHALL invoke `getDamageAppliedPayload` for each DamageApplied event
- **AND** it SHALL skip events where `getDamageAppliedPayload` returns null

#### Scenario: Kill credits uses getUnitDestroyedPayload

- **GIVEN** events containing UnitDestroyed events with valid payloads
- **WHEN** `projectKillCredits` is called
- **THEN** it SHALL invoke `getUnitDestroyedPayload` for each UnitDestroyed event
- **AND** it SHALL skip events where `getUnitDestroyedPayload` returns null

#### Scenario: Unit performance uses both payload extractors

- **GIVEN** events containing both DamageApplied and UnitDestroyed events
- **WHEN** `projectUnitPerformance` is called
- **THEN** it SHALL use `getDamageAppliedPayload` for damage events
- **AND** it SHALL use `getUnitDestroyedPayload` for destruction events
- **AND** it SHALL handle null payloads gracefully

### Requirement: BV Advantage Calculation

The system SHALL calculate Battle Value advantage percentage between two forces, indicating player advantage or disadvantage.

**Source**: `src/utils/simulation-viewer/calculations.ts:10-17`

#### Scenario: BV advantage with player superiority

- **GIVEN** playerBV=2000 and enemyBV=1500
- **WHEN** `calculateBVAdvantage` is called
- **THEN** the result SHALL be 33.33 (rounded to 2 decimal places)
- **AND** the positive value SHALL indicate player advantage

#### Scenario: BV advantage with player disadvantage

- **GIVEN** playerBV=1200 and enemyBV=1800
- **WHEN** `calculateBVAdvantage` is called
- **THEN** the result SHALL be -33.33 (rounded to 2 decimal places)
- **AND** the negative value SHALL indicate player disadvantage

#### Scenario: BV advantage with equal forces

- **GIVEN** playerBV=1500 and enemyBV=1500
- **WHEN** `calculateBVAdvantage` is called
- **THEN** the result SHALL be 0.00
- **AND** the zero value SHALL indicate balanced forces

#### Scenario: BV advantage with zero enemy BV

- **GIVEN** playerBV=2000 and enemyBV=0
- **WHEN** `calculateBVAdvantage` is called
- **THEN** the result SHALL be 100
- **AND** the system SHALL handle division by zero gracefully

### Requirement: Comparison Delta Calculation

The system SHALL calculate comparison deltas between current and baseline values, returning both absolute and percentage change.

**Source**: `src/utils/simulation-viewer/calculations.ts:28-38`

#### Scenario: Comparison delta with positive change

- **GIVEN** current=120 and baseline=100
- **WHEN** `calculateComparisonDelta` is called
- **THEN** the result SHALL have absolute=20 and percentage=20.00
- **AND** both values SHALL be rounded to 2 decimal places

#### Scenario: Comparison delta with negative change

- **GIVEN** current=80 and baseline=100
- **WHEN** `calculateComparisonDelta` is called
- **THEN** the result SHALL have absolute=-20 and percentage=-20.00

#### Scenario: Comparison delta with zero baseline

- **GIVEN** current=50 and baseline=0
- **WHEN** `calculateComparisonDelta` is called
- **THEN** the result SHALL have absolute=50 and percentage=0
- **AND** the system SHALL handle division by zero gracefully

### Requirement: Currency Formatting

The system SHALL format currency values in C-Bills with thousands separators and unit suffix.

**Source**: `src/utils/simulation-viewer/formatting.ts:8-11`

#### Scenario: Currency formatting with millions

- **GIVEN** amount=1234567
- **WHEN** `formatCurrency` is called
- **THEN** the result SHALL be "$1,234,567 C-Bills"
- **AND** thousands separators SHALL use en-US locale format

#### Scenario: Currency formatting with thousands

- **GIVEN** amount=45000
- **WHEN** `formatCurrency` is called
- **THEN** the result SHALL be "$45,000 C-Bills"

#### Scenario: Currency formatting with small amounts

- **GIVEN** amount=500
- **WHEN** `formatCurrency` is called
- **THEN** the result SHALL be "$500 C-Bills"

### Requirement: Duration Formatting

The system SHALL format duration in milliseconds to human-readable strings with appropriate time units.

**Source**: `src/utils/simulation-viewer/formatting.ts:23-35`

#### Scenario: Duration formatting with hours

- **GIVEN** milliseconds=9000000 (2h 30m)
- **WHEN** `formatDuration` is called
- **THEN** the result SHALL be "2h 30m"
- **AND** seconds SHALL be omitted when hours are present

#### Scenario: Duration formatting with minutes

- **GIVEN** milliseconds=150000 (2m 30s)
- **WHEN** `formatDuration` is called
- **THEN** the result SHALL be "2m 30s"
- **AND** hours SHALL be omitted when zero

#### Scenario: Duration formatting with seconds only

- **GIVEN** milliseconds=45000 (45s)
- **WHEN** `formatDuration` is called
- **THEN** the result SHALL be "45s"
- **AND** minutes and hours SHALL be omitted when zero

### Requirement: Drill-Down Navigation

The system SHALL manage drill-down navigation between tabs with filter context, breadcrumb trails, and scroll position preservation.

**Source**: `src/utils/simulation-viewer/navigation.ts:47-162`

#### Scenario: Navigate to target tab with filters

- **GIVEN** a navigation context with sourceTab="campaign-dashboard", targetTab="encounter-history", filters={outcome: "victory"}
- **WHEN** `navigateTo` is called
- **THEN** the current scroll position SHALL be saved for the source tab
- **AND** a breadcrumb SHALL be added with the source tab, label, and filters
- **AND** the breadcrumb trail SHALL be updated

#### Scenario: Navigate back to previous tab

- **GIVEN** a breadcrumb trail with 2 entries
- **WHEN** `navigateBack` is called
- **THEN** the last breadcrumb SHALL be removed from the trail
- **AND** the scroll position SHALL be restored for the previous tab
- **AND** the previous breadcrumb SHALL be returned

#### Scenario: Navigate back with empty trail

- **GIVEN** an empty breadcrumb trail
- **WHEN** `navigateBack` is called
- **THEN** the result SHALL be null
- **AND** no scroll position SHALL be restored

#### Scenario: Check navigation back availability

- **GIVEN** a breadcrumb trail with 1 entry
- **WHEN** `canNavigateBack` is called
- **THEN** the result SHALL be true

#### Scenario: Reset navigation state

- **GIVEN** a navigation state with breadcrumbs and scroll positions
- **WHEN** `reset` is called
- **THEN** the breadcrumb trail SHALL be empty
- **AND** all scroll positions SHALL be cleared

### Requirement: Encounter History Page

The system SHALL provide an Encounter History page component displaying battle list, forces, damage matrix, key moments, event timeline, and comparison sections.

**Source**: `src/components/simulation-viewer/pages/EncounterHistory.tsx:28-146`

#### Scenario: Render encounter history with battles

- **GIVEN** a campaign with 5 battles
- **WHEN** the EncounterHistory component is rendered
- **THEN** the BattleListSidebar SHALL display all 5 battles
- **AND** the battle detail area SHALL show "Select a battle to view details"
- **AND** the component SHALL have data-campaign-id attribute

#### Scenario: Select a battle

- **GIVEN** a rendered EncounterHistory with battles
- **WHEN** a battle is selected from the sidebar
- **THEN** the selectedBattleId state SHALL be updated
- **AND** the currentTurn state SHALL be reset to 1
- **AND** the onSelectBattle callback SHALL be invoked
- **AND** all battle sections SHALL be rendered (Forces, DamageMatrix, KeyMoments, EventTimeline, Comparison)

#### Scenario: Drill down from damage matrix

- **GIVEN** a selected battle with damage matrix
- **WHEN** a drill-down link is clicked in the damage matrix section
- **THEN** the onDrillDown callback SHALL be invoked with targetTab and filter context

#### Scenario: Navigate to key moment

- **GIVEN** a selected battle with key moments
- **WHEN** a key moment is clicked
- **THEN** the currentTurn state SHALL be updated to the moment's turn
- **AND** the event timeline SHALL scroll to that turn

### Requirement: Campaign Dashboard Page

The system SHALL provide a Campaign Dashboard page component displaying roster, force status, financial overview, progression, top performers, and warnings.

**Source**: `src/components/simulation-viewer/pages/CampaignDashboard.tsx:175-569`

#### Scenario: Render campaign dashboard with metrics

- **GIVEN** campaign metrics with roster, force, financial, progression, and warnings data
- **WHEN** the CampaignDashboard component is rendered
- **THEN** 6 sections SHALL be displayed: Roster, Force Status, Financial Overview, Progression, Top Performers, Warnings
- **AND** each section SHALL have a heading and drill-down link
- **AND** the component SHALL have data-campaign-id attribute

#### Scenario: Display roster KPIs

- **GIVEN** roster metrics with active=12, wounded=3, kia=1
- **WHEN** the Roster section is rendered
- **THEN** 3 KPICards SHALL be displayed with correct values
- **AND** the Active card SHALL have green border (border-l-4 border-green-500)
- **AND** the Wounded card SHALL have amber border
- **AND** the KIA card SHALL have red border

#### Scenario: Filter financial trend by time range

- **GIVEN** financial trend data spanning 90 days
- **WHEN** the time range is changed to "7d"
- **THEN** the TrendChart SHALL display only the last 7 days of data
- **AND** the time range selector SHALL show "7d" as active

#### Scenario: Sort top performers by kills

- **GIVEN** 5 performers with varying kills, XP, and missions
- **WHEN** the "Kills" sort button is clicked
- **THEN** performers SHALL be sorted by kills in descending order
- **AND** the kills value SHALL be highlighted in blue
- **AND** an accessibility announcement SHALL be made

#### Scenario: Dismiss a warning

- **GIVEN** 3 active warnings
- **WHEN** the dismiss button is clicked on a warning
- **THEN** the warning SHALL be removed from the active warnings list
- **AND** an accessibility announcement SHALL be made
- **AND** the warning count SHALL be updated

### Requirement: Analysis & Bugs Page

The system SHALL provide an Analysis & Bugs page component displaying invariant status, anomaly alerts, violation log, and threshold configuration.

**Source**: `src/components/simulation-viewer/pages/AnalysisBugs.tsx:255-642`

#### Scenario: Render analysis page with invariants

- **GIVEN** 12 invariant check results
- **WHEN** the AnalysisBugs component is rendered
- **THEN** the Invariant Status section SHALL display a 4-column grid of invariant cards
- **AND** each card SHALL show name, status badge, description, last checked time, and failure count

#### Scenario: Display anomaly alerts

- **GIVEN** 3 anomalies (2 active, 1 dismissed)
- **WHEN** the Anomaly Alerts section is rendered
- **THEN** 2 AnomalyAlertCards SHALL be displayed in a horizontal scroll container
- **AND** the dismissed anomaly SHALL be hidden by default
- **AND** a "Show Dismissed" toggle button SHALL be visible

#### Scenario: Toggle dismissed anomalies

- **GIVEN** anomalies with some dismissed
- **WHEN** the "Show Dismissed" button is clicked
- **THEN** all anomalies SHALL be displayed including dismissed ones
- **AND** the button text SHALL change to "Hide Dismissed"

#### Scenario: Filter violation log by severity

- **GIVEN** 50 violations with mixed severities
- **WHEN** the severity filter is set to ["critical", "warning"]
- **THEN** the VirtualizedViolationLog SHALL display only critical and warning violations
- **AND** the violation count SHALL be updated

#### Scenario: Adjust detector threshold

- **GIVEN** heatSuicide threshold at 80
- **WHEN** the slider is moved to 90
- **THEN** the localThresholds state SHALL be updated to 90
- **AND** the threshold value display SHALL show 90
- **AND** the affected anomaly count SHALL be recalculated

#### Scenario: Reset thresholds to defaults

- **GIVEN** modified thresholds
- **WHEN** the "Reset to Defaults" button is clicked
- **THEN** all thresholds SHALL be set to DEFAULT_THRESHOLDS values
- **AND** an accessibility announcement SHALL be made

#### Scenario: Save threshold changes

- **GIVEN** modified thresholds
- **WHEN** the "Save Thresholds" button is clicked
- **THEN** the onThresholdChange callback SHALL be invoked for each threshold
- **AND** an accessibility announcement SHALL be made

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

### Requirement: Aggregate Metrics Reconcile Against Current MAX_TURNS

`MetricsCollector.getAggregate()` and `swarmAggregation`'s `averageTurns` / `incompleteGameRate` fields SHALL compute against the current `MAX_TURNS = 100` engine ceiling. Any field whose semantics depend on the ceiling MUST be re-derived if `MAX_TURNS` changes; consumers MUST NOT cache the prior `MAX_TURNS = 10` ceiling-dependent values across releases.

#### Scenario: averageTurns reflects up to 100 turns

- **GIVEN** a 100-run swarm where every game runs to natural completion under 100 turns
- **WHEN** the aggregator computes `averageTurns`
- **THEN** the returned value MUST reflect the actual turn counts (typically 15-50 for real catalog 2v2)
- **AND** the value MUST NOT be silently capped at 10 (the prior ceiling)

#### Scenario: incompleteGameRate accounts for the new ceiling

- **GIVEN** a 100-run swarm with the engine at `MAX_TURNS = 100`
- **WHEN** the aggregator runs
- **THEN** `incompleteGameRate` MUST be 0 if all games concluded under 100 turns
- **AND** the rate MUST NOT report against any prior ceiling (e.g., 10)

### Requirement: Schema Versioning Tracks Aggregation Surface Changes

When the aggregation surface adds or removes fields driven by combat-fidelity work, the `ISimulationRunResult.schemaVersion` MUST bump. Consumers reading older schema versions MUST receive backward-compatible payloads; consumers reading the new schema MAY rely on the added fields.

#### Scenario: schemaVersion 1 consumer receives prior shape

- **GIVEN** a `MetricsCollector` populated from `schemaVersion: 1` simulation results
- **WHEN** the consumer calls `getAggregate()`
- **THEN** the returned `IAggregateMetrics` MUST contain the prior-shape fields only
- **AND** new combat-fidelity fields (e.g., `criticalHitsLanded`, `componentDestroyedCount`) MUST be absent or `undefined`

#### Scenario: schemaVersion 2 consumer receives extended shape

- **GIVEN** a `MetricsCollector` populated from `schemaVersion: 2` simulation results that include `participants[]` and event-derived combat metrics
- **WHEN** the consumer calls `getAggregate()`
- **THEN** the returned aggregate MUST include the schema-version-2 fields with non-undefined values

### Requirement: MetricsCollector Hydrates From Event Log

`MetricsCollector.recordGame()` at `src/simulation/metrics/MetricsCollector.ts` SHALL parse the typed event log of each `ISimulationRunResult` and populate the previously-stub fields `playerUnitsStart`, `playerUnitsEnd`, `opponentUnitsStart`, `opponentUnitsEnd`, and `totalDamageDealt`. New fields `criticalHitsLanded`, `componentDestroyedCount`, `ammoExplosions`, `shutdowns`, `falls`, and `pilotHits` MUST also populate from event types `CriticalHit`, `ComponentDestroyed`, `AmmoExplosion`, `HeatEffectApplied { effect: 'shutdown' }`, `UnitFell`, and `PilotHit` respectively.

#### Scenario: Atlas-vs-Atlas mirror records non-zero damage

- **GIVEN** a seeded Atlas-vs-Atlas mirror match running for 10 turns
- **WHEN** `MetricsCollector.recordGame()` consumes the result
- **THEN** `metrics.totalDamageDealt` MUST equal the sum of all `DamageApplied.damage` values in the event log
- **AND** `metrics.playerUnitsStart` MUST equal 1
- **AND** `metrics.criticalHitsLanded` MUST equal the count of `CriticalHit` events in the log

#### Scenario: Game with shutdowns records the count

- **GIVEN** a scenario where one unit shuts down twice via heat
- **WHEN** `recordGame()` runs
- **THEN** `metrics.shutdowns` MUST equal 2

### Requirement: Per-Chassis Aggregation Surfaces Combat Fidelity Metrics

`swarmAggregation` at `src/simulation/metrics/swarmAggregation.ts` SHALL extend the per-chassis `chassisMatrix` rollup with combat-fidelity metrics: `criticalsLandedAvg`, `componentsDestroyedAvg`, `ammoExplosionsAvg`, `shutdownsAvg`, and `fallsAvg` per chassis matchup. These rollups MUST be schema-version-gated under `schemaVersion: 2` for backward compatibility with consumers expecting the prior aggregation shape.

#### Scenario: Atlas chassis-matrix entry includes per-unit crit average

- **GIVEN** a 100-run swarm of Atlas-vs-Locust matches with `schemaVersion: 2`
- **WHEN** `aggregateSwarmRuns()` produces the rollup
- **THEN** `chassisMatrix['atlas-as7-d']['locust-lct-1v'].criticalsLandedAvg` MUST equal the mean `criticalHitsLanded` across the 100 runs
- **AND** schemaVersion 1 consumers MUST receive the prior rollup shape unchanged

### Requirement: Event Log Replay Determinism Audit

The combat-fidelity test suite SHALL include a determinism audit that runs the same seeded scenario twice and asserts the resulting event logs are byte-identical. This closes the regression channel that PR #514's `MAX_TURNS=10 → 100` bump exposed (a ~1-event-over-300 divergence on `STANDARD_LANCE` seeded runs).

#### Scenario: Atlas-vs-Atlas mirror with same seed produces identical event logs

- **GIVEN** two fresh `SimulationRunner` instances each seeded with `42`
- **WHEN** each runs the same 10-turn Atlas-vs-Atlas scenario with the same `SeededD6Roller`
- **THEN** `result1.events.length` MUST equal `result2.events.length`
- **AND** `JSON.stringify(result1.events)` MUST equal `JSON.stringify(result2.events)`

#### Scenario: Cross-engine determinism on 200-turn battle

- **GIVEN** the same seeded Atlas-vs-Atlas scenario run for 200 turns (well beyond the masked `MAX_TURNS=10` ceiling)
- **WHEN** the determinism audit compares two reseeded runs
- **THEN** they MUST agree byte-for-byte on the full event log

### Requirement: EventLogQuery Filter Utility Contract

The simulation core SHALL ship a chainable, immutable query utility at `src/simulation/core/EventLogQuery.ts` that wraps a `readonly IGameEvent[]` and exposes filter methods. Each method SHALL return a NEW `EventLogQuery` instance — the underlying event array is never mutated and never copied. Consumers (metrics collectors, scenario tests, future UI replays) SHALL use this utility instead of inline `events.filter(e => e.type === X && e.payload.unitId === Y)` predicates.

The utility MUST expose at minimum these methods:

```ts
class EventLogQuery {
  static from(events: readonly IGameEvent[]): EventLogQuery;
  ofType<T extends GameEventType>(type: T): EventLogQuery;
  byUnit(unitId: string): EventLogQuery;
  bySide(side: GameSide): EventLogQuery;
  inTurn(turn: number): EventLogQuery;
  inPhase(phase: GamePhase): EventLogQuery;
  whereActor(predicate: (actorId: string) => boolean): EventLogQuery;
  toArray(): readonly IGameEvent[];
  count(): number;
  first(): IGameEvent | undefined;
}
```

Method semantics:

- `from(events)` — entry point; SHALL NOT copy the array (just wrap by reference for chainable filtering).
- `ofType(type)` — keeps events whose `event.type` equals the argument.
- `byUnit(unitId)` — keeps events whose `event.actorId === unitId` OR whose `event.payload.unitId === unitId` (covers both author and target attribution).
- `bySide(side)` — keeps events whose envelope `event.side` equals the argument. For legacy event streams without `event.side`, the utility MAY fall back to the actorId-prefix lookup (`MetricsCollector.sideFromUnitId`) for back-compat.
- `inTurn(turn)` — keeps events whose `event.turn` equals the argument.
- `inPhase(phase)` — keeps events whose `event.phase` equals the argument.
- `whereActor(predicate)` — keeps events whose `event.actorId` (when present) satisfies the predicate; events with no `actorId` are dropped.
- `toArray()` — returns the current filtered readonly array (no copy; the inner array is exposed directly).
- `count()` — returns the length of the current filtered array.
- `first()` — returns the first event of the current filtered array, or `undefined` if empty.

Chainable methods SHALL be order-independent — `query.ofType(X).bySide(Y)` and `query.bySide(Y).ofType(X)` SHALL produce the same result.

`MetricsCollector` and `combatFidelityTally` SHALL adopt this utility, replacing existing inline `events.filter(...)` chains. The refactor SHALL be behavior-equivalent — existing scenario tests, Monte Carlo distribution tests, and combat-fidelity unit tests are the regression net.

#### Scenario: ofType narrows to a single event type

- **GIVEN** a 100-event log with 30 `damage_applied`, 50 `attack_resolved`, and 20 other types
- **WHEN** `EventLogQuery.from(events).ofType(GameEventType.DamageApplied).count()` is called
- **THEN** the result SHALL be 30

#### Scenario: byUnit matches both actor and payload-unit attribution

- **GIVEN** a log with one event where `actorId: 'player-1'` and one event where `payload.unitId: 'player-1'` (target attribution, e.g. `damage_applied` with `sourceUnitId: 'opponent-2'` but `payload.unitId: 'player-1'`)
- **WHEN** `EventLogQuery.from(events).byUnit('player-1').toArray()` is called
- **THEN** the result SHALL contain BOTH events

#### Scenario: bySide reads envelope side first, falls back for legacy streams

- **GIVEN** a log where some events have `event.side: 'player'` (post-PR B) and others have only `actorId: 'player-1'` (legacy, no envelope side)
- **WHEN** `EventLogQuery.from(events).bySide(GameSide.Player).toArray()` is called
- **THEN** the result SHALL contain ALL player-side events regardless of which side-source the event was authored from

#### Scenario: Order-independence of chained filters

- **GIVEN** any event log
- **WHEN** `EventLogQuery.from(events).ofType(GameEventType.DamageApplied).bySide(GameSide.Player).toArray()` is called
- **AND** `EventLogQuery.from(events).bySide(GameSide.Player).ofType(GameEventType.DamageApplied).toArray()` is called
- **THEN** both results SHALL contain identical events in identical order

#### Scenario: Chained methods are immutable (no mutation of intermediate queries)

- **GIVEN** a query `q = EventLogQuery.from(events)` and a derived `q2 = q.ofType(GameEventType.DamageApplied)`
- **WHEN** `q.count()` is called
- **THEN** the result SHALL be `events.length` (the original unfiltered count)
- **AND** `q2.count()` SHALL be the filtered count

### Requirement: Replay State-From-Events Reducer Contract

The covered event families and their mutations SHALL include:

| Event type | Mutation |
|---|---|
| `GameCreated` | Seeds the initial `tokens` array from `payload.units` and sets `mapRadius = payload.config.mapRadius`. When `payload.hexTerrain` is present, it SHALL also seed `hexTerrain` before later terrain mutations apply. |

#### Scenario: GameCreated seeds initial replay terrain

- **GIVEN** an event log containing `GameCreated` with `payload.hexTerrain` for a heavy-woods elevation-2 hex
- **WHEN** the replay reducer walks to sequence 0
- **THEN** `hexTerrain` SHALL include that heavy-woods elevation-2 hex
- **AND** later `TerrainChanged` events for the same coordinate SHALL override the seeded terrain at or after their sequence

### Requirement: Replay Timeline Key-Moment Markers Contract

The application SHALL ship two timeline overlay components — `KeyMomentMarkers` and `PhaseChangeMarkers` — that render on top of the existing `<ReplayTimeline>` track to surface high-value events at a glance and let the user click-to-seek to those events.

`KeyMomentMarkers` (`src/components/audit/replay/KeyMomentMarkers.tsx`) SHALL:

- Accept props `{ events: readonly IGameEvent[]; minSequence: number; maxSequence: number; onSeek: (progress: number) => void }`.
- Filter the event log via `EventLogQuery.from(events)` for the five key-moment types and render one colored badge per match at the timeline-relative position `(event.sequence - minSequence) / (maxSequence - minSequence)`:
  - `UnitDestroyed` → red badge
  - `CriticalHit` and `CriticalHitResolved` → orange badge
  - `AmmoExplosion` → purple badge
  - `PilotHit` → yellow badge
  - `UnitFell` → gray badge
- On badge click, invoke `onSeek(position)` with the badge's relative position so the parent scrubber jumps to that event's `sequence`.
- Render NOTHING when `events.length === 0` or no event matches the five key-moment types.

`PhaseChangeMarkers` (`src/components/audit/replay/PhaseChangeMarkers.tsx`) SHALL:

- Accept the same prop shape as `KeyMomentMarkers`.
- Render dotted vertical lines at every `TurnStarted` and `PhaseChanged` event's relative position.
- On hover, render a tooltip displaying `Turn ${event.turn} — ${formattedPhase}` (e.g. "Turn 7 — Weapon Attack"), using a human-readable phase label derived from the `GamePhase` enum.
- Render NOTHING when no events match.

`<ReplayTimeline>` (`src/components/audit/replay/ReplayTimeline.tsx`) SHALL accept two optional new props:

```ts
interface ReplayTimelineProps {
  // ... existing props ...
  /**
   * Gameplay event log used to derive key-moment + phase-change overlays.
   * When omitted, no overlays render (existing audit-store consumers are unaffected).
   */
  keyMoments?: readonly IGameEvent[];
  phaseChanges?: readonly IGameEvent[];
}
```

When `keyMoments` is provided, `<ReplayTimeline>` SHALL render `<KeyMomentMarkers>` as an overlay above the track. When `phaseChanges` is provided, it SHALL render `<PhaseChangeMarkers>` as an overlay above the track. Both overlays SHALL forward `onSeek` from the timeline's existing seek callback so badge clicks scrub the player.

#### Scenario: Key-moment markers render at the correct positions

- **GIVEN** an event log with one `UnitDestroyed` at sequence 50, one `CriticalHit` at sequence 100, and `minSequence: 0, maxSequence: 200`
- **WHEN** `<KeyMomentMarkers events={log} minSequence={0} maxSequence={200} onSeek={seek}>` mounts
- **THEN** two badges render
- **AND** the `UnitDestroyed` badge sits at left: 25% (50/200)
- **AND** the `CriticalHit` badge sits at left: 50% (100/200)
- **AND** the `UnitDestroyed` badge has the red color class
- **AND** the `CriticalHit` badge has the orange color class

#### Scenario: Clicking a key-moment badge seeks the timeline

- **GIVEN** a `<KeyMomentMarkers>` rendered with one `UnitDestroyed` at sequence 50 in a [0, 200] range
- **WHEN** the user clicks the badge
- **THEN** `onSeek(0.25)` is called exactly once

#### Scenario: Phase-change markers render at every TurnStarted and PhaseChanged

- **GIVEN** an event log containing `TurnStarted` at sequences 10, 30, 50 and `PhaseChanged` at sequences 15, 35, 55
- **WHEN** `<PhaseChangeMarkers>` mounts
- **THEN** six dotted vertical lines render
- **AND** hovering each line reveals a tooltip with `Turn N — <phase>`

#### Scenario: ReplayTimeline composes overlays only when the optional props are set

- **GIVEN** a `<ReplayTimeline>` rendered without the `keyMoments` or `phaseChanges` props
- **WHEN** the timeline mounts
- **THEN** neither `<KeyMomentMarkers>` nor `<PhaseChangeMarkers>` renders
- **AND** the existing audit-style markers prop continues to render unchanged

#### Scenario: Empty event log renders no marker overlays

- **GIVEN** `<KeyMomentMarkers events={[]} ...>` and `<PhaseChangeMarkers events={[]} ...>`
- **WHEN** the components mount
- **THEN** both render an empty fragment (no badges, no lines)

## Data Model Requirements

### TabType Enumeration

**Source**: `src/utils/simulation-viewer/navigation.ts:8-11`

```typescript
type TabType = 'campaign-dashboard' | 'encounter-history' | 'analysis-bugs';
```

The system SHALL define three tab types for navigation:

- `campaign-dashboard`: Campaign overview with KPIs and trends
- `encounter-history`: Battle list and detailed encounter analysis
- `analysis-bugs`: Invariant checks, anomalies, and violations

### IDrillDownContext Interface

**Source**: `src/utils/simulation-viewer/navigation.ts:17-23`

```typescript
interface IDrillDownContext {
  sourceTab: TabType;
  targetTab: TabType;
  filters?: Record<string, unknown>;
  highlightId?: string;
  scrollToId?: string;
}
```

The system SHALL define drill-down context with:

- `sourceTab`: MUST be a valid TabType indicating the originating tab
- `targetTab`: MUST be a valid TabType indicating the destination tab
- `filters`: MAY contain filter parameters to apply on navigation
- `highlightId`: MAY specify an element ID to highlight after navigation
- `scrollToId`: MAY specify an element ID to scroll to after navigation

### IBreadcrumb Interface

**Source**: `src/utils/simulation-viewer/navigation.ts:29-33`

```typescript
interface IBreadcrumb {
  tab: TabType;
  label: string;
  filters?: Record<string, unknown>;
}
```

The system SHALL define breadcrumb entries with:

- `tab`: MUST be a valid TabType
- `label`: MUST be a human-readable tab label
- `filters`: MAY contain the filter state at the time of navigation

### ITrendChartProps Interface

**Source**: `src/components/simulation-viewer/types/ITrendChartProps.ts:19-28`

```typescript
interface ITrendChartProps {
  readonly data: ITrendDataPoint[];
  readonly timeRange?: string;
  readonly timeRangeOptions?: string[];
  readonly onTimeRangeChange?: (range: string) => void;
  readonly threshold?: number;
  readonly thresholdLabel?: string;
  readonly height?: number;
  readonly className?: string;
}
```

The system SHALL define trend chart props with:

- `data`: MUST be an array of ITrendDataPoint with date and value
- `timeRange`: MAY specify the active time range (e.g., "7d", "30d")
- `timeRangeOptions`: MAY provide available time range options
- `onTimeRangeChange`: MAY be invoked when time range is changed
- `threshold`: MAY specify a threshold line value
- `thresholdLabel`: MAY provide a label for the threshold line
- `height`: MAY specify chart height in pixels (default varies by component)
- `className`: MAY provide additional CSS classes

### IKPICardProps Interface

**Source**: `src/components/simulation-viewer/types/IKPICardProps.ts:15-23`

```typescript
interface IKPICardProps {
  readonly label: string;
  readonly value: number | string;
  readonly comparison?: string;
  readonly comparisonDirection?: 'up' | 'down' | 'neutral';
  readonly trend?: number[];
  readonly onClick?: () => void;
  readonly className?: string;
}
```

The system SHALL define KPI card props with:

- `label`: MUST be a descriptive label for the metric
- `value`: MUST be the metric value (number or formatted string)
- `comparison`: MAY provide a comparison string (e.g., "+5%")
- `comparisonDirection`: MAY indicate trend direction for visual styling
- `trend`: MAY provide an array of historical values for sparkline
- `onClick`: MAY be invoked when the card is clicked
- `className`: MAY provide additional CSS classes

### IFilterPanelProps Interface

**Source**: `src/components/simulation-viewer/types/IFilterPanelProps.ts:22-30`

```typescript
interface IFilterPanelProps {
  readonly filters: IFilterDefinition[];
  readonly activeFilters: Record<string, string[]>;
  readonly onFilterChange: (filters: Record<string, string[]>) => void;
  readonly enableSearch?: boolean;
  readonly searchQuery?: string;
  readonly onSearchChange?: (query: string) => void;
  readonly className?: string;
}
```

The system SHALL define filter panel props with:

- `filters`: MUST be an array of IFilterDefinition
- `activeFilters`: MUST be a map of filter ID to selected option values
- `onFilterChange`: MUST be invoked when filters are changed
- `enableSearch`: MAY enable search input (default: false)
- `searchQuery`: MAY provide the current search query
- `onSearchChange`: MAY be invoked when search query changes
- `className`: MAY provide additional CSS classes

### IAnomalyAlertCardProps Interface

**Source**: `src/components/simulation-viewer/types/IAnomalyAlertCardProps.ts:28-35`

```typescript
interface IAnomalyAlertCardProps {
  readonly anomaly: IAnomaly;
  readonly onViewSnapshot?: (anomaly: IAnomaly) => void;
  readonly onViewBattle?: (battleId: string) => void;
  readonly onConfigureThreshold?: (configKey: string) => void;
  readonly onDismiss?: (anomalyId: string) => void;
  readonly className?: string;
}
```

The system SHALL define anomaly alert card props with:

- `anomaly`: MUST be an IAnomaly object with type, severity, message, and metadata
- `onViewSnapshot`: MAY be invoked to view the snapshot where the anomaly occurred
- `onViewBattle`: MAY be invoked to view the battle containing the anomaly
- `onConfigureThreshold`: MAY be invoked to adjust the detector threshold
- `onDismiss`: MAY be invoked to dismiss the anomaly
- `className`: MAY provide additional CSS classes

### IDrillDownLinkProps Interface

**Source**: `src/components/simulation-viewer/types/IDrillDownLinkProps.ts:14-23`

```typescript
interface IDrillDownLinkProps {
  readonly label: string;
  readonly targetTab:
    | 'campaign-dashboard'
    | 'encounter-history'
    | 'analysis-bugs';
  readonly filter?: Record<string, unknown>;
  readonly icon?: string;
  readonly className?: string;
}
```

The system SHALL define drill-down link props with:

- `label`: MUST be the link text
- `targetTab`: MUST be a valid tab identifier
- `filter`: MAY contain filter parameters to apply on navigation
- `icon`: MAY specify an icon identifier (e.g., "chevron-right", "arrow-right")
- `className`: MAY provide additional CSS classes

## Non-Goals

- Real-time battle simulation (handled by game-event-system)
- Persistent storage of analytics data (handled by database layer)
- Export of analytics to external formats (future enhancement)
- Multiplayer campaign synchronization (out of scope)
- AI-driven anomaly detection (Wave 3 detectors are rule-based)

## Dependencies

### Depends On

- **game-event-system**: Provides `IGameEvent`, `GameEventType` enum, and event type definitions
- **event-payloads**: Provides `getDamageAppliedPayload` and `getUnitDestroyedPayload` extractors
- **accessibility**: Provides `FOCUS_RING_CLASSES` and `announce` utilities
- **simulation-viewer-types**: Provides `IAnomaly`, `ICampaignDashboardMetrics`, `IFinancialDataPoint`, `IPerformerSummary`

### Used By

- **Battle Replay System**: Reviews unit performance and damage dealt/received
- **Campaign Tracking**: Aggregates unit statistics across multiple battles
- **Pilot Experience System**: Tracks kills and survival for pilot advancement
- **Battle Statistics UI**: Displays post-battle analytics and performance metrics
- **Simulation Viewer**: Provides navigation, formatting, and calculation utilities for all viewer pages
