# Simulation Viewer

The Simulation Viewer provides a comprehensive after-action analysis interface for reviewing BattleTech simulation results. It surfaces campaign-level metrics, per-encounter drill-downs, anomaly detection, and invariant validation across three tabbed pages.

---

## Overview

| Aspect | Detail |
|--------|--------|
| **Location** | `src/components/simulation-viewer/` |
| **Pages** | Campaign Dashboard, Encounter History, Analysis & Bugs |
| **State** | Zustand stores with localStorage persistence |
| **Accessibility** | WCAG 2.1 AA — keyboard nav, ARIA roles, focus management |
| **Dark Mode** | Full support via Tailwind `dark:` classes |
| **Responsive** | Mobile (480px), Tablet (768px), Desktop (1920px) |

---

## Architecture

```
src/
├── components/simulation-viewer/
│   ├── pages/
│   │   ├── CampaignDashboard.tsx    # Tab 1: KPIs, trends, drill-downs
│   │   ├── EncounterHistory.tsx     # Tab 2: Battle list, detail, VCR
│   │   └── AnalysisBugs.tsx         # Tab 3: Invariants, anomalies, thresholds
│   ├── KPICard.tsx                  # Metric card with trend indicator
│   ├── TrendChart.tsx               # Pure SVG line/area chart
│   ├── AnomalyAlertCard.tsx         # Dismissible anomaly alert
│   ├── TabNavigation.tsx            # Accessible tab bar
│   ├── DrillDownLink.tsx            # Navigation link with context
│   ├── FilterPanel.tsx              # Multi-facet filter UI
│   ├── VirtualizedTimeline.tsx      # react-window event timeline
│   ├── VirtualizedViolationLog.tsx  # react-window violation table
│   ├── types/                       # Component prop interfaces
│   └── index.ts                     # Barrel exports
├── stores/simulation-viewer/
│   ├── useFilterStore.ts            # Filter state + localStorage
│   └── useTabNavigationStore.ts     # Tab + URL sync
├── types/simulation-viewer/
│   ├── IKeyMoment.ts                # Key moment types (18 types, 3 tiers)
│   ├── IAnomaly.ts                  # Anomaly types (9 types)
│   ├── IAnomalyThresholds.ts        # Configurable detection thresholds
│   ├── ICampaignDashboardMetrics.ts # Dashboard KPI data model
│   ├── IBattleComparisonData.ts     # Battle comparison data
│   └── IDashboardConfig.ts          # Dashboard configuration
├── utils/simulation-viewer/
│   ├── calculations.ts              # BV swing, win rate, trend math
│   ├── formatting.ts                # Duration, percentage, number formatting
│   └── navigation.ts                # Tab routing + URL helpers
└── simulation/detectors/
    ├── KeyMomentDetector.ts         # 18 key moment types from event streams
    ├── HeatSuicideDetector.ts       # Excessive heat generation detection
    ├── PassiveUnitDetector.ts       # Idle unit detection
    ├── NoProgressDetector.ts        # Stalled game detection
    ├── LongGameDetector.ts          # Excessive turn count detection
    └── StateCycleDetector.ts        # Repeating state pattern detection
```

---

## Tab 1: Campaign Dashboard

The Campaign Dashboard provides a high-level overview of campaign health through KPI cards, trend charts, and drill-down navigation.

### Sections

| Section | Content |
|---------|---------|
| **Roster** | Active pilots, wounded count, KIA count |
| **Force** | Operational units, damaged units, destroyed units |
| **Financial** | C-Bill balance with trend chart (7d/30d/90d/1y) |
| **Progression** | Missions completed, win rate, campaign progress |
| **Top Performers** | Sortable pilot leaderboard (kills/XP/missions) |
| **At-Risk Warnings** | Auto-derived alerts for low funds, wounded pilots, damaged units |

### KPI Cards

Each KPI card displays:
- **Value** — Current metric (e.g., "12 Active Pilots")
- **Trend** — Up/down/neutral indicator with percentage change
- **Sparkline** — Mini trend visualization

