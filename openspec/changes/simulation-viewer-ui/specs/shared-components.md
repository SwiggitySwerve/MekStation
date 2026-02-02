# Shared Components Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-02-02
**Dependencies**: data-model.md, campaign-dashboard.md, encounter-history.md, analysis-bugs.md
**Affects**: Implementation tasks (component creation)

---

## Overview

### Purpose
Defines reusable UI components shared across all three tabs of the Simulation Viewer (Campaign Dashboard, Encounter History, Analysis & Bugs). Ensures consistent design, behavior, and accessibility across the application.

### Scope
**In Scope:**
- KPI Card component (single metric display with sparkline)
- Trend Chart component (line chart for time-series data)
- Anomaly Alert Card component (severity-based alert display)
- Tab Navigation component (three-tab switcher)
- Drill-Down Link component (navigation with context preservation)
- Filter Panel component (multi-select filters with search)

**Out of Scope:**
- Page-level layouts (defined in tab specs)
- Data fetching logic (defined in data model)
- State management (Zustand stores)
- Chart library selection (implementation detail)

### Key Concepts
- **Component Props**: TypeScript interfaces defining component inputs
- **Responsive Design**: Mobile-first approach with breakpoints at 600px, 960px
- **Accessibility**: WCAG 2.1 AA compliance (keyboard navigation, ARIA labels, screen reader support)
- **Dark Mode**: Support via Tailwind dark: classes
- **Touch Targets**: Minimum 44px for mobile interactions

---

## Requirements

### Requirement: KPI Card Component
The system SHALL provide a KPI Card component that displays a single metric with comparison context, sparkline, and drill-down capability.

**Rationale**: Campaign Dashboard needs consistent metric display across roster, force, financial, and progression sections.

**Priority**: Critical

#### Scenario: Standard KPI card display
**GIVEN** a KPI card with value=8, label="Active Pilots", comparison="+2 vs last month", trend=[5,6,7,8]
**WHEN** the component renders
**THEN** it SHALL display:
- Label "Active Pilots" (text-sm, text-gray-600 dark:text-gray-400)
- Value "8" (text-3xl, font-bold, text-gray-900 dark:text-gray-100)
- Comparison "+2 vs last month" (text-sm, text-green-600, with ↑ icon)
- Sparkline showing trend [5,6,7,8] (height: 40px, stroke: green)
**AND** the card SHALL have hover state (shadow-md → shadow-lg)

#### Scenario: KPI card with negative comparison
**GIVEN** a KPI card with comparison="-3 vs last month"
**WHEN** the component renders
**THEN** the comparison SHALL display:
- Text color: text-red-600
- Icon: ↓ (down arrow)
- Sparkline stroke: red

#### Scenario: KPI card with drill-down
**GIVEN** a KPI card with onClick handler
**WHEN** the user clicks the card
**THEN** the onClick handler SHALL be invoked
**AND** the cursor SHALL be "pointer"
**AND** the card SHALL have focus ring (ring-2 ring-blue-500)

#### Scenario: KPI card without comparison
**GIVEN** a KPI card with comparison=undefined
**WHEN** the component renders
**THEN** the comparison section SHALL not be displayed
**AND** the sparkline SHALL still be visible

#### Scenario: KPI card responsive sizing
**GIVEN** a KPI card on mobile (<600px)
**WHEN** the component renders
**THEN** it SHALL use:
- Value: text-2xl (smaller than desktop)
- Padding: p-4 (reduced from p-6)
- Sparkline height: 32px (reduced from 40px)

### Requirement: Trend Chart Component
The system SHALL provide a Trend Chart component that displays time-series data with configurable time range and responsive sizing.

**Rationale**: Campaign Dashboard needs financial trend visualization with user-configurable time ranges.

**Priority**: High

