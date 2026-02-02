# Simulation Viewer Data Model Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-02-02
**Dependencies**: simulation-system (completed)
**Affects**: campaign-dashboard.md, encounter-history.md, analysis-bugs.md

---

## Overview

### Purpose
Defines TypeScript interfaces and data structures for the Simulation Viewer UI, ensuring type safety and consistency across all three tabs (Campaign Dashboard, Encounter History, Analysis & Bugs).

### Scope
**In Scope:**
- Key moment detection data structures
- Anomaly detection data structures
- Campaign dashboard metrics aggregation
- Battle comparison data structures
- Threshold configuration data structures

**Out of Scope:**
- Simulation core data structures (already defined in `src/simulation/`)
- Campaign core data structures (already defined in `src/types/campaign/`)
- UI component props (defined in component specs)

### Key Concepts
- **Key Moment**: Auto-detected significant event in a battle (first blood, BV swing, critical hit)
- **Anomaly**: Detected simulation issue (heat suicide, passive unit, long game)
- **Threshold**: Configurable detection parameter (heat limit, turn limit, etc.)
- **Snapshot**: Saved game state at moment of anomaly for debugging

---

## Requirements

### Requirement: Key Moment Data Structure
The system SHALL provide a strongly-typed interface for representing significant battle events with tier-based significance levels.

**Rationale**: Key moments need consistent structure for timeline visualization, filtering, and drill-down navigation.

**Priority**: Critical

#### Scenario: First blood key moment
**GIVEN** a battle where the first damage occurs on turn 3
**WHEN** the key moment detector processes the event stream
**THEN** it SHALL create an `IKeyMoment` with:
- `type: "first-blood"`
- `tier: 1` (high significance)
- `turn: 3`
- `description: "First blood: [attacker] damaged [target]"`
- `relatedUnitIds: [attacker.id, target.id]`

#### Scenario: Multiple key moments in same turn
**GIVEN** turn 5 has both a head shot AND an ammo explosion
**WHEN** the detector processes the turn
**THEN** it SHALL create TWO separate `IKeyMoment` objects
**AND** both SHALL have `turn: 5`
**AND** they SHALL be sorted by timestamp within the turn

#### Scenario: Key moment with BV context
**GIVEN** a comeback scenario (BV swing from -30% to +10%)
**WHEN** the detector identifies the comeback
**THEN** the `IKeyMoment` SHALL include:
- `metadata.bvBefore: number`
- `metadata.bvAfter: number`
- `metadata.swingPercent: number`

### Requirement: Anomaly Data Structure
The system SHALL provide a strongly-typed interface for representing detected simulation issues with severity levels and actionable context.

**Rationale**: Anomalies need consistent structure for alert display, filtering, and drill-down to related battles.

**Priority**: Critical

#### Scenario: Heat suicide anomaly
**GIVEN** a unit generates 35 heat on turn 8 (not last-ditch scenario)
**WHEN** the heat suicide detector processes the turn
**THEN** it SHALL create an `IAnomaly` with:
- `type: "heat-suicide"`
- `severity: "warning"`
- `turn: 8`
- `unitId: [unit.id]`
- `message: "[Unit] generated 35 heat (threshold: 30)"`
- `snapshot: IGameState` (optional, if auto-snapshot enabled)

#### Scenario: Anomaly with configurable threshold
**GIVEN** passive unit threshold is set to 5 turns
**WHEN** a unit is passive for 5 consecutive turns
**THEN** the `IAnomaly` SHALL include:
- `thresholdUsed: 5`
- `actualValue: 5`
- `configKey: "passiveUnitTurns"`

#### Scenario: Critical severity anomaly
**GIVEN** an invariant violation (e.g., negative armor)
**WHEN** the detector creates the anomaly
**THEN** it SHALL have `severity: "critical"`
**AND** it SHALL include `snapshot: IGameState` (always, regardless of config)

### Requirement: Campaign Dashboard Metrics
The system SHALL provide aggregated metrics for campaign-level summary display.

**Rationale**: Dashboard needs pre-computed metrics to avoid expensive calculations on every render.

**Priority**: High

