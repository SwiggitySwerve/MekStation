# Design: Desktop Quality of Life Features

## Context

The MekStation desktop application uses Electron with a Next.js frontend. The main process handles native OS integration while the renderer process runs the React application. Communication occurs via IPC with a secure preload bridge.

### Current Architecture

- `desktop/electron/main.ts` - Main process with window management
- `desktop/electron/preload.ts` - Secure IPC bridge
- `desktop/services/local/` - LocalStorageService, BackupService
- Web app communicates via `window.electronAPI`

### Stakeholders

- End users expecting native desktop experience
- Developers maintaining cross-platform compatibility
- QA testing on Windows, macOS, Linux

## Goals / Non-Goals

### Goals

1. Provide native desktop experience matching OS conventions
2. Persist user preferences and state across sessions
3. Improve productivity with keyboard shortcuts and recent files
4. Centralize desktop settings in an accessible UI
5. Maintain cross-platform compatibility (Windows, macOS, Linux)

### Non-Goals

1. Mobile/tablet support (web-only concern)
2. Cloud sync of settings (future consideration)
3. Plugin/extension system
4. Multi-window support (single window paradigm)

## Decisions

### Decision 1: Settings Storage Strategy

**Choice**: Use existing `LocalStorageService` with a dedicated settings namespace

**Alternatives Considered**:

- electron-store: External dependency, but provides JSON config file
- Native fs with JSON: Manual implementation, no caching

**Rationale**: Leverages existing infrastructure, provides compression and caching, keeps dependencies minimal.

### Decision 2: Recent Files Implementation

**Choice**: Dedicated `RecentFilesService` with in-memory cache and disk persistence

**Structure**:

```typescript
interface IRecentFile {
  readonly id: string; // Unit ID
  readonly name: string; // Display name
  readonly path: string; // File path (if file-based)
  readonly lastOpened: Date; // Timestamp
  readonly unitType: string; // BattleMech, Vehicle, etc.
  readonly tonnage?: number; // Quick reference
}
```

**Rationale**: Separates concerns from general storage, allows specialized cleanup and validation logic.

### Decision 3: Menu Architecture

**Choice**: Dynamic menu building with state-aware updates

**Pattern**:

```
Main Process                    Renderer Process
    |                                 |
    |-- Build initial menus           |
    |                                 |
    |<-- IPC: update-recent-files <---|
    |                                 |
    |-- Rebuild File > Open Recent    |
    |                                 |
    |-- Menu click ------------------>|
    |   (IPC: menu-command)           |
```

**Rationale**: Menus must update dynamically (recent files, undo state) while maintaining native feel.

### Decision 4: Settings UI Location

**Choice**: Modal dialog in web app, triggered via IPC or menu

**Alternatives Considered**:

- Separate Electron window: Complex, different styling
- Sidebar panel: Takes screen space, less discoverable
- System preferences integration: Platform-specific, complex

**Rationale**: Modal provides familiar UX, uses existing React components, single codebase.

### Decision 5: Startup Behavior Implementation

**Choice**: Platform-specific APIs with unified settings interface

**Platform APIs**:

- Windows: `app.setLoginItemSettings()` with registry fallback
- macOS: `app.setLoginItemSettings()` (native support)
- Linux: `.desktop` file in `~/.config/autostart/`

**Rationale**: Each platform has different autostart mechanisms; unified API abstracts differences.

## Architecture

### Service Layer

