# Invariant Checkers Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-02-01
**Dependencies**: Core Infrastructure, Game State
**Affects**: Simulation Runner, Bug Detection

---

## Overview

### Purpose
Provides framework for detecting game state violations through invariant checking. Defines 7 core invariants that must hold true throughout simulation execution.

### Scope
**In Scope:**
- Invariant checker framework (IInvariant, IViolation)
- 7 core invariant checkers
- Invariant runner orchestration
- Severity filtering (critical vs warning)
- Known limitation exclusions

**Out of Scope:**
- Fixing violations (detection only)
- Blocking game progression on violations
- UI for displaying violations
- Physical attack validation (not implemented)
- Ammo tracking validation (not implemented)

### Key Concepts
- **Invariant**: Property that must always be true in valid game state
- **Violation**: Detected breach of an invariant with context
- **Severity**: Critical (game-breaking) vs Warning (suspicious but legal)
- **Known Limitation**: Documented exclusion from bug detection

---

## Requirements

### Requirement: Invariant Framework

The system SHALL provide extensible framework for invariant checking.

**Rationale**: Standardized interface enables adding new invariants without modifying runner.

**Priority**: Critical

#### Scenario: Invariant interface
**GIVEN** an invariant checker implementation
**WHEN** calling check() with game state
**THEN** result SHALL be array of violations (empty if none)
**AND** each violation SHALL include invariant name, severity, message, context

#### Scenario: Violation context
**GIVEN** a detected violation
**WHEN** creating IViolation object
**THEN** context SHALL include turn number, phase, sequence number
**AND** context SHALL include relevant unit IDs
**AND** context SHALL include any additional debugging data

### Requirement: Position Uniqueness Invariant

The system SHALL detect when multiple units occupy same hex.

**Rationale**: Two units cannot occupy same hex per BattleTech rules.

**Priority**: Critical

#### Scenario: Duplicate position detection
**GIVEN** game state with two units at hex (5, 3)
**WHEN** running checkUnitPositionUniqueness()
**THEN** violation SHALL be detected
**AND** severity SHALL be 'critical'
**AND** context SHALL include both unit IDs and coordinate

#### Scenario: Valid positions
**GIVEN** game state with all units at unique positions
**WHEN** running checkUnitPositionUniqueness()
**THEN** result SHALL be empty array (no violations)

### Requirement: Heat Bounds Invariant

The system SHALL detect negative heat values.

**Rationale**: Heat cannot be negative per game rules.

**Priority**: Critical

#### Scenario: Negative heat detection
**GIVEN** a unit with heat = -5
**WHEN** running checkHeatNonNegative()
**THEN** violation SHALL be detected
**AND** severity SHALL be 'critical'
**AND** context SHALL include unit ID and heat value

#### Scenario: Valid heat
**GIVEN** all units with heat >= 0
**WHEN** running checkHeatNonNegative()
**THEN** result SHALL be empty array

### Requirement: Armor Bounds Invariant

The system SHALL detect armor/structure values outside valid range.

**Rationale**: Armor and structure must be between 0 and maximum per location.

**Priority**: Critical

#### Scenario: Negative armor detection
**GIVEN** a unit with armor = -10 on CT
**WHEN** running checkArmorBounds()
**THEN** violation SHALL be detected
**AND** severity SHALL be 'critical'

#### Scenario: Armor exceeds maximum
**GIVEN** a unit with armor > maximum for location
**WHEN** running checkArmorBounds()
**THEN** violation SHALL be detected
**AND** severity SHALL be 'warning' (may be valid in some cases)

### Requirement: Destroyed Units Invariant

The system SHALL detect destroyed units returning to active status.

**Rationale**: Destroyed units cannot be resurrected.

**Priority**: Critical

#### Scenario: Unit resurrection detection
**GIVEN** a unit marked destroyed in turn 5
**WHEN** same unit is active in turn 6
**THEN** violation SHALL be detected
**AND** severity SHALL be 'critical'
**AND** context SHALL include unit ID and turn numbers

### Requirement: Phase Transition Invariant

The system SHALL detect invalid phase transitions.

**Rationale**: Phases must follow correct order per game rules.

**Priority**: High

#### Scenario: Phase order validation
**GIVEN** game state transitioning from Movement to Heat
**WHEN** running checkPhaseTransitions()
**THEN** violation SHALL be detected (skipped Attack phase)
**AND** severity SHALL be 'critical'

#### Scenario: Valid phase sequence
**GIVEN** phases: Initiative → Movement → Attack → Heat → End
**WHEN** running checkPhaseTransitions()
**THEN** result SHALL be empty array

### Requirement: Sequence Monotonicity Invariant

The system SHALL detect non-increasing event sequence numbers.

**Rationale**: Event sequences must be strictly increasing.

**Priority**: High

#### Scenario: Sequence number regression
**GIVEN** events with sequences [1, 2, 3, 2, 4]
**WHEN** running checkSequenceMonotonicity()
**THEN** violation SHALL be detected at sequence 2 (after 3)
**AND** severity SHALL be 'critical'

### Requirement: Turn Non-Decreasing Invariant

The system SHALL detect turn numbers that decrease.

