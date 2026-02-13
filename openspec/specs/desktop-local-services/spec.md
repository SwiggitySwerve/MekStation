# desktop-local-services Specification

## Purpose

Defines the desktop application's local services layer for Electron-based integration, including IPC communication, file system access, local storage management, and desktop-specific feature detection. Provides a secure bridge between the renderer process (web UI) and main process (Node.js) while maintaining web compatibility.

## Requirements

### Requirement: Desktop Environment Detection

The system SHALL provide reliable detection of desktop vs web execution context.

**Rationale**: Components need to conditionally enable desktop-only features and gracefully degrade in web environments.

**Priority**: Critical

#### Scenario: Detect Electron environment

- **GIVEN** the application is running in Electron
- **WHEN** `isElectron()` is called
- **THEN** return `true`
- **AND** `window.electronAPI` SHALL be defined

#### Scenario: Detect web browser environment

- **GIVEN** the application is running in a web browser
- **WHEN** `isElectron()` is called
- **THEN** return `false`
- **AND** `window.electronAPI` SHALL be `undefined`

#### Scenario: Access Electron API safely

- **GIVEN** the application may run in web or desktop mode
- **WHEN** `useElectron()` hook is called
- **THEN** return `IElectronAPI` instance if in Electron
- **AND** return `null` if in web browser
- **AND** NOT throw errors in either environment

---

### Requirement: IPC Communication Bridge

The system SHALL provide type-safe IPC communication between renderer and main processes using contextBridge.

**Rationale**: Electron's context isolation requires explicit API exposure for security.

**Priority**: Critical

#### Scenario: Expose API via context bridge

- **GIVEN** the preload script is loading
- **WHEN** `contextBridge.exposeInMainWorld('electronAPI', electronAPI)` is called
- **THEN** the API SHALL be available as `window.electronAPI`
- **AND** Node.js globals (process, Buffer, global) SHALL be removed from window
- **AND** context isolation SHALL remain enabled

#### Scenario: Invoke IPC command

- **GIVEN** the renderer needs to call a main process function
- **WHEN** `window.electronAPI.methodName(args)` is called
- **THEN** the preload script SHALL invoke `ipcRenderer.invoke(channel, args)`
- **AND** return a Promise with the result
- **AND** handle errors with rejected Promise

#### Scenario: Subscribe to IPC events

- **GIVEN** the renderer needs to listen for main process events
- **WHEN** `window.electronAPI.onEventName(callback)` is called
- **THEN** the preload script SHALL register `ipcRenderer.on(channel, callback)`
- **AND** invoke callback with event data when received
- **AND** provide `removeAllListeners(channel)` for cleanup

---

### Requirement: File System Access

The system SHALL provide secure file system operations through IPC with native dialogs.

**Rationale**: Renderer process cannot access Node.js fs module directly due to security.

**Priority**: Critical

#### Scenario: Save file with dialog

- **GIVEN** the user wants to save a unit file
- **WHEN** `electronAPI.saveFile(defaultPath, filters)` is called
- **THEN** display native save dialog with filters
- **AND** return `{ canceled: boolean, filePath?: string }`
- **AND** NOT write file contents (caller handles write)

#### Scenario: Open file with dialog

- **GIVEN** the user wants to open a unit file
- **WHEN** `electronAPI.openFile(filters)` is called
- **THEN** display native open dialog with filters
- **AND** return `{ canceled: boolean, filePaths: string[] }`
- **AND** support multi-select if configured

#### Scenario: Read file contents

- **GIVEN** a valid file path
- **WHEN** `electronAPI.readFile(filePath)` is called
- **THEN** read file contents from disk
- **AND** return `{ success: true, data: string }` on success
- **AND** return `{ success: false, error: string }` on failure
- **AND** handle encoding as UTF-8

#### Scenario: Write file contents

- **GIVEN** a valid file path and data
- **WHEN** `electronAPI.writeFile(filePath, data)` is called
- **THEN** write data to disk as UTF-8
- **AND** return `{ success: true }` on success
- **AND** return `{ success: false, error: string }` on failure
- **AND** create parent directories if needed

#### Scenario: Select directory