```
+-------------------------------------------------------------+
|                      Main Process                            |
+-------------------------------------------------------------+
|  +------------------+  +------------------+                 |
|  |  SettingsService |  | RecentFilesService|                |
|  |  - get/set prefs |  | - add/remove/list |                |
|  |  - defaults      |  | - cleanup invalid |                |
|  |  - validation    |  | - max entries     |                |
|  +--------+---------+  +--------+----------+                |
|           |                     |                            |
|           +----------+----------+                            |
|                      v                                       |
|           +----------------------+                          |
|           |  LocalStorageService |                          |
|           |  (existing)          |                          |
|           +----------------------+                          |
|                                                              |
|  +------------------------------------------------------+   |
|  |                    MenuManager                        |   |
|  |  - buildApplicationMenu()                             |   |
|  |  - updateRecentFilesMenu()                            |   |
|  |  - handleMenuCommand(cmd)                             |   |
|  +------------------------------------------------------+   |
+-------------------------------------------------------------+
                           |
                      IPC Bridge
                           |
+-------------------------------------------------------------+
|                    Renderer Process                          |
+-------------------------------------------------------------+
|  +------------------------------------------------------+   |
|  |              DesktopSettingsDialog                    |   |
|  |  +---------+ +---------+ +---------+ +----------+   |   |
|  |  | General | | Backups | | Updates | | Advanced |   |   |
|  |  +---------+ +---------+ +---------+ +----------+   |   |
|  +------------------------------------------------------+   |
+-------------------------------------------------------------+
```

### IPC Channels

| Channel               | Direction        | Purpose               |
| --------------------- | ---------------- | --------------------- |
| `settings:get`        | Renderer to Main | Get all settings      |
| `settings:set`        | Renderer to Main | Update settings       |
| `settings:reset`      | Renderer to Main | Reset to defaults     |
| `recent-files:list`   | Renderer to Main | Get recent files      |
| `recent-files:add`    | Renderer to Main | Add to recent         |
| `recent-files:remove` | Renderer to Main | Remove from recent    |
| `recent-files:clear`  | Renderer to Main | Clear all recent      |
| `menu:command`        | Main to Renderer | Menu action triggered |
| `app:open-settings`   | Main to Renderer | Open settings dialog  |

### Settings Schema

```typescript
interface IDesktopSettings {
  // General
  launchAtLogin: boolean;
  startMinimized: boolean;
  reopenLastUnit: boolean;
  defaultSaveDirectory: string;

  // Window
  rememberWindowState: boolean;
  windowBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    isMaximized: boolean;
  };

  // Backups
  enableAutoBackup: boolean;
  backupIntervalMinutes: number;
  maxBackupCount: number;
  backupDirectory: string;

  // Updates
  checkForUpdatesAutomatically: boolean;
  updateChannel: 'stable' | 'beta';

  // Recent Files
  maxRecentFiles: number;

  // Advanced
  dataDirectory: string;
  enableDevTools: boolean;
}
```

## Risks / Trade-offs

### Risk: Platform-specific behavior differences

**Mitigation**: Abstract platform logic into utility functions, thorough cross-platform testing, document known differences.

### Risk: Menu state synchronization

**Mitigation**: Use event-driven updates, debounce rapid changes, maintain source of truth in main process.

### Risk: Settings migration on updates

**Mitigation**: Version settings schema, implement migration functions, preserve unknown keys.

### Trade-off: Modal vs native settings window

**Accepted**: Using web-based modal loses some native feel but simplifies development and maintains visual consistency.

### Trade-off: Recent files in main process

**Accepted**: Requires IPC for updates but ensures menu synchronization and persistence.

## Migration Plan

### Phase 1: Foundation

1. Implement SettingsService and RecentFilesService
2. Add IPC handlers for settings and recent files
3. Migrate existing window bounds logic to SettingsService

### Phase 2: Menus

1. Implement MenuManager with static menu structure
2. Wire menu commands to IPC events
3. Add dynamic recent files submenu

### Phase 3: Settings UI

1. Create DesktopSettingsDialog component
2. Connect to settings IPC
3. Add settings trigger to Help menu and tray

### Phase 4: Startup Behavior

1. Implement launch-at-login per platform
2. Add minimized start logic
3. Implement reopen-last-unit feature

### Rollback

- Settings stored separately from user data
- Can disable features via environment variables
- Previous window bounds preserved as fallback

## Open Questions

1. **Keyboard shortcut conflicts**: How to handle conflicts between native menu shortcuts and web app shortcuts?
   - Proposed: Menu shortcuts take precedence, web app uses different modifiers

2. **Recent files maximum**: Should the limit be configurable?
   - Proposed: Yes, in Advanced settings, default 15

3. **Settings sync**: Future consideration for cloud sync of settings?
   - Deferred: Out of scope, but schema should accommodate future sync
