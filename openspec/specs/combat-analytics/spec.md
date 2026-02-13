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