- **GIVEN** the user needs to choose a directory
- **WHEN** `electronAPI.selectDirectory()` is called
- **THEN** display native directory picker
- **AND** return `{ canceled: boolean, filePaths: string[] }`
- **AND** filePaths[0] contains selected directory path

---

### Requirement: Desktop Settings Service

The system SHALL provide persistent desktop application settings with IPC access.

**Rationale**: Desktop-specific preferences (window state, backups, updates) need storage and synchronization.

**Priority**: High

#### Scenario: Get all settings

- **GIVEN** the application has initialized
- **WHEN** `electronAPI.getSettings()` is called
- **THEN** return `IDesktopSettings` object with all preferences
- **AND** merge saved settings with defaults for missing keys
- **AND** return `null` if settings file doesn't exist

#### Scenario: Update settings

- **GIVEN** the user changes a setting
- **WHEN** `electronAPI.setSettings(updates)` is called with partial settings
- **THEN** merge updates with existing settings
- **AND** persist to disk
- **AND** return `{ success: true }` on success
- **AND** emit `settings:on-change` event for each changed key

#### Scenario: Reset settings to defaults

- **GIVEN** the user requests settings reset
- **WHEN** `electronAPI.resetSettings()` is called
- **THEN** restore all settings to `DEFAULT_DESKTOP_SETTINGS`
- **AND** persist defaults to disk
- **AND** return `{ success: true }`
- **AND** emit `settings:on-change` events for all keys

#### Scenario: Get single setting value

- **GIVEN** a valid settings key
- **WHEN** `electronAPI.getSettingValue(key)` is called
- **THEN** return the current value for that key
- **AND** return `null` if key doesn't exist
- **AND** preserve type safety with generic `<K extends keyof IDesktopSettings>`

#### Scenario: Listen for settings changes

- **GIVEN** the renderer needs to react to settings changes
- **WHEN** `electronAPI.onSettingsChange(callback)` is called
- **THEN** register callback for `settings:on-change` events
- **AND** invoke callback with `{ key, oldValue, newValue }` on changes
- **AND** allow cleanup via `removeAllListeners('settings:on-change')`

---

### Requirement: Recent Files Service

The system SHALL maintain a persistent list of recently opened units with metadata.

**Rationale**: Users need quick access to recently edited units from File menu and startup.

**Priority**: High

#### Scenario: Get recent files list

- **GIVEN** the application has tracked recent files
- **WHEN** `electronAPI.getRecentFiles()` is called
- **THEN** return `readonly IRecentFile[]` ordered by most recent first
- **AND** limit to `maxRecentFiles` setting
- **AND** return empty array if no recent files

#### Scenario: Add recent file

- **GIVEN** a unit is successfully opened
- **WHEN** `electronAPI.addRecentFile(params)` is called with `{ id, name, path, unitType, tonnage?, variant? }`
- **THEN** add entry to recent files list
- **AND** update `lastOpened` timestamp to current time
- **AND** move to top if already in list
- **AND** enforce `maxRecentFiles` limit by removing oldest
- **AND** emit `recent-files:on-update` event

#### Scenario: Remove recent file

- **GIVEN** a recent file entry exists
- **WHEN** `electronAPI.removeRecentFile(id)` is called
- **THEN** remove entry from list
- **AND** persist updated list to disk
- **AND** return `{ success: true }`
- **AND** emit `recent-files:on-update` event

#### Scenario: Clear all recent files

- **GIVEN** recent files list is not empty
- **WHEN** `electronAPI.clearRecentFiles()` is called
- **THEN** remove all entries
- **AND** persist empty list to disk
- **AND** return `{ success: true }`
- **AND** emit `recent-files:on-update` event

#### Scenario: Listen for recent files updates

- **GIVEN** the renderer needs to display recent files
- **WHEN** `electronAPI.onRecentFilesUpdate(callback)` is called
- **THEN** register callback for `recent-files:on-update` events
- **AND** invoke callback with updated `readonly IRecentFile[]` on changes
- **AND** allow cleanup via `removeAllListeners('recent-files:on-update')`

---

### Requirement: Window Operations

The system SHALL provide window control operations for desktop chrome.

**Rationale**: Custom title bar requires programmatic window controls.