#### Scenario: Standard trend chart display
**GIVEN** a trend chart with data=[{date:"2026-01-01", value:1000}, {date:"2026-01-02", value:1100}, ...]
**WHEN** the component renders
**THEN** it SHALL display:
- Line chart with X-axis (dates) and Y-axis (values)
- Tooltip on hover showing date and value
- Responsive container (width: 100%, height: 300px on desktop)
- Grid lines (subtle, gray-200 dark:gray-700)

#### Scenario: Configurable time range
**GIVEN** a trend chart with timeRange="7d"
**WHEN** the user selects "30d" from the dropdown
**THEN** the chart SHALL update to show last 30 days
**AND** the onTimeRangeChange callback SHALL be invoked with "30d"
**AND** the selection SHALL persist in the dropdown

#### Scenario: Empty data handling
**GIVEN** a trend chart with data=[]
**WHEN** the component renders
**THEN** it SHALL display:
- Empty state message: "No data available"
- Icon: 📊 (chart icon)
- Suggestion: "Data will appear after first simulation"

#### Scenario: Responsive sizing
**GIVEN** a trend chart on mobile (<600px)
**WHEN** the component renders
**THEN** it SHALL use:
- Height: 200px (reduced from 300px)
- Simplified X-axis labels (fewer ticks)
- Touch-friendly tooltip (larger hit area)

#### Scenario: Threshold line display
**GIVEN** a trend chart with threshold=100000
**WHEN** the component renders
**THEN** it SHALL display:
- Horizontal line at y=100000
- Line color: red (if below threshold), green (if above)
- Label: "Threshold: $100,000"

### Requirement: Anomaly Alert Card Component
The system SHALL provide an Anomaly Alert Card component that displays anomalies with severity-based styling, icons, and actions.

**Rationale**: Analysis & Bugs tab needs consistent anomaly display with visual hierarchy and actionable buttons.

**Priority**: Critical

#### Scenario: Critical anomaly card
**GIVEN** an anomaly with severity="critical", type="state-cycle", message="Game state repeated 3 times"
**WHEN** the component renders
**THEN** it SHALL display:
- Border: border-l-4 border-red-600
- Background: bg-red-50 dark:bg-red-900/20
- Icon: 🔴 (red circle)
- Title: "State Cycle Detected" (text-lg, font-semibold, text-red-900 dark:text-red-100)
- Message: "Game state repeated 3 times" (text-sm, text-red-700 dark:text-red-300)
- Actions: "View Snapshot", "View Battle", "Dismiss"

#### Scenario: Warning anomaly card
**GIVEN** an anomaly with severity="warning", type="heat-suicide"
**WHEN** the component renders
**THEN** it SHALL display:
- Border: border-l-4 border-orange-600
- Background: bg-orange-50 dark:bg-orange-900/20
- Icon: ⚠️ (warning triangle)
- Title: "Heat Suicide" (text-lg, font-semibold, text-orange-900 dark:text-orange-100)
- Actions: "View Battle", "Configure Threshold", "Dismiss"

#### Scenario: Info anomaly card
**GIVEN** an anomaly with severity="info", type="long-game"
**WHEN** the component renders
**THEN** it SHALL display:
- Border: border-l-4 border-blue-600
- Background: bg-blue-50 dark:bg-blue-900/20
- Icon: ℹ️ (info circle)
- Title: "Long Game" (text-lg, font-semibold, text-blue-900 dark:text-blue-100)
- Actions: "View Battle", "Dismiss"

#### Scenario: Dismiss action
**GIVEN** an anomaly alert card
**WHEN** the user clicks "Dismiss"
**THEN** the onDismiss callback SHALL be invoked
**AND** the card SHALL fade out (transition-opacity duration-300)
**AND** the card SHALL be removed from DOM after animation

#### Scenario: Keyboard navigation
**GIVEN** an anomaly alert card with focus
**WHEN** the user presses Tab
**THEN** focus SHALL move to the first action button
**AND** subsequent Tab presses SHALL cycle through action buttons
**AND** Enter/Space SHALL activate the focused button

