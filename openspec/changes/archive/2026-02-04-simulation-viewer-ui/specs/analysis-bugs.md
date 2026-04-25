# Analysis & Bugs Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-02-02
**Dependencies**: data-model.md, simulation-system (completed)
**Affects**: shared-components.md

---

## Overview

### Purpose

Defines the Analysis & Bugs tab of the Simulation Viewer, providing simulation health monitoring through invariant status display, anomaly detection, violation logging, and configurable threshold management.

### Scope

**In Scope:**

- Invariant status display (7 existing invariants from simulation system)
- Anomaly detection specifications (heat suicide, passive unit, no progress, long game, state cycle)
- Violation log with filtering (severity, type, battle)
- Threshold configuration UI (sliders, live preview)
- Auto-snapshot logic (critical always, warning/info configurable)
- Drill-down navigation to related battles/events

**Out of Scope:**

- Real-time monitoring (batch simulation only)
- Anomaly prediction/forecasting (future enhancement)
- Custom anomaly rule creation (future enhancement)
- Export to external monitoring systems (future enhancement)

### Key Concepts

- **Invariant**: Core game rule that must never be violated (e.g., non-negative armor, unique positions)
- **Anomaly**: Detected simulation issue that may indicate a bug (e.g., heat suicide, passive unit)
- **Violation**: Recorded instance of an invariant failure or anomaly detection
- **Threshold**: Configurable detection parameter (e.g., heat limit, turn limit)
- **Snapshot**: Saved game state at moment of anomaly for debugging
- **Severity**: Classification of issue importance (critical, warning, info)

---

## Requirements

### Requirement: Invariant Status Display

The system SHALL display the status of all registered invariants with pass/fail counts and violation details.

**Rationale**: Developers need to see which core game rules are being violated to identify bugs.

**Priority**: Critical

#### Scenario: All invariants passing

**GIVEN** a simulation run with 100 games and zero violations
**WHEN** the user views the Analysis & Bugs tab
**THEN** the invariant status section SHALL display:

- 7 invariant cards (one per registered invariant)
- Each card showing "✓ Passed" status with green indicator
- Each card showing "0 violations" count
- Overall summary showing "7/7 invariants passing"

#### Scenario: Invariant with violations

**GIVEN** a simulation run with 3 "armor_bounds" violations across 2 battles
**WHEN** the user views the invariant status
**THEN** the "Armor Bounds" invariant card SHALL display:

- "✗ Failed" status with red indicator
- "3 violations" count
- "2 battles affected" count
- Clickable link to view violation details

#### Scenario: Drill-down to violation details

**GIVEN** an invariant card showing violations
**WHEN** the user clicks "View Details"
**THEN** the system SHALL:

- Navigate to the violation log section
- Filter violations by the selected invariant type
- Highlight the first violation in the list

### Requirement: Heat Suicide Detection

The system SHALL detect when a unit generates excessive heat without tactical justification and create a warning-level anomaly.

**Rationale**: AI currently has zero heat awareness and can make suicidal decisions. This detector helps identify AI bugs.

**Priority**: High

#### Scenario: Heat suicide detected

**GIVEN** a unit generates 35 heat in a single turn
**AND** the heat suicide threshold is set to 30
**AND** the unit is not in a "last-ditch" scenario (outnumbered 3:1 or more)
**WHEN** the anomaly detector processes the turn
**THEN** it SHALL create an `IAnomaly` with:

- `type: "heat-suicide"`
- `severity: "warning"`
- `message: "[Unit] generated 35 heat (threshold: 30)"`
- `thresholdUsed: 30`
- `actualValue: 35`
- `snapshot: undefined` (unless auto-snapshot for warnings is enabled)

#### Scenario: Last-ditch scenario exemption

**GIVEN** a unit generates 35 heat in a single turn
**AND** the unit is outnumbered 4:1 (last-ditch scenario)
**WHEN** the anomaly detector processes the turn
**THEN** it SHALL NOT create a heat suicide anomaly
**AND** it MAY create an info-level "heat-crisis" anomaly instead

#### Scenario: Configurable threshold

**GIVEN** the user changes the heat suicide threshold from 30 to 24
**WHEN** a unit generates 28 heat in a subsequent simulation
**THEN** the detector SHALL create a heat suicide anomaly
**AND** the anomaly SHALL record `thresholdUsed: 24`

### Requirement: Passive Unit Detection

The system SHALL detect when a unit fails to take meaningful action for N consecutive turns and create a warning-level anomaly.

**Rationale**: Passive units indicate AI decision-making bugs or stuck states.

**Priority**: High

#### Scenario: Passive unit detected

**GIVEN** a unit does not move, attack, or perform any action for 5 consecutive turns
**AND** the passive unit threshold is set to 5 turns
**AND** the unit is not destroyed or shutdown
**WHEN** the anomaly detector processes turn 5
**THEN** it SHALL create an `IAnomaly` with:

