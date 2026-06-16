# desktop-experience Delta — harden-desktop-and-api-security

## ADDED Requirements

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