#### Scenario: Roster summary calculation
**GIVEN** a campaign with 12 pilots (8 active, 3 wounded, 1 KIA)
**WHEN** the dashboard metrics are computed
**THEN** `ICampaignDashboardMetrics.roster` SHALL contain:
- `active: 8`
- `wounded: 3`
- `kia: 1`
- `total: 12`

#### Scenario: Financial trend calculation
**GIVEN** a campaign with 30 days of financial history
**WHEN** the dashboard requests last 7 days trend
**THEN** `ICampaignDashboardMetrics.financialTrend` SHALL contain:
- Array of 7 `IFinancialDataPoint` objects
- Each with `date`, `balance`, `income`, `expenses`
- Sorted chronologically (oldest to newest)

### Requirement: Battle Comparison Data
The system SHALL provide structured data for comparing a battle against campaign averages or other battles.

**Rationale**: Comparison views need consistent baseline calculations.

**Priority**: Medium

#### Scenario: Compare battle to campaign average
**GIVEN** a battle with 15 turns, 3 kills, 2500 damage
**WHEN** the comparison is computed against campaign average (12 turns, 2 kills, 2000 damage)
**THEN** `IBattleComparisonData` SHALL contain:
- `current.turns: 15`, `baseline.turns: 12`, `delta.turns: +3`
- `current.kills: 3`, `baseline.kills: 2`, `delta.kills: +1`
- `current.damage: 2500`, `baseline.damage: 2000`, `delta.damage: +500`

---

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Represents a significant event in a battle that warrants highlighting in the timeline.
 * Auto-detected based on event stream analysis.
 */
interface IKeyMoment {
  /**
   * Unique identifier for this key moment
   * @example "km_battle123_turn5_headshot"
   */
  readonly id: string;

  /**
   * Type of key moment (determines icon, color, description template)
   */
  readonly type: KeyMomentType;

  /**
   * Significance tier (1=high, 2=medium, 3=low)
   * Used for filtering and visual emphasis
   */
  readonly tier: 1 | 2 | 3;

  /**
   * Turn number when this moment occurred
   */
  readonly turn: number;

  /**
   * Phase within the turn (movement, weapon-attack, physical-attack, heat, end)
   */
  readonly phase: GamePhase;

  /**
   * Human-readable description
   * @example "First blood: Atlas AS7-D damaged Timber Wolf Prime"
   */
  readonly description: string;

  /**
   * IDs of units involved in this moment
   * Used for drill-down and filtering
   */
  readonly relatedUnitIds: string[];

  /**
   * Optional metadata specific to the key moment type
   */
  readonly metadata?: Record<string, unknown>;

  /**
   * Timestamp when this moment occurred (for sorting within turn)
   */
  readonly timestamp: number;
}

/**
 * Types of key moments, organized by tier
 */
type KeyMomentType =
  // Tier 1 (High Significance)
  | "first-blood"
  | "bv-swing-major"      // >20% BV shift in one turn
  | "comeback"            // Losing side recovers to win
  | "wipe"                // All enemy units destroyed
  | "last-stand"          // Single unit vs multiple enemies
  | "ace-kill"            // 3+ kills by one unit

  // Tier 2 (Medium Significance)
  | "head-shot"
  | "ammo-explosion"
  | "pilot-kill"
  | "critical-engine"
  | "critical-gyro"
  | "alpha-strike"        // Unit fires all weapons
  | "focus-fire"          // 3+ units attack same target

  // Tier 3 (Low Significance)
  | "heat-crisis"         // Unit shuts down from heat
  | "mobility-kill"       // Leg/hip destroyed
  | "weapons-kill"        // All weapons destroyed
  | "rear-arc-hit"
  | "overkill";           // Damage exceeds remaining armor by 50%

/**
 * Represents a detected simulation issue or unexpected behavior.
 */
interface IAnomaly {
  /**
   * Unique identifier for this anomaly
   * @example "anom_battle123_turn8_heatsuicide"
   */
  readonly id: string;

  /**
   * Type of anomaly detected
   */
  readonly type: AnomalyType;

  /**
   * Severity level (determines color, icon, and whether to auto-snapshot)
   */
  readonly severity: "critical" | "warning" | "info";

  /**
   * Battle ID where this anomaly occurred
   */
  readonly battleId: string;

  /**
   * Turn number when detected (null for battle-level anomalies)
   */
  readonly turn: number | null;

