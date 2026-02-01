# Campaign HUD Layout Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-01-31
**Dependencies**: [starmap-interface, tactical-map-interface, campaign-system]
**Affects**: [campaign-page-implementation, multiplayer-lobby]

---

## Overview

### Purpose
Defines the campaign management HUD layout system for MekStation, providing a Civilization-style 3-panel interface for strategic mercenary company management. This specification encodes information architecture, panel layouts, context modes, and action blocking patterns for campaign gameplay.

### Scope
**In Scope:**
- 3-panel layout structure (left roster, right events, bottom context, center map)
- Top HUD bar with campaign status indicators
- AdvanceDay button with action blocking pattern
- Context panel mode system (SystemDetails, ContractDetails, MechStatus, PilotStatus)
- 3-tier information hierarchy (Glanceable, Hover/Summary, Deep Dive)
- Panel collapsibility and responsive behavior
- Map area component swapping (Starmap ↔ TacticalMap)

**Out of Scope:**
- Campaign logic and state management (see campaign-system spec)
- Contract negotiation workflow (see contract-types spec)
- Repair and maintenance workflow (see repair-maintenance spec)
- Multiplayer lobby UI (separate specification)
- Starmap rendering implementation (see starmap-interface spec)
- Tactical map rendering implementation (see tactical-map-interface spec)

### Key Concepts
- **HUD Layout**: The persistent shell that contains all campaign UI elements
- **Context Panel**: A dynamic bottom panel that changes content based on user selection
- **Action Blocking**: A pattern where the AdvanceDay button transforms to show mandatory incomplete tasks
- **Information Hierarchy**: 3-tier system (Glanceable → Hover/Summary → Deep Dive)
- **Panel Mode**: The current content type displayed in the context panel

---

## Requirements

### Requirement: 3-Panel Layout Structure
The system SHALL provide a 3-panel layout following Civilization design principles.

**Rationale**: Corner widget layout scales well across resolutions and provides clear information hierarchy.

**Priority**: Critical

#### Scenario: Layout renders with all panels
**GIVEN** the campaign page is loaded
**WHEN** the HUD layout is rendered
**THEN** the following panels SHALL be present:
  - Left panel: Force roster (collapsible)
  - Right panel: Events and contracts (collapsible)
  - Bottom panel: Context panel (dynamic content)
  - Center area: Map display (Starmap or TacticalMap)
  - Top bar: Campaign status indicators

#### Scenario: Left panel displays force roster
**GIVEN** the campaign HUD is rendered
**WHEN** viewing the left panel
**THEN** it SHALL display:
  - List of all 'Mechs in the company
  - Pilot assignments for each 'Mech
  - Status indicators (ready, repair, damaged)
  - Collapse/expand toggle button

#### Scenario: Right panel displays events and contracts
**GIVEN** the campaign HUD is rendered
**WHEN** viewing the right panel
**THEN** it SHALL display:
  - Notification list with categories (contracts, personnel, equipment, finance, story)
  - Click-to-jump functionality for each notification
  - Bundled similar notifications
  - Collapse/expand toggle button

#### Scenario: Panels can be collapsed
**GIVEN** a side panel is expanded
**WHEN** the user clicks the collapse button
**THEN** the panel SHALL collapse to a narrow strip
**AND** the map area SHALL expand to fill the space
**AND** the panel SHALL show an expand button

---

### Requirement: Top HUD Bar Status Indicators
The system SHALL display campaign status indicators in the top bar following the 3-tier information hierarchy.

**Rationale**: Glanceable information must be always visible for strategic decision-making.

**Priority**: Critical

#### Scenario: HUD bar displays core metrics
**GIVEN** the campaign HUD is rendered
**WHEN** viewing the top bar
**THEN** the following SHALL be displayed:
  - Current date (BattleTech calendar format: YYYY-MM-DD)
  - C-Bills balance (formatted with M/K suffixes)
  - Company morale (percentage or status indicator)
  - Mercenary rating (text: Reliable, Questionable, etc.)
  - Settings menu button

