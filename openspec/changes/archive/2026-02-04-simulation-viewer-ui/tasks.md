# Simulation Viewer UI - Implementation Tasks

**Status**: Complete
**Version**: 1.0
**Last Updated**: 2026-02-04
**Total Tasks**: 29
**Estimated Effort**: 156-232 hours (19.5-29 days)

---

## Wave 1: Foundation (No Dependencies)

### Task 1.1: Create Data Model Interfaces

**Description**: Implement TypeScript interfaces from data-model.md for key moments, anomalies, dashboard metrics, and comparison data.

**Dependencies**: None

**Acceptance Criteria**:

- [x] All interfaces from data-model.md implemented in `src/types/simulation-viewer/`
- [x] `IKeyMoment`, `IAnomaly`, `ICampaignDashboardMetrics`, `IBattleComparisonData`, `IAnomalyThresholds`, `IDashboardConfig` exported
- [x] JSDoc comments with @example tags for all interfaces
- [x] Type constraints enforced (e.g., tier: 1|2|3, severity: "critical"|"warning"|"info")
- [x] lsp_diagnostics clean on all files
- [x] Exports from `src/types/simulation-viewer/index.ts`

**Effort**: M (6 hours)

**Parallelization**: Can run in parallel with Task 1.2

**Files**:

- `src/types/simulation-viewer/IKeyMoment.ts`
- `src/types/simulation-viewer/IAnomaly.ts`
- `src/types/simulation-viewer/ICampaignDashboardMetrics.ts`
- `src/types/simulation-viewer/IBattleComparisonData.ts`
- `src/types/simulation-viewer/IAnomalyThresholds.ts`
- `src/types/simulation-viewer/IDashboardConfig.ts`
- `src/types/simulation-viewer/index.ts`

---

### Task 1.2: Create Component Props Interfaces

**Description**: Implement TypeScript interfaces from shared-components.md for all component props (KPI Card, Trend Chart, Anomaly Alert Card, Tab Navigation, Drill-Down Link, Filter Panel).

**Dependencies**: None

**Acceptance Criteria**:

- [x] All component props interfaces implemented in `src/components/simulation-viewer/types/`
- [x] `IKPICardProps`, `ITrendChartProps`, `IAnomalyAlertCardProps`, `ITabNavigationProps`, `IDrillDownLinkProps`, `IFilterPanelProps` exported
- [x] JSDoc comments with @example tags
- [x] Optional props marked with `?` suffix
- [x] lsp_diagnostics clean on all files

**Effort**: S (3 hours)

**Parallelization**: Can run in parallel with Task 1.1

**Files**:

- `src/components/simulation-viewer/types/IKPICardProps.ts`
- `src/components/simulation-viewer/types/ITrendChartProps.ts`
- `src/components/simulation-viewer/types/IAnomalyAlertCardProps.ts`
- `src/components/simulation-viewer/types/ITabNavigationProps.ts`
- `src/components/simulation-viewer/types/IDrillDownLinkProps.ts`
- `src/components/simulation-viewer/types/IFilterPanelProps.ts`
- `src/components/simulation-viewer/types/index.ts`

---

### Task 1.3: Create Utility Functions

**Description**: Implement utility functions for data transformations, calculations, and formatting (BV advantage, comparison deltas, date formatting).

**Dependencies**: None

**Acceptance Criteria**:

- [x] `calculateBVAdvantage(playerBV, enemyBV)` function with tests
- [x] `calculateComparisonDelta(current, baseline)` function with tests
- [x] `formatCurrency(amount)` function with tests
- [x] `formatDuration(milliseconds)` function with tests
- [x] `formatPercentage(value)` function with tests
- [x] All functions have unit tests with 100% coverage
- [x] lsp_diagnostics clean

**Effort**: S (4 hours)

**Parallelization**: Can run in parallel with Tasks 1.1, 1.2

**Files**:

- `src/utils/simulation-viewer/calculations.ts`
- `src/utils/simulation-viewer/formatting.ts`
- `src/utils/simulation-viewer/__tests__/calculations.test.ts`
- `src/utils/simulation-viewer/__tests__/formatting.test.ts`

