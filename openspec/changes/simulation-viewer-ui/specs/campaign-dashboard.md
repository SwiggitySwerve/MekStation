# Campaign Dashboard Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-02-02
**Dependencies**: data-model.md
**Affects**: shared-components.md

---

## Overview

### Purpose
The Campaign Dashboard provides an at-a-glance summary of campaign state, showing aggregate metrics for personnel, units, finances, and progression. It answers the question "What's the state of my campaign right now?" without requiring users to drill into individual battles.

### Scope
**In Scope:**
- Roster summary (active/wounded/KIA personnel status)
- Force status (operational/damaged/destroyed unit status with BV totals)
- Financial trends (balance over time with configurable time range)
- Progression metrics (missions completed, win rate, XP earned)
- Top performers (sortable by kills/XP/survival rate)
- At-risk warnings (low funds, many wounded, low BV)
- Drill-down navigation to Encounter History tab

**Out of Scope:**
- Individual battle details (see encounter-history.md)
- Anomaly detection (see analysis-bugs.md)
- Real-time updates (batch processing only)
- Export to external formats (future enhancement)
- Customizable dashboard layouts (future enhancement)

### Key Concepts
- **KPI Card**: Single-metric display with comparison context and sparkline
- **Trend Chart**: Line chart showing metric over time (default: 30 days)
- **At-Risk Warning**: Alert when metric crosses configurable threshold
- **Drill-Down**: Click metric → navigate to related detail in Encounter History tab
- **Comparison Context**: Show current value vs previous period or target

---

## Requirements

### Requirement: Roster Summary Display
The system SHALL display a roster summary showing personnel status with active, wounded, and KIA counts.

**Rationale**: Campaign commanders need to know personnel availability at a glance to plan missions.

**Priority**: Critical

#### Scenario: Standard roster display
**GIVEN** a campaign with 12 pilots (8 active, 3 wounded, 1 KIA)
**WHEN** the dashboard loads
**THEN** the roster KPI card SHALL display:
- "Active: 8" (green indicator)
- "Wounded: 3" (yellow indicator)
- "KIA: 1" (red indicator)
- "Total: 12"
**AND** the card SHALL include a sparkline showing active count over last 30 days

#### Scenario: All personnel active
**GIVEN** a campaign with 10 pilots (all active, 0 wounded, 0 KIA)
**WHEN** the dashboard loads
**THEN** the roster KPI card SHALL display:
- "Active: 10" (green indicator)
- "Wounded: 0" (gray indicator)
- "KIA: 0" (gray indicator)
**AND** no at-risk warning SHALL be shown

#### Scenario: High wounded percentage triggers warning
**GIVEN** a campaign with 10 pilots (5 active, 5 wounded, 0 KIA)
**WHEN** the dashboard loads
**THEN** the roster KPI card SHALL display a warning badge
**AND** the at-risk warnings section SHALL show "Many Wounded: 50% of roster (threshold: 20%)"
**AND** clicking the warning SHALL navigate to Encounter History filtered by recent battles

### Requirement: Force Status Display
The system SHALL display force status showing unit operational status with BV totals.

**Rationale**: Campaign commanders need to know force readiness and combat power.

**Priority**: Critical

#### Scenario: Mixed force status
**GIVEN** a campaign with 13 units (10 operational, 2 damaged, 1 destroyed)
**WHEN** the dashboard loads
**THEN** the force KPI card SHALL display:
- "Operational: 10" (15,000 BV total)
- "Damaged: 2" (2,500 BV total)
- "Destroyed: 1" (0 BV)
**AND** the card SHALL show "Total BV: 17,500" (operational + damaged)
**AND** the card SHALL include a sparkline showing operational BV over last 30 days

#### Scenario: Low BV triggers warning
**GIVEN** a campaign starting BV of 20,000
**WHEN** current operational BV drops to 9,000 (45% of starting)
**THEN** the force KPI card SHALL display a warning badge
**AND** the at-risk warnings section SHALL show "Low BV: 45% of starting force (threshold: 50%)"