#### Scenario: Hover reveals detailed tooltips
**GIVEN** the top HUD bar is displayed
**WHEN** the user hovers over a status indicator
**THEN** a tooltip SHALL appear with detailed information:
  - C-Bills: Monthly income, expenses, net change
  - Morale: Contributing factors, recent changes
  - Mercenary Rating: Current score, next threshold

#### Scenario: Click opens deep dive panel
**GIVEN** the top HUD bar is displayed
**WHEN** the user clicks a status indicator
**THEN** the context panel SHALL switch to the corresponding detail view:
  - C-Bills → Financial summary
  - Morale → Morale breakdown
  - Mercenary Rating → Reputation details

---

### Requirement: AdvanceDay Button with Action Blocking
The system SHALL provide an AdvanceDay button that transforms to show blocking actions when mandatory tasks are incomplete.

**Rationale**: Civilization's End Turn pattern prevents player errors and guides workflow.

**Priority**: Critical

#### Scenario: AdvanceDay button shows ready state
**GIVEN** all mandatory campaign tasks are complete
**WHEN** viewing the AdvanceDay button
**THEN** it SHALL display:
  - Text: "Advance Day"
  - Green/positive visual treatment
  - Arrow icon indicating forward progress
  - Enabled state

#### Scenario: Button shows blocking action
**GIVEN** a mandatory task is incomplete (e.g., unassigned pilots)
**WHEN** viewing the AdvanceDay button
**THEN** it SHALL display:
  - Text: Name of blocking action (e.g., "Assign Pilots")
  - Warning/attention visual treatment
  - Icon indicating the blocking category
  - Enabled state (clickable to route to blocker)

#### Scenario: Click on blocking action routes to task
**GIVEN** the AdvanceDay button shows a blocking action
**WHEN** the user clicks the button
**THEN** the system SHALL:
  - Navigate to the relevant panel/modal for the blocking task
  - Highlight the specific items requiring attention
  - NOT advance the day

#### Scenario: Multiple blockers show highest priority
**GIVEN** multiple mandatory tasks are incomplete
**WHEN** viewing the AdvanceDay button
**THEN** it SHALL display the highest priority blocker:
  - Priority order: Assign Pilots > Resolve Repair > Select Contract
  - Only one blocker shown at a time
  - Resolving one blocker reveals the next

#### Scenario: AdvanceDay executes when ready
**GIVEN** the AdvanceDay button shows "Advance Day" (ready state)
**WHEN** the user clicks the button
**THEN** the system SHALL:
  - Trigger the campaign day advancement
  - Process all daily events
  - Update campaign state
  - Display results/notifications

---

### Requirement: Context Panel Mode System
The system SHALL provide a context panel that changes content based on user selection.

**Rationale**: Single panel for detailed information reduces screen clutter and provides consistent interaction pattern.

**Priority**: High

#### Scenario: Default mode shows campaign summary
**GIVEN** no specific item is selected
**WHEN** viewing the context panel
**THEN** it SHALL display:
  - Campaign summary (current objectives, next deadlines)
  - Recent activity log
  - Quick action buttons

#### Scenario: System selection shows SystemDetails mode
**GIVEN** a star system is selected on the starmap
**WHEN** the context panel updates
**THEN** it SHALL display:
  - System name and faction control
  - Population and industrial rating
  - Available contracts list
  - Market access button
  - Jump distance from current location

#### Scenario: Contract selection shows ContractDetails mode
**GIVEN** a contract is selected from the events panel or system details
**WHEN** the context panel updates
**THEN** it SHALL display:
  - Contract type and employer
  - Mission objectives
  - Payment terms (advance, success, salvage)
  - Difficulty rating
  - Accept/Decline buttons

#### Scenario: Mech selection shows MechStatus mode
**GIVEN** a 'Mech is selected from the roster panel
**WHEN** the context panel updates
**THEN** it SHALL display:
  - 'Mech variant name and tonnage
  - Current armor and structure status
  - Assigned pilot
  - Repair queue and estimated completion
  - Equipment loadout summary
  - View record sheet button

#### Scenario: Pilot selection shows PilotStatus mode
**GIVEN** a pilot is selected from the roster
**WHEN** the context panel updates
**THEN** it SHALL display:
  - Pilot name and callsign
  - Gunnery and piloting skills
  - Special abilities
  - XP and progression
  - Injury status
  - Assigned 'Mech

