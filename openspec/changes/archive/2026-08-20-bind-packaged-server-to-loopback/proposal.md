## Why

Electron starts the packaged server with `HOSTNAME=127.0.0.1`, but `server.js` currently calls `server.listen(port)` and therefore does not bind the actual HTTP/WebSocket listener to that loopback address. Because the local campaign and multiplayer APIs are intentionally unauthenticated, proving the listener is loopback-only is a prerequisite to every CAMP-01 product wave.

## What Changes

- Derive packaged mode from the package-owned standalone config marker, validate its `.next` companion, never use ambient `NODE_ENV`, and reject wildcard/non-loopback hosts in every mode before Next.
- Extend the packaged-socket validation seam to prove the operating system-reported bound address for both initial start and restart, while retaining the existing HTTP, WebSocket replay, and durable reconnect checks.
- Extend only the child-owned immutable `camp-00` row, without changing its command or digest, so the closed listener and wave results durably bind every validated observation predicate at reviewed head and exact main.
- Finalize the ephemeral observation with same-directory no-replace semantics and reject unspecified, non-loopback, malformed, mismatched, replaced, or path-drifted evidence before any follower wave.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `desktop-experience`: Require the packaged production server's actual listener to bind to its configured loopback hostname and require process-level proof rather than configuration/log inspection.

## Non-goals

- Adding API authentication, tenant ownership, TLS, remote hosting, LAN exposure, or firewall configuration.
- Changing campaign or multiplayer routes, wire protocols, persistence, ports, or Electron startup ownership.
- Supporting caller-selected arbitrary hostnames or treating a successful request to loopback as proof of the listener's bound address.
- Implementing product code in this specification PR or adding a dependency.

## Impact

- Affected runtime seam: `server.js` listener startup.
- Affected validation seam: `scripts/validate-multiplayer-packaged-socket.mjs` and its focused regression coverage.
- Affected authority seam: the CAMP-PROOF writer's closed, ephemeral CAMP-00 observation adapter, implemented before this product wave from the merged child specs.
- Affected specification: `openspec/specs/desktop-experience/spec.md`.
- Delivery remains one focused product PR capped at 4 files and 180 changed lines, gated by the merged CAMP authority-receipt implementation, PROOF-02 triage/repairs, reviewed-head proof, exact-main proof, and cleanup.