### Drill-Down Navigation

Clicking a drill-down link navigates to the relevant tab with context:
- Roster drill-down → Encounter History filtered by pilot
- Force drill-down → Encounter History filtered by unit
- Performer drill-down → Encounter History filtered by pilot battles

### At-Risk Warnings

Automatically derived from metrics:
- **Financial Risk** (critical): C-Bill balance below threshold
- **Pilot Risk** (warning): High wounded-to-active ratio
- **Unit Risk** (warning): High damaged-to-operational ratio

Warnings are dismissible and persist across tab switches.

---

## Tab 2: Encounter History

The Encounter History tab provides battle-by-battle analysis with filtering, detail views, and VCR playback.

### Battle List

- Grouped by mission/contract
- Filterable by outcome (victory/defeat/draw)
- Sortable by duration, kills, or damage
- Shows battle card with outcome badge, stats summary, and timestamp

### Battle Detail View

Selecting a battle reveals:

| Section | Content |
|---------|---------|
| **Forces** | Player and enemy unit rosters with status (operational/damaged/destroyed) |
| **Outcome Summary** | Victory/defeat/draw with key statistics |
| **Damage Matrix** | Unit-to-unit damage totals (who damaged whom) |
| **Key Moments** | Tier-filtered significant events (see below) |
| **Event Timeline** | Virtualized scrollable event log |
| **Comparison** | Side-by-side with campaign average or specific battle |

### VCR Playback Controls

The VCR controls allow turn-by-turn replay:

| Control | Action |
|---------|--------|
| **Play/Pause** | Auto-advance turns at selected speed |
| **Step Forward** | Advance one turn |
| **Step Back** | Go back one turn |
| **Speed Select** | 1x, 2x, 4x playback speed |
| **Turn Display** | Current turn indicator |

### Responsive Layout

| Viewport | Layout |
|----------|--------|
| Mobile (≤480px) | Stacked list, sidebar toggle button, 44px touch targets |
| Tablet (768px) | 2-column grid, side-by-side sections |
| Desktop (1920px) | Sidebar always visible, battle list + detail side-by-side |

---

## Tab 3: Analysis & Bugs

The Analysis & Bugs tab surfaces simulation quality issues through four sections.

### Invariant Checks

Displays the status of 7 game state invariants:

| Invariant | Description |
|-----------|-------------|
| Unit Position Uniqueness | No two units on same hex |
| Heat Non-Negative | Heat values ≥ 0 |
| Armor Bounds | Armor/structure values ≥ 0 |
| Destroyed Units Stay Destroyed | No resurrection |
| Phase Transitions | Valid phase order |
| Sequence Monotonicity | Event sequences increase |
| Turn Non-Decreasing | Turn numbers don't decrease |

Each invariant shows pass/fail status, last checked timestamp, and failure count.

### Anomaly Detection

Five detectors analyze simulation runs for unexpected behavior:

| Detector | Default Threshold | Description |
|----------|-------------------|-------------|
| **Heat Suicide** | 30 heat | Unit generates excessive heat beyond safe limits |
| **Passive Unit** | 5 turns | Unit takes no meaningful action for N consecutive turns |
| **No Progress** | 10 turns | Game state shows no damage dealt for N turns |
| **Long Game** | 50 turns | Battle exceeds expected turn count |
| **State Cycle** | 3 repeats | Game state repeats in a detectable pattern |

Anomalies are displayed as alert cards with:
- Severity badge (critical/warning/info)
- Detector type
- Battle and turn reference
- Snapshot link for debugging
- Dismiss button (persisted)

### Violation Log

Virtualized table of all detected violations, sortable by severity or timestamp. Supports filtering by severity level and detector type.

### Threshold Configuration

Interactive threshold editor with:
- **Slider inputs** for each detector threshold
- **Live preview** — value updates in real-time as slider moves
- **Save button** — persists thresholds with success toast notification
- **Reset to Defaults** — restores factory thresholds