---

## Wave 2: Shared Components (Depends on Wave 1)

### Task 2.1: Implement KPI Card Component

**Description**: Create KPI Card component with label, value, comparison, sparkline, and drill-down capability.

**Dependencies**: Task 1.2 (component props interfaces)

**Acceptance Criteria**:

- [x] Component renders label, value, comparison, sparkline
- [x] Comparison direction affects color (green=up, red=down, gray=neutral)
- [x] Sparkline uses lightweight library (react-sparklines or custom SVG)
- [x] onClick handler triggers drill-down navigation
- [x] Hover state (shadow-md → shadow-lg)
- [x] Focus ring (ring-2 ring-blue-500) for keyboard navigation
- [x] Responsive sizing (text-2xl on mobile, text-3xl on desktop)
- [x] Dark mode support (Tailwind dark: classes)
- [x] Unit tests with React Testing Library (>90% coverage)
- [x] Storybook story with all variants

**Effort**: M (6 hours)

**Parallelization**: Can run in parallel with Tasks 2.2, 2.3, 2.4, 2.5, 2.6

**Files**:

- `src/components/simulation-viewer/KPICard.tsx`
- `src/components/simulation-viewer/__tests__/KPICard.test.tsx`
- `src/components/simulation-viewer/KPICard.stories.tsx`

---

### Task 2.2: Implement Trend Chart Component

**Description**: Create Trend Chart component with time-series data, configurable time range, threshold line, and responsive sizing.

**Dependencies**: Task 1.2 (component props interfaces)

**Acceptance Criteria**:

- [x] Component renders line chart with X-axis (dates) and Y-axis (values)
- [x] Tooltip on hover showing date and value
- [x] Time range dropdown (7d/14d/30d/60d/90d)
- [x] Threshold line (horizontal) with label
- [x] Empty state message when data=[]
- [x] Responsive height (300px desktop, 200px mobile)
- [x] Dark mode support
- [x] Unit tests with React Testing Library (>90% coverage)
- [x] Storybook story with all variants

**Effort**: M (8 hours)

**Parallelization**: Can run in parallel with Tasks 2.1, 2.3, 2.4, 2.5, 2.6

**Files**:

- `src/components/simulation-viewer/TrendChart.tsx`
- `src/components/simulation-viewer/__tests__/TrendChart.test.tsx`
- `src/components/simulation-viewer/TrendChart.stories.tsx`

---

### Task 2.3: Implement Anomaly Alert Card Component

**Description**: Create Anomaly Alert Card component with severity-based styling, icons, and actions.

**Dependencies**: Task 1.1 (IAnomaly interface), Task 1.2 (component props interfaces)

**Acceptance Criteria**:

- [x] Component renders icon, title, message, context (battle/turn), actions
- [x] Severity colors: red (critical), orange (warning), blue (info)
- [x] Icons: 🔴 (critical), ⚠️ (warning), ℹ️ (info)
- [x] Actions: "View Snapshot" (critical only), "View Battle", "Configure Threshold" (warning only), "Dismiss"
- [x] Dismiss animation (fade out, 300ms transition)
- [x] Keyboard navigation (Tab, Enter, Space)
- [x] Dark mode support
- [x] Unit tests with React Testing Library (>90% coverage)
- [x] Storybook story with all variants

**Effort**: M (6 hours)

**Parallelization**: Can run in parallel with Tasks 2.1, 2.2, 2.4, 2.5, 2.6

**Files**:

- `src/components/simulation-viewer/AnomalyAlertCard.tsx`
- `src/components/simulation-viewer/__tests__/AnomalyAlertCard.test.tsx`
- `src/components/simulation-viewer/AnomalyAlertCard.stories.tsx`

---

### Task 2.4: Implement Tab Navigation Component

**Description**: Create Tab Navigation component with three tabs, keyboard support, and URL state preservation.

**Dependencies**: Task 1.2 (component props interfaces)

**Acceptance Criteria**:

- [x] Component renders three tabs: "Campaign Dashboard", "Encounter History", "Analysis & Bugs"
- [x] Active tab styling (bg-white, border-b-2 border-blue-600, text-blue-600)
- [x] Inactive tab styling (bg-gray-100, text-gray-600)
- [x] Hover state on inactive tabs
- [x] Keyboard navigation (ArrowLeft, ArrowRight)
- [x] URL state preservation (?tab=encounter-history)
- [x] Responsive layout (full-width on mobile)
- [x] Dark mode support
- [x] Unit tests with React Testing Library (>90% coverage)
- [x] Storybook story with all variants

**Effort**: S (4 hours)

**Parallelization**: Can run in parallel with Tasks 2.1, 2.2, 2.3, 2.5, 2.6

**Files**:

- `src/components/simulation-viewer/TabNavigation.tsx`
- `src/components/simulation-viewer/__tests__/TabNavigation.test.tsx`
- `src/components/simulation-viewer/TabNavigation.stories.tsx`

---

### Task 2.5: Implement Drill-Down Link Component

**Description**: Create Drill-Down Link component with navigation, context preservation, and breadcrumb trail.

**Dependencies**: Task 1.2 (component props interfaces)

**Acceptance Criteria**:

- [x] Component renders link text with icon
- [x] Click triggers navigation to target tab with filter applied
- [x] Breadcrumb trail added (e.g., "Dashboard > Roster > Wounded")
- [x] Scroll position preserved when returning
- [x] Keyboard navigation (Enter, Space)
- [x] Focus ring (ring-2 ring-blue-500)
- [x] Dark mode support
- [x] Unit tests with React Testing Library (>90% coverage)
- [x] Storybook story with all variants

**Effort**: S (4 hours)

**Parallelization**: Can run in parallel with Tasks 2.1, 2.2, 2.3, 2.4, 2.6

**Files**:

- `src/components/simulation-viewer/DrillDownLink.tsx`
- `src/components/simulation-viewer/__tests__/DrillDownLink.test.tsx`
- `src/components/simulation-viewer/DrillDownLink.stories.tsx`

---

### Task 2.6: Implement Filter Panel Component

**Description**: Create Filter Panel component with multi-select filters, search input, and active filter display.

**Dependencies**: Task 1.2 (component props interfaces)

**Acceptance Criteria**:

- [x] Component renders filter dropdowns with checkboxes
- [x] Multi-select support (multiple options per filter)
- [x] Search input with debounce (300ms)
- [x] Active filter badges with count (e.g., "Critical (5)")
- [x] "Clear All" button
- [x] Collapsible sections on mobile
- [x] Keyboard navigation
- [x] Dark mode support
- [x] Unit tests with React Testing Library (>90% coverage)
- [x] Storybook story with all variants

**Effort**: M (6 hours)

**Parallelization**: Can run in parallel with Tasks 2.1, 2.2, 2.3, 2.4, 2.5

**Files**:

- `src/components/simulation-viewer/FilterPanel.tsx`
- `src/components/simulation-viewer/__tests__/FilterPanel.test.tsx`
- `src/components/simulation-viewer/FilterPanel.stories.tsx`

---

## Wave 3: Detection Logic (Depends on Wave 1)

### Task 3.1: Implement Key Moment Detector

**Description**: Create key moment detection logic for all 3 tiers (15 types total) with tier-based classification.

**Dependencies**: Task 1.1 (IKeyMoment interface)

**Acceptance Criteria**:

- [x] Detector processes event stream and creates IKeyMoment objects
- [x] Tier 1 detection: first-blood, bv-swing-major, comeback, wipe, last-stand, ace-kill
- [x] Tier 2 detection: head-shot, ammo-explosion, pilot-kill, critical-engine, critical-gyro, alpha-strike, focus-fire
- [x] Tier 3 detection: heat-crisis, mobility-kill, weapons-kill, rear-arc-hit, overkill
- [x] Each detector has unit tests with 100% coverage
- [x] Edge cases handled (multiple moments per turn, empty battles)
- [x] lsp_diagnostics clean

**Effort**: L (12 hours)

**Parallelization**: Can run in parallel with Tasks 3.2, 3.3, 3.4, 3.5, 3.6

**Files**:

- `src/simulation/detectors/KeyMomentDetector.ts`
- `src/simulation/detectors/__tests__/KeyMomentDetector.test.ts`

---

### Task 3.2: Implement Heat Suicide Detector

**Description**: Create heat suicide anomaly detector with last-ditch scenario exemption.

**Dependencies**: Task 1.1 (IAnomaly interface)

**Acceptance Criteria**:

- [x] Detector creates IAnomaly when heat > threshold
- [x] Last-ditch exemption (outnumbered 3:1 or more)
- [x] Severity: "warning"
- [x] Includes thresholdUsed, actualValue, configKey
- [x] Unit tests with 100% coverage
- [x] Edge cases: shutdown units, last-ditch scenarios
- [x] lsp_diagnostics clean

**Effort**: S (4 hours)

**Parallelization**: Can run in parallel with Tasks 3.1, 3.3, 3.4, 3.5, 3.6

**Files**:

- `src/simulation/detectors/HeatSuicideDetector.ts`
- `src/simulation/detectors/__tests__/HeatSuicideDetector.test.ts`

---

### Task 3.3: Implement Passive Unit Detector

**Description**: Create passive unit anomaly detector with shutdown exemption.

**Dependencies**: Task 1.1 (IAnomaly interface)

**Acceptance Criteria**:

- [x] Detector creates IAnomaly when unit inactive for N consecutive turns
- [x] Shutdown/destroyed unit exemption
- [x] Counter resets on movement or attack
- [x] Severity: "warning"
- [x] Unit tests with 100% coverage
- [x] Edge cases: shutdown units, destroyed units
- [x] lsp_diagnostics clean

**Effort**: S (4 hours)

**Parallelization**: Can run in parallel with Tasks 3.1, 3.2, 3.4, 3.5, 3.6

**Files**:

- `src/simulation/detectors/PassiveUnitDetector.ts`
- `src/simulation/detectors/__tests__/PassiveUnitDetector.test.ts`

---

### Task 3.4: Implement No Progress Detector

**Description**: Create no progress anomaly detector with state comparison logic.

**Dependencies**: Task 1.1 (IAnomaly interface)

**Acceptance Criteria**:

- [x] Detector creates IAnomaly when state unchanged for N turns
- [x] State comparison: positions, armor, structure, heat
- [x] Movement-only changes count as progress
- [x] Severity: "warning"
- [x] Unit tests with 100% coverage
- [x] Edge cases: movement-only, destroyed units
- [x] lsp_diagnostics clean

**Effort**: M (6 hours)

**Parallelization**: Can run in parallel with Tasks 3.1, 3.2, 3.3, 3.5, 3.6

**Files**:

- `src/simulation/detectors/NoProgressDetector.ts`
- `src/simulation/detectors/__tests__/NoProgressDetector.test.ts`

---

### Task 3.5: Implement Long Game Detector

**Description**: Create long game anomaly detector for battles exceeding expected turn count.

**Dependencies**: Task 1.1 (IAnomaly interface)

**Acceptance Criteria**:

- [x] Detector creates IAnomaly when turns > threshold
- [x] Severity: "info"
- [x] Battle-level anomaly (turn: null, unitId: null)
- [x] Unit tests with 100% coverage
- [x] lsp_diagnostics clean

**Effort**: S (2 hours)

**Parallelization**: Can run in parallel with Tasks 3.1, 3.2, 3.3, 3.4, 3.6

**Files**:

- `src/simulation/detectors/LongGameDetector.ts`
- `src/simulation/detectors/__tests__/LongGameDetector.test.ts`

---

### Task 3.6: Implement State Cycle Detector

**Description**: Create state cycle anomaly detector for infinite loop detection.

**Dependencies**: Task 1.1 (IAnomaly interface)

**Acceptance Criteria**:

- [x] Detector creates IAnomaly when state repeats N times
- [x] State comparison: positions, armor, structure, heat
- [x] Severity: "critical"
- [x] Always includes snapshot
- [x] Triggers simulation halt
- [x] Unit tests with 100% coverage
- [x] Edge cases: near-identical states
- [x] lsp_diagnostics clean