  /**
   * Unit ID involved (null for battle-level anomalies)
   */
  readonly unitId: string | null;

  /**
   * Human-readable message
   * @example "Atlas AS7-D generated 35 heat (threshold: 30)"
   */
  readonly message: string;

  /**
   * Threshold value used for detection (if applicable)
   */
  readonly thresholdUsed?: number;

  /**
   * Actual value that triggered the anomaly
   */
  readonly actualValue?: number;

  /**
   * Configuration key for the threshold (for linking to settings)
   */
  readonly configKey?: string;

  /**
   * Optional snapshot of game state at moment of anomaly
   * Always present for critical severity, optional for warning/info
   */
  readonly snapshot?: IGameState;

  /**
   * Timestamp when anomaly was detected
   */
  readonly timestamp: number;
}

/**
 * Types of anomalies that can be detected
 */
type AnomalyType =
  // Heat-related
  | "heat-suicide"        // Unit generates excessive heat without justification
  | "heat-shutdown"       // Unit shuts down from heat (info level)

  // Behavior anomalies
  | "passive-unit"        // Unit doesn't act for N consecutive turns
  | "no-progress"         // Battle state unchanged for N turns
  | "long-game"           // Battle exceeds expected turn count

  // State anomalies
  | "state-cycle"         // Game state repeats (infinite loop detection)
  | "invariant-violation" // Core invariant failed

  // Performance anomalies
  | "slow-turn"           // Turn processing exceeded time threshold
  | "memory-spike";       // Memory usage spike detected

/**
 * Aggregated metrics for campaign dashboard display
 */
interface ICampaignDashboardMetrics {
  /**
   * Roster summary (personnel status)
   */
  readonly roster: {
    readonly active: number;
    readonly wounded: number;
    readonly kia: number;
    readonly total: number;
  };

  /**
   * Force status (unit operational status)
   */
  readonly force: {
    readonly operational: number;      // Fully functional units
    readonly damaged: number;          // Damaged but operational
    readonly destroyed: number;        // Destroyed units
    readonly totalBV: number;          // Total BV of operational units
    readonly damagedBV: number;        // BV of damaged units
  };

  /**
   * Financial trend data (last N days)
   */
  readonly financialTrend: IFinancialDataPoint[];

  /**
   * Progression metrics
   */
  readonly progression: {
    readonly missionsCompleted: number;
    readonly missionsTotal: number;
    readonly winRate: number;          // 0.0 to 1.0
    readonly totalXP: number;
    readonly averageXPPerMission: number;
  };

  /**
   * Top performers (sorted by selected metric)
   */
  readonly topPerformers: IPerformerSummary[];

  /**
   * At-risk warnings
   */
  readonly warnings: {
    readonly lowFunds: boolean;        // Balance below threshold
    readonly manyWounded: boolean;     // Wounded % above threshold
    readonly lowBV: boolean;           // Operational BV below threshold
  };
}

/**
 * Single data point in financial trend chart
 */
interface IFinancialDataPoint {
  readonly date: string;               // ISO date string
  readonly balance: number;
  readonly income: number;
  readonly expenses: number;
}

/**
 * Summary of a top performer for dashboard display
 */
interface IPerformerSummary {
  readonly personId: string;
  readonly name: string;
  readonly rank: string;
  readonly kills: number;
  readonly xp: number;
  readonly survivalRate: number;       // 0.0 to 1.0
  readonly missionsCompleted: number;
}

/**
 * Comparison data for a battle vs baseline (campaign average or specific battle)
 */
interface IBattleComparisonData {
  /**
   * Current battle metrics
   */
  readonly current: IBattleMetrics;

  /**
   * Baseline metrics (campaign average or comparison battle)
   */
  readonly baseline: IBattleMetrics;

  /**
   * Delta (current - baseline)
   */
  readonly delta: IBattleMetrics;

  /**
   * Type of baseline used
   */
  readonly baselineType: "campaign-average" | "specific-battle";

  /**
   * ID of comparison battle (if baselineType is "specific-battle")
   */
  readonly comparisonBattleId?: string;
}

/**
 * Metrics for a single battle (used in comparisons)
 */
interface IBattleMetrics {
  readonly turns: number;
  readonly kills: number;
  readonly totalDamage: number;
  readonly averageDamagePerTurn: number;
  readonly duration: number;           // Milliseconds
  readonly bvDestroyed: number;
}