---

### Requirement: Map Area Component Swapping
The system SHALL support seamless swapping between Starmap and TacticalMap components in the center map area.

**Rationale**: Campaign and combat share the same layout shell for consistent UX.

**Priority**: High

#### Scenario: Campaign mode displays Starmap
**GIVEN** the player is in campaign strategic mode
**WHEN** viewing the map area
**THEN** the Starmap component SHALL be rendered
**AND** starmap-specific controls SHALL be available (jump range filters, faction overlays)

#### Scenario: Combat mode displays TacticalMap
**GIVEN** the player enters a combat mission
**WHEN** the map area updates
**THEN** the TacticalMap component SHALL be rendered
**AND** tactical-specific controls SHALL be available (movement ranges, attack ranges)

#### Scenario: Transition preserves layout shell
**GIVEN** the player transitions from campaign to combat
**WHEN** the map component swaps
**THEN** the following SHALL remain unchanged:
  - Top HUD bar
  - Left panel (roster)
  - Right panel (events)
  - Bottom context panel (content changes, structure persists)

---

### Requirement: 3-Tier Information Hierarchy
The system SHALL implement a 3-tier information hierarchy across all HUD elements.

**Rationale**: Civilization's layered information approach makes complex decisions tractable.

**Priority**: High

#### Scenario: Tier 1 - Glanceable information always visible
**GIVEN** the campaign HUD is rendered
**WHEN** viewing without interaction
**THEN** the following SHALL be immediately visible:
  - Top bar: Date, C-Bills, Morale, Rating
  - Roster: 'Mech names, status icons
  - Events: Notification count, category icons
  - Map: System names, faction colors

#### Scenario: Tier 2 - Hover reveals summary
**GIVEN** the user hovers over a UI element
**WHEN** the hover state is active
**THEN** a tooltip SHALL appear with summary information:
  - System: Population, industrial rating, contract count
  - 'Mech: Armor %, pilot name, repair status
  - Contract: Type, payment, deadline
  - Pilot: Skills, XP, injury status

#### Scenario: Tier 3 - Click opens deep dive
**GIVEN** the user clicks a UI element
**WHEN** the click is processed
**THEN** the context panel or modal SHALL display full details:
  - System: Complete encyclopedia entry, market, contracts
  - 'Mech: Full record sheet, repair queue, loadout
  - Contract: Negotiation screen, full briefing
  - Pilot: Complete stats, abilities, history

---

### Requirement: Responsive Panel Behavior
The system SHALL adapt panel layout for different screen sizes.

**Priority**: Medium

#### Scenario: Desktop displays full layout
**GIVEN** the viewport width is >= 1280px
**WHEN** rendering the HUD
**THEN** all panels SHALL be displayed simultaneously:
  - Left panel: 250px width
  - Right panel: 250px width
  - Map area: Remaining width
  - Context panel: Full width, 200px height

#### Scenario: Tablet collapses side panels by default
**GIVEN** the viewport width is 768px - 1279px
**WHEN** rendering the HUD
**THEN** side panels SHALL be collapsed by default
**AND** touch targets SHALL be enlarged (minimum 44px)
**AND** panels SHALL overlay map when expanded

#### Scenario: Mobile is not supported
**GIVEN** the viewport width is < 768px
**WHEN** attempting to access campaign mode
**THEN** a message SHALL be displayed:
  - "Campaign management requires a larger screen"
  - Recommendation to use desktop or tablet

---

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Props for the main campaign layout component.
 */
interface ICampaignLayoutProps {
  /** Current campaign state */
  readonly campaign: ICampaign;
  
  /** Current map mode */
  readonly mapMode: 'starmap' | 'tactical';
  
  /** Whether left panel is collapsed */
  readonly isLeftPanelCollapsed: boolean;
  
  /** Whether right panel is collapsed */
  readonly isRightPanelCollapsed: boolean;
  
  /** Current context panel mode */
  readonly contextPanelMode: ContextPanelMode;
  
  /** Data for the current context panel mode */
  readonly contextPanelData: ContextPanelData | null;
  
  /** Callback when AdvanceDay is clicked */
  readonly onAdvanceDay: () => void;
  
