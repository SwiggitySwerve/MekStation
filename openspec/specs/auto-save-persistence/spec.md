# Auto-Save and State Persistence Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2026-02-13
**Dependencies**: toast-notifications (useToast), unit-services (useUnitStoreApi)
**Affects**: unit-builder, game-session-management

---

## Overview

### Purpose

This specification defines the auto-save and state persistence subsystem for MekStation. It provides three React hooks for managing application state persistence: `useAutoSaveIndicator` for toast-based save feedback, `usePersistedState` for localStorage-backed state with JSON serialization, and `useGameStatePersistence` for full game state autosave with conflict detection and beforeunload warnings.

### Scope

**In Scope:**

- Auto-save indicator with debounced toast notifications
- Generic localStorage-backed state hook with JSON serialization
- Game state persistence with autosave intervals and debouncing
- Conflict detection for concurrent save operations
- Beforeunload warning for unsaved changes
- Storage key constants for UI preferences

**Out of Scope:**

- Database persistence (SQLite, IndexedDB)
- Server-side synchronization
- Multi-tab state synchronization
- State migration between schema versions
- Undo/redo functionality
- Compression or encryption of stored data

### Key Concepts

- **Auto-Save Indicator**: Visual feedback (toast) shown after state changes are persisted, debounced to avoid notification spam
- **Persisted State**: React state synchronized with localStorage, supporting functional updates and JSON serialization
- **Game State Persistence**: Full game state autosave with configurable intervals, debouncing, conflict detection, and unsaved change warnings
- **Conflict Detection**: Timestamp-based detection of concurrent save operations to prevent data loss
- **Debouncing**: Delay before autosave triggers after state change, preventing excessive writes during rapid edits

---

## Requirements

### Requirement: Auto-Save Indicator

The system SHALL provide a `useAutoSaveIndicator` hook that subscribes to unit store changes and displays a success toast after a debounce period.

**Source**: `src/hooks/useAutoSaveIndicator.ts:6-40`

**Rationale**: Users need visual confirmation that their work is being saved without intrusive notifications on every keystroke.

**Priority**: High

#### Scenario: Show toast after debounce period

**GIVEN** the unit store's `lastModifiedAt` timestamp changes
**WHEN** 500ms elapse without further changes
**THEN** a success toast SHALL be displayed with message "Saved", variant "success", and duration 1500ms

#### Scenario: Debounce rapid changes

**GIVEN** the unit store's `lastModifiedAt` timestamp changes multiple times within 500ms
**WHEN** the debounce timer is active
**THEN** the previous timer SHALL be cleared and a new 500ms timer SHALL start
**AND** only one toast SHALL be shown after the final change

#### Scenario: Cleanup on unmount

**GIVEN** the hook is mounted and subscribed to the unit store
**WHEN** the component unmounts
**THEN** the store subscription SHALL be unsubscribed
**AND** any active debounce timer SHALL be cleared

### Requirement: Persisted State Hook

The system SHALL provide a `usePersistedState` hook that synchronizes React state with localStorage using JSON serialization.

**Source**: `src/hooks/usePersistedState.ts:19-66`

**Rationale**: UI preferences (sidebar collapse, panel expansion) should persist across sessions without requiring a database.

**Priority**: High

#### Scenario: Load from localStorage on mount

**GIVEN** a value exists in localStorage for the specified key
**WHEN** the hook initializes
**THEN** the state SHALL be set to the parsed JSON value from localStorage

#### Scenario: Use default value when no stored data

**GIVEN** no value exists in localStorage for the specified key
**WHEN** the hook initializes
**THEN** the state SHALL be set to the provided default value

#### Scenario: Persist to localStorage on state change

**GIVEN** the state value changes
**WHEN** the hook is initialized (isInitialized = true)
**THEN** the new value SHALL be serialized to JSON and written to localStorage

#### Scenario: Support functional updates

**GIVEN** the setter is called with a function `(prev) => newValue`
**WHEN** the function is executed
**THEN** the previous state SHALL be passed to the function
**AND** the resolved value SHALL be set as the new state

