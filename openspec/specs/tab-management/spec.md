# tab-management Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2026-02-13
**Dependencies**: None (foundation)
**Affects**: Unit customizer, simulation viewer, multi-unit workflows

---

## Overview

### Purpose

The tab management system provides state management for tabbed interfaces across MekStation, supporting multiple concurrent units in the customizer and navigation between simulation viewer sections. It handles tab lifecycle (create, duplicate, close, reorder), active tab tracking, and persistence of tab state across browser sessions.

### Scope

**In Scope:**

- Tab state management (tabs array, active tab ID)
- Tab lifecycle operations (create, duplicate, close, select, rename, reorder)
- Active tab selection and tracking
- Sub-tab persistence (last active sub-tab per unit)
- URL synchronization for simulation viewer tabs
- Browser back/forward navigation support
- localStorage persistence for unit customizer tabs
- Tab metadata caching (name, tonnage, tech base)
- Tab ID validation and sanitization

**Out of Scope:**

- Unit data storage (handled by unit store registry)
- Tab UI rendering (handled by React components)
- Tab drag-and-drop implementation (UI concern)
- Modal dialogs for tab creation (UI concern)

### Key Concepts

- **Tab**: A workspace representing a single unit (customizer) or view (simulation viewer)
- **Active Tab**: The currently selected and visible tab
- **Tab Manager Store**: Zustand store managing tab metadata and lifecycle for unit customizer
- **Tab Navigation Store**: Zustand store managing tab state for simulation viewer with URL sync
- **Sub-Tab**: Secondary navigation within a unit tab (structure, armor, equipment, etc.)
- **Tab Persistence**: Storing tab state in localStorage (customizer) or URL query params (simulation viewer)
- **Tab Sanitization**: Validation and repair of tab IDs on hydration from storage

---

## Requirements

### Requirement: Tab State Management

The system SHALL maintain an ordered list of tabs with unique identifiers and track the currently active tab.

**Rationale**: Users need to work with multiple units simultaneously and switch between them without losing context.

**Priority**: Critical

#### Scenario: Tab state initialization

**GIVEN** the application starts with no persisted state
**WHEN** the tab manager initializes
**THEN** the tabs array is empty
**AND** the activeTabId is null
**AND** isLoading is false

#### Scenario: Multiple tabs tracked

**GIVEN** three tabs have been created
**WHEN** the tab state is queried
**THEN** the tabs array contains exactly three tab entries
**AND** each tab has a unique ID
**AND** the activeTabId matches the most recently created tab

#### Scenario: Active tab retrieval

**GIVEN** multiple tabs exist with one active
**WHEN** getActiveTab() is called
**THEN** the tab info matching activeTabId is returned
**AND** the returned tab contains id, name, tonnage, techBase, and unitType

---

### Requirement: Tab Creation

The system SHALL create new tabs from templates with unique UUIDs and register corresponding unit stores.

**Rationale**: Users need to start new unit designs from weight class templates.

**Priority**: Critical

#### Scenario: Create tab from template

**GIVEN** a unit template (light, medium, heavy, assault)
**WHEN** createTab(template) is called
**THEN** a new tab is added to the tabs array
**AND** the tab has a unique UUID
**AND** a unit store is created in the registry with the same ID
**AND** the new tab becomes the active tab
**AND** the new tab modal is closed

#### Scenario: Create tab with custom name

**GIVEN** a unit template and custom name "Custom Mech"
**WHEN** createTab(template, "Custom Mech") is called
**THEN** the new tab's name is "Custom Mech"
**AND** the unit store's name is also "Custom Mech"

#### Scenario: Create tab with default name

**GIVEN** a unit template with no custom name
**WHEN** createTab(template) is called
**THEN** the new tab's name is "Mek"

#### Scenario: Tab metadata caching

**GIVEN** a heavy mech template (70 tons, Inner Sphere)
**WHEN** createTab(template) is called
**THEN** the tab's tonnage is 70
**AND** the tab's techBase is INNER_SPHERE
**AND** the tab's unitType is BATTLEMECH

---

### Requirement: Tab Duplication

The system SHALL duplicate existing tabs with all configuration, creating independent copies with new IDs.