**Priority**: Medium

#### Scenario: Minimize window

- **GIVEN** the application window is visible
- **WHEN** `electronAPI.minimizeWindow()` is called
- **THEN** minimize window to taskbar
- **AND** return resolved Promise

#### Scenario: Maximize window

- **GIVEN** the application window is not maximized
- **WHEN** `electronAPI.maximizeWindow()` is called
- **THEN** maximize window to fill screen
- **AND** return resolved Promise

#### Scenario: Restore maximized window

- **GIVEN** the application window is maximized
- **WHEN** `electronAPI.maximizeWindow()` is called
- **THEN** restore window to previous size
- **AND** return resolved Promise

#### Scenario: Close window

- **GIVEN** the application window is open
- **WHEN** `electronAPI.closeWindow()` is called
- **THEN** trigger window close event
- **AND** save window state if `rememberWindowState` is enabled
- **AND** quit application if last window

---

### Requirement: Application Info

The system SHALL provide application metadata for display and diagnostics.

**Rationale**: About dialog and diagnostics need version, platform, and environment info.

**Priority**: Low

#### Scenario: Get application info

- **GIVEN** the application is running
- **WHEN** `electronAPI.getAppInfo()` is called
- **THEN** return `{ version, platform, userDataPath, developmentMode }`
- **AND** version matches package.json version
- **AND** platform is 'win32', 'darwin', or 'linux'
- **AND** userDataPath is Electron's app.getPath('userData')
- **AND** developmentMode is `true` if NODE_ENV === 'development'

---

### Requirement: Menu State Synchronization

The system SHALL synchronize application state with native menu items.

**Rationale**: Menu items (Undo, Redo, Save) need to enable/disable based on app state.

**Priority**: Medium

#### Scenario: Update menu state

- **GIVEN** the application state changes
- **WHEN** `electronAPI.updateMenuState({ canUndo, canRedo, hasUnit, hasSelection })` is called
- **THEN** send state to main process via `menu:update-state` channel
- **AND** main process SHALL update menu item enabled states
- **AND** NOT wait for response (fire-and-forget)

#### Scenario: Listen for menu commands

- **GIVEN** the renderer needs to handle menu actions
- **WHEN** `electronAPI.onMenuCommand(callback)` is called
- **THEN** register callback for `menu:command` events
- **AND** invoke callback with `MenuCommand` string on menu selection
- **AND** support commands: 'file:new', 'file:save', 'edit:undo', 'edit:redo', etc.

---

### Requirement: Backup Operations

The system SHALL provide backup creation and restoration through IPC.

**Rationale**: Users need to manually trigger backups and restore from backup files.

**Priority**: Medium

#### Scenario: Create backup

- **GIVEN** the user requests a manual backup
- **WHEN** `electronAPI.createBackup()` is called
- **THEN** invoke BackupService to create backup
- **AND** return `true` on success
- **AND** return `false` on failure
- **AND** backup file SHALL be saved to configured backup directory

#### Scenario: Restore from backup

- **GIVEN** a valid backup file path
- **WHEN** `electronAPI.restoreBackup(backupPath)` is called
- **THEN** invoke BackupService to restore from backup
- **AND** return `true` on success
- **AND** return `false` on failure
- **AND** reload application state after successful restore

---

### Requirement: Event Listeners

The system SHALL provide event subscription for main process notifications.

**Rationale**: Main process needs to notify renderer of auto-save, menu actions, and file imports.

**Priority**: Medium

#### Scenario: Auto-save trigger

- **GIVEN** auto-save interval has elapsed
- **WHEN** main process emits 'auto-save-trigger' event
- **THEN** invoke registered callback via `onAutoSaveTrigger(callback)`
- **AND** renderer SHALL save current unit

#### Scenario: Import unit from file

- **GIVEN** user drags .mtf file onto application
- **WHEN** main process emits 'import-unit-file' event with filePath
- **THEN** invoke registered callback via `onImportUnitFile(callback)`
- **AND** renderer SHALL load unit from filePath

#### Scenario: Import unit from URL

