# Change: Add Desktop Quality of Life Features

## Why

The MekStation Electron application currently functions as a basic web app wrapper but lacks the polished desktop experience users expect from native applications. Users have expressed frustration with:

- No persistent window state or startup preferences
- Missing standard application menus and keyboard shortcuts
- No quick access to recently opened units
- No native settings/preferences UI
- Inconsistent behavior with desktop conventions

This change addresses these pain points by implementing four interconnected features that transform the app into a proper desktop citizen, improving user productivity and satisfaction.

## What Changes

### 1. Enhanced Startup Behavior
- **Launch at Login**: Optional automatic startup when user logs in
- **Minimized Start**: Option to start minimized to system tray
- **Window State Persistence**: Remember window position, size, and maximized state
- **Last Unit Memory**: Automatically reopen last opened unit(s) on startup
- **Splash Screen**: Professional loading screen during initialization

### 2. Native Application Menus
Complete menu bar implementation with standard keyboard shortcuts:
- **File Menu**: New, Open, Open Recent, Save, Import, Export, Quit
- **Edit Menu**: Undo/Redo, Cut/Copy/Paste, Select All
- **View Menu**: Zoom controls, Fullscreen toggle, Developer tools
- **Unit Menu**: Unit-specific actions (New, Duplicate, Properties)
- **Help Menu**: About, Updates, Documentation

### 3. Recently Opened Units
Persistent history of recently accessed units:
- Track last 10-20 opened units with metadata (name, path, last opened)
- Display in File > Open Recent submenu
- Quick access from system tray context menu
- Clear history option in settings
- Automatic cleanup of invalid entries

### 4. Desktop Settings/Preferences UI
Native settings dialog with organized tabs:
- **General**: Startup behavior, default directories, UI preferences
- **Backups**: Auto-backup settings, retention policies
- **Updates**: Auto-update preferences, update channels
- **Advanced**: Data directories, cache management, reset options

## Impact

### Affected Specs
- `desktop-experience` (new capability)

### Affected Code
**New Files:**
- `desktop/services/local/SettingsService.ts`
- `desktop/services/local/RecentFilesService.ts`
- `src/components/settings/DesktopSettingsDialog.tsx`

**Modified Files:**
- `desktop/electron/main.ts` (menus, startup logic, IPC handlers)
- `desktop/electron/preload.ts` (expose new APIs)
- `desktop/types/BaseTypes.ts` (settings interfaces)

### Breaking Changes
None - all changes are additive and backward-compatible.

### Migration Notes
- Existing user data will be automatically migrated to new settings structure
- Window bounds and basic preferences will be preserved
- No user action required

### Testing Considerations
- Cross-platform testing (Windows, macOS, Linux) for menus and startup behavior
- Settings persistence across app restarts
- Recent files cleanup when units are deleted/moved
- Keyboard shortcut conflicts with web app shortcuts

### Performance Impact
- Minimal: Settings and recent files stored locally with efficient caching
- Startup time increase: ~500ms for splash screen and initialization checks
- Memory usage: ~2-3MB additional for new services