**Rationale**: Users need to create variants of existing designs without starting from scratch.

**Priority**: High

#### Scenario: Duplicate tab

**GIVEN** an existing tab with ID "tab-1"
**WHEN** duplicateTab("tab-1") is called
**THEN** a new tab is created with a different UUID
**AND** a new unit store is created with the duplicated configuration
**AND** the new tab's name contains "(Copy)"
**AND** the new tab becomes the active tab
**AND** the function returns the new tab ID

#### Scenario: Duplicate preserves configuration

**GIVEN** a tab with XL engine and Mixed tech base
**WHEN** duplicateTab() is called
**THEN** the new tab has the same engine type
**AND** the new tab has the same tech base mode
**AND** modifying the duplicate does not affect the original

#### Scenario: Duplicate non-existent tab

**GIVEN** no tab with ID "invalid-id" exists
**WHEN** duplicateTab("invalid-id") is called
**THEN** the function returns null
**AND** no new tab is created

---

### Requirement: Tab Closing

The system SHALL close tabs and manage active tab selection when the active tab is closed.

**Rationale**: Users need to remove tabs they no longer need and maintain a coherent active tab state.

**Priority**: Critical

#### Scenario: Close non-active tab

**GIVEN** three tabs exist with tab-2 active
**WHEN** closeTab("tab-1") is called
**THEN** tab-1 is removed from the tabs array
**AND** the activeTabId remains "tab-2"
**AND** the tabs array has two entries

#### Scenario: Close active tab (middle position)

**GIVEN** three tabs exist with tab-2 (middle) active
**WHEN** closeTab("tab-2") is called
**THEN** tab-2 is removed
**AND** the activeTabId is set to the next tab (previously at index 2, now at index 1)

#### Scenario: Close active tab (last position)

**GIVEN** two tabs exist with tab-2 (last) active
**WHEN** closeTab("tab-2") is called
**THEN** tab-2 is removed
**AND** the activeTabId is set to tab-1 (previous tab)

#### Scenario: Close last remaining tab

**GIVEN** one tab exists
**WHEN** closeTab() is called
**THEN** the tabs array is empty
**AND** the activeTabId is null

#### Scenario: Close non-existent tab

**GIVEN** tabs array with known IDs
**WHEN** closeTab("invalid-id") is called
**THEN** no tabs are removed
**AND** the activeTabId is unchanged

---

### Requirement: Tab Selection

The system SHALL change the active tab and hydrate the corresponding unit store.

**Rationale**: Users need to switch between tabs to work on different units.

**Priority**: Critical

#### Scenario: Select existing tab

**GIVEN** three tabs exist with tab-1 active
**WHEN** selectTab("tab-3") is called
**THEN** the activeTabId is "tab-3"
**AND** the unit store for tab-3 is hydrated from localStorage
**AND** the unit store for tab-3 is accessible via getUnitStore()

#### Scenario: Select already active tab

**GIVEN** tab-1 is active
**WHEN** selectTab("tab-1") is called
**THEN** the activeTabId remains "tab-1"
**AND** the unit store is re-hydrated (idempotent)

---

### Requirement: Tab Renaming

The system SHALL rename tabs and synchronize the name with the unit store.

**Rationale**: Users need to give meaningful names to their unit designs.

**Priority**: High

#### Scenario: Rename tab

**GIVEN** a tab with name "Mek"
**WHEN** renameTab(tabId, "Atlas Custom") is called
**THEN** the tab's name is "Atlas Custom"
**AND** the unit store's name is also "Atlas Custom"

#### Scenario: Rename updates lastModifiedAt

**GIVEN** a tab with lastModifiedAt timestamp T1
**WHEN** renameTab() is called
**THEN** the tab's lastModifiedAt is updated to T2 (T2 > T1)

---

### Requirement: Tab Reordering

The system SHALL reorder tabs by moving a tab from one index to another.

**Rationale**: Users need to organize tabs in their preferred order.

**Priority**: Medium

#### Scenario: Reorder tabs

