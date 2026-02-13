# pwa-offline-system Specification

## Purpose

Provides Progressive Web App (PWA) capabilities including offline detection, service worker lifecycle management, caching strategies, install prompts, and manifest configuration. Enables the application to function offline, cache assets intelligently, and be installed as a standalone app on user devices.

## Requirements

### Requirement: Offline Status Detection

The system SHALL detect and track online/offline network status using browser APIs and optional network verification.

#### Scenario: Basic offline detection

- **WHEN** browser goes offline
- **THEN** navigator.onLine returns false
- **AND** window 'offline' event fires
- **AND** isOffline state updates to true
- **AND** lastChanged timestamp is recorded

#### Scenario: Online restoration

- **WHEN** browser comes back online
- **THEN** navigator.onLine returns true
- **AND** window 'online' event fires
- **AND** isOnline state updates to true
- **AND** onOnline callback is triggered (if provided)

#### Scenario: Optional network verification

- **WHEN** performNetworkCheck option is enabled
- **THEN** system performs HEAD request to pingUrl (default: /api/health)
- **AND** uses no-cors mode for cross-origin compatibility
- **AND** verifies actual connectivity beyond navigator.onLine
- **AND** updates status based on fetch success/failure

#### Scenario: SSR safety

- **WHEN** running in server-side rendering environment
- **THEN** system assumes online status (navigator undefined)
- **AND** no event listeners are attached
- **AND** no errors are thrown

### Requirement: Offline Indicator UI

The system SHALL display persistent toast notifications for offline/online status transitions.

#### Scenario: Offline notification

- **WHEN** browser goes offline
- **THEN** warning toast displays "No internet connection"
- **AND** toast has duration of 0 (persistent)
- **AND** toast remains visible until connection restored

#### Scenario: Online notification

- **WHEN** browser comes back online
- **THEN** success toast displays "Back online"
- **AND** toast auto-dismisses after default duration (3 seconds)
- **AND** offline warning toast is automatically dismissed

#### Scenario: Event listener cleanup

- **WHEN** component using useOfflineIndicator unmounts
- **THEN** online and offline event listeners are removed
- **AND** no memory leaks occur

### Requirement: Service Worker Registration

The system SHALL register and manage service worker lifecycle.

#### Scenario: Service worker support detection

- **WHEN** application loads
- **THEN** system checks if 'serviceWorker' in navigator
- **AND** isSupported flag reflects browser capability
- **AND** registration is skipped if not supported

#### Scenario: Initial registration

- **WHEN** service worker is supported
- **THEN** system registers /service-worker.js
- **AND** isInstalled state updates to true on success
- **AND** registration object is stored in state
- **AND** errors are logged if registration fails

#### Scenario: Service worker activation

- **WHEN** service worker becomes active
- **THEN** navigator.serviceWorker.controller is set
- **AND** isActivated state updates to true
- **AND** service worker begins intercepting fetch requests

### Requirement: Service Worker Lifecycle Management

The system SHALL handle service worker state transitions and updates.

#### Scenario: Update detection

- **WHEN** new service worker version is available
- **THEN** 'updatefound' event fires on registration
- **AND** registration.installing contains new worker
- **AND** system listens for statechange events

#### Scenario: Waiting state

- **WHEN** new service worker reaches 'installed' state
- **AND** existing service worker is controlling page
- **THEN** isWaiting state updates to true
- **AND** new worker waits for activation

#### Scenario: Skip waiting

- **WHEN** skipWaiting() is called
- **AND** registration.waiting exists
- **THEN** system posts SKIP_WAITING message to waiting worker
- **AND** worker calls self.skipWaiting()
- **AND** worker activates immediately

#### Scenario: Controller change and reload

- **WHEN** new service worker becomes active
- **THEN** 'controllerchange' event fires
- **AND** page automatically reloads
- **AND** new service worker takes control

### Requirement: Caching Strategies

The service worker SHALL implement multiple caching strategies based on resource type.

#### Scenario: Cache-first for static assets

- **WHEN** request is for image or font
- **OR** request URL starts with /icons/ or /images/
- **THEN** service worker checks cache first
- **AND** returns cached response if available
- **AND** fetches from network if cache miss
- **AND** caches successful network response

#### Scenario: Network-first for HTML documents

- **WHEN** request destination is 'document'
- **OR** request mode is 'navigate'
- **THEN** service worker tries network first
- **AND** caches successful response in RUNTIME_CACHE
- **AND** falls back to cached version if network fails
- **AND** returns /offline.html if both fail

#### Scenario: Stale-while-revalidate for JS/CSS

- **WHEN** request destination is 'script' or 'style'
- **THEN** service worker returns cached version immediately
- **AND** fetches fresh version in background
- **AND** updates cache with fresh response
- **AND** next request gets updated version

#### Scenario: Non-GET request passthrough

- **WHEN** request method is not GET
- **THEN** service worker does not intercept
- **AND** request passes through to network

#### Scenario: Cross-origin request passthrough