#### Scenario: All units operational
**GIVEN** a campaign with 12 units (all operational, 0 damaged, 0 destroyed)
**WHEN** the dashboard loads
**THEN** the force KPI card SHALL display:
- "Operational: 12" (18,000 BV total)
- "Damaged: 0" (gray indicator)
- "Destroyed: 0" (gray indicator)
**AND** no at-risk warning SHALL be shown

### Requirement: Financial Trend Display
The system SHALL display a financial trend chart showing balance over time with configurable time range.

**Rationale**: Campaign commanders need to track financial health and plan expenses.

**Priority**: High

#### Scenario: 30-day financial trend
**GIVEN** a campaign with 30 days of financial history
**WHEN** the dashboard loads with default config (30 days)
**THEN** the financial trend chart SHALL display:
- Line chart with 30 data points (one per day)
- X-axis: dates (oldest to newest)
- Y-axis: C-Bills balance
- Tooltip on hover: date, balance, income, expenses
**AND** the chart SHALL include a horizontal line showing starting balance
**AND** the chart SHALL use green for positive trend, red for negative trend

#### Scenario: Configurable time range
**GIVEN** a campaign with 90 days of financial history
**WHEN** the user selects "7 days" from the time range dropdown
**THEN** the financial trend chart SHALL update to show last 7 days
**AND** the chart SHALL maintain the same visual style
**AND** the config SHALL persist for the session

#### Scenario: Low funds triggers warning
**GIVEN** a campaign with current balance of $80,000
**WHEN** the low funds threshold is $100,000
**THEN** the financial trend chart SHALL display a warning badge
**AND** the at-risk warnings section SHALL show "Low Funds: $80,000 (threshold: $100,000)"
**AND** the chart SHALL highlight the threshold line in red

### Requirement: Progression Metrics Display
The system SHALL display progression metrics showing missions completed, win rate, and XP earned.

**Rationale**: Campaign commanders need to track progress toward campaign goals.

**Priority**: High

#### Scenario: Standard progression display
**GIVEN** a campaign with 5 missions completed (4 wins, 1 loss) and 1,500 total XP
**WHEN** the dashboard loads
**THEN** the progression KPI cards SHALL display:
- "Missions: 5/10" (50% complete)
- "Win Rate: 80%" (4/5 wins)
- "Total XP: 1,500" (300 avg per mission)
**AND** each card SHALL include a sparkline showing trend over time

#### Scenario: Perfect win rate
**GIVEN** a campaign with 3 missions completed (all wins)
**WHEN** the dashboard loads
**THEN** the win rate KPI card SHALL display:
- "Win Rate: 100%" (green indicator)
- Sparkline showing consistent wins

#### Scenario: No missions completed
**GIVEN** a new campaign with 0 missions completed
**WHEN** the dashboard loads
**THEN** the progression KPI cards SHALL display:
- "Missions: 0/10" (0% complete)
- "Win Rate: N/A" (gray indicator)
- "Total XP: 0"
**AND** sparklines SHALL be empty (no data)

### Requirement: Top Performers Display
The system SHALL display top performers sorted by user-selected metric (kills/XP/survival rate).

**Rationale**: Campaign commanders need to identify high-performing pilots for promotion and rewards.

**Priority**: Medium

#### Scenario: Top 5 performers by kills
**GIVEN** a campaign with 12 pilots
**WHEN** the dashboard loads with default config (sort by kills, show 5)
**THEN** the top performers section SHALL display:
- 5 pilot cards sorted by kills (descending)
- Each card shows: name, rank, kills, XP, survival rate, missions
**AND** the sort dropdown SHALL show "Kills" selected
**AND** clicking a pilot card SHALL navigate to their detail page

#### Scenario: Change sort to survival rate
**GIVEN** the top performers section is displayed
**WHEN** the user selects "Survival Rate" from the sort dropdown
**THEN** the section SHALL re-sort to show top 5 by survival rate (descending)
**AND** the config SHALL persist for the session

#### Scenario: Fewer than 5 performers
**GIVEN** a campaign with 3 pilots
**WHEN** the dashboard loads
**THEN** the top performers section SHALL display all 3 pilots
**AND** no empty cards SHALL be shown