**GIVEN** tabs ["tab-1", "tab-2", "tab-3"]
**WHEN** reorderTabs(fromIndex: 0, toIndex: 2) is called
**THEN** the tabs array is ["tab-2", "tab-3", "tab-1"]
**AND** all tab data is preserved

#### Scenario: Reorder preserves active tab

**GIVEN** tabs ["tab-1", "tab-2", "tab-3"] with tab-2 active
**WHEN** reorderTabs(fromIndex: 0, toIndex: 2) is called
**THEN** the activeTabId is still "tab-2"

---

### Requirement: Sub-Tab Persistence

The system SHALL track the last active sub-tab for each unit tab to restore context when switching between units.

**Rationale**: Users expect to return to the same sub-tab (structure, armor, equipment, etc.) when switching back to a unit.

**Priority**: High

#### Scenario: Set last sub-tab

**GIVEN** a tab with ID "tab-1"
**WHEN** setLastSubTab("tab-1", "armor") is called
**THEN** the tab's lastSubTab property is "armor"

#### Scenario: Get last sub-tab

**GIVEN** a tab with lastSubTab set to "equipment"
**WHEN** getLastSubTab(tabId) is called
**THEN** the function returns "equipment"

#### Scenario: Get last sub-tab for new tab

**GIVEN** a newly created tab with no lastSubTab set
**WHEN** getLastSubTab(tabId) is called
**THEN** the function returns undefined

#### Scenario: Sub-tab persistence across tab switches

**GIVEN** tab-1 with lastSubTab "preview" and tab-2 with lastSubTab "armor"
**WHEN** selectTab("tab-1") is called
**THEN** the lastSubTab for tab-1 is still "preview"
**AND** the lastSubTab for tab-2 is still "armor"

#### Scenario: Sub-tab updates through rapid switches

**GIVEN** five tabs with different lastSubTab values
**WHEN** selectTab() is called rapidly for tabs 2, 0, 4, 1, 3
**THEN** all tabs retain their original lastSubTab values

---

### Requirement: Tab ID Validation and Sanitization

The system SHALL validate tab IDs on hydration and repair invalid or missing IDs with new UUIDs.

**Rationale**: Corrupted localStorage or migration from older formats can result in invalid tab IDs, which must be repaired to maintain system integrity.

**Priority**: High

#### Scenario: Repair missing tab ID

**GIVEN** persisted state with a tab having id: ""
**WHEN** the store rehydrates
**THEN** the tab is assigned a new valid UUID
**AND** the activeTabId is updated if it pointed to the repaired tab
**AND** a warning is logged

#### Scenario: Repair invalid (non-UUID) tab ID

**GIVEN** persisted state with a tab having id: "invalid-not-a-uuid"
**WHEN** the store rehydrates
**THEN** the tab is assigned a new valid UUID
**AND** the activeTabId is updated if it pointed to the repaired tab

#### Scenario: Repair multiple invalid tab IDs

**GIVEN** persisted state with three tabs, two with invalid IDs
**WHEN** the store rehydrates
**THEN** both invalid tabs are assigned new UUIDs
**AND** all new IDs are unique
**AND** the activeTabId is updated to the repaired ID if necessary

#### Scenario: Preserve valid tab IDs

**GIVEN** persisted state with a tab having a valid UUID
**WHEN** the store rehydrates
**THEN** the tab's ID is unchanged

#### Scenario: Repair invalid activeTabId

**GIVEN** persisted state with activeTabId: "invalid"
**WHEN** the store rehydrates
**THEN** the activeTabId is reset to the first tab's ID
**AND** a warning is logged

---

### Requirement: Simulation Viewer Tab Navigation

The system SHALL manage tab navigation for the simulation viewer with URL synchronization and browser history support.

**Rationale**: Simulation viewer tabs (campaign-dashboard, encounter-history, analysis-bugs) need URL-based state for bookmarking and back/forward navigation.

**Priority**: High

#### Scenario: Set active tab updates URL

**GIVEN** the simulation viewer is on campaign-dashboard
**WHEN** setActiveTab('encounter-history') is called
**THEN** the activeTab is 'encounter-history'
**AND** the URL query parameter is updated to ?tab=encounter-history
**AND** the tab is added to the history array