---

## Key Moment Detection

The `KeyMomentDetector` processes game event streams to identify 18 significant battle moments across 3 tiers.

### Tier 1 — Game-Changing Events (6 types)

| Type | Description |
|------|-------------|
| `first-blood` | First unit destruction in the battle |
| `bv-swing-major` | Large BV advantage shift between sides |
| `comeback` | Side recovers from significant BV deficit |
| `wipe` | Complete elimination of one side |
| `last-stand` | Single unit remaining against multiple enemies |
| `ace-kill` | High-value target (ace pilot) destroyed |

### Tier 2 — Significant Tactical Events (7 types)

| Type | Description |
|------|-------------|
| `head-shot` | Head location hit (potential pilot kill) |
| `ammo-explosion` | Ammunition critical hit causing internal explosion |
| `pilot-kill` | Pilot incapacitated (consciousness/wounds) |
| `critical-engine` | Engine critical hit |
| `critical-gyro` | Gyro critical hit |
| `alpha-strike` | Unit fires all weapons simultaneously |
| `focus-fire` | Multiple units concentrate fire on single target |

### Tier 3 — Notable Routine Events (5 types)

| Type | Description |
|------|-------------|
| `heat-crisis` | Unit enters dangerous heat levels |
| `mobility-kill` | Unit loses all movement capability |
| `weapons-kill` | Unit loses all weapons |
| `rear-arc-hit` | Attack hits rear armor (reduced protection) |
| `overkill` | Damage significantly exceeds remaining armor/structure |

**Display**: Tier 1 and 2 are shown by default. Tier 3 is available via toggle.

---

## Shared Components

### KPICard

Reusable metric display card with value, label, trend indicator, and optional sparkline.

```tsx
<KPICard
  label="Active Pilots"
  value={12}
  trend={{ direction: 'up', percentage: 8.3 }}
  icon="users"
/>
```

### TrendChart

Pure SVG line/area chart for financial and performance trends. Supports multiple data series, time range selection, and responsive sizing.

```tsx
<TrendChart
  data={financialData}
  timeRange="30d"
  height={200}
  showArea={true}
/>
```

### AnomalyAlertCard

Dismissible alert card for detected anomalies with severity-based styling.

```tsx
<AnomalyAlertCard
  anomaly={heatSuicideAnomaly}
  onDismiss={(id) => dismissAnomaly(id)}
  onViewSnapshot={(id) => navigateToSnapshot(id)}
/>
```

### TabNavigation

Accessible tab bar with ARIA roles, keyboard navigation (arrow keys), and URL synchronization.

```tsx
<TabNavigation
  tabs={['Campaign Dashboard', 'Encounter History', 'Analysis & Bugs']}
  activeTab={0}
  onTabChange={(index) => setActiveTab(index)}
/>
```

### FilterPanel

Multi-facet filter UI with checkbox groups, supporting clear-all and filter persistence.

```tsx
<FilterPanel
  filters={filterDefinitions}
  values={currentFilters}
  onChange={(filters) => updateFilters(filters)}
  onClear={() => clearAllFilters()}
/>
```

### DrillDownLink

Navigation link that passes context to the target tab.

```tsx
<DrillDownLink
  label="View Battles"
  target="encounter-history"
  context={{ pilotId: 'pilot-001' }}
  onClick={onDrillDown}
/>
```

---

## State Management

### Filter Store (`useFilterStore`)

Zustand store with `persist` middleware for filter state:

- **Encounter History filters**: outcome, sort field/order, key moment tier/type
- **Analysis & Bugs filters**: severity, detector type, battle ID, dismissed status
- **URL sync**: Filter state reflected in query parameters
- **Clear all**: Resets all filters and clears localStorage

### Tab Navigation Store (`useTabNavigationStore`)

Manages active tab index with URL hash synchronization. Preserves tab state across page navigation.

---

## Accessibility