### Requirement: At-Risk Warnings Display
The system SHALL display at-risk warnings when metrics cross configurable thresholds.

**Rationale**: Campaign commanders need proactive alerts to prevent campaign failure.

**Priority**: High

#### Scenario: Multiple warnings active
**GIVEN** a campaign with low funds ($80k < $100k) and many wounded (30% > 20%)
**WHEN** the dashboard loads
**THEN** the at-risk warnings section SHALL display:
- "Low Funds: $80,000 (threshold: $100,000)" (red badge)
- "Many Wounded: 30% of roster (threshold: 20%)" (orange badge)
**AND** each warning SHALL be clickable to navigate to related detail
**AND** warnings SHALL be sorted by severity (critical > warning > info)

#### Scenario: No warnings active
**GIVEN** a campaign with all metrics above thresholds
**WHEN** the dashboard loads
**THEN** the at-risk warnings section SHALL display:
- "All systems nominal" (green indicator)
**AND** no warning badges SHALL be shown

#### Scenario: Warning threshold configuration
**GIVEN** the at-risk warnings section is displayed
**WHEN** the user clicks "Configure Thresholds"
**THEN** a modal SHALL open with sliders for:
- Low funds amount (C-Bills)
- Wounded percent (0-100%)
- Low BV percent (0-100%)
**AND** changes SHALL apply immediately to the dashboard
**AND** the config SHALL persist across sessions

### Requirement: Drill-Down Navigation
The system SHALL provide drill-down navigation from dashboard metrics to related details in Encounter History tab.

**Rationale**: Users need to investigate metrics without losing context.

**Priority**: High

#### Scenario: Drill down from roster summary
**GIVEN** the roster KPI card shows 3 wounded pilots
**WHEN** the user clicks "Wounded: 3"
**THEN** the system SHALL navigate to Encounter History tab
**AND** the tab SHALL filter to show battles where pilots were wounded
**AND** a breadcrumb SHALL show "Dashboard > Roster > Wounded"

#### Scenario: Drill down from financial trend
**GIVEN** the financial trend chart shows a sharp drop on 2026-01-15
**WHEN** the user clicks the data point for 2026-01-15
**THEN** the system SHALL navigate to Encounter History tab
**AND** the tab SHALL filter to show battles on 2026-01-15
**AND** the tab SHALL highlight financial impacts (repair costs, salvage income)

#### Scenario: Drill down from top performer
**GIVEN** the top performers section shows "Natasha Kerensky" with 12 kills
**WHEN** the user clicks the pilot card
**THEN** the system SHALL navigate to Encounter History tab
**AND** the tab SHALL filter to show battles where Natasha participated
**AND** the tab SHALL highlight her kills in the damage matrix

### Requirement: Responsive Layout
The system SHALL provide a responsive layout that adapts to screen size.

**Rationale**: Users may access the dashboard on desktop, tablet, or mobile devices.

**Priority**: Medium

#### Scenario: Desktop layout (>960px)
**GIVEN** a viewport width of 1920px
**WHEN** the dashboard loads
**THEN** the layout SHALL display:
- 4 KPI cards per row (roster, force, missions, win rate)
- Financial trend chart at 50% width, progression chart at 50% width
- Top performers in a single row (5 cards)
**AND** all elements SHALL use 12-column grid with 32px gutters

#### Scenario: Tablet layout (600-960px)
**GIVEN** a viewport width of 768px
**WHEN** the dashboard loads
**THEN** the layout SHALL display:
- 2 KPI cards per row
- Financial trend chart at 100% width
- Top performers in 2 rows (3 + 2 cards)
**AND** all elements SHALL use 12-column grid with 24px gutters

#### Scenario: Mobile layout (<600px)
**GIVEN** a viewport width of 480px
**WHEN** the dashboard loads
**THEN** the layout SHALL display:
- 1 KPI card per row (stacked vertically)
- Financial trend chart at 100% width (simplified)
- Top performers in 5 rows (1 card each)
**AND** all elements SHALL use 12-column grid with 16px gutters
**AND** tap targets SHALL be at least 44px

---

## Data Model Requirements

### Required Interfaces