- `type: "passive-unit"`
- `severity: "warning"`
- `message: "[Unit] has been passive for 5 turns (threshold: 5)"`
- `thresholdUsed: 5`
- `actualValue: 5`

#### Scenario: Unit becomes active again

**GIVEN** a unit has been passive for 4 turns
**WHEN** the unit moves or attacks on turn 5
**THEN** the passive turn counter SHALL reset to 0
**AND** no anomaly SHALL be created

#### Scenario: Shutdown unit exemption

**GIVEN** a unit is shutdown from heat
**WHEN** the unit remains inactive for 5 turns
**THEN** the detector SHALL NOT create a passive unit anomaly
**AND** it MAY create an info-level "heat-shutdown" anomaly instead

### Requirement: No Progress Detection

The system SHALL detect when the battle state remains unchanged for N consecutive turns and create a warning-level anomaly.

**Rationale**: Stalemate or infinite loop detection to identify simulation bugs.

**Priority**: Medium

#### Scenario: No progress detected

**GIVEN** the game state (unit positions, armor, heat) is identical for 10 consecutive turns
**AND** the no progress threshold is set to 10 turns
**WHEN** the anomaly detector processes turn 10
**THEN** it SHALL create an `IAnomaly` with:

- `type: "no-progress"`
- `severity: "warning"`
- `message: "Battle state unchanged for 10 turns (threshold: 10)"`
- `turn: null` (battle-level anomaly)
- `unitId: null` (battle-level anomaly)

#### Scenario: State change resets counter

**GIVEN** the game state has been unchanged for 8 turns
**WHEN** a unit takes damage on turn 9
**THEN** the no progress counter SHALL reset to 0
**AND** no anomaly SHALL be created

#### Scenario: Movement-only changes count as progress

**GIVEN** units are moving but not dealing damage
**WHEN** the anomaly detector checks for progress
**THEN** position changes SHALL count as state changes
**AND** the no progress counter SHALL reset

### Requirement: Long Game Detection

The system SHALL detect when a battle exceeds the expected turn count and create an info-level anomaly.

**Rationale**: Unusually long battles may indicate AI inefficiency or balance issues.

**Priority**: Low

#### Scenario: Long game detected

**GIVEN** a battle reaches turn 51
**AND** the long game threshold is set to 50 turns
**WHEN** the anomaly detector processes turn 51
**THEN** it SHALL create an `IAnomaly` with:

- `type: "long-game"`
- `severity: "info"`
- `message: "Battle exceeded expected length (51 turns, threshold: 50)"`
- `turn: null` (battle-level anomaly)

#### Scenario: Long game with no other anomalies

**GIVEN** a battle reaches turn 60 with no violations
**WHEN** the user views the Analysis & Bugs tab
**THEN** the long game anomaly SHALL be displayed
**AND** it SHALL NOT be treated as a failure (info severity)

#### Scenario: Configurable threshold

**GIVEN** the user changes the long game threshold from 50 to 30
**WHEN** a battle reaches turn 31
**THEN** the detector SHALL create a long game anomaly

### Requirement: State Cycle Detection

The system SHALL detect when the game state repeats N times and create a critical-level anomaly.

**Rationale**: Repeated states indicate infinite loops or deterministic AI bugs.

**Priority**: Critical

#### Scenario: State cycle detected

**GIVEN** the game state (positions, armor, heat) repeats 3 times
**AND** the state cycle threshold is set to 3 repeats
**WHEN** the anomaly detector processes the third repeat
**THEN** it SHALL create an `IAnomaly` with:

- `type: "state-cycle"`
- `severity: "critical"`
- `message: "Game state repeated 3 times (threshold: 3)"`
- `snapshot: IGameState` (always present for critical severity)

#### Scenario: State cycle triggers simulation halt

**GIVEN** a state cycle anomaly is detected
**WHEN** the simulation runner processes the anomaly
**THEN** it SHALL terminate the simulation immediately
**AND** it SHALL mark the simulation as "failed"
**AND** it SHALL save a snapshot to `__snapshots__/failed/`

#### Scenario: Near-identical states do not trigger

**GIVEN** two game states differ only in heat values (positions/armor identical)
**WHEN** the anomaly detector compares states
**THEN** it SHALL NOT consider them identical
**AND** the state cycle counter SHALL NOT increment

### Requirement: Violation Log Display

The system SHALL display a filterable, sortable log of all violations and anomalies detected across all simulations.

**Rationale**: Developers need to review all issues in one place with filtering and sorting.

**Priority**: High

#### Scenario: Display all violations

**GIVEN** a simulation run with 15 violations (5 critical, 7 warning, 3 info)
**WHEN** the user views the violation log
**THEN** the log SHALL display:

