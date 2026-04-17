# Change: Add Multiplayer Server Infrastructure

## Why

**Sub-phase 4b.** The 4a P2P model works for 1v1 but has structural
limits: no cheat resistance beyond "both peers ran the same build", no
support for 3+ players, and host-leaves = game over. Phase 4b steps up
to a server-authoritative model: the canonical `GameSession` runs on a
server, clients connect as observers that submit intents, and all random
rolls and rule resolution happen server-side. This change is the
foundation — a transport contract, a session persistence contract, and
a scaffold for running the same `GameEngine` server-side — without
committing to a specific hosting provider yet.

## What Changes

- Introduce `multiplayer-server` spec describing the WebSocket-based
  client-server protocol and the session persistence contract
- Define the transport: bi-directional WebSocket channel between client
  and server, JSON-encoded messages, with typed envelopes:
  `SessionJoin`, `Intent`, `Event`, `ReplayStream`, `Heartbeat`,
  `Error`, `Close`
- Define the session persistence contract: a pluggable `IMatchStore`
  interface with `createMatch`, `appendEvent`, `getEvents`,
  `getMatchMeta`, `closeMatch` — leaving the concrete implementation
  (SQLite, Postgres, Redis, Fly Volumes, Supabase) deferred
- Scaffold a Node.js server that runs `GameEngine` + `InteractiveSession`
  server-side under the existing Next.js API route structure, with a
  dev-mode in-memory `IMatchStore`
- Keep the hosting decision open: proposal defines the protocol + the
  store contract; production implementation is a later change

## Dependencies

- **Requires**: `add-p2p-game-session-sync` (validated the event-sync
  model that the server now arbitrates), existing
  `game-session-management`, `api-layer`, `event-store`,
  `auto-save-persistence`
- **Required By**: `add-authoritative-roll-arbitration`,
  `add-multiplayer-lobby-and-matchmaking-2-8`,
  `add-player-identity-and-auth`,
  `add-reconnection-and-session-rehydration`,
  `add-fog-of-war-event-filtering`

## Impact

- Affected specs: `multiplayer-server` (ADDED — WebSocket envelopes,
  match store contract, server lifecycle), `api-layer` (MODIFIED —
  documents the WebSocket path and thin REST surface for match
  creation)
- Affected code: new `src/server/multiplayer/` (transport, match store,
  session host), new `src/pages/api/multiplayer/` WebSocket upgrade
  endpoint, new `src/lib/multiplayer/client.ts` (typed client wrapper)
- Non-goals: specific cloud vendor, identity/auth (separate change),
  fog of war (separate change), load balancing, horizontal scaling,
  encryption beyond TLS, voice chat