#### Scenario: Handle localStorage read errors

**GIVEN** localStorage.getItem() throws an error (e.g., quota exceeded, disabled)
**WHEN** the hook attempts to read from localStorage
**THEN** a warning SHALL be logged via `logger.warn()`
**AND** the default value SHALL be used

#### Scenario: Handle localStorage write errors

**GIVEN** localStorage.setItem() throws an error (e.g., quota exceeded)
**WHEN** the hook attempts to write to localStorage
**THEN** a warning SHALL be logged via `logger.warn()`
**AND** the state SHALL remain updated in memory

### Requirement: Storage Keys

The system SHALL provide a `STORAGE_KEYS` constant object with predefined localStorage keys for UI preferences.

**Source**: `src/hooks/usePersistedState.ts:71-78`

**Rationale**: Centralized key management prevents typos and ensures consistent naming conventions.

**Priority**: Medium

#### Scenario: Sidebar collapsed state key

**GIVEN** the application needs to persist sidebar collapsed state
**WHEN** accessing `STORAGE_KEYS.SIDEBAR_COLLAPSED`
**THEN** the value SHALL be `'mekstation:sidebar-collapsed'`

#### Scenario: Loadout tray expanded state key

**GIVEN** the application needs to persist loadout tray expanded state (desktop)
**WHEN** accessing `STORAGE_KEYS.LOADOUT_TRAY_EXPANDED`
**THEN** the value SHALL be `'mekstation:loadout-tray-expanded'`

#### Scenario: Loadout sheet expanded state key

**GIVEN** the application needs to persist loadout bottom sheet expanded state (mobile)
**WHEN** accessing `STORAGE_KEYS.LOADOUT_SHEET_EXPANDED`
**THEN** the value SHALL be `'mekstation:loadout-sheet-expanded'`

### Requirement: Game State Persistence Hook

The system SHALL provide a `useGameStatePersistence` hook that autosaves game state to localStorage with configurable intervals, debouncing, conflict detection, and unsaved change warnings.

**Source**: `src/hooks/useGameStatePersistence.ts:118-340`

**Rationale**: Game sessions can be long and complex; autosave prevents data loss from browser crashes or accidental tab closures.

**Priority**: Critical

#### Scenario: Autosave after debounce period

**GIVEN** the game state changes and `enableAutosave` is true
**WHEN** 1000ms (default debounce) elapse without further changes
**THEN** the state SHALL be saved to localStorage with metadata

#### Scenario: Periodic autosave

**GIVEN** the game state has unsaved changes and `enableAutosave` is true
**WHEN** 30000ms (default interval) elapse
**THEN** the state SHALL be saved to localStorage with metadata

#### Scenario: Manual save

**GIVEN** the game state is not null
**WHEN** the `save()` function is called
**THEN** the state SHALL be saved to localStorage with metadata
**AND** `isSaving` SHALL be true during the save operation
**AND** `hasUnsavedChanges` SHALL be set to false after save completes
**AND** `lastSaved` SHALL be updated to the current timestamp

#### Scenario: Load state on mount

**GIVEN** the hook initializes
**WHEN** the component mounts
**THEN** the `load()` function SHALL be called automatically
**AND** if stored data exists, the state SHALL be restored
**AND** if no stored data exists, the state SHALL be null

#### Scenario: Conflict detection on save

**GIVEN** the hook has loaded state with timestamp T1
**WHEN** the `save()` function is called
**AND** localStorage contains data with timestamp T2 > T1
**THEN** an error SHALL be thrown with message "Save conflict: Local storage has newer data than current state"
**AND** `error` SHALL be set to the conflict error
**AND** the save operation SHALL be aborted

#### Scenario: Beforeunload warning for unsaved changes

**GIVEN** the game state has unsaved changes (`hasUnsavedChanges` is true)
**WHEN** the user attempts to close the tab or navigate away
**THEN** a beforeunload event handler SHALL be registered
**AND** the browser SHALL display a confirmation dialog with message "You have unsaved changes. Are you sure you want to leave?"

#### Scenario: Clear saved data