- 15 rows (one per violation)
- Each row showing: severity badge, type, message, battle ID, turn, timestamp
- Rows sorted by severity (critical first), then timestamp (newest first)

#### Scenario: Filter by severity

**GIVEN** the violation log with 15 violations
**WHEN** the user selects "Critical" severity filter
**THEN** the log SHALL display only 5 critical violations
**AND** the filter badge SHALL show "Critical (5)"

#### Scenario: Filter by type

**GIVEN** the violation log with 15 violations
**WHEN** the user selects "heat-suicide" type filter
**THEN** the log SHALL display only heat suicide anomalies
**AND** the filter badge SHALL show "Heat Suicide (3)"

#### Scenario: Filter by battle

**GIVEN** the violation log with violations from 3 battles
**WHEN** the user selects battle "battle_abc123"
**THEN** the log SHALL display only violations from that battle
**AND** the filter badge SHALL show "Battle abc123 (8)"

#### Scenario: Multiple filters combined

**GIVEN** the violation log with 15 violations
**WHEN** the user selects "Warning" severity AND "passive-unit" type
**THEN** the log SHALL display only warning-level passive unit anomalies
**AND** both filter badges SHALL be visible

#### Scenario: Drill-down to battle details

**GIVEN** a violation row in the log
**WHEN** the user clicks the battle ID link
**THEN** the system SHALL navigate to the Encounter History tab
**AND** it SHALL open the detailed view for that battle
**AND** it SHALL scroll to the turn where the violation occurred

### Requirement: Threshold Configuration UI

The system SHALL provide an interactive UI for configuring anomaly detection thresholds with live preview.

**Rationale**: Different users have different tolerance for warnings; thresholds must be configurable.

**Priority**: High

#### Scenario: Display threshold sliders

**GIVEN** the user opens the threshold configuration panel
**WHEN** the panel renders
**THEN** it SHALL display 5 sliders:

- Heat Suicide Threshold (0-100, default 30)
- Passive Unit Turns (1-20, default 5)
- No Progress Turns (1-50, default 10)
- Long Game Turns (10-200, default 50)
- State Cycle Repeats (2-10, default 3)
  **AND** each slider SHALL show current value, min, max, and default

#### Scenario: Adjust threshold with live preview

**GIVEN** the threshold configuration panel is open
**AND** the current simulation has 3 heat suicide anomalies (35, 32, 28 heat)
**WHEN** the user drags the heat suicide slider from 30 to 32
**THEN** the preview SHALL update to show:

- "2 anomalies would be detected" (35 and 32 heat)
- "1 anomaly would be suppressed" (28 heat)
  **AND** the slider value label SHALL update to "32"

#### Scenario: Reset to defaults

**GIVEN** the user has changed multiple thresholds
**WHEN** the user clicks "Reset to Defaults"
**THEN** all sliders SHALL return to default values:

- Heat Suicide: 30
- Passive Unit: 5
- No Progress: 10
- Long Game: 50
- State Cycle: 3
  **AND** the preview SHALL update accordingly

#### Scenario: Save threshold changes

**GIVEN** the user has adjusted thresholds
**WHEN** the user clicks "Save Changes"
**THEN** the new thresholds SHALL be persisted to configuration
**AND** future simulations SHALL use the new thresholds
**AND** the configuration panel SHALL close
**AND** a success toast SHALL appear: "Thresholds updated"

#### Scenario: Cancel threshold changes

**GIVEN** the user has adjusted thresholds
**WHEN** the user clicks "Cancel"
**THEN** the thresholds SHALL revert to saved values
**AND** the configuration panel SHALL close
**AND** no changes SHALL be persisted

### Requirement: Auto-Snapshot Configuration

The system SHALL allow users to configure when game state snapshots are automatically saved for anomalies.

**Rationale**: Snapshots are valuable for debugging but consume memory/storage; users should control when they're created.

**Priority**: Medium

#### Scenario: Default auto-snapshot settings

**GIVEN** a fresh installation
**WHEN** the user views auto-snapshot configuration
**THEN** the settings SHALL show:

- "Critical anomalies": ON (always snapshot)
- "Warning anomalies": OFF (no snapshot)
- "Info anomalies": OFF (no snapshot)

#### Scenario: Enable snapshots for warnings

**GIVEN** the auto-snapshot configuration panel
**WHEN** the user toggles "Warning anomalies" to ON
**AND** clicks "Save Changes"
**THEN** future warning-level anomalies SHALL include snapshots
**AND** the configuration SHALL be persisted

#### Scenario: Disable snapshots for critical (not allowed)

**GIVEN** the auto-snapshot configuration panel
**WHEN** the user attempts to toggle "Critical anomalies" to OFF
**THEN** the toggle SHALL remain ON (disabled state)
**AND** a tooltip SHALL explain: "Critical anomalies always include snapshots for debugging"

#### Scenario: Snapshot storage warning