  /** Callback when panel collapse state changes */
  readonly onPanelToggle: (panel: 'left' | 'right') => void;
}

/**
 * Context panel mode union type.
 */
type ContextPanelMode = 
  | 'default'
  | 'systemDetails'
  | 'contractDetails'
  | 'mechStatus'
  | 'pilotStatus';

/**
 * Context panel data discriminated union.
 */
type ContextPanelData = 
  | { mode: 'default'; data: ICampaignSummary }
  | { mode: 'systemDetails'; data: IStarSystem }
  | { mode: 'contractDetails'; data: IContract }
  | { mode: 'mechStatus'; data: IMech }
  | { mode: 'pilotStatus'; data: IPilot };

/**
 * Props for the context panel component.
 */
interface IContextPanelProps {
  /** Current mode */
  readonly mode: ContextPanelMode;
  
  /** Data for the current mode */
  readonly data: ContextPanelData | null;
  
  /** Callback when user interacts with panel content */
  readonly onAction: (action: ContextPanelAction) => void;
}

/**
 * Context panel action types.
 */
type ContextPanelAction =
  | { type: 'acceptContract'; contractId: string }
  | { type: 'viewRecordSheet'; mechId: string }
  | { type: 'accessMarket'; systemId: string }
  | { type: 'assignPilot'; mechId: string; pilotId: string };

/**
 * Props for the AdvanceDay button component.
 */
interface IAdvanceDayButtonProps {
  /** Current blocking action, if any */
  readonly blocker: ActionBlocker | null;
  
  /** Whether the button is in a loading state */
  readonly isProcessing: boolean;
  
  /** Callback when button is clicked */
  readonly onClick: () => void;
}

/**
 * Action blocker definition.
 */
interface ActionBlocker {
  /** Blocker type */
  readonly type: 'assignPilots' | 'resolveRepair' | 'selectContract';
  
  /** Display text for the blocker */
  readonly text: string;
  
  /** Icon identifier for the blocker */
  readonly icon: string;
  
  /** Priority (higher = shown first) */
  readonly priority: number;
  
  /** Route/action to take when clicked */
  readonly action: () => void;
}

/**
 * Props for the top HUD bar component.
 */
interface IHUDBarProps {
  /** Current campaign date */
  readonly date: string;
  
  /** C-Bills balance */
  readonly cBills: number;
  
  /** Company morale (0-100) */
  readonly morale: number;
  
  /** Mercenary rating text */
  readonly mercenaryRating: string;
  
  /** Active contract summary, if any */
  readonly activeContract: IContractSummary | null;
  
  /** Callback when status indicator is clicked */
  readonly onStatusClick: (status: 'date' | 'cBills' | 'morale' | 'rating') => void;
}

/**
 * Contract summary for HUD display.
 */
interface IContractSummary {
  /** Contract ID */
  readonly id: string;
  
  /** Contract type */
  readonly type: string;
  
  /** Employer name */
  readonly employer: string;
  
  /** Days remaining */
  readonly daysRemaining: number;
}

/**
 * Campaign summary for default context panel.
 */
interface ICampaignSummary {
  /** Current objectives */
  readonly objectives: readonly string[];
  
  /** Next deadline */
  readonly nextDeadline: {
    readonly description: string;
    readonly daysRemaining: number;
  } | null;
  
  /** Recent activity log entries */
  readonly recentActivity: readonly IActivityLogEntry[];
}

/**
 * Activity log entry.
 */
interface IActivityLogEntry {
  /** Entry ID */
  readonly id: string;
  
  /** Timestamp */
  readonly timestamp: string;
  
  /** Category */
  readonly category: 'contract' | 'personnel' | 'equipment' | 'finance' | 'story';
  
  /** Description text */
  readonly description: string;
  
