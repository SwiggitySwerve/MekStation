## ADDED Requirements

### Requirement: Packaged Local Server Listener Boundary

The packaged desktop application's production HTTP server SHALL bind its actual listener to the configured loopback hostname before campaign, custom-unit, force, or encounter routes accept traffic. Supplying `HOSTNAME=127.0.0.1` to the child process or logging a loopback URL SHALL NOT count as proof unless the listener receives that hostname.

#### Scenario: Packaged server listens only on configured loopback

- **GIVEN** the packaged server starts with `HOSTNAME=127.0.0.1`
- **WHEN** the HTTP listener begins accepting connections
- **THEN** the listener SHALL bind explicitly to `127.0.0.1`
- **AND** it SHALL NOT bind the unspecified IPv4 or IPv6 address

#### Scenario: Verification inspects the live listener

- **WHEN** packaged-server security verification runs
- **THEN** it SHALL start the production listener through a bounded test seam and inspect the actual bound address
- **AND** a static assertion that Electron merely sets the environment variable SHALL NOT satisfy the gate