/**
 * Configuration for anomaly detection thresholds
 */
interface IAnomalyThresholds {
  /**
   * Heat suicide detection threshold (heat generated in single turn)
   * @default 30
   */
  readonly heatSuicideThreshold: number;

  /**
   * Passive unit detection threshold (consecutive turns without action)
   * @default 5
   */
  readonly passiveUnitTurns: number;

  /**
   * No progress detection threshold (turns without state change)
   * @default 10
   */
  readonly noProgressTurns: number;

  /**
   * Long game detection threshold (total turns)
   * @default 50
   */
  readonly longGameTurns: number;

  /**
   * State cycle detection threshold (repeated states)
   * @default 3
   */
  readonly stateCycleRepeats: number;

  /**
   * Auto-snapshot configuration
   */
  readonly autoSnapshot: {
    readonly enabled: boolean;
    readonly onCritical: boolean;      // Always snapshot critical anomalies
    readonly onWarning: boolean;       // Snapshot warning anomalies
    readonly onInfo: boolean;          // Snapshot info anomalies
  };
}

/**
 * Configuration for campaign dashboard display
 */
interface IDashboardConfig {
  /**
   * Financial trend time range (days)
   * @default 30
   */
  readonly financialTrendDays: number;

  /**
   * At-risk thresholds
   */
  readonly atRiskThresholds: {
    readonly lowFundsAmount: number;   // C-Bills
    readonly woundedPercent: number;   // 0.0 to 1.0
    readonly lowBVPercent: number;     // 0.0 to 1.0 (vs starting BV)
  };