- **WHEN** request origin differs from location.origin
- **THEN** service worker does not intercept
- **AND** request passes through to network

### Requirement: Cache Versioning and Cleanup

The service worker SHALL manage cache versions and clean up old caches.

#### Scenario: Static cache on install

- **WHEN** service worker installs
- **THEN** CACHE_NAME cache is opened
- **AND** STATIC_ASSETS array is cached
- **AND** self.skipWaiting() is called
- **AND** worker activates immediately

#### Scenario: Old cache cleanup on activate

- **WHEN** service worker activates
- **THEN** all cache names are retrieved
- **AND** caches not matching CACHE_NAME or RUNTIME_CACHE are deleted
- **AND** self.clients.claim() takes control of pages
- **AND** old versions are removed

#### Scenario: Cache name versioning

- **GIVEN** CACHE_NAME = 'mekstation-v1'
- **AND** RUNTIME_CACHE = 'mekstation-runtime-v1'
- **WHEN** cache version is incremented
- **THEN** new caches are created
- **AND** old caches are cleaned up on activation

### Requirement: Manual Cache Management

The system SHALL support manual cache updates via message passing.

#### Scenario: Manual URL caching

- **WHEN** cacheUrls() is called with URL array
- **AND** service worker is active
- **THEN** system posts CACHE_URLS message to active worker
- **AND** worker adds URLs to CACHE_NAME cache
- **AND** URLs are available for offline access

#### Scenario: Message handling in worker

- **WHEN** service worker receives CACHE_URLS message
- **THEN** worker opens CACHE_NAME cache
- **AND** calls cache.addAll(event.data.urls)
- **AND** waits for caching to complete

### Requirement: Install Prompt Management

The system SHALL manage PWA install prompt display and user interaction.

#### Scenario: Install prompt deferral

- **WHEN** browser fires 'beforeinstallprompt' event
- **THEN** event.preventDefault() is called
- **AND** event is stored in deferredPrompt state
- **AND** showPrompt is set to true after 3 second delay

#### Scenario: Already installed detection (display-mode)

- **WHEN** window.matchMedia('(display-mode: standalone)').matches
- **THEN** isInstalled is set to true
- **AND** install prompt is not shown

#### Scenario: Already installed detection (Safari)

- **WHEN** navigator.standalone === true
- **THEN** isInstalled is set to true
- **AND** install prompt is not shown

#### Scenario: Install prompt display

- **WHEN** showPrompt is true
- **AND** deferredPrompt exists
- **AND** app is not installed
- **AND** prompt was not recently dismissed
- **THEN** install prompt UI renders at bottom-right
- **AND** prompt slides up with animation
- **AND** displays "Install MekStation" message

#### Scenario: User accepts install

- **WHEN** user clicks "Install" button
- **THEN** deferredPrompt.prompt() is called
- **AND** system waits for deferredPrompt.userChoice
- **AND** outcome is logged (accepted/dismissed)
- **AND** deferredPrompt is cleared
- **AND** showPrompt is set to false

#### Scenario: User dismisses prompt

- **WHEN** user clicks "Not Now" button
- **THEN** showPrompt is set to false
- **AND** dismissal timestamp is stored in localStorage
- **AND** prompt will not show again for 7 days

#### Scenario: Dismissal cooldown

- **WHEN** checking if prompt should display
- **AND** localStorage contains 'pwa-install-prompt-dismissed'
- **AND** dismissal was less than 7 days ago
- **THEN** prompt is not shown
- **AND** wasRecentlyDismissed() returns true

#### Scenario: App installed event

- **WHEN** 'appinstalled' event fires
- **THEN** isInstalled is set to true
- **AND** showPrompt is set to false
- **AND** deferredPrompt is cleared
- **AND** prompt UI is removed

### Requirement: PWA Manifest Configuration

The application SHALL provide a web app manifest with metadata and icons.

#### Scenario: Basic manifest properties

- **WHEN** manifest.json is loaded
- **THEN** name is "MekStation"
- **AND** short_name is "MekStation"
- **AND** description is "BattleTech Mech customization and gameplay tracking"
- **AND** start_url is "/"
- **AND** display is "standalone"

#### Scenario: Theme and appearance

- **WHEN** manifest is loaded
- **THEN** background_color is "#ffffff"
- **AND** theme_color is "#00bfff"
- **AND** orientation is "portrait-primary"

#### Scenario: Icon configuration

- **WHEN** manifest icons are loaded
- **THEN** 192x192 icon is provided
- **AND** 512x512 icon is provided
- **AND** both have purpose "any maskable"
- **AND** both are PNG format

#### Scenario: App shortcuts

- **WHEN** manifest shortcuts are loaded
- **THEN** "Customize Mech" shortcut points to /customizer
- **AND** "Gameplay Sheet" shortcut points to /gameplay
- **AND** each shortcut has name, short_name, description, and icon

#### Scenario: App categorization

- **WHEN** manifest categories are loaded
- **THEN** categories include "games" and "entertainment"