### Requirement: Tab Navigation Component
The system SHALL provide a Tab Navigation component that switches between Campaign Dashboard, Encounter History, and Analysis & Bugs tabs with keyboard support and URL state preservation.

**Rationale**: All three tabs need consistent navigation with accessibility and state management.

**Priority**: Critical

#### Scenario: Standard tab navigation
**GIVEN** a tab navigation with activeTab="campaign-dashboard"
**WHEN** the component renders
**THEN** it SHALL display:
- Three tabs: "Campaign Dashboard", "Encounter History", "Analysis & Bugs"
- Active tab with: bg-white dark:bg-gray-800, border-b-2 border-blue-600, text-blue-600
- Inactive tabs with: bg-gray-100 dark:bg-gray-900, text-gray-600 dark:text-gray-400
- Hover state on inactive tabs: bg-gray-200 dark:bg-gray-800

#### Scenario: Tab switching
**GIVEN** a tab navigation with activeTab="campaign-dashboard"
**WHEN** the user clicks "Encounter History"
**THEN** the onTabChange callback SHALL be invoked with "encounter-history"
**AND** the URL SHALL update to /simulation-viewer?tab=encounter-history
**AND** the active tab indicator SHALL move to "Encounter History"

#### Scenario: Keyboard navigation
**GIVEN** a tab navigation with focus on "Campaign Dashboard"
**WHEN** the user presses ArrowRight
**THEN** focus SHALL move to "Encounter History"
**AND** the tab SHALL be activated
**WHEN** the user presses ArrowLeft
**THEN** focus SHALL move back to "Campaign Dashboard"

#### Scenario: URL state preservation
**GIVEN** a URL with ?tab=analysis-bugs
**WHEN** the tab navigation mounts
**THEN** the activeTab SHALL be set to "analysis-bugs"
**AND** the "Analysis & Bugs" tab SHALL be displayed as active

#### Scenario: Responsive layout
**GIVEN** a tab navigation on mobile (<600px)
**WHEN** the component renders
**THEN** it SHALL use:
- Full-width tabs (w-full)
- Stacked layout (flex-col) if needed
- Smaller text (text-sm)

### Requirement: Drill-Down Link Component
The system SHALL provide a Drill-Down Link component that navigates to related details with context preservation and breadcrumb trail.

**Rationale**: Campaign Dashboard needs to link to Encounter History with filters applied and context preserved.

**Priority**: High

#### Scenario: Standard drill-down link
**GIVEN** a drill-down link with label="View Battles", targetTab="encounter-history", filter={status:"wounded"}
**WHEN** the user clicks the link
**THEN** the system SHALL:
- Navigate to Encounter History tab
- Apply filter: status="wounded"
- Add breadcrumb: "Dashboard > Roster > Wounded"
- Preserve scroll position when returning

#### Scenario: Link with icon
**GIVEN** a drill-down link with icon="arrow-right"
**WHEN** the component renders
**THEN** it SHALL display:
- Link text with underline on hover
- Icon to the right of text
- Color: text-blue-600 dark:text-blue-400
- Cursor: pointer

#### Scenario: Keyboard navigation
**GIVEN** a drill-down link with focus
**WHEN** the user presses Enter or Space
**THEN** the navigation SHALL be triggered
**AND** the link SHALL have focus ring (ring-2 ring-blue-500)

#### Scenario: Back navigation
**GIVEN** a user navigated via drill-down link
**WHEN** the user clicks the browser back button
**THEN** the system SHALL:
- Return to the previous tab
- Restore scroll position
- Clear applied filters (unless explicitly preserved)

### Requirement: Filter Panel Component
The system SHALL provide a Filter Panel component that supports multi-select filters, search input, and active filter display.

**Rationale**: Encounter History and Analysis & Bugs tabs need consistent filtering UI.

**Priority**: High