| Feature | Implementation |
|---------|---------------|
| **Keyboard Navigation** | Arrow keys for tabs, Enter/Space for activation |
| **ARIA Roles** | `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls` |
| **Focus Management** | Visible focus rings (`FOCUS_RING_CLASSES`), focus trap in modals |
| **Screen Reader** | Live region announcements via `announce()` utility |
| **Touch Targets** | Minimum 44px height on mobile for all interactive elements |
| **Color Contrast** | WCAG AA compliant in both light and dark modes |

---

## Testing

### Unit Tests (271 tests)

Component-level tests in `src/components/simulation-viewer/__tests__/`:

| Component | Tests | Coverage |
|-----------|-------|----------|
| KPICard | 35 | 95%+ |
| TrendChart | 40 | 97%+ |
| AnomalyAlertCard | 38 | 100% |
| TabNavigation | 29 | 100% |
| DrillDownLink | 24 | 100% |
| FilterPanel | 54 | 100% |

### Page Tests

Page-level tests in `src/__tests__/pages/simulation-viewer/`:
- `CampaignDashboard.test.tsx`
- `EncounterHistory.test.tsx`
- `AnalysisBugs.test.tsx`

### Integration Tests (20 tests)

Full workflow tests in `src/__tests__/integration/simulation-viewer.test.tsx`:

1. Dashboard → Encounter History via drill-down (3 tests)
2. Filter battles by outcome, sort by duration (2 tests)
3. Battle detail, timeline, VCR controls (4 tests)
4. Anomaly detection, threshold configuration (2 tests)
5. Dismiss anomaly, verify persistence (3 tests)
6. Tab switching, state preservation (6 tests)

### E2E Tests (8 tests)

Playwright browser tests in `e2e/simulation-viewer.spec.ts`:

1. Full workflow: dashboard → history → analysis
2. Drill-down navigation with filter application
3. VCR playback controls
4. Threshold configuration with live preview
5. Dark mode toggle
6. Responsive layout at mobile (480px)
7. Responsive layout at tablet (768px)
8. Responsive layout at desktop (1920px)

**Test harness**: `src/pages/e2e/simulation-viewer.tsx` — renders all 3 tabs with mock data since components are not routed.

### Detector Tests

Per-detector test suites in `src/simulation/detectors/__tests__/`:
- `KeyMomentDetector.test.ts`
- `HeatSuicideDetector.test.ts`
- `PassiveUnitDetector.test.ts`
- `NoProgressDetector.test.ts`
- `LongGameDetector.test.ts`
- `StateCycleDetector.test.ts`

---

## Development

### Running Tests

```bash
# Unit + integration tests
npx jest src/components/simulation-viewer/ --coverage
npx jest src/__tests__/integration/simulation-viewer.test.tsx

# E2E tests
npx playwright test e2e/simulation-viewer.spec.ts --project=chromium

# Detector tests
npx jest src/simulation/detectors/
```

### Storybook

All shared components have Storybook stories:

```bash
npm run storybook
# Navigate to Simulation Viewer section
```

Stories available for: KPICard, TrendChart, AnomalyAlertCard, TabNavigation, DrillDownLink, FilterPanel.

### Adding a New Detector

1. Create detector class in `src/simulation/detectors/`
2. Add anomaly type to `AnomalyType` in `src/types/simulation-viewer/IAnomaly.ts`
3. Add threshold field to `IAnomalyThresholds`
4. Add detector type to `DetectorType` in `AnalysisBugs.tsx`
5. Add filter option in `useFilterStore.ts`
6. Write tests in `src/simulation/detectors/__tests__/`

### Adding a New Key Moment Type

1. Add type to `KeyMomentType` union in `src/types/simulation-viewer/IKeyMoment.ts`
2. Implement detection logic in `KeyMomentDetector.ts`
3. Assign appropriate tier (1-3)
4. Write tests in `src/simulation/detectors/__tests__/KeyMomentDetector.test.ts`
