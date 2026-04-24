# after-combat-report Specification Delta

## ADDED Requirements

### Requirement: Force Summary Schema

The after-combat-report system SHALL define an `IForceSummary` schema
that aggregates per-side force statistics used by the pre-battle
comparison panel and reusable elsewhere (post-battle reports, campaign
contracts).

#### Scenario: Force summary contains required fields

- **GIVEN** a configured 2-mech force with assigned pilots
- **WHEN** `deriveForceSummary(side, force)` is called
- **THEN** the returned `IForceSummary` SHALL contain `{side,
totalBV, totalTonnage, heatDissipation, avgGunnery, avgPiloting,
weaponDamagePerTurnPotential, spaSummary}`
- **AND** `side` SHALL be one of `GameSide.Player` or
  `GameSide.Opponent`

#### Scenario: BV aggregation

- **GIVEN** a force with two mechs of BV `{1820, 2100}`
- **WHEN** the summary is derived
- **THEN** `totalBV` SHALL equal 3920

#### Scenario: Tonnage aggregation

- **GIVEN** a force with two mechs of tonnage `{45, 55}`
- **WHEN** the summary is derived
- **THEN** `totalTonnage` SHALL equal 100

#### Scenario: Heat dissipation aggregation

- **GIVEN** a force where mech A has 12 single heat sinks (10 integral
  engine + 2 added) and mech B has 14 double heat sinks (10 engine +
  4 added)
- **WHEN** the summary is derived
- **THEN** `heatDissipation` SHALL equal `12 + 28 = 40` (singles × 1 +
  doubles × 2)

#### Scenario: Pilot skill averaging

- **GIVEN** two pilots with `{gunnery: 4, piloting: 5}` and `{gunnery:
3, piloting: 4}`
- **WHEN** the summary is derived
- **THEN** `avgGunnery` SHALL equal 3.5
- **AND** `avgPiloting` SHALL equal 4.5

#### Scenario: DPT potential aggregation

- **GIVEN** a force whose weapons sum to 45 damage per turn if every
  weapon fires at medium range without misses
- **WHEN** the summary is derived
- **THEN** `weaponDamagePerTurnPotential` SHALL equal 45
- **AND** no hit-probability factor SHALL be applied (this is
  potential, not expected)

#### Scenario: SPA summary aggregation

- **GIVEN** a force where two pilots have `"Sniper"` and one pilot has
  `"Marksman"`
- **WHEN** the summary is derived
- **THEN** `spaSummary` SHALL contain entries for both `"Sniper"` and
  `"Marksman"`
- **AND** the Sniper entry SHALL list both pilots' unit IDs
- **AND** the Marksman entry SHALL list the single pilot's unit ID

### Requirement: Force Comparison Schema

The after-combat-report system SHALL define an `IForceComparison`
schema wrapping two `IForceSummary` values with computed deltas,
`bvRatio`, and per-metric severity tiers used to render visual
warnings in the comparison panel.

#### Scenario: Comparison contains deltas and severity

- **GIVEN** two force summaries (player and opponent)
- **WHEN** `compareForces(player, opponent)` is called
- **THEN** the returned `IForceComparison` SHALL contain `{player,
opponent, deltas, bvRatio}`
- **AND** `deltas` SHALL contain entries for `totalBV`,
  `totalTonnage`, `heatDissipation`, `avgGunnery`, `avgPiloting`,
  `weaponDamagePerTurnPotential`
- **AND** each delta entry SHALL be shaped `{value: number, severity:
'low' | 'moderate' | 'high'}`

#### Scenario: Delta value is player minus opponent

- **GIVEN** `player.totalBV = 5325` and `opponent.totalBV = 5000`
- **WHEN** the comparison is computed
- **THEN** `deltas.totalBV.value` SHALL equal 325 (positive means
  player advantage)

#### Scenario: Gunnery delta inverts sign (lower is better)