- **GIVEN** user opens mekstation:// URL
- **WHEN** main process emits 'import-unit-url' event with url
- **THEN** invoke registered callback via `onImportUnitUrl(callback)`
- **AND** renderer SHALL fetch and load unit from url

#### Scenario: Open unit from recent files

- **GIVEN** user selects recent file from menu
- **WHEN** main process emits 'open-unit' event with unitId
- **THEN** invoke registered callback via `onOpenUnit(callback)`
- **AND** renderer SHALL load unit by ID

#### Scenario: Create new unit

- **GIVEN** user selects File > New from menu
- **WHEN** main process emits 'create-new-unit' event
- **THEN** invoke registered callback via `onCreateNewUnit(callback)`
- **AND** renderer SHALL navigate to unit builder

#### Scenario: Open settings

- **GIVEN** user selects Preferences from menu
- **WHEN** main process emits 'app:open-settings' event
- **THEN** invoke registered callback via `onOpenSettings(callback)`
- **AND** renderer SHALL open settings dialog

---

### Requirement: Development Mode API

The system SHALL provide development utilities in development builds only.

**Rationale**: Developers need access to DevTools and reload during development.

**Priority**: Low

#### Scenario: Open DevTools

- **GIVEN** NODE_ENV === 'development'
- **WHEN** `window.electronDevAPI.openDevTools()` is called
- **THEN** open Chrome DevTools for current window
- **AND** NOT available in production builds

#### Scenario: Reload window

- **GIVEN** NODE_ENV === 'development'
- **WHEN** `window.electronDevAPI.reloadWindow()` is called
- **THEN** reload renderer process
- **AND** NOT available in production builds

#### Scenario: Get environment

- **GIVEN** NODE_ENV === 'development'
- **WHEN** `window.electronDevAPI.getEnvironment()` is called
- **THEN** return 'development' or 'production'
- **AND** NOT available in production builds

---

### Requirement: Security Hardening

The system SHALL enforce security best practices for Electron IPC.

**Rationale**: Prevent XSS and code injection attacks in renderer process.

**Priority**: Critical

#### Scenario: Context isolation enabled

- **GIVEN** the BrowserWindow is created
- **WHEN** webPreferences are configured
- **THEN** `contextIsolation` SHALL be `true`
- **AND** `nodeIntegration` SHALL be `false`
- **AND** `sandbox` SHOULD be `true` (if compatible)

#### Scenario: Remove Node.js globals

- **GIVEN** the preload script is executing
- **WHEN** window object is accessed
- **THEN** `window.global` SHALL be deleted
- **AND** `window.process` SHALL be deleted
- **AND** `window.Buffer` SHALL be deleted
- **AND** prevent access to Node.js APIs from renderer

#### Scenario: Validate IPC channels

- **GIVEN** an IPC message is received
- **WHEN** the main process handles the message
- **THEN** validate channel name against allowed list
- **AND** validate argument types and structure
- **AND** reject invalid or malicious requests

---

## Data Model Requirements

### IElectronAPI Interface

```typescript
interface IElectronAPI {
  // Application info
  getAppInfo(): Promise<IAppInfo>;

  // Window operations
  minimizeWindow(): Promise<void>;
  maximizeWindow(): Promise<void>;
  closeWindow(): Promise<void>;

  // File operations
  saveFile(
    defaultPath: string,
    filters: IFileFilter[],
  ): Promise<ISaveDialogResult>;
  openFile(filters: IFileFilter[]): Promise<IOpenDialogResult>;
  readFile(filePath: string): Promise<IFileResult>;
  writeFile(filePath: string, data: string): Promise<IFileResult>;
  selectDirectory(): Promise<IOpenDialogResult>;

  // Settings operations
  getSettings(): Promise<IDesktopSettings | null>;
  setSettings(updates: Partial<IDesktopSettings>): Promise<IServiceResult>;
  resetSettings(): Promise<IServiceResult>;
  getSettingValue<K extends keyof IDesktopSettings>(
    key: K,
  ): Promise<IDesktopSettings[K] | null>;
  onSettingsChange(callback: (event: ISettingsChangeEvent) => void): void;

  // Recent files operations
  getRecentFiles(): Promise<readonly IRecentFile[]>;
  addRecentFile(params: IAddRecentFileParams): Promise<IServiceResult>;
  removeRecentFile(id: string): Promise<IServiceResult>;
  clearRecentFiles(): Promise<IServiceResult>;
  onRecentFilesUpdate(callback: (files: readonly IRecentFile[]) => void): void;

  // Menu operations
  updateMenuState(state: {
    canUndo?: boolean;
    canRedo?: boolean;
    hasUnit?: boolean;
    hasSelection?: boolean;
  }): void;
  onMenuCommand(callback: (command: MenuCommand) => void): void;

  // Service operations
  serviceCall(method: string, ...args: unknown[]): Promise<IServiceResult>;

  // Backup operations
  createBackup(): Promise<boolean>;
  restoreBackup(backupPath: string): Promise<boolean>;

  // Event listeners
  onAutoSaveTrigger(callback: () => void): void;
  onImportUnitFile(callback: (filePath: string) => void): void;
  onImportUnitUrl(callback: (url: string) => void): void;
  onOpenUnit(callback: (unitId: string) => void): void;
  onCreateNewUnit(callback: () => void): void;
  onOpenSettings(callback: () => void): void;

  // Cleanup
  removeAllListeners(channel: string): void;
}
```