The implementation MUST use the following TypeScript interfaces from `data-model.md`:

```typescript
/**
 * Reference: See data-model.md for full interface definitions
 */
interface ICampaignDashboardMetrics {
  readonly roster: {
    readonly active: number;
    readonly wounded: number;
    readonly kia: number;
    readonly total: number;
  };
  readonly force: {
    readonly operational: number;
    readonly damaged: number;
    readonly destroyed: number;
    readonly totalBV: number;
    readonly damagedBV: number;
  };
  readonly financialTrend: IFinancialDataPoint[];
  readonly progression: {
    readonly missionsCompleted: number;
    readonly missionsTotal: number;
    readonly winRate: number;
    readonly totalXP: number;
    readonly averageXPPerMission: number;
  };
  readonly topPerformers: IPerformerSummary[];
  readonly warnings: {
    readonly lowFunds: boolean;
    readonly manyWounded: boolean;
    readonly lowBV: boolean;
  };
}

interface IFinancialDataPoint {
  readonly date: string;
  readonly balance: number;
  readonly income: number;
  readonly expenses: number;
}

interface IPerformerSummary {
  readonly personId: string;
  readonly name: string;
  readonly rank: string;
  readonly kills: number;
  readonly xp: number;
  readonly survivalRate: number;
  readonly missionsCompleted: number;
}

interface IDashboardConfig {
  readonly financialTrendDays: number;
  readonly atRiskThresholds: {
    readonly lowFundsAmount: number;
    readonly woundedPercent: number;
    readonly lowBVPercent: number;
  };
  readonly topPerformers: {
    readonly count: number;
    readonly sortBy: "kills" | "xp" | "survival-rate";
  };
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `ICampaignDashboardMetrics.roster.active` | `number` | Yes | Active pilots | >= 0 | N/A |
| `ICampaignDashboardMetrics.roster.wounded` | `number` | Yes | Wounded pilots | >= 0 | N/A |
| `ICampaignDashboardMetrics.roster.kia` | `number` | Yes | KIA pilots | >= 0 | N/A |
| `ICampaignDashboardMetrics.force.operational` | `number` | Yes | Operational units | >= 0 | N/A |
| `ICampaignDashboardMetrics.force.totalBV` | `number` | Yes | Total BV | >= 0 | N/A |
| `ICampaignDashboardMetrics.progression.winRate` | `number` | Yes | Win rate | 0.0 to 1.0 | N/A |
| `IDashboardConfig.financialTrendDays` | `number` | Yes | Trend days | 7, 14, 30, 60, 90 | 30 |
| `IDashboardConfig.atRiskThresholds.lowFundsAmount` | `number` | Yes | Low funds threshold | > 0 | 100000 |
| `IDashboardConfig.atRiskThresholds.woundedPercent` | `number` | Yes | Wounded threshold | 0.0 to 1.0 | 0.2 |
| `IDashboardConfig.topPerformers.count` | `number` | Yes | Performers to show | 1 to 10 | 5 |

### Type Constraints

- `ICampaignDashboardMetrics.roster.total` MUST equal `active + wounded + kia`
- `ICampaignDashboardMetrics.force.totalBV` MUST equal sum of operational and damaged unit BV
- `ICampaignDashboardMetrics.progression.winRate` MUST be between 0.0 and 1.0
- `ICampaignDashboardMetrics.progression.winRate` MUST be null when `missionsCompleted` is 0
- `IFinancialDataPoint.date` MUST be ISO 8601 date string (YYYY-MM-DD)
- `IFinancialDataPoint` array MUST be sorted chronologically (oldest to newest)
- `IPerformerSummary.survivalRate` MUST be between 0.0 and 1.0
- `IDashboardConfig.financialTrendDays` MUST be one of: 7, 14, 30, 60, 90
- `IDashboardConfig.atRiskThresholds.woundedPercent` MUST be between 0.0 and 1.0
- `IDashboardConfig.atRiskThresholds.lowBVPercent` MUST be between 0.0 and 1.0
- When `ICampaignDashboardMetrics.warnings.lowFunds` is true, current balance MUST be < `IDashboardConfig.atRiskThresholds.lowFundsAmount`

---

## Validation Rules

### Validation: Roster Totals Match
**Rule**: Roster total must equal sum of active, wounded, and KIA.

**Severity**: Error

**Condition**:
```typescript
if (roster.total !== roster.active + roster.wounded + roster.kia) {
  // invalid - emit error
}
```

**Error Message**: "Roster total mismatch: total={total}, active={active}, wounded={wounded}, kia={kia}"

**User Action**: Recalculate roster metrics from campaign state.

### Validation: Win Rate Range
**Rule**: Win rate must be between 0.0 and 1.0, or null if no missions completed.

**Severity**: Error

**Condition**:
```typescript
if (progression.missionsCompleted === 0 && progression.winRate !== null) {
  // invalid - emit error
}
if (progression.winRate !== null && (progression.winRate < 0 || progression.winRate > 1)) {
  // invalid - emit error
}
```

**Error Message**: "Invalid win rate: {winRate} (must be 0.0-1.0 or null)"

**User Action**: Recalculate win rate as wins / missionsCompleted.

### Validation: Financial Trend Chronological Order
**Rule**: Financial trend data points must be sorted chronologically.

**Severity**: Warning

**Condition**:
```typescript
for (let i = 1; i < financialTrend.length; i++) {
  if (new Date(financialTrend[i].date) < new Date(financialTrend[i-1].date)) {
    // invalid - emit warning
  }
}
```

**Error Message**: "Financial trend data not sorted chronologically"

**User Action**: Sort financial trend array by date before rendering.

### Validation: Threshold Configuration Range
**Rule**: All threshold percentages must be between 0.0 and 1.0.

**Severity**: Error

**Condition**:
```typescript
if (config.atRiskThresholds.woundedPercent < 0 || config.atRiskThresholds.woundedPercent > 1) {
  // invalid - emit error
}
if (config.atRiskThresholds.lowBVPercent < 0 || config.atRiskThresholds.lowBVPercent > 1) {
  // invalid - emit error
}
```

**Error Message**: "Invalid threshold: {name}={value} (must be 0.0-1.0)"

**User Action**: Reset threshold to default value.

---

## Dependencies

### Depends On
- **data-model.md**: Uses `ICampaignDashboardMetrics`, `IDashboardConfig`, `IFinancialDataPoint`, `IPerformerSummary`
- **campaign-types**: Uses `Campaign`, `Person`, `Force` from core campaign system
- **simulation-system**: Uses battle results for progression metrics

### Used By
- **shared-components.md**: KPI Card, Trend Chart, Performer Card components
- **encounter-history.md**: Drill-down navigation target

---

## Implementation Notes

### Performance Considerations
- **Pre-compute metrics**: Calculate `ICampaignDashboardMetrics` on campaign state change, not on every render
- **Memoize charts**: Use React.memo or useMemo for chart components to avoid re-renders
- **Lazy load sparklines**: Only render sparklines when KPI cards are visible (intersection observer)
- **Debounce config changes**: Wait 300ms after user stops adjusting sliders before recalculating

### Edge Cases
- **Empty campaign**: All metrics show 0 or N/A, no warnings, no sparklines
- **First mission**: Win rate is N/A until first mission completes
- **No financial history**: Trend chart shows "No data available" message
- **All pilots KIA**: Roster shows 100% KIA, critical warning displayed
- **Negative balance**: Financial trend chart shows red line below zero

### Common Pitfalls
- **Pitfall**: Recalculating metrics on every render
  - **Solution**: Use Zustand store to cache metrics, only recalculate on campaign state change
- **Pitfall**: Hardcoding thresholds in components
  - **Solution**: Read thresholds from `IDashboardConfig`, allow user configuration
- **Pitfall**: Not handling null win rate
  - **Solution**: Display "N/A" when `missionsCompleted` is 0
- **Pitfall**: Sparklines causing performance issues
  - **Solution**: Use lightweight charting library (e.g., react-sparklines), limit data points to 30

---

## Examples

### Example 1: Standard Dashboard Metrics

**Input**:
```typescript
const campaign: Campaign = {
  pilots: [
    { status: "active" }, { status: "active" }, { status: "active" },
    { status: "active" }, { status: "active" }, { status: "active" },
    { status: "active" }, { status: "active" },
    { status: "wounded" }, { status: "wounded" }, { status: "wounded" },
    { status: "kia" }
  ],
  units: [
    { status: "operational", bv: 1500 }, { status: "operational", bv: 1500 },
    { status: "operational", bv: 1500 }, { status: "operational", bv: 1500 },
    { status: "operational", bv: 1500 }, { status: "operational", bv: 1500 },
    { status: "operational", bv: 1500 }, { status: "operational", bv: 1500 },
    { status: "operational", bv: 1500 }, { status: "operational", bv: 1500 },
    { status: "damaged", bv: 1250 }, { status: "damaged", bv: 1250 },
    { status: "destroyed", bv: 0 }
  ],
  missions: [
    { result: "win" }, { result: "win" }, { result: "win" },
    { result: "win" }, { result: "loss" }
  ],
  totalXP: 1500,
  balance: 850000,
  startingBV: 20000
};
```

**Processing**:
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
    totalBV: 15000,  // 10 * 1500
    damagedBV: 2500  // 2 * 1250
  },
  financialTrend: [
    // ... 30 days of data
  ],
  progression: {
    missionsCompleted: 5,
    missionsTotal: 10,
    winRate: 0.8,  // 4 wins / 5 missions
    totalXP: 1500,
    averageXPPerMission: 300  // 1500 / 5
  },
  topPerformers: [
    // ... sorted by kills
  ],
  warnings: {
    lowFunds: true,   // 850000 < 1000000
    manyWounded: true, // 3/12 = 25% > 20%
    lowBV: true       // 17500 / 20000 = 87.5% > 50% (no warning)
  }
};
```