#### Scenario: Navigate back to previous tab

**GIVEN** history is ['campaign-dashboard', 'encounter-history']
**WHEN** goBack() is called
**THEN** the activeTab is 'campaign-dashboard'
**AND** the history is ['campaign-dashboard']
**AND** window.history.back() is called

#### Scenario: Cannot go back with single history entry

**GIVEN** history is ['campaign-dashboard']
**WHEN** canGoBack() is called
**THEN** the function returns false

#### Scenario: Initialize tab from URL on mount

**GIVEN** the URL is ?tab=encounter-history
**WHEN** useInitTabFromURL() is called
**THEN** the activeTab is set to 'encounter-history'
**AND** the history is ['encounter-history']

#### Scenario: Sync tab on browser back button

**GIVEN** the URL changes to ?tab=campaign-dashboard via popstate event
**WHEN** useSyncTabWithURL() listener fires
**THEN** the activeTab is updated to 'campaign-dashboard'

#### Scenario: Validate tab parameter

**GIVEN** the URL is ?tab=invalid-tab
**WHEN** useInitTabFromURL() is called
**THEN** the activeTab remains at the default 'campaign-dashboard'
**AND** the invalid tab is ignored

---

### Requirement: Tab Persistence

The system SHALL persist tab state to localStorage (customizer) or URL query params (simulation viewer) and restore on reload.

**Rationale**: Users expect their tabs to persist across browser sessions and page refreshes.

**Priority**: Critical

#### Scenario: Persist tabs to localStorage

**GIVEN** three tabs exist in the customizer
**WHEN** the store state changes
**THEN** the tabs array is written to localStorage key "megamek-tab-manager"
**AND** the activeTabId is written to localStorage

#### Scenario: Restore tabs from localStorage

**GIVEN** localStorage contains persisted tabs
**WHEN** the application reloads
**THEN** the tabs array is restored
**AND** the activeTabId is restored
**AND** the active unit store is hydrated

#### Scenario: Partialize excludes transient state

**GIVEN** the store has isLoading and isNewTabModalOpen set to true
**WHEN** the store persists
**THEN** only tabs and activeTabId are written to localStorage
**AND** isLoading and isNewTabModalOpen are not persisted

#### Scenario: Simulation viewer tab persists to URL

**GIVEN** the simulation viewer activeTab is 'encounter-history'
**WHEN** the page is refreshed
**THEN** the URL still contains ?tab=encounter-history
**AND** the activeTab is restored to 'encounter-history'

---

### Requirement: Modal State Management

The system SHALL manage the new tab modal open/close state.

**Rationale**: The UI needs to control when the new tab creation modal is displayed.

**Priority**: Medium

#### Scenario: Open new tab modal

**GIVEN** isNewTabModalOpen is false
**WHEN** openNewTabModal() is called
**THEN** isNewTabModalOpen is true

#### Scenario: Close new tab modal

**GIVEN** isNewTabModalOpen is true
**WHEN** closeNewTabModal() is called
**THEN** isNewTabModalOpen is false

#### Scenario: Create tab closes modal

**GIVEN** isNewTabModalOpen is true
**WHEN** createTab() is called
**THEN** isNewTabModalOpen is false

---

## Data Model Requirements

### Required Interfaces

The implementation MUST provide the following TypeScript interfaces:

```typescript
/**
 * Tab metadata stored in TabManager (not in unit store)
 */
interface TabInfo {
  /**
   * Unit ID (matches unit store ID)
   * MUST be a valid UUID
   */
  readonly id: string;

  /**
   * Display name (cached from unit store for tab rendering)
   * User-editable via renameTab()
   */
  name: string;

  /**
   * Tonnage (cached for tab display)
   * Range: 20-100 tons
   */
  readonly tonnage: number;

  /**
   * Tech base (cached for tab display)
   * Values: INNER_SPHERE, CLAN
   */
  readonly techBase: TechBase;

  /**
   * Unit type (defaults to BATTLEMECH for backwards compatibility)
   */
  readonly unitType: UnitType;

  /**
   * Last active sub-tab for this unit (structure, armor, equipment, etc.)
   * Optional - undefined for new tabs
   */
  lastSubTab?: string;
}

/**
 * Template for creating new units
 */
interface UnitTemplate {
  readonly id: string;
  readonly name: string;
  readonly tonnage: number;
  readonly techBase: TechBase;
  readonly walkMP: number;
}

/**
 * Tab Manager state
 */
interface TabManagerState {
  /** Ordered list of tab info */
  tabs: TabInfo[];

  /** Currently active tab ID (null if no tabs) */
  activeTabId: string | null;

  /** Loading state (for hydration) */
  isLoading: boolean;

  /** New tab modal state */
  isNewTabModalOpen: boolean;

  // Actions
  createTab: (template: UnitTemplate, customName?: string) => string;
  duplicateTab: (tabId: string) => string | null;
  closeTab: (tabId: string) => void;
  selectTab: (tabId: string) => void;
  renameTab: (tabId: string, name: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  addTab: (
    tabInfo: Omit<TabInfo, 'tonnage' | 'techBase' | 'unitType'> & {
      tonnage?: number;
      techBase?: TechBase;
      unitType?: UnitType;
    },
  ) => void;
  setLastSubTab: (tabId: string, subTab: string) => void;
  getLastSubTab: (tabId: string) => string | undefined;
  openNewTabModal: () => void;
  closeNewTabModal: () => void;
  getActiveTab: () => TabInfo | null;
  setLoading: (loading: boolean) => void;
}

/**
 * Valid tab identifiers for the Simulation Viewer
 */
type SimulationViewerTab =
  | 'campaign-dashboard'
  | 'encounter-history'
  | 'analysis-bugs';

/**
 * Tab navigation state for Simulation Viewer
 */
interface ITabNavigationState {
  /** Currently active tab */
  activeTab: SimulationViewerTab;

  /** History of visited tabs for back/forward navigation */
  history: SimulationViewerTab[];
}

/**
 * Tab navigation actions for Simulation Viewer
 */
interface ITabNavigationActions {
  setActiveTab: (tab: SimulationViewerTab) => void;
  goBack: () => void;
  canGoBack: () => boolean;
  reset: () => void;
}

/**
 * Complete tab navigation store type
 */
type ITabNavigationStore = ITabNavigationState & ITabNavigationActions;
```

### Required Properties

| Property            | Type                    | Required | Description                  | Valid Values                                    | Default                |
| ------------------- | ----------------------- | -------- | ---------------------------- | ----------------------------------------------- | ---------------------- |
| `id`                | `string`                | Yes      | Unique tab identifier        | Valid UUID                                      | Generated UUID         |
| `name`              | `string`                | Yes      | Display name                 | Any non-empty string                            | "Mek"                  |
| `tonnage`           | `number`                | Yes      | Unit tonnage                 | 20-100 (step 5)                                 | From template          |
| `techBase`          | `TechBase`              | Yes      | Tech base                    | INNER_SPHERE, CLAN                              | INNER_SPHERE           |
| `unitType`          | `UnitType`              | Yes      | Unit type                    | BATTLEMECH, VEHICLE, AEROSPACE, etc.            | BATTLEMECH             |
| `lastSubTab`        | `string \| undefined`   | No       | Last active sub-tab          | "structure", "armor", "equipment", etc.         | undefined              |
| `tabs`              | `TabInfo[]`             | Yes      | Ordered list of tabs         | Array of TabInfo                                | []                     |
| `activeTabId`       | `string \| null`        | Yes      | Currently active tab ID      | Valid UUID or null                              | null                   |
| `isLoading`         | `boolean`               | Yes      | Loading state                | true, false                                     | true                   |
| `isNewTabModalOpen` | `boolean`               | Yes      | New tab modal state          | true, false                                     | false                  |
| `activeTab`         | `SimulationViewerTab`   | Yes      | Active simulation viewer tab | 'campaign-dashboard', 'encounter-history', etc. | 'campaign-dashboard'   |
| `history`           | `SimulationViewerTab[]` | Yes      | Tab navigation history       | Array of SimulationViewerTab                    | ['campaign-dashboard'] |

### Type Constraints