**GIVEN** saved data exists in localStorage
**WHEN** the `clear()` function is called
**THEN** the data SHALL be removed from localStorage
**AND** the state SHALL be set to null
**AND** `lastSaved` SHALL be set to null
**AND** `hasUnsavedChanges` SHALL be set to false

#### Scenario: Update state with autosave trigger

**GIVEN** `enableAutosave` is true
**WHEN** the `setState()` function is called with new state
**THEN** the state SHALL be updated
**AND** `hasUnsavedChanges` SHALL be set to true
**AND** the debounce timer SHALL start

### Requirement: Save Metadata

The system SHALL store metadata alongside game state to enable versioning and conflict detection.

**Source**: `src/hooks/useGameStatePersistence.ts:22-38`

**Rationale**: Metadata enables conflict detection, schema migration, and debugging.

**Priority**: High

#### Scenario: Save with metadata

**GIVEN** the `save()` function is called
**WHEN** the state is serialized to localStorage
**THEN** the stored data SHALL include a `metadata` object with:

- `timestamp`: current timestamp (Date.now())
- `version`: schema version string (default: '1.0.0')

#### Scenario: Internal timestamp for conflict detection

**GIVEN** the `save()` function is called
**WHEN** the state is serialized to localStorage
**THEN** the stored state SHALL include an internal `_lastSaved` timestamp
**AND** this timestamp SHALL be used for conflict detection on subsequent saves

---

## Data Model Requirements

### Required Interfaces

The implementation MUST provide the following TypeScript interfaces:

```typescript
/**
 * Game state for persistence
 * Stores the current unit and editor state
 */
interface GameState {
  /**
   * Currently active unit being edited
   */
  readonly currentUnit?: IBattleMech;

  /**
   * List of recently edited units (references by ID)
   */
  readonly recentUnitIds?: string[];

  /**
   * Editor UI state that should be preserved
   */
  readonly editorState?: {
    readonly activeTab?: string;
    readonly selectedLocation?: string;
    readonly panelState?: Record<string, boolean>;
  };
}

/**
 * Save metadata for versioning and conflict detection
 */
interface SaveMetadata {
  /**
   * Timestamp when the save occurred
   */
  readonly timestamp: number;

  /**
   * Schema version for migration support
   */
  readonly version: string;
}

/**
 * Complete stored data structure
 */
interface StoredData {
  /**
   * Game state with internal metadata
   */
  readonly state: GameState & { _lastSaved?: number };

  /**
   * Save metadata
   */
  readonly metadata: SaveMetadata;
}

/**
 * Options for useGameStatePersistence hook
 */
interface UseGameStatePersistenceOptions {
  /**
   * Key to use for localStorage
   */
  readonly storageKey: string;

  /**
   * Autosave interval in milliseconds (default: 30000 = 30 seconds)
   */
  readonly autosaveInterval?: number;

  /**
   * Debounce delay in milliseconds before autosave after state change (default: 1000)
   */
  readonly autosaveDebounce?: number;

  /**
   * Enable/disable autosave (default: true)
   */
  readonly enableAutosave?: boolean;

  /**
   * Version of the game state schema (for migration)
   */
  readonly version?: string;
}

/**
 * Return value from useGameStatePersistence hook
 */
interface UseGameStatePersistenceReturn {
  /**
   * Current game state
   */
  readonly state: GameState | null;

  /**
   * Whether state is currently being saved
   */
  readonly isSaving: boolean;

  /**
   * Whether there are unsaved changes
   */
  readonly hasUnsavedChanges: boolean;

  /**
   * Last saved timestamp (null if never saved)
   */
  readonly lastSaved: Date | null;

  /**
   * Error from last save/load operation (null if no error)
   */
  readonly error: Error | null;

  /**
   * Save state manually
   */
  readonly save: () => Promise<void>;

  /**
   * Load state from storage
   */
  readonly load: () => Promise<void>;

  /**
   * Clear all saved data
   */
  readonly clear: () => void;

  /**
   * Update game state (triggers autosave if enabled)
   */
  readonly setState: (state: GameState) => void;
}
```