#### Scenario: Standard filter panel
**GIVEN** a filter panel with filters=[{id:"severity", label:"Severity", options:["critical","warning","info"]}]
**WHEN** the component renders
**THEN** it SHALL display:
- Filter label "Severity"
- Multi-select dropdown with checkboxes
- Options: "Critical", "Warning", "Info"
- "Clear All" button (disabled if no filters active)

#### Scenario: Multi-select filter
**GIVEN** a filter panel with severity filter
**WHEN** the user selects "Critical" and "Warning"
**THEN** the onFilterChange callback SHALL be invoked with {severity:["critical","warning"]}
**AND** active filter badges SHALL display: "Critical (5)", "Warning (12)"
**AND** the dropdown SHALL show checkmarks next to selected options

#### Scenario: Search input
**GIVEN** a filter panel with search enabled
**WHEN** the user types "Atlas" in the search box
**THEN** the onSearchChange callback SHALL be invoked with "Atlas"
**AND** the search input SHALL debounce (300ms delay)
**AND** a clear button (X) SHALL appear in the input

#### Scenario: Clear all filters
**GIVEN** a filter panel with 3 active filters
**WHEN** the user clicks "Clear All"
**THEN** all filters SHALL be cleared
**AND** the onFilterChange callback SHALL be invoked with {}
**AND** active filter badges SHALL be removed

#### Scenario: Active filter count badge
**GIVEN** a filter panel with 3 active filters
**WHEN** the component renders
**THEN** it SHALL display:
- Badge: "3 active filters" (bg-blue-100 dark:bg-blue-900, text-blue-800 dark:text-blue-200)
- Badge position: top-right of filter panel

#### Scenario: Responsive layout
**GIVEN** a filter panel on mobile (<600px)
**WHEN** the component renders
**THEN** it SHALL use:
- Full-width dropdowns
- Stacked layout (flex-col)
- Collapsible sections (expand/collapse)

---

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Props for KPI Card component
 */
interface IKPICardProps {
  /**
   * Metric label
   * @example "Active Pilots"
   */
  readonly label: string;

  /**
   * Current metric value
   * @example 8
   */
  readonly value: number | string;

  /**
   * Comparison context (optional)
   * @example "+2 vs last month"
   */
  readonly comparison?: string;

  /**
   * Comparison direction (for color coding)
   */
  readonly comparisonDirection?: "up" | "down" | "neutral";

  /**
   * Sparkline data (optional)
   * @example [5, 6, 7, 8]
   */
  readonly sparklineData?: number[];

  /**
   * Click handler for drill-down (optional)
   */
  readonly onClick?: () => void;

  /**
   * Status indicator color (optional)
   * @example "green" | "red" | "yellow" | "gray"
   */
  readonly status?: "success" | "error" | "warning" | "neutral";

  /**
   * Additional CSS classes
   */
  readonly className?: string;
}

/**
 * Props for Trend Chart component
 */
interface ITrendChartProps {
  /**
   * Time-series data points
   */
  readonly data: IFinancialDataPoint[];

  /**
   * Chart title
   * @example "Financial Trend"
   */
  readonly title: string;

  /**
   * Time range selection (optional)
   * @example "7d" | "14d" | "30d" | "60d" | "90d"
   */
  readonly timeRange?: string;

  /**
   * Available time range options (optional)
   */
  readonly timeRangeOptions?: string[];

  /**
   * Callback when time range changes
   */
  readonly onTimeRangeChange?: (range: string) => void;

  /**
   * Threshold line value (optional)
   * @example 100000
   */
  readonly threshold?: number;

  /**
   * Threshold label (optional)
   * @example "Low Funds Threshold"
   */
  readonly thresholdLabel?: string;

  /**
   * Chart height in pixels
   * @default 300
   */
  readonly height?: number;

  /**
   * Additional CSS classes
   */
  readonly className?: string;
}

/**
 * Props for Anomaly Alert Card component
 */