**Output**:
Dashboard displays:
- Roster: 8 active, 3 wounded, 1 KIA (warning badge)
- Force: 10 operational (15,000 BV), 2 damaged (2,500 BV)
- Missions: 5/10 complete, 80% win rate
- Warnings: "Low Funds: $850,000", "Many Wounded: 25%"

### Example 2: Empty Campaign (New Game)

**Input**:
```typescript
const campaign: Campaign = {
  pilots: [],
  units: [],
  missions: [],
  totalXP: 0,
  balance: 1000000,
  startingBV: 0
};
```

**Output**:
```typescript
const metrics: ICampaignDashboardMetrics = {
  roster: { active: 0, wounded: 0, kia: 0, total: 0 },
  force: { operational: 0, damaged: 0, destroyed: 0, totalBV: 0, damagedBV: 0 },
  financialTrend: [],
  progression: {
    missionsCompleted: 0,
    missionsTotal: 10,
    winRate: null,  // N/A
    totalXP: 0,
    averageXPPerMission: 0
  },
  topPerformers: [],
  warnings: { lowFunds: false, manyWounded: false, lowBV: false }
};
```

Dashboard displays:
- All KPI cards show 0 or N/A
- No sparklines (no data)
- No warnings
- "No data available" message in charts

---

## References

### Official BattleTech Rules
- **Campaign Operations**: Campaign management rules (page 12)
- **TechManual**: Battle Value calculations (page 315)

### Related Documentation
- `openspec/changes/simulation-viewer-ui/specs/data-model.md` - TypeScript interfaces
- `openspec/changes/simulation-viewer-ui/specs/encounter-history.md` - Drill-down target
- `openspec/changes/simulation-viewer-ui/specs/shared-components.md` - UI components

### Design Research
- Material Design Dashboard Patterns: https://material.io/design/layout/understanding-layout.html
- Edward Tufte Data Visualization Principles: The Visual Display of Quantitative Information
- Cleveland & McGill Hierarchy: Graphical Perception (1984)

---

## Changelog

### Version 1.0 (2026-02-02)
- Initial specification
- Defined roster, force, financial, progression, and top performers displays
- Established at-risk warning system with configurable thresholds
- Defined drill-down navigation patterns to Encounter History tab
- Specified responsive layout for desktop, tablet, and mobile
- Added validation rules for data integrity
- Included concrete examples for standard and edge cases
