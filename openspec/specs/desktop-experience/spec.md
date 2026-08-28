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

### Requirement: Packaged Production Listener Uses the Configured Loopback

The package-owned config SHALL select packaged mode only with a `.next` directory;
absent config is nonpackaged regardless of `.next`, while config without it
fails before Next. Ambient `NODE_ENV` cannot select/downgrade mode. Packaged
accepts only omitted/`127.0.0.1`; nonpackaged only omitted/`localhost`/loopback;
every other host rejects before Next and the resolved literal reaches listener.

#### Scenario: Explicit IPv4 loopback binds the actual listener

- **GIVEN** the production server starts with `HOSTNAME=127.0.0.1`
- **WHEN** the HTTP/WebSocket listener begins accepting connections
- **THEN** the listener MUST receive `127.0.0.1` as its host
- **AND** its actual bound address MUST equal `127.0.0.1`
- **AND** it MUST NOT bind `0.0.0.0` or `::`

#### Scenario: Omitted production hostname fails safe to loopback

- **GIVEN** the production server starts without `HOSTNAME`
- **WHEN** its listener configuration is resolved
- **THEN** the configured and actual listener address MUST be `127.0.0.1`

#### Scenario: Unsafe production hostname is rejected before listening

- **GIVEN** a fixed standalone layout receives `""`, `" "`, `localhost`,
  `127.0.0.2`, `192.168.1.10`, `0.0.0.0`, `::`, `::1`, or `not-an-ip`
- **WHEN** startup validates with ambient `NODE_ENV` unset or `development`
- **THEN** startup MUST fail before the first Next import, `prepare()`,
  `listen()`, or listener-ready evidence
- **AND** every rejected process MUST produce its bounded configuration error
  before a test-only `Module._load` guard observes request `next`
- **AND** no campaign, custom-unit, force, encounter, HTTP, or WebSocket route
  MUST accept traffic

#### Scenario: Marker truth table preserves development and fails partial package

- **WHEN** config is absent with `.next` absent or present
- **THEN** mode MUST be nonpackaged and omitted host MUST remain `localhost`
- **WHEN** config exists without a `.next` directory
- **THEN** startup MUST fail before the first Next import

### Requirement: Packaged Listener Authority Is Process-Proven

The packaged-socket validator SHALL prove the operating system socket identity
through a closed machine record derived from `server.address()` for both the
initial packaged start and the restart. A configured environment variable,
Next.js option, human-readable log, static source assertion, or successful
loopback request MUST NOT satisfy this requirement by itself.

#### Scenario: Initial start and restart prove matching listener identities

- **WHEN** `validate:multiplayer:packaged-socket` starts the production server,
  exercises the existing HTTP/WebSocket flow, restarts it, and reconnects
- **THEN** initial MUST omit `HOSTNAME`/`NODE_ENV`; restart MUST set loopback
  plus ambient `NODE_ENV=development`, yet both MUST select packaged mode
- **AND** each owned process MUST publish exactly one closed listener record
- **AND** each record's actual address, family, and port MUST match that
  invocation's configured address and requested port
- **AND** the initial and restarted processes MUST prove the same loopback
  identity
- **AND** the existing match creation, replay, persistence, and same-match
  reconnect assertions MUST still pass

#### Scenario: Invalid listener evidence fails the gate

- **WHEN** a listener record is missing, duplicate, malformed, has unknown
  fields, reports a pipe address, reports the wrong port or family, reports an
  unspecified or non-loopback address, or differs from its configured address
- **THEN** the validator MUST fail before publishing a successful result
- **AND** any line containing the listener prefix outside the exact
  `MEKSTATION_LISTENER_READY <compact-json>\n` framing MUST fail
- **AND** it MUST reject a ready line over 1024 bytes or a non-integer/out-of-range
  port, accept exact framing split across chunks, and reject coalesced duplicates

#### Scenario: Runtime probes reject both unspecified address families

- **WHEN** the validator runs bounded production probes with
  `HOSTNAME=0.0.0.0` and `HOSTNAME=::`
- **THEN** each process MUST exit non-zero before publishing listener-ready
  evidence or accepting a connection
- **AND** each process plus owned cleanup MUST finish within 5 seconds
- **AND** cleanup MUST await close and rebind/close the port without fixed delay
- **AND** the authority result MUST record
  `unspecifiedAddressRejected=true` only after both rejections are proven

#### Scenario: Positive IPv6 loopback is unsupported in CAMP-00

