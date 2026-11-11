## ADDED Requirements

### Requirement: API Writes Bypass Worker Fetch Dispatch

The service worker SHALL register static network routing during installation,
when `event.addRoutes` is supported, for PUT, POST, PATCH and DELETE requests
matching `/api/*`. GET handling and offline caches SHALL retain their existing
behavior. Browsers without this API SHALL retain their existing behavior.

#### Scenario: Supported browser installs a worker

- **WHEN** the install event provides `addRoutes`
- **THEN** exactly those four API write methods use the network source
- **AND** the existing static assets are cached and skipWaiting is requested

#### Scenario: Static routing is unavailable

- **WHEN** the install event has no `addRoutes` function
- **THEN** installation completes with the existing asset caching and skipWaiting
- **AND** no static route registration is attempted

#### Scenario: Warm controlled document reloads during debounce

- **GIVEN** a campaign is saved and the service worker controls the page after several reloads
- **WHEN** the user advances one day and reloads before the ordinary save
- **THEN** the server record reaches the advanced date without another edit

#### Scenario: Clean reload has no pending write

- **WHEN** a saved campaign is reloaded with no pending mutations
- **THEN** no campaign PUT is sent

## MODIFIED Requirements

### Requirement: Service Worker Lifecycle Management

The system SHALL handle service worker state transitions and updates.
The page SHALL reload at most once when an existing worker controller is
replaced, and SHALL NOT reload automatically while campaign persistence is
dirty. It SHALL wait at most 10 seconds for the existing ordinary save to clear
dirty. A save error, conflict, timeout or unmount SHALL cancel that automatic
reload and remove its subscription and timer without clearing pending edits.

#### Scenario: Update detection

- **WHEN** a new service worker version is available
- **THEN** updatefound fires on the registration
- **AND** the system listens for statechange on registration.installing

#### Scenario: Waiting state

- **WHEN** a new worker reaches installed state while an existing controller is present
- **THEN** isWaiting becomes true

#### Scenario: Skip waiting

- **WHEN** skipWaiting is called and registration.waiting exists
- **THEN** the page posts SKIP_WAITING to the waiting worker
- **AND** the worker requests activation through self.skipWaiting

#### Scenario: Clean controller replacement

- **WHEN** an existing controller is replaced while campaign persistence is clean
- **THEN** the page reloads once under the new controller

#### Scenario: First installation claims the page

- **WHEN** no controller existed before the first controller change
- **THEN** the page does not reload

#### Scenario: Pending ordinary save succeeds

- **GIVEN** an existing controller is replaced while a campaign is dirty
- **WHEN** the ordinary save acknowledges all pending edits within 10 seconds
- **THEN** the page reloads once after dirty becomes false
- **AND** an acknowledgement that leaves newer edits dirty does not reload

#### Scenario: Pending save cannot complete safely

- **GIVEN** an update reload is waiting for a dirty campaign
- **WHEN** a save errors, conflicts, or remains pending for 10 seconds
- **THEN** the automatic reload is cancelled and the document stays open
- **AND** pending edits remain available through the existing persistence UI
- **AND** a later acknowledgement does not restart that cancelled reload

#### Scenario: Waiting page unmounts

- **WHEN** the hook unmounts during a pending update reload
- **THEN** its subscription and timeout are removed and no reload follows
