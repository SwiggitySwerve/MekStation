# desktop-experience Specification

## Purpose

Defines Desktop Experience requirements for Desktop Settings Service, Recent Files Tracking, Native Application Menu, and Startup Behavior Configuration, preserving the source-of-truth scope introduced by archived change add-desktop-qol-features.
## Requirements
### Requirement: Desktop Settings Service

The system SHALL provide a SettingsService that manages all desktop application preferences with type-safe access, default values, and persistence.

#### Scenario: Load settings on startup

- **GIVEN** the desktop application is starting
- **WHEN** the main process initializes
- **THEN** the SettingsService SHALL load saved settings from disk
- **AND** merge with default values for any missing keys
- **AND** make settings available to other services

#### Scenario: Update settings

- **GIVEN** the user changes a setting in the preferences UI
- **WHEN** the setting change is submitted
- **THEN** the SettingsService SHALL validate the new value
- **AND** persist the updated settings to disk
- **AND** notify affected services of the change

#### Scenario: Reset settings to defaults

- **GIVEN** the user requests a settings reset
- **WHEN** the reset action is confirmed
- **THEN** the SettingsService SHALL restore all settings to default values
- **AND** persist the default settings to disk
- **AND** notify affected services of the reset

### Requirement: Recent Files Tracking

The system SHALL maintain a persistent list of recently opened units with relevant metadata for quick access.

#### Scenario: Add unit to recent files

- **GIVEN** the user opens a unit
- **WHEN** the unit is successfully loaded
- **THEN** the RecentFilesService SHALL add the unit to the recent files list
- **AND** update the lastOpened timestamp
- **AND** move the unit to the top of the list if already present
- **AND** enforce the maximum recent files limit

#### Scenario: Display recent files in menu

- **GIVEN** the application has recent files recorded
- **WHEN** the user opens the File menu
- **THEN** the Open Recent submenu SHALL display up to maxRecentFiles entries
- **AND** each entry SHALL show the unit name and type
- **AND** entries SHALL be ordered by most recently opened

#### Scenario: Clear recent files

- **GIVEN** the user has recent files recorded
- **WHEN** the user selects Clear Recent from the menu or settings
- **THEN** the RecentFilesService SHALL remove all recent file entries
- **AND** update the menu to show an empty state

#### Scenario: Remove invalid recent file entries

- **GIVEN** a recent file entry references a unit that no longer exists
- **WHEN** the user attempts to open that entry
- **THEN** the system SHALL display an error message
- **AND** offer to remove the invalid entry from the list

### Requirement: Native Application Menu

The system SHALL provide a native application menu bar with standard menus, keyboard shortcuts, and dynamic content.

#### Scenario: Display File menu

- **GIVEN** the application is running
- **WHEN** the user accesses the File menu
- **THEN** the menu SHALL display New, Open, Open Recent, Save, Save As, Import, Export, and Quit options
- **AND** each option SHALL have an appropriate keyboard shortcut

#### Scenario: Display Edit menu

- **GIVEN** the application is running
- **WHEN** the user accesses the Edit menu
- **THEN** the menu SHALL display Undo, Redo, Cut, Copy, Paste, and Select All options
- **AND** each option SHALL have standard platform keyboard shortcuts

#### Scenario: Display View menu

- **GIVEN** the application is running
- **WHEN** the user accesses the View menu
- **THEN** the menu SHALL display Zoom In, Zoom Out, Reset Zoom, and Toggle Fullscreen options
- **AND** Developer Tools option SHALL be visible only in development mode

#### Scenario: Display Unit menu

- **GIVEN** the application is running with a unit loaded
- **WHEN** the user accesses the Unit menu
- **THEN** the menu SHALL display New Unit, Duplicate Unit, Delete Unit, and Unit Properties options

#### Scenario: Display Help menu

- **GIVEN** the application is running
- **WHEN** the user accesses the Help menu
- **THEN** the menu SHALL display About, Check for Updates, Documentation, and Report Issue options

#### Scenario: Execute menu command

- **GIVEN** the application is running
- **WHEN** the user selects a menu item or uses its keyboard shortcut
- **THEN** the system SHALL send the corresponding command to the renderer process
- **AND** the renderer process SHALL execute the appropriate action

### Requirement: Startup Behavior Configuration

The system SHALL allow users to configure application startup behavior including auto-launch, window state, and session restoration.

#### Scenario: Launch at system login

- **GIVEN** the user enables Launch at Login in settings
- **WHEN** the system starts
- **THEN** the application SHALL be configured to start automatically
- **AND** respect the Start Minimized setting if enabled

#### Scenario: Start minimized to tray

- **GIVEN** the user enables Start Minimized in settings
- **WHEN** the application starts
- **THEN** the main window SHALL not be shown
- **AND** the system tray icon SHALL be visible
- **AND** clicking the tray icon SHALL show the main window

#### Scenario: Restore window state

- **GIVEN** the user has Remember Window State enabled
- **WHEN** the application starts
- **THEN** the window SHALL be positioned at the last saved location
- **AND** sized to the last saved dimensions
- **AND** maximized if it was previously maximized

#### Scenario: Reopen last unit

- **GIVEN** the user has Reopen Last Unit enabled
- **WHEN** the application starts
- **THEN** the system SHALL automatically load the most recently opened unit
- **AND** display a loading indicator during the load

### Requirement: Desktop Settings UI

The system SHALL provide a settings dialog accessible from the application menu and system tray for configuring all desktop preferences.

#### Scenario: Open settings dialog