interface IAnomalyAlertCardProps {
  /**
   * Anomaly data
   */
  readonly anomaly: IAnomaly;

  /**
   * Callback when "View Snapshot" is clicked
   */
  readonly onViewSnapshot?: (anomaly: IAnomaly) => void;

  /**
   * Callback when "View Battle" is clicked
   */
  readonly onViewBattle?: (battleId: string) => void;

  /**
   * Callback when "Configure Threshold" is clicked
   */
  readonly onConfigureThreshold?: (configKey: string) => void;

  /**
   * Callback when "Dismiss" is clicked
   */
  readonly onDismiss?: (anomalyId: string) => void;

  /**
   * Additional CSS classes
   */
  readonly className?: string;
}

/**
 * Props for Tab Navigation component
 */
interface ITabNavigationProps {
  /**
   * Currently active tab
   */
  readonly activeTab: "campaign-dashboard" | "encounter-history" | "analysis-bugs";

  /**
   * Callback when tab changes
   */
  readonly onTabChange: (tab: string) => void;

  /**
   * Additional CSS classes
   */
  readonly className?: string;
}

/**
 * Props for Drill-Down Link component
 */
interface IDrillDownLinkProps {
  /**
   * Link label
   * @example "View Battles"
   */
  readonly label: string;

  /**
   * Target tab to navigate to
   */
  readonly targetTab: "campaign-dashboard" | "encounter-history" | "analysis-bugs";

  /**
   * Filter to apply on target tab (optional)
   * @example { status: "wounded" }
   */
  readonly filter?: Record<string, unknown>;

  /**
   * Icon to display (optional)
   * @example "arrow-right"
   */
  readonly icon?: string;

  /**
   * Additional CSS classes
   */
  readonly className?: string;
}

/**
 * Props for Filter Panel component
 */
interface IFilterPanelProps {
  /**
   * Available filters
   */
  readonly filters: IFilterDefinition[];

  /**
   * Currently active filters
   */
  readonly activeFilters: Record<string, string[]>;

  /**
   * Callback when filters change
   */
  readonly onFilterChange: (filters: Record<string, string[]>) => void;

  /**
   * Enable search input
   * @default false
   */
  readonly enableSearch?: boolean;

  /**
   * Search query
   */
  readonly searchQuery?: string;

  /**
   * Callback when search query changes
   */
  readonly onSearchChange?: (query: string) => void;

  /**
   * Additional CSS classes
   */
  readonly className?: string;
}

/**
 * Filter definition for Filter Panel
 */
interface IFilterDefinition {
  /**
   * Filter identifier
   * @example "severity"
   */
  readonly id: string;

  /**
   * Filter label
   * @example "Severity"
   */
  readonly label: string;

  /**
   * Filter options
   * @example ["critical", "warning", "info"]
   */
  readonly options: string[];

