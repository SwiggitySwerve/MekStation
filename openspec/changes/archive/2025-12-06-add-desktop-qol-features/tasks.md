# Tasks: Add Desktop Quality of Life Features

## Phase 1: Foundation Services

### 1.1 Settings Service
- [x] 1.1.1 Create `desktop/services/local/SettingsService.ts` with IDesktopSettings interface
- [x] 1.1.2 Implement default settings values and validation logic
- [x] 1.1.3 Add settings persistence using LocalStorageService
- [x] 1.1.4 Implement settings migration for schema versioning
- [x] 1.1.5 Add settings change event emitter for service notifications

### 1.2 Recent Files Service
- [x] 1.2.1 Create `desktop/services/local/RecentFilesService.ts` with IRecentFile interface
- [x] 1.2.2 Implement add/remove/list/clear operations
- [x] 1.2.3 Add maximum entries enforcement with LRU eviction
- [x] 1.2.4 Add invalid entry detection and cleanup
- [x] 1.2.5 Persist recent files using LocalStorageService

### 1.3 Type Definitions
- [x] 1.3.1 Add IDesktopSettings interface to `desktop/types/BaseTypes.ts`
- [x] 1.3.2 Add IRecentFile interface to `desktop/types/BaseTypes.ts`
- [x] 1.3.3 Add menu command type definitions
- [x] 1.3.4 Add IPC channel type definitions for type-safe communication

## Phase 2: IPC Layer

### 2.1 Main Process IPC Handlers
- [x] 2.1.1 Add settings IPC handlers (get, set, reset) in `main.ts`
- [x] 2.1.2 Add recent files IPC handlers (list, add, remove, clear) in `main.ts`
- [x] 2.1.3 Add menu command IPC handler for renderer communication

### 2.2 Preload Bridge
- [x] 2.2.1 Extend IElectronAPI in `preload.ts` with settings methods
- [x] 2.2.2 Add recent files methods to IElectronAPI
- [x] 2.2.3 Add menu command event listeners
- [x] 2.2.4 Add settings dialog trigger listener

## Phase 3: Native Application Menus

### 3.1 Menu Manager
- [x] 3.1.1 Create `desktop/electron/MenuManager.ts` class
- [x] 3.1.2 Implement File menu with New, Open, Save, Import, Export, Quit
- [x] 3.1.3 Implement Edit menu with Undo, Redo, Cut, Copy, Paste, Select All
- [x] 3.1.4 Implement View menu with Zoom controls, Fullscreen, DevTools
- [x] 3.1.5 Implement Unit menu with unit-specific actions
- [x] 3.1.6 Implement Help menu with About, Updates, Documentation

### 3.2 Recent Files Submenu
- [x] 3.2.1 Add dynamic Open Recent submenu to File menu
- [x] 3.2.2 Implement menu rebuild on recent files change
- [x] 3.2.3 Add Clear Recent menu item
- [x] 3.2.4 Handle empty state (no recent files)

### 3.3 Keyboard Shortcuts
- [x] 3.3.1 Configure platform-appropriate accelerators (Cmd vs Ctrl)
- [x] 3.3.2 Add keyboard shortcut registration for all menu items
- [x] 3.3.3 Document keyboard shortcut mappings

## Phase 4: Startup Behavior

### 4.1 Launch at Login
- [x] 4.1.1 Implement `app.setLoginItemSettings()` for Windows/macOS
- [x] 4.1.2 Create Linux autostart .desktop file management
- [x] 4.1.3 Add platform detection and appropriate API calls
- [x] 4.1.4 Handle settings toggle and apply changes immediately

### 4.2 Window State
- [x] 4.2.1 Migrate existing window bounds logic to SettingsService
- [x] 4.2.2 Add maximized state tracking
- [x] 4.2.3 Implement display bounds validation (handle disconnected monitors)
- [x] 4.2.4 Add window state restore on startup

### 4.3 Start Minimized
- [x] 4.3.1 Add minimized start logic to main window creation
- [x] 4.3.2 Ensure tray icon is visible when starting minimized
- [x] 4.3.3 Handle tray click to show window

### 4.4 Reopen Last Unit
- [x] 4.4.1 Track last opened unit in RecentFilesService
- [x] 4.4.2 Implement auto-load on startup if setting enabled
- [x] 4.4.3 Add loading indicator during unit load
- [x] 4.4.4 Handle errors gracefully (missing unit, corrupted data)

