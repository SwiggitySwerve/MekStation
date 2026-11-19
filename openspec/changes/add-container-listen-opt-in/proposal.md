## Why

The production Docker image sets `HOSTNAME=0.0.0.0`, which a container needs to be reachable through a port map. Since c9bc06ef3 (2026-08-12), the packaged server accepts only the `127.0.0.1` loopback listener and exits on any other host. So the image builds (after PARITY-PLAN 1.0.84) but cannot start: `[mp-boot] invalid HOSTNAME "0.0.0.0"`. The owner chose an explicit container-only opt-in (PARITY-PLAN 1.0.92, §202).

## What Changes

- `server.js` binds `0.0.0.0` in the packaged layout only when `HOSTNAME` is exactly `0.0.0.0` **and** `MEKSTATION_CONTAINER_LISTEN` is exactly `all-interfaces`, and logs `CONTAINER_LISTEN_ALL_INTERFACES` at boot.
- Every other value, the variable with any other host, and development mode leave the existing loopback rule unchanged, with a logged "ignored" line.
- Only the production `Dockerfile` sets the variable. A test keeps it out of `desktop/`, `src/`, `scripts/`, `.github/`, `package.json`, `docker-compose.yml` and `electron-builder.yml`.
- The same-host request guard, the desktop app's `HOSTNAME=127.0.0.1` launch and the packaged listener-ready evidence are unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `desktop-experience`: the packaged listener requirement gains the exact container opt-in and its no-accident scenario.

## Non-goals

- LAN access to the container's API. The same-host guard still requires a literal loopback `Host`, so the container serves the Docker host through a loopback port map.
- Any change to the desktop (Electron) listener.