- **GIVEN** the application is running
- **WHEN** the user selects Preferences from the menu or tray
- **THEN** a modal settings dialog SHALL be displayed
- **AND** the dialog SHALL show the General tab by default

#### Scenario: Navigate settings tabs

- **GIVEN** the settings dialog is open
- **WHEN** the user clicks a tab (General, Backups, Updates, Advanced)
- **THEN** the dialog SHALL display the corresponding settings panel
- **AND** preserve any unsaved changes in other tabs

#### Scenario: Save settings changes

- **GIVEN** the user has made changes in the settings dialog
- **WHEN** the user clicks Save or Apply
- **THEN** all changed settings SHALL be persisted
- **AND** affected services SHALL be notified
- **AND** the dialog SHALL close (for Save) or remain open (for Apply)

#### Scenario: Cancel settings changes

- **GIVEN** the user has made unsaved changes in the settings dialog
- **WHEN** the user clicks Cancel or closes the dialog
- **THEN** a confirmation prompt SHALL be displayed
- **AND** if confirmed, changes SHALL be discarded
- **AND** the dialog SHALL close

### Requirement: Window State Persistence

The system SHALL persist window position, size, and maximized state between sessions.

#### Scenario: Save window state on close

- **GIVEN** the application window is closing
- **WHEN** the window close event fires
- **THEN** the current window bounds SHALL be saved
- **AND** the maximized state SHALL be saved

#### Scenario: Handle display configuration changes

- **GIVEN** the saved window position is outside visible displays
- **WHEN** the application starts
- **THEN** the window SHALL be repositioned to a visible location
- **AND** the window size SHALL be preserved if possible

### Requirement: Backup Settings Integration

The system SHALL expose backup service configuration through the desktop settings UI.

#### Scenario: Configure auto-backup

- **GIVEN** the user opens the Backups settings tab
- **WHEN** the user modifies backup settings
- **THEN** the options SHALL include enable/disable auto-backup
- **AND** backup frequency in minutes
- **AND** maximum backup count
- **AND** backup directory location

#### Scenario: Apply backup settings

- **GIVEN** the user has changed backup settings
- **WHEN** the settings are saved
- **THEN** the BackupService SHALL be reconfigured with new values
- **AND** the next backup SHALL use the new settings

### Requirement: Update Settings Integration

The system SHALL expose auto-updater configuration through the desktop settings UI.

#### Scenario: Configure update preferences

- **GIVEN** the user opens the Updates settings tab
- **WHEN** the user views update settings
- **THEN** the options SHALL include auto-check for updates toggle
- **AND** update channel selection (stable/beta)

#### Scenario: Apply update settings

- **GIVEN** the user has changed update settings
- **WHEN** the settings are saved
- **THEN** the auto-updater SHALL be reconfigured
- **AND** update checks SHALL follow the new preferences

### Requirement: Renderer Content-Security-Policy Enforcement

The desktop renderer SHALL load under an enforced Content-Security-Policy that
restricts script, style, object, and frame sources to the application's own origin,
forbids being framed by other origins (`frame-ancestors 'none'`), and is applied to
both the development load (`http://localhost:3600`) and the packaged load
(`http://127.0.0.1:3001`). The policy SHALL be derived from a single source so the
Next-emitted header and the main-process pin cannot diverge.

#### Scenario: CSP is present on the loaded renderer

- **GIVEN** the desktop application has loaded its renderer in dev or packaged mode
- **WHEN** the loaded document's effective Content-Security-Policy is inspected
- **THEN** a `Content-Security-Policy` SHALL be in force with `default-src 'self'`
  and `frame-ancestors 'none'`
- **AND** `object-src` SHALL be `'none'`
- **AND** the policy SHALL NOT permit script execution from arbitrary external
  origins.

#### Scenario: Main process pins the policy independent of upstream headers

- **GIVEN** the packaged renderer is served by the spawned standalone Next server
- **WHEN** a response reaches the renderer with its CSP header missing or altered
- **THEN** the main process SHALL pin the Content-Security-Policy via the session's
  header-received handling
- **AND** the renderer SHALL still be subject to the enforced policy.

#### Scenario: Supporting security headers accompany the policy

- **GIVEN** the renderer document is served
- **WHEN** its response headers are inspected
- **THEN** `X-Content-Type-Options: nosniff` SHALL be present
- **AND** an `X-Frame-Options: DENY` (consistent with `frame-ancestors 'none'`) and a
  `Referrer-Policy` SHALL be present.

### Requirement: Renderer Navigation and External-Link Hardening

The desktop main process SHALL prevent in-window navigation away from the expected
application origin and SHALL only open external URLs through the operating system for
an explicit scheme allowlist, denying all other navigation and link-open attempts by
default.

#### Scenario: In-window navigation to a foreign origin is blocked

- **GIVEN** the renderer attempts to navigate the main window to an origin other than
  the expected app origin (`http://localhost:3600` in dev or
  `http://127.0.0.1:3001` packaged)
- **WHEN** the `will-navigate` event fires
- **THEN** the main process SHALL prevent the navigation
- **AND** the main window SHALL remain on the application origin.

#### Scenario: External link opens only for allowlisted schemes

- **GIVEN** the renderer requests a new window or external link with an `https:` or
  `mailto:` URL
- **WHEN** the window-open handler processes it
- **THEN** the main process SHALL open it via the OS and deny opening a new Electron
  window
- **AND** a `file:`, `javascript:`, or any other non-allowlisted scheme SHALL NOT be
  passed to the OS open
- **AND** a URL that fails to parse SHALL be denied without opening.