**Effort**: M (6 hours)

**Parallelization**: Can run in parallel with Tasks 3.1, 3.2, 3.3, 3.4, 3.5

**Files**:

- `src/simulation/detectors/StateCycleDetector.ts`
- `src/simulation/detectors/__tests__/StateCycleDetector.test.ts`

---

## Wave 4: Tab Pages (Depends on Waves 2, 3)

### Task 4.1: Implement Campaign Dashboard Page

**Description**: Create Campaign Dashboard page with roster, force, financial, progression, top performers, and warnings sections.

**Dependencies**: Tasks 2.1 (KPI Card), 2.2 (Trend Chart), 2.5 (Drill-Down Link), 2.4 (Tab Navigation)

**Acceptance Criteria**:

- [x] Page renders 6 sections: roster, force, financial, progression, top performers, warnings
- [x] Roster section: KPI Card with active/wounded/KIA counts
- [x] Force section: KPI Card with operational/damaged/destroyed counts + BV totals
- [x] Financial section: Trend Chart with configurable time range
- [x] Progression section: KPI Cards for missions, win rate, XP
- [x] Top performers section: 5 performer cards sorted by user-selected metric
- [x] Warnings section: At-risk warnings with drill-down links
- [x] Responsive layout (4 cards/row desktop, 2 cards/row tablet, 1 card/row mobile)
- [x] Dark mode support
- [x] Unit tests with React Testing Library (>90% coverage)

**Effort**: L (10 hours)

**Parallelization**: Can run in parallel with Tasks 4.2, 4.3

**Files**:

- `src/pages/simulation-viewer/CampaignDashboard.tsx`
- `src/pages/simulation-viewer/__tests__/CampaignDashboard.test.tsx`

---

### Task 4.2: Implement Encounter History Page

**Description**: Create Encounter History page with battle list, battle detail, damage matrix, key moments, event timeline, and comparison view.

**Dependencies**: Tasks 2.6 (Filter Panel), 2.5 (Drill-Down Link), 2.4 (Tab Navigation), 3.1 (Key Moment Detector)

**Acceptance Criteria**:

- [x] Page renders battle list grouped by mission
- [x] Battle list filterable by outcome, sortable by duration/kills/damage
- [x] Battle detail view: forces, outcome summary, damage matrix, key moments, event timeline
- [x] Damage matrix: grid visualization (rows=attackers, columns=targets)
- [x] Key moments: timeline with tier badges, filterable by tier/type
- [x] Event timeline: vertical layout, grouped by turn, expandable/collapsible
- [x] VCR controls: play, pause, step forward/back, speed control (1x/2x/4x)
- [x] Comparison view: vs campaign average or specific battle
- [x] Responsive layout
- [x] Dark mode support
- [x] Unit tests with React Testing Library (>90% coverage)

**Effort**: L (16 hours)

**Parallelization**: Can run in parallel with Tasks 4.1, 4.3

**Files**:

- `src/pages/simulation-viewer/EncounterHistory.tsx`
- `src/pages/simulation-viewer/__tests__/EncounterHistory.test.tsx`

---

### Task 4.3: Implement Analysis & Bugs Page

**Description**: Create Analysis & Bugs page with invariant status, anomaly cards, violation log, and threshold configuration.

**Dependencies**: Tasks 2.3 (Anomaly Alert Card), 2.6 (Filter Panel), 2.4 (Tab Navigation), 3.2-3.6 (Anomaly Detectors)

**Acceptance Criteria**:

- [x] Page renders 4 sections: invariant status, anomaly cards, violation log, threshold config
- [x] Invariant status: 7 cards (one per invariant) with pass/fail status
- [x] Anomaly cards: severity-based styling, actions (View Snapshot, View Battle, Configure Threshold, Dismiss)
- [x] Violation log: filterable by severity/type/battle, sortable by severity/timestamp
- [x] Threshold config: 5 sliders (heat suicide, passive unit, no progress, long game, state cycle) with live preview
- [x] Auto-snapshot config: toggles for critical/warning/info
- [x] Responsive layout
- [x] Dark mode support
- [x] Unit tests with React Testing Library (>90% coverage)