**GIVEN** the user enables snapshots for all severity levels
**WHEN** the configuration panel displays storage estimate
**THEN** it SHALL show:

- "Estimated storage per simulation: ~5 MB"
- "100 simulations: ~500 MB"
  **AND** it SHALL display a warning icon if estimate exceeds 1 GB

### Requirement: Anomaly Alert Card Display

The system SHALL display anomalies as alert cards with severity-based styling, icons, and actions.

**Rationale**: Visual hierarchy and quick actions improve developer workflow.

**Priority**: High

#### Scenario: Critical anomaly card

**GIVEN** a critical-level anomaly (state cycle)
**WHEN** the card renders
**THEN** it SHALL display:

- Red border and background (critical severity)
- "🔴" icon (critical indicator)
- Title: "State Cycle Detected"
- Message: "Game state repeated 3 times (threshold: 3)"
- Battle ID link: "battle_abc123"
- Turn: "Turn 15"
- Actions: "View Snapshot", "View Battle", "Dismiss"

#### Scenario: Warning anomaly card

**GIVEN** a warning-level anomaly (heat suicide)
**WHEN** the card renders
**THEN** it SHALL display:

- Orange border and background (warning severity)
- "⚠️" icon (warning indicator)
- Title: "Heat Suicide"
- Message: "Atlas AS7-D generated 35 heat (threshold: 30)"
- Battle ID link: "battle_abc123"
- Turn: "Turn 8"
- Actions: "View Battle", "Configure Threshold", "Dismiss"

#### Scenario: Info anomaly card

**GIVEN** an info-level anomaly (long game)
**WHEN** the card renders
**THEN** it SHALL display:

- Blue border and background (info severity)
- "ℹ️" icon (info indicator)
- Title: "Long Game"
- Message: "Battle exceeded expected length (51 turns, threshold: 50)"
- Battle ID link: "battle_abc123"
- Actions: "View Battle", "Dismiss"

#### Scenario: Dismiss anomaly card

**GIVEN** an anomaly alert card
**WHEN** the user clicks "Dismiss"
**THEN** the card SHALL fade out and be removed from view
**AND** the anomaly SHALL be marked as "dismissed" in the log
**AND** it SHALL NOT reappear on page refresh

#### Scenario: View snapshot action

**GIVEN** a critical anomaly card with snapshot
**WHEN** the user clicks "View Snapshot"
**THEN** the system SHALL open a modal displaying:

- JSON representation of the game state
- Syntax highlighting
- Copy to clipboard button
- Download as file button

---

## Data Model Requirements

### Required Interfaces

The implementation MUST use the following TypeScript interfaces from `data-model.md`:

```typescript
// Reference: openspec/changes/simulation-viewer-ui/specs/data-model.md

interface IAnomaly {
  readonly id: string;
  readonly type: AnomalyType;
  readonly severity: 'critical' | 'warning' | 'info';
  readonly battleId: string;
  readonly turn: number | null;
  readonly unitId: string | null;
  readonly message: string;
  readonly thresholdUsed?: number;
  readonly actualValue?: number;
  readonly configKey?: string;
  readonly snapshot?: IGameState;
  readonly timestamp: number;
}

type AnomalyType =
  | 'heat-suicide'
  | 'heat-shutdown'
  | 'passive-unit'
  | 'no-progress'
  | 'long-game'
  | 'state-cycle'
  | 'invariant-violation'
  | 'slow-turn'
  | 'memory-spike';

interface IAnomalyThresholds {
  readonly heatSuicideThreshold: number;
  readonly passiveUnitTurns: number;
  readonly noProgressTurns: number;
  readonly longGameTurns: number;
  readonly stateCycleRepeats: number;
  readonly autoSnapshot: {
    readonly enabled: boolean;
    readonly onCritical: boolean;
    readonly onWarning: boolean;
    readonly onInfo: boolean;
  };
}
```

### Required Properties

| Property                                  | Type             | Required | Description         | Valid Values                  | Default |
| ----------------------------------------- | ---------------- | -------- | ------------------- | ----------------------------- | ------- |
| `IAnomaly.severity`                       | `string`         | Yes      | Severity level      | "critical", "warning", "info" | N/A     |
| `IAnomaly.type`                           | `AnomalyType`    | Yes      | Anomaly type        | See `AnomalyType` union       | N/A     |
| `IAnomaly.battleId`                       | `string`         | Yes      | Battle identifier   | Non-empty string              | N/A     |
| `IAnomaly.turn`                           | `number \| null` | Yes      | Turn number         | Positive integer or null      | N/A     |
| `IAnomalyThresholds.heatSuicideThreshold` | `number`         | Yes      | Heat threshold      | 0-100                         | 30      |
| `IAnomalyThresholds.passiveUnitTurns`     | `number`         | Yes      | Passive turns       | 1-20                          | 5       |
| `IAnomalyThresholds.noProgressTurns`      | `number`         | Yes      | No progress turns   | 1-50                          | 10      |
| `IAnomalyThresholds.longGameTurns`        | `number`         | Yes      | Long game turns     | 10-200                        | 50      |
| `IAnomalyThresholds.stateCycleRepeats`    | `number`         | Yes      | State cycle repeats | 2-10                          | 3       |