- `id` MUST be a valid UUID (validated via isValidUUID())
- `id` MUST be unique across all tabs
- `name` MUST NOT be empty
- `tonnage` MUST be between 20 and 100 (inclusive)
- `tonnage` MUST be a multiple of 5
- `techBase` MUST be one of TechBase enum values
- `unitType` MUST be one of UnitType enum values
- `activeTabId` MUST be null or match an existing tab's id
- `tabs` MUST be an array (can be empty)
- `lastSubTab` MUST be a valid sub-tab identifier if present
- `activeTab` MUST be one of the valid SimulationViewerTab values
- `history` MUST contain at least one entry

---

## Validation Rules

### Validation: Tab ID Uniqueness

**Rule**: All tab IDs MUST be unique within the tabs array.

**Check**:

```typescript
const ids = tabs.map((t) => t.id);
const uniqueIds = new Set(ids);
if (ids.length !== uniqueIds.size) {
  throw new Error('Duplicate tab IDs detected');
}
```

**Error Message**: "Duplicate tab IDs detected. Each tab must have a unique identifier."

---

### Validation: Active Tab Exists

**Rule**: If activeTabId is not null, it MUST match an existing tab's id.

**Check**:

```typescript
if (activeTabId !== null && !tabs.some((t) => t.id === activeTabId)) {
  throw new Error('Active tab ID does not match any existing tab');
}
```

**Error Message**: "Active tab ID '{activeTabId}' does not match any existing tab."

---

### Validation: Tab ID Format

**Rule**: All tab IDs MUST be valid UUIDs.

**Check**:

```typescript
tabs.forEach((tab) => {
  if (!isValidUUID(tab.id)) {
    throw new Error(`Invalid tab ID format: ${tab.id}`);
  }
});
```

**Error Message**: "Invalid tab ID format: '{id}'. Tab IDs must be valid UUIDs."

---

### Validation: Simulation Viewer Tab Value

**Rule**: activeTab MUST be one of the valid SimulationViewerTab values.

**Check**:

```typescript
const VALID_TABS = ['campaign-dashboard', 'encounter-history', 'analysis-bugs'];
if (!VALID_TABS.includes(activeTab)) {
  throw new Error(`Invalid tab value: ${activeTab}`);
}
```

**Error Message**: "Invalid tab value: '{activeTab}'. Must be one of: campaign-dashboard, encounter-history, analysis-bugs."

---

## Implementation Notes

### Performance Considerations

- **Tab switching**: Hydrating unit stores on selectTab() can be expensive for large units. Consider lazy hydration or caching strategies.
- **Persistence**: Writing to localStorage on every state change can cause performance issues. Zustand's persist middleware handles debouncing automatically.
- **Tab reordering**: Array splicing is O(n) but acceptable for typical tab counts (< 20).

### Edge Cases

- **Empty tabs array**: activeTabId MUST be null when tabs.length === 0.
- **Closing last tab**: Users CAN close the last tab, resulting in an empty workspace.
- **Rapid tab switches**: Sub-tab persistence MUST handle rapid selectTab() calls without race conditions.
- **Invalid URL params**: Simulation viewer MUST ignore invalid ?tab values and fall back to default.
- **Corrupted localStorage**: Tab sanitization MUST repair invalid IDs on hydration.

### Common Pitfalls

- **Forgetting to hydrate unit store**: selectTab() MUST call hydrateOrCreateUnit() to ensure the unit store is loaded.
- **Not updating lastModifiedAt**: renameTab() and other mutations MUST update the timestamp.
- **Persisting transient state**: Only tabs and activeTabId should be persisted, not isLoading or modal state.
- **Assuming tabs exist**: Always check if tabs array is empty before accessing tabs[0].
- **Not validating tab IDs**: Always use isValidUUID() before trusting persisted tab IDs.

---

## Examples

### Example: Create and Select Tab

```typescript
import {
  useTabManagerStore,
  UNIT_TEMPLATES,
} from '@/stores/useTabManagerStore';

// Create a new medium mech tab
const mediumTemplate = UNIT_TEMPLATES[1]; // 50 tons
const tabId = useTabManagerStore
  .getState()
  .createTab(mediumTemplate, 'Atlas Custom');

// Tab is automatically selected and unit store is created
const activeTab = useTabManagerStore.getState().getActiveTab();
console.log(activeTab?.name); // "Atlas Custom"
console.log(activeTab?.tonnage); // 50
```

