# pwa-foundation Specification

## Purpose
Enable MekStation installation as a Progressive Web App on mobile and desktop platforms, providing offline capabilities and app-like experience.

## Requirements

### Requirement: Web App Manifest
The system SHALL provide a valid web app manifest for PWA installation.

#### Scenario: Manifest metadata
- **WHEN** serving the application
- **THEN** system SHALL provide manifest.json at /manifest.json
- **AND** manifest SHALL include app name "MekStation - BattleTech Unit Construction"
- **AND** manifest SHALL include short name "MekStation"
- **AND** manifest SHALL set display mode to "standalone"
- **AND** manifest SHALL set orientation to "any"

#### Scenario: Manifest icons
- **GIVEN** the web app manifest
- **WHEN** browser reads manifest for installation
- **THEN** manifest SHALL include 192x192 PNG icon
- **AND** manifest SHALL include 512x512 PNG icon
- **AND** icons SHALL have purpose "any maskable"
- **AND** icons SHALL match MekStation branding (slate/amber theme)

#### Scenario: Manifest shortcuts
- **GIVEN** the web app manifest
- **WHEN** browser reads manifest for installation
- **THEN** manifest SHALL include shortcut for "Browse Units" at /units
- **AND** manifest SHALL include shortcut for "Customize Unit" at /customizer
- **AND** each shortcut SHALL include icon reference

#### Scenario: Theme colors
- **GIVEN** the web app manifest
- **WHEN** browser applies app theme
- **THEN** background_color SHALL be #0f172a (slate-900)
- **AND** theme_color SHALL be #f59e0b (amber-500)
- **AND** colors SHALL match MekStation branding

### Requirement: Service Worker
The system SHALL register a service worker for offline capability and caching.

#### Scenario: Service worker registration
- **GIVEN** a production build
- **WHEN** application starts in browser
- **THEN** system SHALL register service worker
- **AND** service worker SHALL use next-pwa plugin
- **AND** service worker SHALL be disabled in development mode

#### Scenario: Font caching strategy
- **GIVEN** the service worker is active
- **WHEN** browser requests Google Fonts
- **THEN** system SHALL use CacheFirst strategy
- **AND** fonts SHALL cache for 1 year
- **AND** cache SHALL hold maximum 4 entries

#### Scenario: Image caching strategy
- **GIVEN** the service worker is active
- **WHEN** browser requests images (png, jpg, svg, gif, webp, ico)
- **THEN** system SHALL use StaleWhileRevalidate strategy
- **AND** images SHALL cache for 24 hours
- **AND** cache SHALL hold maximum 64 entries

#### Scenario: Static asset caching
- **GIVEN** the service worker is active
- **WHEN** browser requests JavaScript or CSS files
- **THEN** system SHALL use StaleWhileRevalidate strategy
- **AND** assets SHALL cache for 7 days
- **AND** cache SHALL hold maximum 64 entries