### Type Constraints

- `IAnomaly.severity` MUST be one of: "critical", "warning", "info"
- `IAnomaly.turn` MUST be null OR a positive integer (>= 1)
- `IAnomaly.snapshot` MUST be present when `severity` is "critical"
- `IAnomalyThresholds.heatSuicideThreshold` MUST be between 0 and 100
- `IAnomalyThresholds.passiveUnitTurns` MUST be between 1 and 20
- `IAnomalyThresholds.noProgressTurns` MUST be between 1 and 50
- `IAnomalyThresholds.longGameTurns` MUST be between 10 and 200
- `IAnomalyThresholds.stateCycleRepeats` MUST be between 2 and 10
- `IAnomalyThresholds.autoSnapshot.onCritical` MUST always be true (cannot be disabled)

---

## Calculation Formulas

### Heat Suicide Detection Algorithm

**Formula**:

```typescript
function detectHeatSuicide(
  unit: IUnit,
  heatGenerated: number,
  threshold: number,
  enemyCount: number,
  allyCount: number,
): boolean {
  // Exemption: Last-ditch scenario (outnumbered 3:1 or more)
  const isLastDitch = enemyCount >= allyCount * 3;

  if (isLastDitch) {
    return false; // No anomaly for last-ditch scenarios
  }

  // Detect if heat exceeds threshold
  return heatGenerated > threshold;
}
```

**Where**:

- `heatGenerated` = Heat generated in current turn (from weapon fire + movement)
- `threshold` = Configured heat suicide threshold (default 30)
- `enemyCount` = Number of active enemy units
- `allyCount` = Number of active allied units (including this unit)

**Example**:

```
Input: heatGenerated = 35, threshold = 30, enemyCount = 2, allyCount = 2
Calculation: isLastDitch = 2 >= 2 * 3 = false
             35 > 30 = true
Output: Anomaly detected
```

**Special Cases**:

- When `enemyCount >= allyCount * 3`: No anomaly (last-ditch exemption)
- When `unit.shutdown`: Create "heat-shutdown" info anomaly instead

### Passive Unit Detection Algorithm

**Formula**:

```typescript
function detectPassiveUnit(
  unit: IUnit,
  consecutiveInactiveTurns: number,
  threshold: number,
): boolean {
  // Exemptions
  if (unit.destroyed || unit.shutdown) {
    return false;
  }

  // Detect if inactive turns exceed threshold
  return consecutiveInactiveTurns >= threshold;
}
```

**Where**:

- `consecutiveInactiveTurns` = Number of turns without movement, attack, or action
- `threshold` = Configured passive unit threshold (default 5)

**Example**:

```
Input: consecutiveInactiveTurns = 5, threshold = 5, unit.destroyed = false
Calculation: 5 >= 5 = true
Output: Anomaly detected
```

**Special Cases**:

- When `unit.destroyed`: No anomaly (unit cannot act)
- When `unit.shutdown`: No anomaly (unit cannot act)
- When unit moves OR attacks: Reset `consecutiveInactiveTurns` to 0

### No Progress Detection Algorithm

**Formula**:

```typescript
function detectNoProgress(
  currentState: IGameState,
  previousStates: IGameState[],
  threshold: number,
): boolean {
  // Compare last N states for changes
  const recentStates = previousStates.slice(-threshold);

  for (const prevState of recentStates) {
    if (!statesEqual(currentState, prevState)) {
      return false; // Progress detected
    }
  }

  return recentStates.length >= threshold;
}

function statesEqual(state1: IGameState, state2: IGameState): boolean {
  // Compare unit positions, armor, structure, heat
  for (const unitId in state1.units) {
    const unit1 = state1.units[unitId];
    const unit2 = state2.units[unitId];

    if (!unit2) return false;

    // Check position
    if (
      unit1.position.q !== unit2.position.q ||
      unit1.position.r !== unit2.position.r
    ) {
      return false;
    }

    // Check armor/structure/heat
    if (
      !deepEqual(unit1.armor, unit2.armor) ||
      !deepEqual(unit1.structure, unit2.structure) ||
      unit1.heat !== unit2.heat
    ) {
      return false;
    }
  }

  return true;
}
```

**Where**:

- `currentState` = Current game state
- `previousStates` = Array of previous game states (last N turns)
- `threshold` = Configured no progress threshold (default 10)

**Example**:

```
Input: threshold = 10, previousStates.length = 10, all states identical
Calculation: statesEqual returns true for all 10 comparisons
Output: Anomaly detected
```