  /** Optional action to take */
  readonly action?: () => void;
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `mapMode` | `'starmap' \| 'tactical'` | Yes | Current map display mode | starmap, tactical | starmap |
| `contextPanelMode` | `ContextPanelMode` | Yes | Current context panel content | default, systemDetails, contractDetails, mechStatus, pilotStatus | default |
| `isLeftPanelCollapsed` | `boolean` | Yes | Left panel collapse state | true, false | false |
| `isRightPanelCollapsed` | `boolean` | Yes | Right panel collapse state | true, false | false |
| `blocker` | `ActionBlocker \| null` | Yes | Current action blocker | ActionBlocker or null | null |
| `morale` | `number` | Yes | Company morale | 0-100 | 50 |

### Type Constraints

- `morale` MUST be between 0 and 100 inclusive
- `contextPanelMode` MUST match the `mode` field in `contextPanelData`
- When `blocker` is not null, AdvanceDay button MUST display blocker text
- When `mapMode` is 'starmap', starmap-specific controls MUST be available
- When `mapMode` is 'tactical', tactical-specific controls MUST be available

---

## Layout Specifications

### ASCII Layout Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Date: 3025-03-15] [C-Bills: 12.5M] [Morale: 85%] [Rep: Reliable]  [≡] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ ┌──────────┐                                              ┌──────────┐ │
│ │ ROSTER   │                                              │ EVENTS   │ │
│ │ ──────── │                                              │ ──────── │ │
│ │ Atlas    │                                              │ ● New    │ │
│ │ Marauder │                M A P   A R E A               │   contract│ │
│ │ Hunch... │                                              │ ● Repair │ │
│ │ Shadow..│                (Starmap or TacticalMap)       │   done   │ │
│ │          │                                              │          │ │
│ │ [<]      │                                              │     [>]  │ │
│ └──────────┘                                              └──────────┘ │
│                                                                        │
│ ┌────────────────────────────────────────────────┐    ┌──────────────┐ │
│ │ [MINIMAP]   [Jump Range ▼] [Contracts ▼]       │    │  ADVANCE     │ │
│ │             [Factions ▼]   [Industrial ▼]      │    │    DAY       │ │
│ └────────────────────────────────────────────────┘    │    →→→       │ │
│                                                       └──────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────┐   │
│ │ [Context Panel: Selected System / Contract / Mech / Pilot]       │   │
│ └──────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Panel Dimensions (Desktop)

| Panel | Width | Height | Position |
|-------|-------|--------|----------|
| Top HUD Bar | 100% | 60px | Fixed top |
| Left Panel (expanded) | 250px | calc(100vh - 60px - 200px) | Fixed left |
| Left Panel (collapsed) | 40px | calc(100vh - 60px - 200px) | Fixed left |
| Right Panel (expanded) | 250px | calc(100vh - 60px - 200px) | Fixed right |
| Right Panel (collapsed) | 40px | calc(100vh - 60px - 200px) | Fixed right |
| Map Area | Remaining width | calc(100vh - 60px - 200px) | Center |
| Context Panel | 100% | 200px | Fixed bottom |
| AdvanceDay Button | 150px | 80px | Fixed bottom-right |

---

## Validation Rules

### Validation: Context Panel Mode Matches Data

**Rule**: The `contextPanelMode` MUST match the `mode` field in `contextPanelData`.

**Severity**: Error

**Condition**:
```typescript
if (contextPanelData !== null && contextPanelMode !== contextPanelData.mode) {
  // invalid - mode mismatch
}
```

**Error Message**: "Context panel mode '{mode}' does not match data mode '{data.mode}'"

**User Action**: Developer must ensure mode and data are synchronized.

### Validation: Morale Range

**Rule**: Morale MUST be between 0 and 100 inclusive.

**Severity**: Error

**Condition**:
```typescript
if (morale < 0 || morale > 100) {
  // invalid - out of range
}
```

**Error Message**: "Morale value {morale} is out of valid range (0-100)"

**User Action**: Clamp morale to valid range.

### Validation: Blocker Priority

**Rule**: When multiple blockers exist, the highest priority blocker MUST be displayed.

**Severity**: Warning

**Condition**:
```typescript
const blockers = getActiveBlockers();
if (blockers.length > 1) {
  const highestPriority = Math.max(...blockers.map(b => b.priority));
  if (displayedBlocker.priority !== highestPriority) {
    // warning - wrong blocker displayed
  }
}
```

**Error Message**: "Displaying blocker with priority {priority}, but higher priority blocker exists"

**User Action**: Display the blocker with the highest priority value.

---

## Dependencies

### Depends On
- **starmap-interface**: Provides the Starmap component for campaign strategic view
- **tactical-map-interface**: Provides the TacticalMap component for combat view
- **campaign-system**: Provides campaign state, advancement logic, and event processing

### Used By
- **campaign-page-implementation**: Implements the full campaign page using this layout
- **multiplayer-lobby**: May reuse HUD components for multiplayer campaign sessions

### Component Hierarchy
1. Campaign system provides state and logic
2. Campaign HUD layout renders shell and panels
3. Starmap/TacticalMap components render in map area
4. Context panel switches content based on selection

---

## Implementation Notes

### Performance Considerations
- Collapse side panels by default on smaller screens to maximize map area
- Use React.memo for panel components to prevent unnecessary re-renders
- Debounce hover tooltips to avoid excessive tooltip rendering
- Lazy load context panel content when mode changes

### Edge Cases
- **No active campaign**: Display campaign creation/load screen instead of HUD
- **Empty roster**: Left panel shows "No 'Mechs" message with add button
- **No notifications**: Right panel shows "No events" message
- **Multiple blockers**: Display highest priority, resolve sequentially
- **Viewport too small**: Display "screen too small" message for < 768px width

### Common Pitfalls
- **Pitfall**: Forgetting to update context panel when selection changes
  - **Solution**: Use a centralized selection state that triggers context panel updates
- **Pitfall**: Panel collapse state not persisting across sessions
  - **Solution**: Store collapse state in localStorage or campaign preferences
- **Pitfall**: AdvanceDay button not updating when blockers resolve
  - **Solution**: Recalculate blockers on every campaign state change

---

## Examples

### Example 1: Rendering Campaign HUD with Starmap

**Input**:
```typescript
const campaign: ICampaign = {
  id: 'campaign-001',
  date: '3025-03-15',
  cBills: 12500000,
  morale: 85,
  mercenaryRating: 'Reliable',
  // ... other campaign properties
};

const layoutProps: ICampaignLayoutProps = {
  campaign,
  mapMode: 'starmap',
  isLeftPanelCollapsed: false,
  isRightPanelCollapsed: false,
  contextPanelMode: 'default',
  contextPanelData: {
    mode: 'default',
    data: {
      objectives: ['Secure contract in Davion space', 'Repair Atlas'],
      nextDeadline: {
        description: 'Contract deadline',
        daysRemaining: 7,
      },
      recentActivity: [
        {
          id: 'activity-001',
          timestamp: '3025-03-14',
          category: 'equipment',
          description: 'Marauder repair completed',
        },
      ],
    },
  },
  onAdvanceDay: () => console.log('Advancing day...'),
  onPanelToggle: (panel) => console.log(`Toggling ${panel} panel`),
};
```

**Processing**:
```typescript
// Render campaign layout
<CampaignLayout {...layoutProps}>
  {/* Top HUD bar */}
  <HUDBar
    date={campaign.date}
    cBills={campaign.cBills}
    morale={campaign.morale}
    mercenaryRating={campaign.mercenaryRating}
    activeContract={null}
    onStatusClick={(status) => console.log(`Clicked ${status}`)}
  />
  
  {/* Left panel: Roster */}
  <RosterPanel
    mechs={campaign.mechs}
    isCollapsed={layoutProps.isLeftPanelCollapsed}
    onToggle={() => layoutProps.onPanelToggle('left')}
  />
  
  {/* Map area: Starmap */}
  <StarmapDisplay
    currentSystem={campaign.currentSystem}
    systems={getAllSystems()}
    onSystemSelect={(system) => console.log(`Selected ${system.name}`)}
  />
  
  {/* Right panel: Events */}
  <EventsPanel
    notifications={campaign.notifications}
    isCollapsed={layoutProps.isRightPanelCollapsed}
    onToggle={() => layoutProps.onPanelToggle('right')}
  />
  
  {/* Context panel */}
  <ContextPanel
    mode={layoutProps.contextPanelMode}
    data={layoutProps.contextPanelData}
    onAction={(action) => console.log('Context action:', action)}
  />
  
  {/* AdvanceDay button */}
  <AdvanceDayButton
    blocker={null}
    isProcessing={false}
    onClick={layoutProps.onAdvanceDay}
  />
</CampaignLayout>
```

**Output**:
- Full campaign HUD rendered with starmap
- All panels visible and expanded
- Context panel shows campaign summary
- AdvanceDay button shows "Advance Day" (no blockers)

### Example 2: AdvanceDay Button with Blocker

**Input**:
```typescript
const blocker: ActionBlocker = {
  type: 'assignPilots',
  text: 'Assign Pilots',
  icon: 'user-plus',
  priority: 100,
  action: () => {
    // Navigate to pilot assignment screen
    openPilotAssignmentModal();
  },
};

const buttonProps: IAdvanceDayButtonProps = {
  blocker,
  isProcessing: false,
  onClick: () => {
    if (blocker) {
      blocker.action();
    } else {
      advanceCampaignDay();
    }
  },
};
```

**Processing**:
```typescript
<AdvanceDayButton {...buttonProps} />

// Internal rendering logic:
if (blocker) {
  return (
    <button
      className="advance-day-button warning"
      onClick={onClick}
    >
      <Icon name={blocker.icon} />
      <span>{blocker.text}</span>
    </button>
  );
} else {
  return (
    <button
      className="advance-day-button ready"
      onClick={onClick}
    >
      <Icon name="arrow-right" />
      <span>Advance Day</span>
    </button>
  );
}
```

**Output**:
- Button displays "Assign Pilots" with warning styling
- Clicking button opens pilot assignment modal
- Day does NOT advance until blocker is resolved

### Example 3: Context Panel Mode Switch

**Input**:
```typescript
// User clicks a star system on the starmap
const selectedSystem: IStarSystem = {
  id: 'system-solaris',
  name: 'Solaris VII',
  faction: 'Lyran Commonwealth',
  population: 1200000000,
  industrialRating: 'A',
  availableContracts: [
    { id: 'contract-001', type: 'Gladiator Match', payment: 500000 },
    { id: 'contract-002', type: 'Garrison Duty', payment: 300000 },
  ],
  jumpDistance: 2,
};

const contextPanelData: ContextPanelData = {
  mode: 'systemDetails',
  data: selectedSystem,
};
```

**Processing**:
```typescript
<ContextPanel
  mode="systemDetails"
  data={contextPanelData}
  onAction={(action) => {
    if (action.type === 'accessMarket') {
      navigateToMarket(action.systemId);
    }
  }}
/>

// Internal rendering for systemDetails mode:
return (
  <div className="context-panel system-details">
    <h2>{data.name}</h2>
    <p>Faction: {data.faction}</p>
    <p>Population: {formatNumber(data.population)}</p>
    <p>Industrial Rating: {data.industrialRating}</p>
    <p>Jump Distance: {data.jumpDistance} jumps</p>
    
    <h3>Available Contracts</h3>
    <ul>
      {data.availableContracts.map(contract => (
        <li key={contract.id}>
          {contract.type} - {formatCBills(contract.payment)}
        </li>
      ))}
    </ul>
    
    <button onClick={() => onAction({ type: 'accessMarket', systemId: data.id })}>
      Access Market
    </button>
  </div>
);
```

**Output**:
- Context panel displays Solaris VII system details
- Shows faction, population, industrial rating, jump distance
- Lists 2 available contracts
- Provides "Access Market" button

---

## References

### Design Principles
- **Civilization 5/6 HUD Design**: Corner widget layout, End Turn button pattern, 3-tier information hierarchy
- **Red Blob Games - UI Design**: Information layering and progressive disclosure

### Related Documentation
- `starmap-interface`: Starmap component specification
- `tactical-map-interface`: Tactical map component specification
- `campaign-system`: Campaign state and logic specification
- `contract-types`: Contract negotiation and management

### Research Sources
- `.sisyphus/drafts/campaign-map-design-research.md`: Part 1 (Civilization Design Principles), Part 3 (Campaign-Specific UI Patterns), Part 6 (Design Recommendations)

---

## Changelog

### Version 1.0 (2026-01-31)
- Initial specification based on Civilization HUD design research
- Covers 3-panel layout, context panel modes, action blocking pattern, 3-tier information hierarchy
