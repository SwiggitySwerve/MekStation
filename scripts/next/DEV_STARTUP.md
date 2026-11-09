# Development startup

The dev-port and run-dev modules own development port selection and startup ordering.

- `npm run dev` defaults to port 3600 and starts the custom multiplayer server.
- `npm run dev:e2e` uses Next's webpack development mode on the same selected port.
- Set `PORT` to an integer from 1 through 65535 to select another port. In
  PowerShell: `$env:PORT = '3687'; npm run dev`.
- An occupied port fails before configuration synchronization or server launch.
  The diagnostic names the listener PID using the public machine-idle utility.
  If PID lookup is unavailable, startup explains the failure and still refuses
  the port. Stop the holder explicitly or select a free port.
- No process is reclaimed automatically, including servers from this checkout.
- The guard releases its probe socket before startup. The server's own bind is
  authoritative if another process claims the port after that check.
- The launcher synchronizes the browser manifest before starting the server,
  forwards termination signals to its own child, and preserves failure status.
- Production-evidence startup runs `run-dev.mjs --check-port` before its build.
  Playwright forwards `MEKSTATION_E2E_PORT` as `PORT`; CI's explicit standalone
  server commands and readiness-token rules remain unchanged.
- Electron's development wait URL and window are still fixed at port 3600.

`dev-port.cjs` exposes the port boundary to Node and Jest. OS process discovery
and environment reads stay in `run-dev.mjs`, outside the guard's test import graph.