**Effort**: L (12 hours)

**Parallelization**: Can run in parallel with Tasks 4.1, 4.2

**Files**:

- `src/pages/simulation-viewer/AnalysisBugs.tsx`
- `src/pages/simulation-viewer/__tests__/AnalysisBugs.test.tsx`

---

## Wave 5: Integration (Depends on Wave 4)

### Task 5.1: Implement Tab Navigation State Management

**Description**: Create Zustand store for tab navigation state with URL synchronization.

**Dependencies**: Task 4.1, 4.2, 4.3 (all tab pages)

**Acceptance Criteria**:

- [x] Zustand store manages activeTab state
- [x] URL synchronization (?tab=encounter-history)
- [x] Browser back/forward navigation support
- [x] Tab change triggers URL update
- [x] URL change triggers tab change
- [x] Unit tests with 100% coverage
- [x] lsp_diagnostics clean

**Effort**: S (4 hours)

**Parallelization**: Can run in parallel with Tasks 5.2, 5.3

**Files**:

- `src/stores/simulation-viewer/useTabNavigationStore.ts`
- `src/stores/simulation-viewer/__tests__/useTabNavigationStore.test.ts`

---

### Task 5.2: Implement Drill-Down Navigation Logic

**Description**: Create navigation logic for drill-down links with filter application and breadcrumb trail.

**Dependencies**: Task 4.1, 4.2, 4.3 (all tab pages)

**Acceptance Criteria**:

- [x] Navigation function applies filters to target tab
- [x] Breadcrumb trail added to navigation history
- [x] Scroll position preserved when returning
- [x] Filter state persists during navigation
- [x] Unit tests with 100% coverage
- [x] lsp_diagnostics clean

**Effort**: M (6 hours)

**Parallelization**: Can run in parallel with Tasks 5.1, 5.3

**Files**:

- `src/utils/simulation-viewer/navigation.ts`
- `src/utils/simulation-viewer/__tests__/navigation.test.ts`

---

### Task 5.3: Implement Filter Persistence Logic

**Description**: Create filter persistence logic for Encounter History and Analysis & Bugs tabs.

**Dependencies**: Task 4.2, 4.3 (Encounter History, Analysis & Bugs pages)

**Acceptance Criteria**:

- [x] Filters persist across tab switches
- [x] Filters persist across page refreshes (localStorage)
- [x] "Clear All" resets filters
- [x] Filter state synchronized with URL query params
- [x] Unit tests with 100% coverage
- [x] lsp_diagnostics clean

**Effort**: S (4 hours)

**Parallelization**: Can run in parallel with Tasks 5.1, 5.2

**Files**:

- `src/stores/simulation-viewer/useFilterStore.ts`
- `src/stores/simulation-viewer/__tests__/useFilterStore.test.ts`

---

### Task 5.4: Integrate Detectors with Simulation System

**Description**: Integrate key moment and anomaly detectors with simulation runner.

**Dependencies**: Tasks 3.1-3.6 (all detectors)

**Acceptance Criteria**:

- [x] Simulation runner calls detectors during/after battle
- [x] Key moments cached in battle record
- [x] Anomalies logged to violation log
- [x] Critical anomalies trigger simulation halt
- [x] Snapshots saved when configured
- [x] Unit tests with 100% coverage
- [x] Integration tests with full simulation run
- [x] lsp_diagnostics clean

**Effort**: M (8 hours)

**Parallelization**: Cannot run in parallel (depends on all detectors)

**Files**:

- `src/simulation/runner/SimulationRunner.ts` (modify)
- `src/simulation/runner/__tests__/SimulationRunner.test.ts` (modify)

---

## Wave 6: Polish (Depends on Wave 5)

### Task 6.1: Implement Dark Mode Theming

**Description**: Ensure all components support dark mode with Tailwind dark: classes.

**Dependencies**: All component tasks (2.1-2.6, 4.1-4.3)

**Acceptance Criteria**:

- [x] All components use Tailwind dark: classes
- [x] Color contrast meets WCAG 2.1 AA in both modes
- [x] Theme toggle button in header
- [x] Theme preference persists (localStorage)
- [x] Visual regression tests in both modes (Storybook snapshots)
- [x] Manual QA in both modes