### Required Constants

The implementation MUST provide the following constants:

```typescript
/**
 * Storage keys for MekStation UI preferences
 */
const STORAGE_KEYS = {
  /** Main navigation sidebar collapsed state */
  SIDEBAR_COLLAPSED: 'mekstation:sidebar-collapsed',
  /** Equipment loadout tray expanded state (desktop) */
  LOADOUT_TRAY_EXPANDED: 'mekstation:loadout-tray-expanded',
  /** Equipment loadout bottom sheet expanded (mobile) */
  LOADOUT_SHEET_EXPANDED: 'mekstation:loadout-sheet-expanded',
} as const;

/**
 * Default autosave interval (30 seconds)
 */
const DEFAULT_AUTOSAVE_INTERVAL = 30000;

/**
 * Default autosave debounce delay (1 second)
 */
const DEFAULT_AUTOSAVE_DEBOUNCE = 1000;

/**
 * Default schema version
 */
const DEFAULT_VERSION = '1.0.0';
```

### Type Constraints

- `storageKey` MUST be a non-empty string
- `autosaveInterval` MUST be a positive number (if provided)
- `autosaveDebounce` MUST be a positive number (if provided)
- `version` MUST follow semantic versioning format (if provided)
- `GameState` MAY be null (no active game session)
- `_lastSaved` MUST NOT be exposed in the public API (internal use only)

---

## Dependencies

### Depends On

- **toast-notifications**: `useToast` hook for displaying save feedback
- **unit-services**: `useUnitStoreApi` for subscribing to unit store changes
- **logger**: `logger.warn()` for logging localStorage errors

### Used By

- **unit-builder**: Uses `useAutoSaveIndicator` to show save feedback
- **game-session-management**: Uses `useGameStatePersistence` for session autosave
- **app-navigation**: Uses `usePersistedState` for sidebar and panel state
- **equipment-browser**: Uses `usePersistedState` for loadout tray/sheet state

---

## Implementation Notes

### Performance Considerations

- **Debouncing**: Auto-save indicator debounces for 500ms to avoid toast spam during rapid edits
- **Autosave debouncing**: Game state autosave debounces for 1000ms to reduce localStorage writes
- **Periodic autosave**: Game state autosave runs every 30 seconds (configurable) as a safety net
- **JSON serialization**: All persisted state uses JSON.stringify/parse, which can be slow for large objects
- **localStorage quota**: Browser localStorage is typically limited to 5-10MB; large game states may exceed this

### Edge Cases

- **SSR/SSG**: `usePersistedState` checks `typeof window === 'undefined'` to avoid errors during server-side rendering
- **localStorage disabled**: All hooks handle localStorage errors gracefully by logging warnings and falling back to in-memory state
- **Quota exceeded**: Write errors are logged but do not crash the application
- **Concurrent saves**: `useGameStatePersistence` detects conflicts by comparing timestamps and throws an error to prevent data loss
- **Unmount during save**: Cleanup functions clear timers and unsubscribe from stores to prevent memory leaks

### Common Pitfalls

- **Pitfall**: Forgetting to initialize `usePersistedState` before first render
  - **Solution**: Hook uses `isInitialized` flag to prevent writing default value to localStorage before reading existing value

- **Pitfall**: Storing non-serializable data (functions, circular references) in persisted state
  - **Solution**: JSON.stringify will throw an error; use only plain objects, arrays, strings, numbers, booleans, and null

- **Pitfall**: Using `useAutoSaveIndicator` without `ToastProvider` in the component tree
  - **Solution**: Ensure `ToastProvider` wraps the component using the hook

- **Pitfall**: Conflict detection false positives when multiple tabs are open
  - **Solution**: Current implementation does not support multi-tab synchronization; consider using BroadcastChannel or storage events for cross-tab sync

---

## Examples

### Example 1: Auto-Save Indicator

**Usage**:

```typescript
import { useAutoSaveIndicator } from '@/hooks/useAutoSaveIndicator';

function UnitBuilder() {
  // Subscribe to unit store changes and show save toast
  useAutoSaveIndicator();

  return <div>Unit Builder UI</div>;
}
```