**Special Cases**:

- Movement-only changes count as progress (position changes)
- Heat changes count as progress (even if no damage)
- Destroyed units are excluded from comparison

### State Cycle Detection Algorithm

**Formula**:

```typescript
function detectStateCycle(
  currentState: IGameState,
  stateHistory: IGameState[],
  threshold: number,
): boolean {
  // Count how many times current state has appeared
  let repeatCount = 0;

  for (const historicalState of stateHistory) {
    if (statesEqual(currentState, historicalState)) {
      repeatCount++;
    }
  }

  return repeatCount >= threshold;
}
```

**Where**:

- `currentState` = Current game state
- `stateHistory` = Array of all previous game states
- `threshold` = Configured state cycle threshold (default 3)

**Example**:

```
Input: threshold = 3, stateHistory contains 2 identical states
Calculation: repeatCount = 2, 2 >= 3 = false
Output: No anomaly (not yet)

Input: threshold = 3, stateHistory contains 3 identical states
Calculation: repeatCount = 3, 3 >= 3 = true
Output: Anomaly detected (critical)
```

**Special Cases**:

- State comparison uses same `statesEqual` function as no progress detection
- State cycle is critical severity (always triggers simulation halt)
- Snapshot is always saved for state cycle anomalies

---

## Validation Rules

### Validation: Threshold Range Constraints

**Rule**: All threshold values must be within valid ranges

**Severity**: Error

**Condition**:

```typescript
function validateThresholds(thresholds: IAnomalyThresholds): string[] {
  const errors: string[] = [];

  if (
    thresholds.heatSuicideThreshold < 0 ||
    thresholds.heatSuicideThreshold > 100
  ) {
    errors.push('Heat suicide threshold must be between 0 and 100');
  }

  if (thresholds.passiveUnitTurns < 1 || thresholds.passiveUnitTurns > 20) {
    errors.push('Passive unit turns must be between 1 and 20');
  }

  if (thresholds.noProgressTurns < 1 || thresholds.noProgressTurns > 50) {
    errors.push('No progress turns must be between 1 and 50');
  }

  if (thresholds.longGameTurns < 10 || thresholds.longGameTurns > 200) {
    errors.push('Long game turns must be between 10 and 200');
  }

  if (thresholds.stateCycleRepeats < 2 || thresholds.stateCycleRepeats > 10) {
    errors.push('State cycle repeats must be between 2 and 10');
  }

  return errors;
}
```

**Error Message**: "[Specific threshold] must be between [min] and [max]"

**User Action**: Adjust threshold value to be within valid range

### Validation: Auto-Snapshot Critical Always Enabled

**Rule**: Critical anomalies must always have auto-snapshot enabled

**Severity**: Error

**Condition**:

```typescript
function validateAutoSnapshot(config: IAnomalyThresholds): string[] {
  const errors: string[] = [];

  if (!config.autoSnapshot.onCritical) {
    errors.push('Critical anomalies must always have auto-snapshot enabled');
  }

  return errors;
}
```

**Error Message**: "Critical anomalies must always have auto-snapshot enabled for debugging"

**User Action**: Cannot disable critical auto-snapshot (UI prevents this)

### Validation: Anomaly Severity Consistency

**Rule**: Anomaly severity must match type expectations

**Severity**: Warning

**Condition**:

```typescript
function validateAnomalySeverity(anomaly: IAnomaly): string[] {
  const warnings: string[] = [];

  const expectedSeverity: Record<AnomalyType, 'critical' | 'warning' | 'info'> =
    {
      'heat-suicide': 'warning',
      'heat-shutdown': 'info',
      'passive-unit': 'warning',
      'no-progress': 'warning',
      'long-game': 'info',
      'state-cycle': 'critical',
      'invariant-violation': 'critical',
      'slow-turn': 'info',
      'memory-spike': 'warning',
    };

  if (anomaly.severity !== expectedSeverity[anomaly.type]) {
    warnings.push(
      `Anomaly type "${anomaly.type}" should have severity "${expectedSeverity[anomaly.type]}" but has "${anomaly.severity}"`,
    );
  }

  return warnings;
}
```

**Error Message**: "Anomaly type '[type]' should have severity '[expected]' but has '[actual]'"

**User Action**: Review anomaly detection logic for consistency

---

## Dependencies

### Depends On

- **data-model.md**: Uses `IAnomaly`, `IAnomalyThresholds`, `AnomalyType` interfaces
- **simulation-system**: Uses `IGameState`, `IViolation` from core simulation
- **src/simulation/invariants/checkers.ts**: References 7 existing invariants:
  1. `unit_position_uniqueness`
  2. `heat_non_negative`
  3. `armor_bounds`
  4. `destroyed_units_stay_destroyed`
  5. `phase_transitions`
  6. `sequence_monotonicity`
  7. `turn_non_decreasing`