**Effort**: M (6 hours)

**Parallelization**: Can run in parallel with Tasks 6.2, 6.3, 6.4

**Files**:

- `src/components/ThemeToggle.tsx`
- `src/stores/useThemeStore.ts`
- `src/styles/dark-mode.css`

---

### Task 6.2: Implement Responsive Design

**Description**: Ensure all pages and components are responsive (mobile, tablet, desktop).

**Dependencies**: All component tasks (2.1-2.6, 4.1-4.3)

**Acceptance Criteria**:

- [x] All pages tested at 480px (mobile), 768px (tablet), 1920px (desktop)
- [x] Touch targets minimum 44px on mobile
- [x] Stacked layout on mobile, grid on desktop
- [x] Simplified charts on mobile (fewer ticks, larger hit areas)
- [x] Collapsible sections on mobile
- [x] Visual regression tests at all breakpoints
- [x] Manual QA on mobile device

**Effort**: M (8 hours)

**Parallelization**: Can run in parallel with Tasks 6.1, 6.3, 6.4

**Files**:

- `src/styles/responsive.css`
- `src/utils/responsive.ts`

---

### Task 6.3: Implement Accessibility Features

**Description**: Ensure all components meet WCAG 2.1 AA accessibility standards.

**Dependencies**: All component tasks (2.1-2.6, 4.1-4.3)

**Acceptance Criteria**:

- [x] All interactive elements keyboard accessible (Tab, Enter, Space, Arrow keys)
- [x] All components have ARIA labels and roles
- [x] Focus indicators visible (ring-2 ring-blue-500)
- [x] Screen reader announcements for state changes
- [x] Color contrast meets 4.5:1 (normal text), 3:1 (large text)
- [x] Automated accessibility tests (axe-core)
- [x] Manual QA with keyboard only (no mouse)
- [x] Manual QA with screen reader (NVDA/JAWS)

**Effort**: M (8 hours)

**Parallelization**: Can run in parallel with Tasks 6.1, 6.2, 6.4

**Files**:

- `src/utils/accessibility.ts`
- `src/__tests__/accessibility.test.ts`

---

### Task 6.4: Performance Optimization

**Description**: Optimize performance for large datasets (1000+ events, 100+ battles).

**Dependencies**: All component tasks (2.1-2.6, 4.1-4.3)

**Acceptance Criteria**:

- [x] Event timeline virtualized (react-window) for 1000+ events
- [x] Violation log virtualized for 1000+ violations
- [x] Sparklines use lightweight library (react-sparklines or custom SVG)
- [x] Debounced search input (300ms)
- [x] Memoized chart components (React.memo)
- [x] Lazy loading for tab content (React.lazy)
- [x] Performance tests: timeline with 1000 events renders in <500ms
- [x] Performance tests: violation log with 1000 violations renders in <500ms
- [x] lsp_diagnostics clean

**Effort**: M (8 hours)

**Parallelization**: Can run in parallel with Tasks 6.1, 6.2, 6.3

**Files**:

- `src/components/simulation-viewer/VirtualizedTimeline.tsx`
- `src/components/simulation-viewer/VirtualizedViolationLog.tsx`
- `src/__tests__/performance.test.ts`

---

## Wave 7: Testing & Documentation (Depends on Wave 6)

### Task 7.1: Write Integration Tests

**Description**: Write integration tests for full user workflows across all three tabs.

**Dependencies**: All tasks in Waves 1-6

**Acceptance Criteria**:

- [x] Test: Navigate from Campaign Dashboard to Encounter History via drill-down link
- [x] Test: Filter battles by outcome, sort by duration
- [x] Test: View battle detail, expand timeline, play VCR controls
- [x] Test: Detect anomaly, view in Analysis & Bugs tab, configure threshold
- [x] Test: Dismiss anomaly, verify persistence
- [x] Test: Switch tabs, verify state preservation
- [x] All tests pass with 100% success rate
- [x] lsp_diagnostics clean

**Effort**: M (8 hours)