#### Scenario: API call caching
- **GIVEN** the service worker is active
- **WHEN** browser makes API calls to /api/*
- **THEN** system SHALL use NetworkFirst strategy
- **AND** responses SHALL cache for 24 hours
- **AND** network SHALL timeout after 10 seconds
- **AND** cache SHALL hold maximum 32 entries

#### Scenario: JSON data caching
- **GIVEN** the service worker is active
- **WHEN** browser requests JSON data files
- **THEN** system SHALL use StaleWhileRevalidate strategy
- **AND** data SHALL cache for 7 days
- **AND** cache SHALL hold maximum 128 entries

### Requirement: PWA Installation UI
The system SHALL provide user interface for PWA installation.

#### Scenario: Install button visibility (Chrome/Edge)
- **GIVEN** browser supports beforeinstallprompt event
- **WHEN** app becomes installable
- **THEN** system SHALL display "Install App" button in sidebar footer
- **AND** button SHALL show lightning bolt icon
- **AND** button SHALL use amber accent color

#### Scenario: Install prompt handling (Chrome/Edge)
- **GIVEN** user clicks "Install App" button
- **WHEN** beforeinstallprompt event is available
- **THEN** system SHALL trigger browser install prompt
- **AND** prompt SHALL ask user to install app
- **AND** system SHALL handle user choice (accepted/dismissed)

#### Scenario: Install button visibility (iOS Safari)
- **GIVEN** browser is iOS Safari
- **WHEN** app is loaded
- **THEN** system SHALL display "Install App" button
- **AND** system SHALL detect iOS via user agent
- **AND** system SHALL NOT rely on beforeinstallprompt

#### Scenario: Install instructions (iOS Safari)
- **GIVEN** user clicks "Install App" button on iOS
- **WHEN** iOS does not support beforeinstallprompt
- **THEN** system SHALL display alert with installation instructions
- **AND** instructions SHALL explain Share → Add to Home Screen
- **AND** instructions SHALL be clear and actionable

#### Scenario: Install button hiding
- **GIVEN** app is already installed
- **WHEN** app launches in standalone mode
- **THEN** system SHALL detect standalone display mode
- **AND** install button SHALL NOT display
- **AND** system SHALL check via window.matchMedia('(display-mode: standalone)')

#### Scenario: Collapsed sidebar button
- **GIVEN** sidebar is collapsed
- **WHEN** app is installable
- **THEN** install button SHALL show icon only
- **AND** button SHALL have tooltip on hover
- **AND** button SHALL maintain 44x44px minimum touch target

#### Scenario: Expanded sidebar button
- **GIVEN** sidebar is expanded
- **WHEN** app is installable
- **THEN** install button SHALL show icon and "Install App" text
- **AND** button SHALL span full footer width
- **AND** button SHALL maintain visual hierarchy

### Requirement: Mobile Viewport Configuration
The system SHALL configure viewport for optimal mobile display.

#### Scenario: Viewport meta tag
- **GIVEN** the application HTML head
- **WHEN** page loads on mobile device
- **THEN** viewport meta tag SHALL set width=device-width
- **AND** initial-scale SHALL be 1.0
- **AND** maximum-scale SHALL be 5.0
- **AND** viewport-fit SHALL be cover (for notched devices)

#### Scenario: Apple mobile web app meta tags
- **GIVEN** the application HTML head
- **WHEN** page loads in iOS Safari
- **THEN** apple-mobile-web-app-capable SHALL be yes
- **AND** apple-mobile-web-app-status-bar-style SHALL be black-translucent
- **AND** theme-color SHALL match manifest (#0f172a)

#### Scenario: Manifest link
- **GIVEN** the application HTML head
- **WHEN** browser loads page
- **THEN** link rel="manifest" SHALL point to /manifest.json
- **AND** apple-touch-icon SHALL point to /icon-192x192.png

### Requirement: Safe Area Support
The system SHALL support safe area insets for notched mobile devices.

#### Scenario: Safe area CSS variables
- **GIVEN** notched device (iPhone X+)
- **WHEN** CSS uses env() function
- **THEN** system SHALL define --safe-area-inset-top variable
- **AND** system SHALL define --safe-area-inset-right variable
- **AND** system SHALL define --safe-area-inset-bottom variable
- **AND** system SHALL define --safe-area-inset-left variable
- **AND** variables SHALL fallback to 0px for non-supporting browsers

#### Scenario: Safe area padding utilities
- **GIVEN** component needs safe area padding
- **WHEN** component uses .p-safe-top class
- **THEN** padding-top SHALL be calc(0.75rem + var(--safe-area-inset-top))
- **AND** .p-safe-bottom SHALL add bottom safe area inset
- **AND** .p-safe-left SHALL add left safe area inset
- **AND** .p-safe-right SHALL add right safe area inset

#### Scenario: Safe area full padding
- **GIVEN** component needs safe area padding on all sides
- **WHEN** component uses .p-safe class
- **THEN** padding SHALL include safe area insets on all sides
- **AND** base padding SHALL be 0.75rem
- **AND** insets SHALL be added to base padding

#### Scenario: Safe area margin utilities
- **GIVEN** component needs safe area margins
- **WHEN** component uses .mt-safe class
- **THEN** margin-top SHALL be var(--safe-area-inset-top)
- **AND** .mb-safe SHALL add bottom safe area inset
- **AND** .ml-safe SHALL add left safe area inset
- **AND** .mr-safe SHALL add right safe area inset

#### Scenario: Fixed positioning with safe areas
- **GIVEN** fixed element at bottom of viewport
- **WHEN** element uses .fixed-safe-bottom class
- **THEN** element SHALL be fixed at bottom
- **AND** padding-bottom SHALL include safe area inset
- **AND** element SHALL not overlap home indicator

#### Scenario: Fixed top with safe areas
- **GIVEN** fixed element at top of viewport
- **WHEN** element uses .fixed-safe-top class
- **THEN** element SHALL be fixed at top
- **AND** padding-top SHALL include safe area inset
- **AND** element SHALL not overlap notch

### Requirement: Touch Target Sizing
The system SHALL ensure interactive elements meet minimum touch target size.

#### Scenario: Minimum touch target size
- **GIVEN** mobile viewport (max-width: 768px)
- **WHEN** interactive element renders
- **THEN** button SHALL have min-height: 44px
- **AND** button SHALL have min-width: 44px
- **AND** anchor SHALL have min-height: 44px
- **AND** anchor SHALL have min-width: 44px

#### Scenario: Form input touch targets
- **GIVEN** mobile viewport (max-width: 768px)
- **WHEN** form input renders
- **THEN** text input SHALL have min-height: 44px
- **AND** select SHALL have min-height: 44px
- **AND** checkbox SHALL have min-height: 44px
- **AND** radio SHALL have min-height: 44px

#### Scenario: Touch action manipulation
- **GIVEN** form input on mobile device
- **WHEN** user taps input
- **THEN** touch-action SHALL be manipulation
- **AND** browser SHALL NOT zoom on focus
- **AND** tap delay SHALL be eliminated

### Requirement: PWA Test Compatibility
The system SHALL work correctly in test environments.

#### Scenario: matchMedia guard
- **GIVEN** test environment (jsdom)
- **WHEN** usePWAInstall hook initializes
- **THEN** system SHALL check typeof window.matchMedia === 'function'
- **AND** system SHALL NOT throw if matchMedia is undefined
- **AND** system SHALL default to false if check fails

#### Scenario: Event listener cleanup
- **GIVEN** usePWAInstall hook is active
- **WHEN** component unmounts
- **THEN** system SHALL remove beforeinstallprompt listener
- **AND** system SHALL remove appinstalled listener
- **AND** no memory leaks SHALL occur

### Requirement: Build and Test Success
The system SHALL maintain build stability and test coverage.

#### Scenario: Production build
- **GIVEN** PWA features implemented
- **WHEN** running npm run build
- **THEN** build SHALL complete successfully
- **AND** all routes SHALL compile
- **AND** service worker SHALL be generated
- **AND** no build errors SHALL occur

#### Scenario: Test suite
- **GIVEN** PWA features implemented
- **WHEN** running npm test
- **THEN** all existing tests SHALL pass
- **AND** no test failures SHALL be introduced
- **AND** PWA components SHALL be testable

### Requirement: Offline Capability
The system SHALL provide basic offline functionality.

#### Scenario: Cached asset loading
- **GIVEN** app has been loaded once online
- **WHEN** user goes offline
- **THEN** cached JavaScript SHALL load
- **AND** cached CSS SHALL load
- **AND** cached images SHALL load
- **AND** app SHALL remain functional

#### Scenario: API fallback
- **GIVEN** user is offline
- **WHEN** app makes API call
- **THEN** system SHALL attempt network request first
- **AND** system SHALL timeout after 10 seconds
- **AND** cached response SHALL be used if available
- **AND** app SHALL NOT crash

### Requirement: Lighthouse PWA Compliance
The system SHALL meet Lighthouse PWA criteria.

#### Scenario: PWA installable criteria
- **GIVEN** Lighthouse PWA audit
- **WHEN** audit runs
- **THEN** app SHALL have valid manifest
- **AND** app SHALL have registered service worker
- **AND** app SHALL have start_url
- **AND** app SHALL have display: standalone
- **AND** app SHALL have icons at least 192x192

#### Scenario: PWA scoring target
- **GIVEN** Lighthouse PWA audit
- **WHEN** audit completes
- **THEN** overall PWA score SHALL be 90 or higher
- **AND** installable SHALL pass
- **AND** offline SHALL pass
- **AND** manifest SHALL pass