### Used By

- **shared-components.md**: Provides Anomaly Alert Card, Threshold Config components
- **encounter-history.md**: Links to battles from violation log

### Construction Sequence

1. Simulation system runs and detects invariant violations
2. Anomaly detectors process game state and create `IAnomaly` objects
3. Violations and anomalies are collected in violation log
4. Analysis & Bugs tab displays invariant status, anomaly cards, and violation log
5. User configures thresholds, which affect future simulations

---

## Implementation Notes

### Performance Considerations

- **State comparison**: Use shallow comparison for positions, deep comparison only for armor/structure
- **State history**: Limit history to last 100 states (circular buffer) to prevent memory growth
- **Snapshot serialization**: Only serialize game state when anomaly severity warrants it
- **Violation log**: Virtualize list rendering for 1000+ violations (react-window or similar)

### Edge Cases

- **Empty simulation**: No violations or anomalies (all invariants passing)
- **Multiple anomalies per turn**: Display all in chronological order
- **Anomaly without snapshot**: Show "No snapshot available" message
- **Threshold changes mid-simulation**: Anomalies detected with old thresholds remain valid (store `thresholdUsed`)
- **Dismissed anomalies**: Persist dismissal state to avoid re-showing on refresh

### Common Pitfalls

- **Pitfall**: Comparing full game state objects for equality (expensive)
  - **Solution**: Compare only relevant fields (positions, armor, structure, heat)
- **Pitfall**: Creating snapshots for every anomaly (memory explosion)
  - **Solution**: Make snapshots optional, only for critical by default
- **Pitfall**: Hardcoding severity colors in components
  - **Solution**: Use severity-to-color mapping in shared theme/constants
- **Pitfall**: Not resetting passive turn counter when unit acts
  - **Solution**: Reset counter on any movement, attack, or action
- **Pitfall**: Treating info-level anomalies as failures
  - **Solution**: Info anomalies are informational only, not failures

---

## Examples

### Example 1: Heat Suicide Anomaly Detection

**Input**:

```typescript
const unit: IUnit = {
  id: 'unit_atlas_001',
  name: 'Atlas AS7-D',
  heat: 15, // Current heat before turn
  // ... other properties
};

const heatGenerated = 35; // Heat from weapons + movement
const threshold = 30;
const enemyCount = 2;
const allyCount = 2;
```

**Processing**:

```typescript
// Check last-ditch scenario
const isLastDitch = enemyCount >= allyCount * 3; // 2 >= 6 = false

// Check if heat exceeds threshold
const isHeatSuicide = heatGenerated > threshold; // 35 > 30 = true

// Create anomaly
if (isHeatSuicide && !isLastDitch) {
  const anomaly: IAnomaly = {
    id: 'anom_battle_abc123_turn8_heatsuicide',
    type: 'heat-suicide',
    severity: 'warning',
    battleId: 'battle_abc123',
    turn: 8,
    unitId: 'unit_atlas_001',
    message: 'Atlas AS7-D generated 35 heat (threshold: 30)',
    thresholdUsed: 30,
    actualValue: 35,
    configKey: 'heatSuicideThreshold',
    snapshot: undefined, // No snapshot for warning (unless configured)
    timestamp: Date.now(),
  };
}
```

**Output**:

```typescript
// Anomaly card displays:
// ⚠️ Heat Suicide
// Atlas AS7-D generated 35 heat (threshold: 30)
// Battle: battle_abc123 | Turn: 8
// [View Battle] [Configure Threshold] [Dismiss]
```

### Example 2: Passive Unit Detection

**Input**:

```typescript
const unit: IUnit = {
  id: 'unit_timberwolf_002',
  name: 'Timber Wolf Prime',
  destroyed: false,
  shutdown: false,
  // ... other properties
};

const consecutiveInactiveTurns = 5;
const threshold = 5;
```

**Processing**:

```typescript
// Check exemptions
if (unit.destroyed || unit.shutdown) {
  return; // No anomaly
}

// Check if inactive turns exceed threshold
const isPassive = consecutiveInactiveTurns >= threshold; // 5 >= 5 = true

// Create anomaly
if (isPassive) {
  const anomaly: IAnomaly = {
    id: 'anom_battle_abc123_turn12_passive',
    type: 'passive-unit',
    severity: 'warning',
    battleId: 'battle_abc123',
    turn: 12,
    unitId: 'unit_timberwolf_002',
    message: 'Timber Wolf Prime has been passive for 5 turns (threshold: 5)',
    thresholdUsed: 5,
    actualValue: 5,
    configKey: 'passiveUnitTurns',
    snapshot: undefined,
    timestamp: Date.now(),
  };
}
```

**Output**:

```typescript
// Anomaly card displays:
// ⚠️ Passive Unit
// Timber Wolf Prime has been passive for 5 turns (threshold: 5)
// Battle: battle_abc123 | Turn: 12
// [View Battle] [Configure Threshold] [Dismiss]
```

### Example 3: State Cycle Detection (Critical)

**Input**:

```typescript
const currentState: IGameState = {
  turn: 15,
  phase: GamePhase.Movement,
  units: {
    /* ... */
  },
  // ... other properties
};

const stateHistory: IGameState[] = [
  /* ... 14 previous states, including 2 identical to currentState ... */
];

const threshold = 3;
```

**Processing**:

```typescript
// Count repeats
let repeatCount = 0;
for (const historicalState of stateHistory) {
  if (statesEqual(currentState, historicalState)) {
    repeatCount++;
  }
}
// repeatCount = 2 (found 2 identical states in history)

// Current state is the 3rd repeat
repeatCount++; // repeatCount = 3

// Check if threshold exceeded
const isStateCycle = repeatCount >= threshold; // 3 >= 3 = true

// Create critical anomaly
if (isStateCycle) {
  const anomaly: IAnomaly = {
    id: 'anom_battle_abc123_turn15_statecycle',
    type: 'state-cycle',
    severity: 'critical',
    battleId: 'battle_abc123',
    turn: 15,
    unitId: null, // Battle-level anomaly
    message: 'Game state repeated 3 times (threshold: 3)',
    thresholdUsed: 3,
    actualValue: 3,
    configKey: 'stateCycleRepeats',
    snapshot: currentState, // Always present for critical
    timestamp: Date.now(),
  };

  // Halt simulation
  throw new Error('State cycle detected - infinite loop');
}
```

**Output**:

```typescript
// Anomaly card displays:
// 🔴 State Cycle Detected
// Game state repeated 3 times (threshold: 3)
// Battle: battle_abc123 | Turn: 15
// [View Snapshot] [View Battle] [Dismiss]

// Simulation halts and saves snapshot to:
// src/simulation/__snapshots__/failed/battle_abc123_1738526400000.json
```

### Example 4: Threshold Configuration UI

**Input**:

```typescript
const currentThresholds: IAnomalyThresholds = {
  heatSuicideThreshold: 30,
  passiveUnitTurns: 5,
  noProgressTurns: 10,
  longGameTurns: 50,
  stateCycleRepeats: 3,
  autoSnapshot: {
    enabled: true,
    onCritical: true,
    onWarning: false,
    onInfo: false,
  },
};

const currentAnomalies: IAnomaly[] = [
  { type: 'heat-suicide', actualValue: 35 /* ... */ },
  { type: 'heat-suicide', actualValue: 32 /* ... */ },
  { type: 'heat-suicide', actualValue: 28 /* ... */ },
];
```

**Processing**:

```typescript
// User drags heat suicide slider from 30 to 32
const newThreshold = 32;

// Calculate preview
const wouldDetect = currentAnomalies.filter(
  (a) => a.type === 'heat-suicide' && a.actualValue! > newThreshold,
).length; // 2 (35 and 32)

const wouldSuppress = currentAnomalies.filter(
  (a) => a.type === 'heat-suicide' && a.actualValue! <= newThreshold,
).length; // 1 (28)
```

**Output**:

```typescript
// Threshold config panel displays:
// Heat Suicide Threshold: [====|====] 32
// Min: 0 | Max: 100 | Default: 30
//
// Preview:
// ✓ 2 anomalies would be detected
// ✗ 1 anomaly would be suppressed
//
// [Reset to Defaults] [Cancel] [Save Changes]
```

---

## References

### Official BattleTech Rules

- **TechManual**: Heat scale (page 43), Shutdown rules (page 44)
- **Total Warfare**: Combat phases (page 8), Damage application (page 46)

### Related Documentation

- `src/simulation/invariants/checkers.ts` - 7 existing invariant functions
- `src/simulation/core/types.ts` - `IGameState`, `IViolation` interfaces
- `openspec/specs/heat-system.md` - Heat thresholds and shutdown rules
- `openspec/changes/simulation-viewer-ui/specs/data-model.md` - TypeScript interfaces

### Design System References

- Carbon Design System - Status indicators
- PatternFly - Alert severity patterns
- GitLab Pajamas - Alert card structure
- Material Design - Slider components

---

## Changelog

### Version 1.0 (2026-02-02)

- Initial specification
- Defined 7 invariant status display requirements
- Defined 5 anomaly detection types (heat suicide, passive unit, no progress, long game, state cycle)
- Defined violation log with filtering (severity, type, battle)
- Defined threshold configuration UI with live preview
- Defined auto-snapshot configuration (critical always, warning/info configurable)
- Defined anomaly alert card display with severity-based styling
- Included detection algorithms for each anomaly type
- Established default thresholds (heat: 30, passive: 5, no progress: 10, long game: 50, state cycle: 3)
