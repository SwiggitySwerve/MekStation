## Why

The production Docker image sets `HOSTNAME=0.0.0.0`, which a container needs to be reachable through a port map. Since c9bc06ef3 (2026-08-12), the packaged server accepts only the `127.0.0.1` loopback listener and exits on any other host. So the image builds (after PARITY-PLAN 1.0.84) but cannot start: `[mp-boot] invalid HOSTNAME "0.0.0.0"`. The owner chose an explicit container-only opt-in (PARITY-PLAN 1.0.92, §202).

## What Changes

- `server.js` binds `0.0.0.0` in the packaged layout only when `HOSTNAME` is exactly `0.0.0.0` **and** `MEKSTATION_CONTAINER_LISTEN` is exactly `all-interfaces`, and logs `CONTAINER_LISTEN_ALL_INTERFACES` at boot.
- Every other value, the variable with any other host, and development mode leave the existing loopback rule unchanged, with a logged "ignored" line.
- Only the production `Dockerfile` sets the variable. A test keeps it out of `desktop/`, `src/`, `scripts/`, `.github/`, `package.json`, `docker-compose.yml` and `electron-builder.yml`.
- The same-host request guard, the desktop app's `HOSTNAME=127.0.0.1` launch and the packaged listener-ready evidence are unchanged.
- The API rate-limit key (`clientRateLimitKey`) honours `X-Forwarded-For` only from a loopback hop; any other peer is keyed by its socket address, so a client of the container's port cannot rotate the header to evade the vault KDF limit.
- The packaged-socket validator strips the variable from its rejection probes, so an exported opt-in cannot satisfy or bypass them.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `desktop-experience`: the packaged listener requirement gains the exact container opt-in and its no-accident scenario.

## Non-goals

- LAN, remote or reverse-proxy access to the container. The same-host guard trusts a loopback `Host` header and the local API has no network authentication, so the compose file and run script publish the port on the host's `127.0.0.1` only, and the traefik labels are removed.
- Any change to the desktop (Electron) listener.
- Host checks on pages, `_next/data/*` and static `public/` files. The same-host guard covers `/api` and WebSocket upgrades only, so a client that reaches the port can read page data (for example `/gameplay/games` returns recent match logs). That is accepted (Root ruling on the 1.0.92 security review): with the loopback-only publish, the container is reachable by host-local processes, which is the desktop app's exposure, and also by containers sharing its Docker network, because the server listens on `0.0.0.0` inside the container. The compose and Dockerfile comments say not to attach untrusted containers to that network.