  /**
   * Option labels (optional, defaults to capitalized options)
   * @example { "critical": "Critical", "warning": "Warning", "info": "Info" }
   */
  readonly optionLabels?: Record<string, string>;
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `IKPICardProps.label` | `string` | Yes | Metric label | Non-empty string | N/A |
| `IKPICardProps.value` | `number \| string` | Yes | Metric value | Any | N/A |
| `IKPICardProps.comparisonDirection` | `string` | No | Comparison direction | "up", "down", "neutral" | "neutral" |
| `ITrendChartProps.data` | `IFinancialDataPoint[]` | Yes | Chart data | Non-empty array | N/A |
| `ITrendChartProps.height` | `number` | No | Chart height | > 0 | 300 |
| `IAnomalyAlertCardProps.anomaly` | `IAnomaly` | Yes | Anomaly data | Valid IAnomaly | N/A |
| `ITabNavigationProps.activeTab` | `string` | Yes | Active tab | "campaign-dashboard", "encounter-history", "analysis-bugs" | N/A |
| `IFilterPanelProps.filters` | `IFilterDefinition[]` | Yes | Filter definitions | Non-empty array | N/A |

### Type Constraints

- `IKPICardProps.comparisonDirection` MUST be one of: "up", "down", "neutral"
- `IKPICardProps.status` MUST be one of: "success", "error", "warning", "neutral"
- `ITrendChartProps.height` MUST be > 0
- `ITrendChartProps.timeRange` MUST be one of: "7d", "14d", "30d", "60d", "90d"
- `ITabNavigationProps.activeTab` MUST be one of: "campaign-dashboard", "encounter-history", "analysis-bugs"
- `IFilterDefinition.options` MUST be non-empty array
- When `IKPICardProps.onClick` is provided, component MUST be keyboard accessible (Enter/Space)
- When `IAnomalyAlertCardProps.anomaly.severity` is "critical", "View Snapshot" action MUST be available

---

## Validation Rules

### Validation: KPI Card Props
**Rule**: KPI Card must have valid label and value

**Severity**: Error

**Condition**:
```typescript
if (!props.label || props.label.trim() === "") {
  // invalid - empty label
}
if (props.value === null || props.value === undefined) {
  // invalid - missing value
}
```

**Error Message**: "KPI Card requires non-empty label and value"

**User Action**: Provide valid label and value props

### Validation: Trend Chart Data
**Rule**: Trend Chart data must be chronologically sorted

**Severity**: Warning

**Condition**:
```typescript
for (let i = 1; i < props.data.length; i++) {
  if (new Date(props.data[i].date) < new Date(props.data[i-1].date)) {
    // invalid - not sorted
  }
}
```

**Error Message**: "Trend Chart data not sorted chronologically"

**User Action**: Sort data by date before passing to component

### Validation: Anomaly Alert Card Actions
**Rule**: Critical anomalies must have "View Snapshot" action available

**Severity**: Error

**Condition**:
```typescript
if (props.anomaly.severity === "critical" && !props.onViewSnapshot) {
  // invalid - missing required action
}
```

**Error Message**: "Critical anomalies require onViewSnapshot callback"

**User Action**: Provide onViewSnapshot callback for critical anomalies

### Validation: Tab Navigation Active Tab
**Rule**: Active tab must be one of the valid tab IDs

**Severity**: Error

**Condition**:
```typescript
const validTabs = ["campaign-dashboard", "encounter-history", "analysis-bugs"];
if (!validTabs.includes(props.activeTab)) {
  // invalid - unknown tab
}
```

**Error Message**: "Invalid active tab: {activeTab}"

**User Action**: Use one of: "campaign-dashboard", "encounter-history", "analysis-bugs"

---

## Dependencies

### Depends On
- **data-model.md**: Uses `IAnomaly`, `IFinancialDataPoint` interfaces
- **campaign-dashboard.md**: KPI Card, Trend Chart usage requirements
- **encounter-history.md**: Filter Panel, Drill-Down Link usage requirements
- **analysis-bugs.md**: Anomaly Alert Card, Filter Panel usage requirements

### Used By
- **Campaign Dashboard**: KPI Card, Trend Chart, Drill-Down Link, Tab Navigation
- **Encounter History**: Filter Panel, Drill-Down Link, Tab Navigation
- **Analysis & Bugs**: Anomaly Alert Card, Filter Panel, Tab Navigation

---

## Implementation Notes

### Performance Considerations
- **Sparklines**: Use lightweight library (react-sparklines or custom SVG) to avoid heavy chart library overhead
- **Trend Charts**: Debounce time range changes (300ms) to avoid excessive re-renders
- **Filter Panel**: Debounce search input (300ms) to reduce callback frequency
- **Anomaly Cards**: Use CSS transitions for dismiss animation (avoid JS animation)

### Accessibility Requirements
- **Keyboard Navigation**: All interactive components must be keyboard accessible (Tab, Enter, Space, Arrow keys)
- **ARIA Labels**: All components must have appropriate ARIA labels and roles
- **Screen Reader Support**: All components must announce state changes (e.g., "Filter applied: Critical")
- **Focus Management**: Focus must be visible (ring-2 ring-blue-500) and logical
- **Color Contrast**: All text must meet WCAG 2.1 AA contrast ratios (4.5:1 for normal text, 3:1 for large text)

### Responsive Design
- **Breakpoints**: Mobile <600px, Tablet 600-960px, Desktop >960px
- **Touch Targets**: Minimum 44px for mobile (buttons, links, checkboxes)
- **Spacing**: 8px/16px/24px grid system (Tailwind defaults)
- **Typography**: Responsive text sizes (text-sm on mobile, text-base on desktop)

### Dark Mode Support
- **Color Scheme**: Use Tailwind dark: classes for all color properties
- **Contrast**: Ensure sufficient contrast in both light and dark modes
- **Testing**: Test all components in both modes

### Common Pitfalls
- **Pitfall**: Hardcoding colors instead of using Tailwind classes
  - **Solution**: Use semantic color classes (text-red-600, bg-blue-50) with dark: variants
- **Pitfall**: Not handling empty data states
  - **Solution**: Always provide empty state UI with helpful message
- **Pitfall**: Forgetting keyboard navigation
  - **Solution**: Test all components with keyboard only (no mouse)
- **Pitfall**: Not debouncing search input
  - **Solution**: Use 300ms debounce to avoid excessive callbacks

---

## Examples

### Example 1: KPI Card Usage

**Input**:
```typescript
<KPICard
  label="Active Pilots"
  value={8}
  comparison="+2 vs last month"
  comparisonDirection="up"
  sparklineData={[5, 6, 7, 8]}
  status="success"
  onClick={() => navigateToEncounterHistory({ filter: { status: "active" } })}
/>
```

**Output**:
```
┌─────────────────────────────┐
│ Active Pilots               │
│                             │
│ 8                           │
│ ↑ +2 vs last month          │
│ [sparkline: 5→6→7→8]        │
└─────────────────────────────┘
```

### Example 2: Trend Chart Usage

**Input**:
```typescript
<TrendChart
  title="Financial Trend"
  data={[
    { date: "2026-01-01", balance: 1000000, income: 50000, expenses: 30000 },
    { date: "2026-01-02", balance: 1020000, income: 40000, expenses: 20000 },
    // ... more data points
  ]}
  timeRange="30d"
  timeRangeOptions={["7d", "14d", "30d", "60d", "90d"]}
  onTimeRangeChange={(range) => setTimeRange(range)}
  threshold={100000}
  thresholdLabel="Low Funds Threshold"
  height={300}
/>
```

**Output**:
```
Financial Trend                    [7d] [14d] [30d] [60d] [90d]
┌─────────────────────────────────────────────────────┐
│                                                     │
│  1.2M ┤                                    ╭────    │
│  1.1M ┤                          ╭────────╯        │
│  1.0M ┤                ╭────────╯                  │
│  0.9M ┤      ╭────────╯                            │
│  0.8M ┤─────╯                                       │
│       └─────────────────────────────────────────   │
│       Jan 1        Jan 15        Jan 30            │
│                                                     │
│       ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │ (threshold line)
└─────────────────────────────────────────────────────┘
```

### Example 3: Anomaly Alert Card Usage

**Input**:
```typescript
<AnomalyAlertCard
  anomaly={{
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
    timestamp: Date.now()
  }}
  onViewBattle={(battleId) => navigateToEncounterHistory({ battleId })}
  onConfigureThreshold={(configKey) => openThresholdConfig(configKey)}
  onDismiss={(anomalyId) => dismissAnomaly(anomalyId)}
/>
```

**Output**:
```
┌─────────────────────────────────────────────────────┐
│ ⚠️  Heat Suicide                                    │
│                                                     │
│ Atlas AS7-D generated 35 heat (threshold: 30)      │
│                                                     │
│ Battle: battle_abc123 | Turn: 8                    │
│                                                     │
│ [View Battle] [Configure Threshold] [Dismiss]      │
└─────────────────────────────────────────────────────┘
```

### Example 4: Tab Navigation Usage

**Input**:
```typescript
<TabNavigation
  activeTab="campaign-dashboard"
  onTabChange={(tab) => {
    setActiveTab(tab);
    router.push(`/simulation-viewer?tab=${tab}`);
  }}
/>
```

**Output**:
```
┌─────────────────┬─────────────────┬─────────────────┐
│ Campaign        │ Encounter       │ Analysis &      │
│ Dashboard       │ History         │ Bugs            │
│ (active)        │                 │                 │
└─────────────────┴─────────────────┴─────────────────┘
```

### Example 5: Filter Panel Usage

**Input**:
```typescript
<FilterPanel
  filters={[
    {
      id: "severity",
      label: "Severity",
      options: ["critical", "warning", "info"],
      optionLabels: { critical: "Critical", warning: "Warning", info: "Info" }
    },
    {
      id: "type",
      label: "Type",
      options: ["heat-suicide", "passive-unit", "long-game"]
    }
  ]}
  activeFilters={{ severity: ["critical", "warning"] }}
  onFilterChange={(filters) => setActiveFilters(filters)}
  enableSearch={true}
  searchQuery=""
  onSearchChange={(query) => setSearchQuery(query)}
/>
```

**Output**:
```
┌─────────────────────────────────────────────────────┐
│ Filters                          [2 active filters] │
├─────────────────────────────────────────────────────┤
│ Search: [_____________________________] [X]         │
├─────────────────────────────────────────────────────┤
│ Severity: [Critical ✓] [Warning ✓] [Info]          │
│ Type:     [Heat Suicide] [Passive Unit] [Long Game] │
├─────────────────────────────────────────────────────┤
│ Active: [Critical (5)] [Warning (12)]               │
│                                                     │
│ [Clear All]                                         │
└─────────────────────────────────────────────────────┘
```

---

## References

### Design System References
- **Material Design**: Component patterns, spacing, typography
- **Tailwind CSS**: Utility classes, dark mode, responsive design
- **Shadcn UI**: Component structure, accessibility patterns
- **Carbon Design System**: Status indicators, alert cards

### Related Documentation
- `openspec/changes/simulation-viewer-ui/specs/data-model.md` - TypeScript interfaces
- `openspec/changes/simulation-viewer-ui/specs/campaign-dashboard.md` - KPI Card, Trend Chart usage
- `openspec/changes/simulation-viewer-ui/specs/encounter-history.md` - Filter Panel, Drill-Down Link usage
- `openspec/changes/simulation-viewer-ui/specs/analysis-bugs.md` - Anomaly Alert Card usage
- `.sisyphus/notepads/simulation-viewer-specs/learnings.md` - UI research findings

### UI Pattern Research
- Dashboard design: F-pattern layout, KPI cards, sparklines (ses_3e0154034ffeo3Jxu4RhRS4iA5)
- Anomaly detection UI: Severity colors, alert cards, threshold config (ses_3e0153219ffeZJiTyVruBchDn6)
- Event timeline UI: Vertical timeline, key moment indicators, VCR controls (ses_3e01521c8ffemQx7DML9ffemG7)

---

## Changelog

### Version 1.0 (2026-02-02)
- Initial specification
- Defined 6 shared components: KPI Card, Trend Chart, Anomaly Alert Card, Tab Navigation, Drill-Down Link, Filter Panel
- Established component props interfaces with TypeScript
- Defined accessibility requirements (WCAG 2.1 AA, keyboard navigation, ARIA labels)
- Defined responsive design patterns (breakpoints, touch targets, spacing)
- Defined dark mode support via Tailwind dark: classes
- Included concrete examples for all components
- Established validation rules for component props