### Supporting Types

```typescript
interface IAppInfo {
  version: string;
  platform: string;
  userDataPath: string;
  developmentMode: boolean;
}

interface IFileFilter {
  name: string;
  extensions: string[];
}

interface ISaveDialogResult {
  canceled: boolean;
  filePath?: string;
}

interface IOpenDialogResult {
  canceled: boolean;
  filePaths: string[];
}

interface IFileResult {
  success: boolean;
  data?: string;
  error?: string;
}

interface IServiceResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

interface IDesktopSettings {
  version: number;
  launchAtLogin: boolean;
  startMinimized: boolean;
  reopenLastUnit: boolean;
  defaultSaveDirectory: string;
  rememberWindowState: boolean;
  windowBounds: IWindowBounds;
  enableAutoBackup: boolean;
  backupIntervalMinutes: number;
  maxBackupCount: number;
  backupDirectory: string;
  checkForUpdatesAutomatically: boolean;
  updateChannel: UpdateChannel;
  maxRecentFiles: number;
  dataDirectory: string;
  enableDevTools: boolean;
}

interface IWindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

type UpdateChannel = 'stable' | 'beta';

interface IRecentFile {
  id: string;
  name: string;
  path: string;
  lastOpened: string; // ISO date string
  unitType: UnitType;
  tonnage?: number;
  variant?: string;
}

interface IAddRecentFileParams {
  id: string;
  name: string;
  path: string;
  unitType: UnitType;
  tonnage?: number;
  variant?: string;
}

type UnitType =
  | 'BattleMech'
  | 'Vehicle'
  | 'Infantry'
  | 'ProtoMech'
  | 'Aerospace'
  | 'Unknown';

interface ISettingsChangeEvent {
  key: keyof IDesktopSettings;
  oldValue: unknown;
  newValue: unknown;
}

type MenuCommand =
  | 'file:new'
  | 'file:open'
  | 'file:save'
  | 'file:save-as'
  | 'file:import'
  | 'file:export'
  | 'file:print'
  | 'file:preferences'
  | 'file:quit'
  | 'edit:undo'
  | 'edit:redo'
  | 'edit:cut'
  | 'edit:copy'
  | 'edit:paste'
  | 'edit:select-all'
  | 'view:zoom-in'
  | 'view:zoom-out'
  | 'view:zoom-reset'
  | 'view:fullscreen'
  | 'view:dev-tools'
  | 'unit:new'
  | 'unit:duplicate'
  | 'unit:delete'
  | 'unit:properties'
  | 'help:about'
  | 'help:check-updates'
  | 'help:documentation'
  | 'help:report-issue';
```

### IPC Channel Constants

