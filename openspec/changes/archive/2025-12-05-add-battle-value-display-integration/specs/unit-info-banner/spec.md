# unit-info-banner Specification Delta

## ADDED Requirements

### Requirement: Battle Value Display

The banner SHALL display Battle Value (BV) in the statistics grid.

#### Scenario: BV stat rendering

- **WHEN** statistics grid renders
- **THEN** BV appears as first stat (before ENGINE) in Section 3
- **AND** label shows "BV"
- **AND** value shows formatted number with locale separators (e.g., "1,234")
- **AND** value shows "-" if battleValue is undefined or 0

#### Scenario: BV color styling

- **WHEN** BV stat renders
- **THEN** value text uses cyan color (text-cyan-400)
- **AND** color is distinct from other stats for quick identification

#### Scenario: BV reactive updates

- **WHEN** unit configuration changes (armor, equipment, movement, etc.)
- **THEN** BV value updates automatically
- **AND** recalculation uses CalculationService.calculateBattleValue()

## MODIFIED Requirements

### Requirement: Statistics Grid

The banner SHALL display key unit statistics in a horizontal grid using "current / max" format for capacity-based stats.

#### Scenario: Movement stats display

- **WHEN** movement stats render
- **THEN** Walk MP shows as single value (e.g., "4")
- **AND** Run MP shows as single value (e.g., "6")
- **AND** Jump MP shows as single value (e.g., "0")
- **AND** each has its own labeled cell

#### Scenario: BV and Engine stats display

- **WHEN** single-value stats render
- **THEN** BV appears first with cyan color
- **AND** ENGINE appears second with orange color
- **AND** both use SimpleStat component

#### Scenario: Weight stat with capacity format

- **WHEN** weight stat renders
- **THEN** label shows "WEIGHT"
- **AND** value shows "usedTonnage / maxTonnage" format (e.g., "45.5t / 50.0t")
- **AND** value text is red if used exceeds max (overweight)
- **AND** value text is yellow if within 0.5 tons of max
- **AND** value text is white/normal otherwise

#### Scenario: Critical slots stat with capacity format

- **WHEN** critical slots stat renders
- **THEN** label shows "SLOTS"
- **AND** value shows "used / total" format (e.g., "16 / 78")
- **AND** total is 78 for standard BattleMech
- **AND** value text is red if used exceeds total

#### Scenario: Armor stat with capacity format

- **WHEN** armor stat renders
- **THEN** label shows "ARMOR"
- **AND** value shows "allocated / maximum" format (e.g., "200 / 350")
- **AND** maximum is calculated from tonnage (2 × internal structure points)

#### Scenario: Heat stat with balance format

- **WHEN** heat stat renders
- **THEN** label shows "HEAT"
- **AND** value shows "generated / dissipation" format (e.g., "15 / 10")
- **AND** value text is red if generated exceeds dissipation (overheating)
- **AND** value text is green if dissipation meets or exceeds generation

#### Scenario: Grid minimum width

- **WHEN** statistics grid renders
- **THEN** minimum width is 380px to accommodate all stats including BV