## Phase 5: Settings UI

### 5.1 Settings Dialog Component
- [x] 5.1.1 Create `src/components/settings/DesktopSettingsDialog.tsx`
- [x] 5.1.2 Implement tabbed layout (General, Backups, Updates, Advanced)
- [x] 5.1.3 Add dialog open/close state management
- [x] 5.1.4 Style dialog to match application theme

### 5.2 General Settings Tab
- [x] 5.2.1 Add Launch at Login toggle
- [x] 5.2.2 Add Start Minimized toggle
- [x] 5.2.3 Add Reopen Last Unit toggle
- [x] 5.2.4 Add Default Save Directory selector with folder picker

### 5.3 Backups Settings Tab
- [x] 5.3.1 Add Enable Auto-backup toggle
- [x] 5.3.2 Add Backup Frequency input (minutes)
- [x] 5.3.3 Add Maximum Backups input (count)
- [x] 5.3.4 Add Backup Directory selector with folder picker

### 5.4 Updates Settings Tab
- [x] 5.4.1 Add Auto-check for Updates toggle
- [x] 5.4.2 Add Update Channel selector (stable/beta)
- [x] 5.4.3 Add Check Now button with status feedback

### 5.5 Advanced Settings Tab
- [x] 5.5.1 Add Data Directory selector
- [x] 5.5.2 Add Clear Cache button with confirmation
- [x] 5.5.3 Add Reset All Settings button with confirmation
- [x] 5.5.4 Add Maximum Recent Files input

### 5.6 Dialog Actions
- [x] 5.6.1 Implement Save button with settings persistence
- [x] 5.6.2 Implement Apply button (save without closing)
- [x] 5.6.3 Implement Cancel button with unsaved changes prompt
- [x] 5.6.4 Connect dialog to IPC for settings operations

## Phase 6: Integration

### 6.1 System Tray Updates
- [x] 6.1.1 Add recent files to tray context menu
- [x] 6.1.2 Add Preferences menu item to tray
- [x] 6.1.3 Update tray menu when recent files change

### 6.2 Renderer Integration
- [x] 6.2.1 Create useDesktopSettings React hook
- [x] 6.2.2 Create useRecentFiles React hook
- [x] 6.2.3 Wire menu commands to existing app actions
- [x] 6.2.4 Add settings dialog trigger to app header/menu

### 6.3 Service Coordination
- [x] 6.3.1 Connect SettingsService to BackupService configuration
- [x] 6.3.2 Connect SettingsService to auto-updater configuration
- [x] 6.3.3 Ensure services react to settings changes in real-time

## Phase 7: Testing and Documentation

### 7.1 Unit Tests
- [x] 7.1.1 Test SettingsService CRUD operations
- [x] 7.1.2 Test RecentFilesService CRUD and LRU eviction
- [x] 7.1.3 Test settings validation and migration
- [x] 7.1.4 Test menu command routing

### 7.2 Integration Tests
- [x] 7.2.1 Test IPC communication for settings
- [x] 7.2.2 Test IPC communication for recent files
- [x] 7.2.3 Test menu actions trigger correct app behaviors

### 7.3 Cross-Platform Testing
- [x] 7.3.1 Test launch at login on Windows
- [x] 7.3.2 Test launch at login on macOS
- [x] 7.3.3 Test launch at login on Linux
- [x] 7.3.4 Test keyboard shortcuts on each platform

### 7.4 Documentation
- [x] 7.4.1 Document settings schema and defaults
- [x] 7.4.2 Document keyboard shortcuts
- [x] 7.4.3 Update user documentation with new features
- [x] 7.4.4 Add inline code documentation

## Dependencies

- Phase 2 depends on Phase 1 (services must exist before IPC)
- Phase 3 depends on Phase 2 (menus use IPC to communicate)
- Phase 4 depends on Phase 1 (startup uses SettingsService)
- Phase 5 depends on Phase 2 (UI uses IPC to read/write settings)
- Phase 6 depends on Phases 3-5 (integration ties everything together)
- Phase 7 can begin partially in parallel with implementation

## Parallelizable Work

The following can be developed in parallel:
- SettingsService and RecentFilesService (Phase 1.1 and 1.2)
- Main process IPC and Preload bridge (Phase 2.1 and 2.2)
- Different settings tabs (Phase 5.2, 5.3, 5.4, 5.5)
- Unit tests for different services (Phase 7.1)