```typescript
const SETTINGS_IPC_CHANNELS = {
  GET: 'settings:get',
  SET: 'settings:set',
  RESET: 'settings:reset',
  GET_VALUE: 'settings:get-value',
  ON_CHANGE: 'settings:on-change',
} as const;

const RECENT_FILES_IPC_CHANNELS = {
  LIST: 'recent-files:list',
  ADD: 'recent-files:add',
  REMOVE: 'recent-files:remove',
  CLEAR: 'recent-files:clear',
  ON_UPDATE: 'recent-files:on-update',
} as const;

const MENU_IPC_CHANNELS = {
  COMMAND: 'menu:command',
  UPDATE_RECENT: 'menu:update-recent',
  UPDATE_STATE: 'menu:update-state',
} as const;

const APP_IPC_CHANNELS = {
  OPEN_SETTINGS: 'app:open-settings',
  SHOW_ABOUT: 'app:show-about',
  GET_INFO: 'app:get-info',
} as const;
```

---

## Validation Rules

### Desktop Detection

- `isElectron()` MUST return boolean
- `isElectron()` MUST NOT throw errors
- `useElectron()` MUST return `IElectronAPI | null`
- `useElectron()` MUST NOT throw errors in web environment

### IPC Communication

- All IPC methods MUST return Promises
- IPC channels MUST use namespaced constants (e.g., 'settings:get')
- Event listeners MUST provide cleanup via `removeAllListeners(channel)`
- IPC arguments MUST be JSON-serializable (no functions, circular refs)

### File Operations

- File paths MUST be absolute paths
- File filters MUST include at least one extension
- Read/write operations MUST handle encoding as UTF-8
- File operations MUST return `{ success, data?, error? }` structure

### Settings Management

- Settings updates MUST be partial (Partial<IDesktopSettings>)
- Settings MUST merge with defaults for missing keys
- Settings changes MUST emit `settings:on-change` events
- Settings MUST persist to disk on every change

### Recent Files

- Recent files list MUST be ordered by `lastOpened` descending
- Recent files MUST enforce `maxRecentFiles` limit
- `lastOpened` MUST be ISO 8601 date string
- Recent files MUST emit `recent-files:on-update` on changes

### Security

- Context isolation MUST be enabled
- Node integration MUST be disabled
- Node.js globals MUST be removed from window
- IPC channels MUST be validated against allowed list

---

## Implementation Notes

### Performance Considerations

- **IPC Overhead**: Minimize IPC calls by batching operations where possible
- **File I/O**: Use async file operations to avoid blocking renderer
- **Event Listeners**: Clean up listeners on component unmount to prevent memory leaks
- **Settings Persistence**: Debounce settings writes to avoid excessive disk I/O

### Edge Cases

- **Missing electronAPI**: Always check for `null` before calling methods
- **File Not Found**: Handle ENOENT errors gracefully with user-friendly messages
- **Invalid Paths**: Validate file paths before passing to IPC
- **Concurrent Settings Updates**: Last write wins, no conflict resolution
- **Window State Out of Bounds**: Reposition window if saved position is off-screen

### Common Pitfalls

- **Forgetting null checks**: Always use `api?.method()` or check `if (api)`
- **Memory leaks**: Always call `removeAllListeners()` in cleanup
- **Synchronous IPC**: Never use `ipcRenderer.sendSync()` (blocks renderer)
- **Exposing Node.js APIs**: Never expose fs, child_process, etc. directly
- **Circular references**: Ensure IPC arguments are JSON-serializable

---

## Examples

### Desktop Detection

```typescript
import { isElectron, useElectron } from '@/components/settings/useElectron';

// Function-based detection
if (isElectron()) {
  console.log('Running in Electron');
}

// Hook-based access
function MyComponent() {
  const api = useElectron();

  const handleSave = async () => {
    if (!api) {
      console.warn('Desktop features not available');
      return;
    }

    const result = await api.saveFile('unit.json', [
      { name: 'JSON Files', extensions: ['json'] },
    ]);

    if (!result.canceled && result.filePath) {
      console.log('Save to:', result.filePath);
    }
  };

  return <button onClick={handleSave}>Save</button>;
}
```

### File Operations