**Behavior**:

1. User edits unit (e.g., changes armor allocation)
2. Unit store's `lastModifiedAt` timestamp updates
3. Hook detects change and starts 500ms debounce timer
4. If no further changes occur within 500ms, toast is shown: "Saved" (success, 1500ms duration)
5. If user makes another change within 500ms, timer resets

### Example 2: Persisted State for Sidebar

**Usage**:

```typescript
import { usePersistedState, STORAGE_KEYS } from '@/hooks/usePersistedState';

function Sidebar() {
  const [isCollapsed, setIsCollapsed] = usePersistedState(
    STORAGE_KEYS.SIDEBAR_COLLAPSED,
    false // default: expanded
  );

  return (
    <aside className={isCollapsed ? 'w-16' : 'w-64'}>
      <button onClick={() => setIsCollapsed(!isCollapsed)}>
        Toggle
      </button>
    </aside>
  );
}
```

**Behavior**:

1. On mount, hook reads `localStorage.getItem('mekstation:sidebar-collapsed')`
2. If value exists, state is set to parsed JSON value (true/false)
3. If no value exists, state is set to default (false)
4. When user clicks toggle, `setIsCollapsed` updates state and writes to localStorage
5. On next page load, sidebar restores previous collapsed state

### Example 3: Game State Persistence

**Usage**:

```typescript
import { useGameStatePersistence } from '@/hooks/useGameStatePersistence';

function GameSession() {
  const {
    state,
    isSaving,
    hasUnsavedChanges,
    lastSaved,
    error,
    save,
    load,
    clear,
    setState,
  } = useGameStatePersistence({
    storageKey: 'mekstation-game-session',
    autosaveInterval: 30000, // 30 seconds
    autosaveDebounce: 1000,  // 1 second
    enableAutosave: true,
    version: '1.0.0',
  });

  const handleUnitChange = (unit: IBattleMech) => {
    setState({
      ...state,
      currentUnit: unit,
    });
  };

  return (
    <div>
      {hasUnsavedChanges && <span>Unsaved changes</span>}
      {lastSaved && <span>Last saved: {lastSaved.toLocaleTimeString()}</span>}
      {error && <span>Error: {error.message}</span>}
      <button onClick={save} disabled={isSaving}>
        Save Now
      </button>
      <button onClick={clear}>Clear Save</button>
    </div>
  );
}
```

**Behavior**:

1. On mount, hook calls `load()` and restores state from localStorage (if exists)
2. User edits unit, triggering `handleUnitChange`
3. `setState` updates state and sets `hasUnsavedChanges = true`
4. Debounce timer starts (1000ms)
5. If no further changes within 1000ms, autosave triggers
6. State is saved to localStorage with metadata (timestamp, version)
7. `hasUnsavedChanges` is set to false, `lastSaved` is updated
8. If user tries to close tab with unsaved changes, browser shows confirmation dialog
9. Periodic autosave runs every 30 seconds as a safety net

---

## References

### Related Documentation

- `src/hooks/useAutoSaveIndicator.ts` - Auto-save indicator implementation
- `src/hooks/usePersistedState.ts` - Persisted state hook implementation
- `src/hooks/useGameStatePersistence.ts` - Game state persistence hook implementation
- `openspec/specs/toast-notifications/spec.md` - Toast notification system
- `openspec/specs/unit-services/spec.md` - Unit store architecture

---

## Changelog

### Version 1.0 (2026-02-13)

- Initial specification
- Documented `useAutoSaveIndicator` hook (500ms debounce, success toast)
- Documented `usePersistedState` hook (localStorage, JSON serialization, functional updates)
- Documented `useGameStatePersistence` hook (30s interval, 1s debounce, conflict detection, beforeunload warning)
- Documented `STORAGE_KEYS` constant (3 UI preference keys)
- Documented data models: GameState, SaveMetadata, StoredData, UseGameStatePersistenceOptions, UseGameStatePersistenceReturn