- **WHEN** the validator runs a bounded production probe with `HOSTNAME=::1`
- **THEN** the process MUST exit non-zero before publishing listener-ready
  evidence or accepting a connection
- **AND** the validator MUST NOT format or exercise an IPv6 HTTP/WebSocket URL

### Requirement: CAMP-00 Listener Result Is Closed and Durable

The CAMP-00 authority controller SHALL adapt successful process proof into the
closed `camp01-listener-result/v1` artifact defined by
`add-camp01-authority-receipts`. It MUST retain only the wave/run identity,
common loopback address, exact-address-match result, and unspecified-address
rejection result; it MUST NOT retain raw logs, environment values, arbitrary
errors, ports, process identifiers, or local paths.

#### Scenario: Fresh proof worktree prepares isolated standalone output

- **WHEN** CAMP-00 runs after only the authority controller's dependency
  bootstrap
- **THEN** the validator MUST build and hydrate below the writer-owned
  `CAMP01_NEXT_DIST_DIR` with sequential shell-free Node commands
- **AND** default `.next` MUST remain absent and the writer MUST remove runtime
  output before the pre-command ignored/untracked manifest is compared
- **AND** preparation/cleanup MUST finish within 10 minutes and each successful
  listener-ready record MUST arrive within 60 seconds

#### Scenario: Writer converts one closed ephemeral observation

- **GIVEN** the writer exclusively created `CAMP01_ARTIFACT_DIR` and issued the
  parent run identity
- **WHEN** the packaged-socket command completes successfully
- **THEN** the validator MUST no-replace hard-link the closed observation at
  `CAMP01_ARTIFACT_DIR/listener-observation.json`, then unlink the temp
- **AND** no copy/rename fallback is permitted
- **AND** the observation MUST bind both successful listener records, both
  wildcard rejections, the unsupported IPv6-loopback rejection, the existing
  journey, matrix, ordering, isolated preparation, environment-independent
  packaged mode, no-replace finalization, run identity, host modes, and reuse
- **AND** the writer MUST ignore stdout/stderr as authority input, validate and
  normalize stable bytes in memory, close, delete and verify observation/runtime
  absent, and only then construct/finalize both results and set cleanup true
- **AND** final allowlist/manifest validation MUST follow result finalization

#### Scenario: Invalid ephemeral handoff fails closed

- **WHEN** the observation/temp is pre-created, missing, extra, cross-run,
  malformed, changed between held-handle reads, nonregular, reparse-backed,
  path/handle identity-drifted, noncanonical, or survives conversion
- **THEN** the writer MUST publish no successful CAMP-00 receipt
- **AND** an observation over 4096 bytes MUST be rejected
- **AND** deterministic adapter tests MUST inject between-read mutation and
  cover every path fault without races; a real Windows test MUST preserve
  pre-created final bytes on hard-link `EEXIST` with no weaker fallback

#### Scenario: Reviewed-head proof publishes the closed listener result

- **GIVEN** all CAMP-00 predecessors and the approved child-spec/product
  provenance validate
- **WHEN** the immutable `camp-00` command passes at the exact reviewed product
  head
- **THEN** `listener-result.json` MUST identify `127.0.0.1` as the common
  address proven by both successful starts
- **AND** `expectedAddressMatched` and `unspecifiedAddressRejected` MUST both be
  `true`
- **AND** the authority validator MUST derive
  `boundAddressIsLoopback===true`
- **AND** `wave-result.json` MUST contain every exact CAMP-00 assertion,
  including packaged-mode independence, host modes/matrix, ordering, build,
  journey, no-replace/stable reads, cleanup, and port reuse, all `true`
- **AND** durable reopen MUST revalidate both result bytes and manifest digests

#### Scenario: Failed or incomplete proof publishes no successful receipt

- **WHEN** either successful start, either wildcard rejection probe, the
  existing HTTP/WebSocket/restart journey, product provenance, artifact schema,
  or durable digest validation fails
- **THEN** the controller MUST NOT publish a successful CAMP-00 receipt

#### Scenario: Exact-main proof gates the next wave

- **WHEN** the focused product PR merges with its reviewed head and all
  applicable GitHub checks passing
- **THEN** the controller MUST rerun the immutable CAMP-00 command against
  freshly fetched exact main under a new run identity
- **AND** CAMP-01A MUST remain blocked until that durable result and its
  creation-bound cleanup receipt revalidate