**Rationale**: Turn numbers must never decrease.

**Priority**: High

#### Scenario: Turn regression detection
**GIVEN** game state with turn 5 followed by turn 4
**WHEN** running checkTurnNonDecreasing()
**THEN** violation SHALL be detected
**AND** severity SHALL be 'critical'

### Requirement: Invariant Runner Orchestration

The system SHALL run all invariants and collect violations.

**Rationale**: Centralized runner ensures all invariants checked consistently.

**Priority**: Critical

#### Scenario: Run all invariants
**GIVEN** InvariantRunner with 7 registered invariants
**WHEN** calling check(state)
**THEN** all 7 invariants SHALL be executed
**AND** violations from all SHALL be collected
**AND** known limitations SHALL be filtered out

#### Scenario: Severity filtering
**GIVEN** violations with mixed severities
**WHEN** filtering by severity = 'critical'
**THEN** only critical violations SHALL be returned
**AND** warnings SHALL be excluded

---

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Invariant checker interface.
 */
interface IInvariant {
  /**
   * Invariant name for identification.
   * @example "position-uniqueness"
   */
  readonly name: string;

  /**
   * Default severity for violations.
   */
  readonly severity: 'critical' | 'warning';

  /**
   * Check invariant against game state.
   * @param state Current game state
   * @returns Array of violations (empty if none)
   */
  readonly check: (state: IGameState) => IViolation[];
}

/**
 * Invariant violation record.
 */
interface IViolation {
  /**
   * Name of violated invariant.
   */
  readonly invariant: string;

  /**
   * Violation severity.
   */
  readonly severity: 'critical' | 'warning';

  /**
   * Human-readable violation message.
   */
  readonly message: string;

  /**
   * Contextual data for debugging.
   */
  readonly context: {
    /** Turn number when violation occurred */
    readonly turn?: number;
    /** Game phase when violation occurred */
    readonly phase?: GamePhase;
    /** Event sequence number */
    readonly sequence?: number;
    /** Affected unit ID */
    readonly unitId?: string;
    /** Additional context data */
    readonly [key: string]: any;
  };
}

/**
 * Invariant runner orchestrating all checks.
 */
interface IInvariantRunner {
  /**
   * Run all registered invariants.
   * @param state Current game state
   * @returns All violations detected
   */
  readonly check: (state: IGameState) => IViolation[];

  /**
   * Filter violations by severity.
   * @param violations All violations
   * @param severity Severity to filter by
   * @returns Filtered violations
   */
  readonly filterBySeverity: (
    violations: IViolation[],
    severity: 'critical' | 'warning'
  ) => IViolation[];
}
```

---

## Validation Rules

### Validation: Invariant Completeness

**Rule**: All 7 core invariants must be registered

**Severity**: Error

**Condition**:
```typescript
const requiredInvariants = [
  'position-uniqueness',
  'heat-non-negative',
  'armor-bounds',
  'destroyed-stay-destroyed',
  'phase-transitions',
  'sequence-monotonicity',
  'turn-non-decreasing'
];
if (runner.invariants.length < 7) {
  // error - missing invariants
}
```

**Error Message**: "InvariantRunner missing required invariants"

**User Action**: Register all 7 core invariants

---

## Dependencies

### Depends On
- **Core Infrastructure**: ISimulationContext
- **Game State**: IGameState, GamePhase enums

### Used By
- **Simulation Runner**: Calls InvariantRunner after each event
- **Metrics Collector**: Records violations
- **Snapshot Manager**: Includes violations in snapshots

---

## Examples

### Example 1: Position Uniqueness Check

**Input**:
```typescript
const state: IGameState = {
  units: [
    { id: 'unit-1', position: { coord: { q: 5, r: 3 } } },
    { id: 'unit-2', position: { coord: { q: 5, r: 3 } } } // duplicate!
  ]
};
```

**Processing**:
```typescript
const violations = checkUnitPositionUniqueness(state);
```

**Output**:
```typescript
// violations = [{
//   invariant: 'position-uniqueness',
//   severity: 'critical',
//   message: 'Multiple units at position (5, 3): unit-1, unit-2',
//   context: { unitIds: ['unit-1', 'unit-2'], coord: { q: 5, r: 3 } }
// }]
```

### Example 2: Invariant Runner

**Input**:
```typescript
const runner = new InvariantRunner();
runner.register(positionUniqueness);
runner.register(heatNonNegative);
// ... register all 7 invariants
```

**Processing**:
```typescript
const violations = runner.check(state);
const criticalOnly = runner.filterBySeverity(violations, 'critical');
```

**Output**:
```typescript
// violations = [/* all violations */]
// criticalOnly = [/* only critical violations */]
```

---

## References

### Pattern References
- **Game State**: `src/utils/gameplay/gameState.ts:deriveState()`
- **Game Types**: `src/types/gameplay/GameSessionInterfaces.ts`

### Related Documentation
- Core Infrastructure Specification
- Simulation Runner Specification
- Known Limitations Documentation

---

## Changelog

### Version 1.0 (2026-02-01)
- Initial specification
- Defined 7 core invariants
- Defined IInvariant and IViolation interfaces
- Specified InvariantRunner orchestration