### Example: Duplicate and Modify Tab

```typescript
// Duplicate an existing tab
const originalId = useTabManagerStore.getState().tabs[0].id;
const duplicateId = useTabManagerStore.getState().duplicateTab(originalId);

// Rename the duplicate
if (duplicateId) {
  useTabManagerStore.getState().renameTab(duplicateId, 'Atlas Variant');
}
```

### Example: Close Tab with Adjacent Selection

```typescript
// Create three tabs
const tab1 = useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0]);
const tab2 = useTabManagerStore.getState().createTab(UNIT_TEMPLATES[1]);
const tab3 = useTabManagerStore.getState().createTab(UNIT_TEMPLATES[2]);

// Select middle tab
useTabManagerStore.getState().selectTab(tab2);

// Close middle tab - next tab (tab3) becomes active
useTabManagerStore.getState().closeTab(tab2);
console.log(useTabManagerStore.getState().activeTabId); // tab3
```

### Example: Sub-Tab Persistence

```typescript
// Set last sub-tab for a unit
const tabId = useTabManagerStore.getState().tabs[0].id;
useTabManagerStore.getState().setLastSubTab(tabId, 'armor');

// Switch to another tab and back
useTabManagerStore.getState().selectTab(anotherTabId);
useTabManagerStore.getState().selectTab(tabId);

// Retrieve last sub-tab
const lastSubTab = useTabManagerStore.getState().getLastSubTab(tabId);
console.log(lastSubTab); // "armor"
```

### Example: Simulation Viewer Tab Navigation

```typescript
import { useTabNavigationStore } from '@/stores/simulation-viewer/useTabNavigationStore';

// Set active tab (updates URL to ?tab=encounter-history)
useTabNavigationStore.getState().setActiveTab('encounter-history');

// Navigate back
if (useTabNavigationStore.getState().canGoBack()) {
  useTabNavigationStore.getState().goBack();
}

// Initialize from URL on mount
useInitTabFromURL();

// Sync with browser back/forward
useSyncTabWithURL();
```

### Example: Tab Sanitization on Hydration

```typescript
// Persisted state with invalid tab ID
const persistedState = {
  tabs: [
    {
      id: '',
      name: 'Missing ID',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
    },
    {
      id: 'invalid-not-uuid',
      name: 'Invalid ID',
      tonnage: 70,
      techBase: TechBase.CLAN,
    },
  ],
  activeTabId: 'invalid-not-uuid',
};

// On rehydration, sanitizeTabsOnHydration() repairs IDs
// Result:
// tabs[0].id = "550e8400-e29b-41d4-a716-446655440000" (new UUID)
// tabs[1].id = "6ba7b810-9dad-11d1-80b4-00c04fd430c8" (new UUID)
// activeTabId = "6ba7b810-9dad-11d1-80b4-00c04fd430c8" (updated to repaired ID)
```

---

## References

### Internal Specifications

- `unit-store-architecture/spec.md` - Unit store registry and lifecycle
- `customizer-tabs/spec.md` - Customizer tab UI components

### Source Files

- `src/stores/useTabManagerStore.ts` - Tab manager store implementation
- `src/stores/simulation-viewer/useTabNavigationStore.ts` - Simulation viewer tab navigation
- `src/stores/unitStoreRegistry.ts` - Unit store registry
- `src/__tests__/stores/useTabManagerStore.test.ts` - Tab manager tests

### External References

- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Zustand Persist Middleware](https://docs.pmnd.rs/zustand/integrations/persisting-store-data)

---

## Changelog

### Version 1.0 (2026-02-13)

- Initial specification
- Defined tab state management requirements
- Defined tab lifecycle operations (create, duplicate, close, select, rename, reorder)
- Defined sub-tab persistence
- Defined simulation viewer tab navigation with URL sync
- Defined tab ID validation and sanitization
- Defined persistence requirements (localStorage and URL)