- **GIVEN** `player.avgGunnery = 3.5` and `opponent.avgGunnery = 4.0`
- **WHEN** the comparison is computed
- **THEN** `deltas.avgGunnery.value` SHALL equal `-0.5` in raw
  arithmetic (player − opponent)
- **AND** the severity SHALL be assessed on the absolute value
- **AND** the rendered badge SHALL show the player side as having the
  advantage (lower gunnery wins)

#### Scenario: BV ratio calculation

- **GIVEN** `player.totalBV = 5000` and `opponent.totalBV = 4000`
- **WHEN** the comparison is computed
- **THEN** `bvRatio` SHALL equal 1.25 (= 5000 / 4000)

### Requirement: Severity Tier Thresholds

The comparison SHALL assign each delta a severity tier using
documented thresholds so the UI can render warning accents
consistently.

#### Scenario: BV severity tiers

- **GIVEN** `bvRatio = 1.30`
- **WHEN** severity is assigned
- **THEN** `deltas.totalBV.severity` SHALL equal `"high"`

- **GIVEN** `bvRatio = 1.15`
- **WHEN** severity is assigned
- **THEN** `deltas.totalBV.severity` SHALL equal `"moderate"`

- **GIVEN** `bvRatio = 1.05`
- **WHEN** severity is assigned
- **THEN** `deltas.totalBV.severity` SHALL equal `"low"`

#### Scenario: Tonnage severity based on percentage

- **GIVEN** `player.totalTonnage = 100`, `opponent.totalTonnage = 125`
  (25% delta vs max 125)
- **WHEN** severity is assigned
- **THEN** `deltas.totalTonnage.severity` SHALL equal `"high"` (> 20%)

- **GIVEN** tonnage delta is 15% vs max
- **WHEN** severity is assigned
- **THEN** `deltas.totalTonnage.severity` SHALL equal `"moderate"`

- **GIVEN** tonnage delta is 5% vs max
- **WHEN** severity is assigned
- **THEN** `deltas.totalTonnage.severity` SHALL equal `"low"`

#### Scenario: Pilot skill severity

- **GIVEN** `|avgGunnery delta| = 1.2`
- **WHEN** severity is assigned
- **THEN** `deltas.avgGunnery.severity` SHALL equal `"high"`

- **GIVEN** `|avgPiloting delta| = 0.6`
- **WHEN** severity is assigned
- **THEN** `deltas.avgPiloting.severity` SHALL equal `"moderate"`

#### Scenario: DPT severity thresholds

- **GIVEN** DPT delta of 30% vs max
- **WHEN** severity is assigned
- **THEN** `deltas.weaponDamagePerTurnPotential.severity` SHALL equal
  `"high"`

- **GIVEN** DPT delta of 18% vs max
- **WHEN** severity is assigned
- **THEN** `deltas.weaponDamagePerTurnPotential.severity` SHALL equal
  `"moderate"`

### Requirement: Partial Force Summary Handling

`deriveForceSummary` SHALL produce a best-effort summary when one side
is only partially configured (e.g., missing pilots, invalid unit IDs),
skipping invalid entries rather than throwing.

#### Scenario: Invalid unit IDs skipped

- **GIVEN** a force with two valid units and one unknown unit ID
- **WHEN** the summary is derived
- **THEN** the summary SHALL aggregate across the two valid units
- **AND** `warnings` SHALL include `"Force contains unknown units"`
- **AND** no exception SHALL be thrown

#### Scenario: Missing pilot falls back to default skill

- **GIVEN** a force with one pilotless unit
- **WHEN** the summary is derived
- **THEN** the pilotless unit SHALL contribute the default skill
  values (`gunnery: 4`, `piloting: 5`) to the averages
- **AND** `warnings` SHALL include `"Unit has no assigned pilot"`

#### Scenario: Empty force returns zero summary

- **GIVEN** an empty force (no units)
- **WHEN** the summary is derived
- **THEN** all numeric fields SHALL equal 0
- **AND** `spaSummary` SHALL be an empty array
- **AND** no exception SHALL be thrown