```typescript
// Save file with dialog
const result = await electronAPI.saveFile('MyMech.json', [
  { name: 'JSON Files', extensions: ['json'] },
  { name: 'All Files', extensions: ['*'] },
]);

if (!result.canceled && result.filePath) {
  const writeResult = await electronAPI.writeFile(
    result.filePath,
    JSON.stringify(unit, null, 2),
  );

  if (writeResult.success) {
    console.log('Saved successfully');
  } else {
    console.error('Save failed:', writeResult.error);
  }
}

// Open and read file
const openResult = await electronAPI.openFile([
  { name: 'JSON Files', extensions: ['json'] },
]);

if (!openResult.canceled && openResult.filePaths.length > 0) {
  const readResult = await electronAPI.readFile(openResult.filePaths[0]);

  if (readResult.success && readResult.data) {
    const unit = JSON.parse(readResult.data);
    console.log('Loaded unit:', unit);
  } else {
    console.error('Read failed:', readResult.error);
  }
}
```

### Settings Management

```typescript
// Get all settings
const settings = await electronAPI.getSettings();
console.log('Auto-backup enabled:', settings?.enableAutoBackup);

// Update specific settings
await electronAPI.setSettings({
  enableAutoBackup: true,
  backupIntervalMinutes: 10,
});

// Get single setting
const interval = await electronAPI.getSettingValue('backupIntervalMinutes');
console.log('Backup interval:', interval);

// Listen for changes
electronAPI.onSettingsChange((event) => {
  console.log(
    `${event.key} changed from ${event.oldValue} to ${event.newValue}`,
  );
});

// Cleanup
useEffect(() => {
  return () => {
    electronAPI.removeAllListeners('settings:on-change');
  };
}, []);
```

### Recent Files

```typescript
// Get recent files
const recentFiles = await electronAPI.getRecentFiles();
console.log('Recent files:', recentFiles);

// Add recent file
await electronAPI.addRecentFile({
  id: 'atlas-as7-d',
  name: 'Atlas AS7-D',
  path: '/path/to/atlas.json',
  unitType: 'BattleMech',
  tonnage: 100,
  variant: 'AS7-D',
});

// Listen for updates
electronAPI.onRecentFilesUpdate((files) => {
  console.log('Recent files updated:', files);
});

// Remove specific file
await electronAPI.removeRecentFile('atlas-as7-d');

// Clear all
await electronAPI.clearRecentFiles();
```

### Window Operations

```typescript
// Custom title bar controls
function TitleBar() {
  const { minimize, maximize, close, isElectron } = useElectronWindow();

  if (!isElectron) return null;

  return (
    <div className="title-bar">
      <button onClick={minimize}>−</button>
      <button onClick={maximize}>□</button>
      <button onClick={close}>×</button>
    </div>
  );
}
```

### Menu Integration

```typescript
// Update menu state based on app state
useEffect(() => {
  if (!electronAPI) return;

  electronAPI.updateMenuState({
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    hasUnit: !!currentUnit,
    hasSelection: !!selectedEquipment,
  });
}, [history, currentUnit, selectedEquipment]);

// Handle menu commands
useEffect(() => {
  if (!electronAPI) return;

  const handleMenuCommand = (command: MenuCommand) => {
    switch (command) {
      case 'file:new':
        createNewUnit();
        break;
      case 'file:save':
        saveCurrentUnit();
        break;
      case 'edit:undo':
        history.undo();
        break;
      case 'edit:redo':
        history.redo();
        break;
      // ... handle other commands
    }
  };

  electronAPI.onMenuCommand(handleMenuCommand);

  return () => {
    electronAPI.removeAllListeners('menu:command');
  };
}, []);
```

---

## Dependencies

### Depends On

- **Electron**: IPC, contextBridge, BrowserWindow APIs
- **Node.js**: fs, path modules (main process only)
- **desktop-experience**: Settings schema, recent files schema

### Used By

- **Unit Builder**: File save/load operations
- **Settings UI**: Desktop preferences management
- **Main Menu**: Recent files, window controls
- **Auto-save**: Periodic backup triggers
- **Import/Export**: File system access

---

## References

- **Electron Security**: https://www.electronjs.org/docs/latest/tutorial/security
- **Context Isolation**: https://www.electronjs.org/docs/latest/tutorial/context-isolation
- **IPC Communication**: https://www.electronjs.org/docs/latest/tutorial/ipc
- **Related Specs**: `desktop-experience/spec.md`, `api-layer/spec.md`