  /**
   * Top performers configuration
   */
  readonly topPerformers: {
    readonly count: number;            // How many to show
    readonly sortBy: "kills" | "xp" | "survival-rate";
  };
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `IKeyMoment.id` | `string` | Yes | Unique identifier | Non-empty string | N/A |
| `IKeyMoment.type` | `KeyMomentType` | Yes | Type of key moment | See `KeyMomentType` enum | N/A |
| `IKeyMoment.tier` | `1 \| 2 \| 3` | Yes | Significance tier | 1, 2, or 3 | N/A |
| `IKeyMoment.turn` | `number` | Yes | Turn number | Positive integer | N/A |
| `IAnomaly.severity` | `string` | Yes | Severity level | "critical", "warning", "info" | N/A |
| `IAnomalyThresholds.heatSuicideThreshold` | `number` | Yes | Heat threshold | 0-100 | 30 |
| `IAnomalyThresholds.passiveUnitTurns` | `number` | Yes | Passive turns | Positive integer | 5 |
| `IDashboardConfig.financialTrendDays` | `number` | Yes | Trend days | 7, 14, 30, 60, 90 | 30 |

### Type Constraints

- `IKeyMoment.tier` MUST be 1, 2, or 3 (no other values allowed)
- `IKeyMoment.turn` MUST be a positive integer (>= 1)
- `IAnomaly.severity` MUST be one of: "critical", "warning", "info"
- `IAnomaly.turn` MUST be null OR a positive integer
- `IAnomalyThresholds.heatSuicideThreshold` MUST be between 0 and 100
- `IAnomalyThresholds.passiveUnitTurns` MUST be >= 1
- `ICampaignDashboardMetrics.progression.winRate` MUST be between 0.0 and 1.0
- `IPerformerSummary.survivalRate` MUST be between 0.0 and 1.0
- When `IAnomaly.severity` is "critical", `snapshot` SHALL always be present
- When `IBattleComparisonData.baselineType` is "specific-battle", `comparisonBattleId` MUST be present

---

## Dependencies

### Depends On
- **simulation-system**: Uses `IGameState`, `GamePhase` from core simulation
- **campaign-types**: Uses `Campaign`, `Person`, `Force` from campaign system

### Used By
- **campaign-dashboard.md**: Uses `ICampaignDashboardMetrics`, `IDashboardConfig`
- **encounter-history.md**: Uses `IKeyMoment`, `IBattleComparisonData`
- **analysis-bugs.md**: Uses `IAnomaly`, `IAnomalyThresholds`
- **shared-components.md**: Uses all interfaces for component props

---

## Implementation Notes

### Performance Considerations
- **Key moment detection**: Run once per battle, cache results in battle record
- **Anomaly detection**: Run during simulation, not post-processing (to enable early termination)
- **Dashboard metrics**: Pre-compute on campaign state change, don't recalculate on every render
- **Snapshots**: Only serialize game state when anomaly severity warrants it (configurable)

### Edge Cases
- **Empty battles**: Key moments array may be empty (no significant events)
- **Multiple anomalies per turn**: Array of anomalies, not single object
- **Missing baseline**: Comparison data may be unavailable for first battle
- **Threshold changes**: Anomalies detected with old thresholds remain valid (store `thresholdUsed`)

### Common Pitfalls
- **Pitfall**: Storing full game state snapshot for every anomaly
  - **Solution**: Make snapshots optional, only for critical severity by default
- **Pitfall**: Recalculating dashboard metrics on every render
  - **Solution**: Use memoization, only recalculate when campaign state changes
- **Pitfall**: Hardcoding tier assignments in UI components
  - **Solution**: Tier is part of data model, UI reads it from `IKeyMoment.tier`

---

## Examples

### Example 1: Creating a Key Moment

```typescript
const keyMoment: IKeyMoment = {
  id: "km_battle_abc123_turn5_headshot",
  type: "head-shot",
  tier: 2,
  turn: 5,
  phase: "weapon-attack",
  description: "Head shot: Atlas AS7-D hit Timber Wolf Prime in the head for 15 damage",
  relatedUnitIds: ["unit_atlas_001", "unit_timberwolf_002"],
  metadata: {
    damage: 15,
    location: "head",
    attackerId: "unit_atlas_001",
    targetId: "unit_timberwolf_002"
  },
  timestamp: Date.now()
};
```

### Example 2: Creating a Heat Suicide Anomaly

```typescript
const anomaly: IAnomaly = {
  id: "anom_battle_abc123_turn8_heatsuicide",
  type: "heat-suicide",
  severity: "warning",
  battleId: "battle_abc123",
  turn: 8,
  unitId: "unit_atlas_001",
  message: "Atlas AS7-D generated 35 heat (threshold: 30)",
  thresholdUsed: 30,
  actualValue: 35,
  configKey: "heatSuicideThreshold",
  snapshot: undefined, // Not included for warning severity (unless configured)
  timestamp: Date.now()
};
```

### Example 3: Campaign Dashboard Metrics

```typescript
const metrics: ICampaignDashboardMetrics = {
  roster: {
    active: 8,
    wounded: 3,
    kia: 1,
    total: 12
  },
  force: {
    operational: 10,
    damaged: 2,
    destroyed: 1,
    totalBV: 15000,
    damagedBV: 2500
  },
  financialTrend: [
    { date: "2026-01-26", balance: 1000000, income: 50000, expenses: 30000 },
    { date: "2026-01-27", balance: 1020000, income: 40000, expenses: 20000 },
    // ... 28 more days
  ],
  progression: {
    missionsCompleted: 5,
    missionsTotal: 10,
    winRate: 0.8,
    totalXP: 1500,
    averageXPPerMission: 300
  },
  topPerformers: [
    {
      personId: "person_001",
      name: "Natasha Kerensky",
      rank: "Captain",
      kills: 12,
      xp: 500,
      survivalRate: 1.0,
      missionsCompleted: 5
    },
    // ... more performers
  ],
  warnings: {
    lowFunds: false,
    manyWounded: true,  // 3/12 = 25% wounded (threshold: 20%)
    lowBV: false
  }
};
```

---

## References

### Official BattleTech Rules
- **TechManual**: Heat scale (page 43), Battle Value (page 315)
- **Total Warfare**: Combat phases (page 8)

### Related Documentation
- `src/simulation/core/GameState.ts` - Core game state interface
- `src/types/campaign/Campaign.ts` - Campaign data structures
- `openspec/specs/heat-system.md` - Heat thresholds and shutdown rules

---

## Changelog

### Version 1.0 (2026-02-02)
- Initial specification
- Defined key moment, anomaly, dashboard metrics, and comparison data interfaces
- Established tier system for key moments (1=high, 2=medium, 3=low)
- Defined configurable thresholds for anomaly detection
- Added snapshot support for debugging anomalies