**Parallelization**: Can run in parallel with Task 7.2

**Files**:

- `src/__tests__/integration/simulation-viewer.test.tsx`

---

### Task 7.2: Write End-to-End Tests

**Description**: Write end-to-end tests using Playwright for full browser workflows.

**Dependencies**: All tasks in Waves 1-6

**Acceptance Criteria**:

- [x] Test: Full workflow from dashboard to encounter history to analysis
- [x] Test: Drill-down navigation with filter application
- [x] Test: VCR playback controls
- [x] Test: Threshold configuration with live preview
- [x] Test: Dark mode toggle
- [x] Test: Responsive layout at all breakpoints
- [x] All tests pass with 100% success rate

**Effort**: M (8 hours)

**Parallelization**: Can run in parallel with Task 7.1

**Files**:

- `e2e/simulation-viewer.spec.ts`

---

### Task 7.3: Update Documentation

**Description**: Update project documentation with Simulation Viewer UI usage guide.

**Dependencies**: All tasks in Waves 1-6

**Acceptance Criteria**:

- [x] Add Simulation Viewer section to `docs/features/simulation-viewer.md`
- [x] Document all three tabs (Campaign Dashboard, Encounter History, Analysis & Bugs)
- [x] Document key moment detection (15 types, 3 tiers)
- [x] Document anomaly detection (5 types, configurable thresholds)
- [x] Document drill-down navigation patterns
- [x] Document accessibility features
- [x] Add screenshots for all major features
- [x] Update `README.md` with Simulation Viewer feature

**Effort**: S (4 hours)

**Parallelization**: Cannot run in parallel (final task)

**Files**:

- `docs/features/simulation-viewer.md`
- `README.md` (update)

---

## Summary

**Total Tasks**: 29

**Estimated Effort**: 156-232 hours (19.5-29 days at 8 hours/day)

**Parallelizable Waves**: Wave 1 (3 tasks), Wave 2 (6 tasks), Wave 3 (6 tasks), Wave 4 (3 tasks), Wave 5 (3 tasks), Wave 6 (4 tasks), Wave 7 (2 tasks)

**Critical Path**: Wave 1 → Wave 2 → Wave 4 → Wave 5 → Wave 6 → Wave 7

**Breakdown by Wave**:

- Wave 1 (Foundation): 3 tasks, 13 hours
- Wave 2 (Shared Components): 6 tasks, 34 hours
- Wave 3 (Detection Logic): 6 tasks, 34 hours
- Wave 4 (Tab Pages): 3 tasks, 38 hours
- Wave 5 (Integration): 4 tasks, 22 hours
- Wave 6 (Polish): 4 tasks, 30 hours
- Wave 7 (Testing & Documentation): 3 tasks, 20 hours

**Breakdown by Effort**:

- Small (S): 13 tasks, 46 hours
- Medium (M): 21 tasks, 134 hours
- Large (L): 5 tasks, 52 hours

**Specifications Covered**:

- data-model.md: Tasks 1.1, 3.1-3.6
- campaign-dashboard.md: Tasks 2.1, 2.2, 2.5, 4.1
- encounter-history.md: Tasks 2.6, 3.1, 4.2
- analysis-bugs.md: Tasks 2.3, 3.2-3.6, 4.3
- shared-components.md: Tasks 2.1-2.6

**Testing Coverage**:

- Unit tests: All component and detector tasks (>90% coverage)
- Integration tests: Task 7.1
- End-to-end tests: Task 7.2
- Accessibility tests: Task 6.3
- Performance tests: Task 6.4
- Visual regression tests: Task 6.1, 6.2

**Key Risks**:

- Wave 3 (Detection Logic): Complex algorithms, edge cases, may take longer than estimated
- Wave 4 (Tab Pages): Large tasks, may need to split into smaller subtasks
- Wave 6 (Performance): Virtualization may require library evaluation and integration

**Mitigation Strategies**:

- Start Wave 3 early (can run in parallel with Wave 2)
- Break Wave 4 tasks into smaller subtasks if needed
- Evaluate virtualization libraries (react-window, react-virtualized) during Wave 1