## Non-Goals

The following are explicitly OUT OF SCOPE for this specification:

- **Background sync** - Syncing data when connection is restored
- **Push notifications** - Server-initiated notifications
- **Periodic background sync** - Scheduled background updates
- **Offline data persistence** - IndexedDB or local storage strategies
- **Conflict resolution** - Handling offline data conflicts
- **Service worker update UI** - Prompting users to reload for updates

## Dependencies

- **Toast Notifications** (`toast-notifications`) - For offline/online status display
- **Logger Utility** (`@/utils/logger`) - For service worker error logging
- React 19 hooks (useState, useEffect, useCallback)
- Browser APIs: navigator.onLine, ServiceWorker API, BeforeInstallPromptEvent

## Implementation Notes

### Performance Considerations

- Service worker registration is non-blocking
- Cache lookups are fast (IndexedDB-backed)
- Stale-while-revalidate minimizes perceived latency
- Event listeners are cleaned up on unmount

### Edge Cases

- **Safari iOS**: Uses navigator.standalone instead of display-mode
- **Firefox**: May not support beforeinstallprompt event
- **No-cors mode**: Opaque responses cannot be inspected
- **Cache storage limits**: Browsers may evict caches under storage pressure

### Security Considerations

- Service workers require HTTPS (except localhost)
- No-cors mode prevents reading response bodies
- Cache poisoning mitigated by origin checks

### Browser Compatibility

- Service workers: Chrome 40+, Firefox 44+, Safari 11.1+, Edge 17+
- BeforeInstallPromptEvent: Chrome/Edge only (not Firefox/Safari)
- Display-mode media query: Chrome 42+, Safari 13+

## Examples

### Basic offline detection

```typescript
import { useOfflineStatus } from '@/hooks/useOfflineStatus';

function MyComponent() {
  const { isOnline, isOffline, lastChanged } = useOfflineStatus();

  return (
    <div>
      <p>Status: {isOnline ? 'Online' : 'Offline'}</p>
      {lastChanged && <p>Last changed: {new Date(lastChanged).toLocaleString()}</p>}
    </div>
  );
}
```

### Offline detection with callbacks

```typescript
import { useOfflineStatus } from '@/hooks/useOfflineStatus';

function MyComponent() {
  const { isOnline } = useOfflineStatus({
    onOffline: () => {
      console.log('Connection lost');
      // Pause auto-save, queue changes, etc.
    },
    onOnline: () => {
      console.log('Connection restored');
      // Resume auto-save, sync queued changes, etc.
    },
  });

  return <button disabled={!isOnline}>Save</button>;
}
```

### Offline detection with network verification

```typescript
import { useOfflineStatus } from '@/hooks/useOfflineStatus';

function MyComponent() {
  const { isOnline } = useOfflineStatus({
    performNetworkCheck: true,
    pingUrl: '/api/health',
  });

  return <div>Verified online: {isOnline ? 'Yes' : 'No'}</div>;
}
```

### Offline indicator integration

```typescript
import { useOfflineIndicator } from '@/hooks/useOfflineIndicator';

function App() {
  useOfflineIndicator(); // Automatically shows toasts

  return <div>App content</div>;
}
```

### Service worker management

```typescript
import { useServiceWorker } from '@/hooks/useServiceWorker';

function ServiceWorkerStatus() {
  const { isSupported, isInstalled, isWaiting, skipWaiting, cacheUrls } = useServiceWorker();

  const handleUpdate = () => {
    skipWaiting(); // Activates waiting worker and reloads page
  };

  const handleCacheUrls = () => {
    cacheUrls(['/offline.html', '/icons/icon.svg']);
  };

  return (
    <div>
      <p>Supported: {isSupported ? 'Yes' : 'No'}</p>
      <p>Installed: {isInstalled ? 'Yes' : 'No'}</p>
      {isWaiting && <button onClick={handleUpdate}>Update Available</button>}
      <button onClick={handleCacheUrls}>Cache URLs</button>
    </div>
  );
}
```

### Install prompt integration

```tsx
import { InstallPrompt } from '@/components/pwa/InstallPrompt';

function App() {
  return (
    <div>
      <InstallPrompt />
      {/* Rest of app */}
    </div>
  );
}
```

### Service worker caching strategies

```javascript
// service-worker.js

// Cache-first for images
if (request.destination === 'image') {
  event.respondWith(cacheFirst(request));
}

// Network-first for HTML
if (request.destination === 'document') {
  event.respondWith(networkFirst(request));
}

// Stale-while-revalidate for JS/CSS
if (request.destination === 'script' || request.destination === 'style') {
  event.respondWith(staleWhileRevalidate(request));
}
```

## References

- **Service Worker API**: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- **PWA Manifest**: https://developer.mozilla.org/en-US/docs/Web/Manifest
- **BeforeInstallPromptEvent**: https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
- **Caching Strategies**: https://web.dev/offline-cookbook/
- **Related Specs**: `toast-notifications`
