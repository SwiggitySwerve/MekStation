# Safe development port startup

## Why

Development startup currently kills every listener on port 3600, including
servers and E2E runs in other checkouts. Selecting PORT does not prevent the kill.

## What Changes

- Share a port guard between development modes and production-evidence startup.
- Default to 3600, honor PORT, and reject invalid ports.
- Refuse occupied ports, report their PID, and suggest selecting a free port.
- Never reclaim a port automatically. Preserve configuration synchronization,
  custom multiplayer startup, webpack E2E mode, and explicit CI server commands.

## Impact

- Capability: e2e-testing.
- Code: package scripts, scripts/next, and the production-evidence wrapper.
- No gameplay, schema, persistence, dependency, or CI workflow changes.
- Electron keeps its current development URL on 3600.
- PID lookup uses the existing public machine-idle utility. If OS enumeration
  fails, startup still refuses the port and explains the diagnostic failure.
