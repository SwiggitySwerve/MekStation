## Why

All live networked multiplayer fails on the plain `npm run dev` server: host and guest sockets are accepted then immediately closed `1008 unknown-campaign-match` / `unknown-match`, the 1v1 lobby hangs on "Joining lobby… Status: closed", and co-op join times out waiting for the host snapshot (2026-07-07 live playtest, finding C3). Root cause: `getDefaultMatchStore` keeps its singleton in module-level state, but the dev server loads the module through two module graphs — `server.js` requires it via the `tsx/cjs` hook for the WebSocket upgrade path while Next/Turbopack compiles a separate copy for the REST API routes — so REST-created matches live in one `InMemoryMatchStore` and the socket handler looks them up in another (the "dev-only store in use" banner logs once per instantiation, twice per session). `MULTIPLAYER_STORE=durable` masks it because both copies share one SQLite file, which is why the Playwright e2e config passes while manual dev play is broken.

## What Changes

- The match-store (and player-store) singleton becomes process-global: the cached instance is anchored on `globalThis` under a namespaced key so every module-graph copy of the factory resolves the same store within one Node process. Dev keeps in-memory semantics; production keeps the durable store.
- The dev-only startup banner logs once per process (a second instantiation attempt is now impossible by construction; the banner moves to/asserts at the singleton seam).
- A regression test simulates the dual-module-graph condition (two isolated copies of the factory module state) and asserts both resolve the same store instance.
- Manual-dev socket proof: the live validation for this change goes through the real transport (`POST /api/multiplayer/matches` + socket upgrade on the running dev server), not the in-process runtime shim that previously green-lit a broken flow.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `multiplayer-server`: "Dev-Mode In-Memory Store" — the dev store SHALL be one instance per server process regardless of how many module graphs load the factory; REST-created matches SHALL be visible to the socket upgrade handler in dev.

## Impact

- `src/lib/multiplayer/server/getDefaultMatchStore.ts` (globalThis-anchored singleton; same treatment for the player store if `InMemoryPlayerStore` has the same factory pattern — its banner also logged at match creation in the playtest), test alongside existing store contract suites.
- No transport, envelope, auth, or route changes. Non-goals: changing the dev default to the durable store (in-memory dev semantics stay); packaged-build store selection; matchmaking behavior.
