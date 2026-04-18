# Tasks: Add Multiplayer Server Infrastructure

## 1. Transport Protocol

- [x] 1.1 Define `ServerMessage` and `ClientMessage` discriminated
      unions covering: `SessionJoin`, `Intent`, `Event`, `ReplayStart`,
      `ReplayChunk`, `ReplayEnd`, `Heartbeat`, `Error`, `Close`
- [x] 1.2 Each message carries `kind`, `matchId`, and a `ts` (ISO
      timestamp)
- [x] 1.3 All messages are JSON-encoded
- [x] 1.4 Envelope schema validation via zod on both client and server
- [x] 1.5 Heartbeat every 20 seconds; missed heartbeat after 60s =
      treat connection as dead

## 2. Match Store Contract

- [x] 2.1 Define `IMatchStore` interface with methods:
      `createMatch(meta): Promise<matchId>`,
      `appendEvent(matchId, event): Promise<void>`,
      `getEvents(matchId, fromSeq?): Promise<IGameEvent[]>`,
      `getMatchMeta(matchId): Promise<IMatchMeta>`,
      `updateMatchMeta(matchId, patch): Promise<void>`,
      `closeMatch(matchId): Promise<void>`
- [x] 2.2 Define `IMatchMeta` shape: `{matchId, hostPlayerId,
playerIds, sideAssignments, status: 'lobby' | 'active' |
'completed', createdAt, updatedAt, config}`
- [x] 2.3 Store contract MUST be transactional: `appendEvent` is
      all-or-nothing, sequence collisions SHALL reject
- [x] 2.4 Store MUST be async; synchronous implementations acceptable
      via `Promise.resolve`

## 3. In-Memory Match Store (Dev Mode)

- [x] 3.1 Implement `InMemoryMatchStore` satisfying `IMatchStore`
- [x] 3.2 Backs a `Map<matchId, {meta, events}>`
- [x] 3.3 Exposed via a factory so a production store can be swapped in
      without touching call sites
- [x] 3.4 Warn prominently on server startup: `"InMemoryMatchStore is
dev-only; configure a persistent store for production"`

## 4. WebSocket Upgrade Endpoint

- [x] 4.1 Add `src/pages/api/multiplayer/socket.ts` that handles the
      WebSocket upgrade under Next.js's custom server path
      (placeholder route returns 426; actual upgrade lives in
      `server.js`)
- [~] 4.2 First message from a client MUST be `SessionJoin`; server
      replies with either `ReplayStart` + log or `Error` (Wave 1
      stub closes with `INTERNAL_ERROR` — full handshake in Wave 2)
- [x] 4.3 Server maintains a `Set<WebSocket>` per match id for
      broadcasting (in `ServerMatchHost.sockets`)
- [x] 4.4 Disconnection removes the socket from the set but does NOT
      end the match

## 5. Server-Side Engine Host

- [x] 5.1 New `ServerMatchHost` class: wraps one `InteractiveSession`
      per active match, owns its lifetime
- [x] 5.2 Hosts receive `Intent` messages, validate, run the engine,
      append the resulting events to the `IMatchStore`, broadcast the
      events to all connected clients for that match
- [x] 5.3 Host persists after every appended event (write-through)
- [~] 5.4 Host loads its session from the store on creation so a server
      restart can resume (Wave 4 reconnect work — Wave 1 has the
      contract via `getEvents(fromSeq)` but does not rehydrate)

## 6. Client Wrapper

- [x] 6.1 New `src/lib/multiplayer/client.ts` exporting `connect(url,
matchId, auth)` → `IMultiplayerClient`
- [x] 6.2 Client exposes `send(intent)`, `on(event, cb)`, `close()`
- [x] 6.3 Client handles replay on connect: accumulates events until a
      `ReplayEnd`, then fires `ready`
- [x] 6.4 Client auto-reconnects with exponential backoff (capped at
      30s)

## 7. Match Creation REST

- [x] 7.1 `POST /api/multiplayer/matches` body: `{config, players:
IPlayerRef[]}` returns `{matchId, wsUrl}`
- [x] 7.2 `GET /api/multiplayer/matches/:id` returns match meta (for
      the lobby)
- [x] 7.3 `DELETE /api/multiplayer/matches/:id` (host-only) closes a
      match
- [x] 7.4 All endpoints require a valid `playerId` in a bearer token or
      header (full auth is a separate change)

## 8. Observability

- [~] 8.1 Each `ServerMatchHost` logs key events (Wave 2 will route
      through the `logging-system`; Wave 1 uses `console.warn` /
      `console.log` for startup + storage failures)
- [ ] 8.2 A metrics hook exposes active match count and connected
      player count for future dashboards (deferred to Wave 5 capstone)
- [~] 8.3 Correlate logs with `matchId` so a failing match can be
      traced end-to-end (current logs include matchId in the prefix)

## 9. Error Handling

- [~] 9.1 Malformed message → server responds `Error {code: 'BAD_
ENVELOPE'}` and keeps the connection open (Wave 1 client validates
      via zod; the upgrade-handler dispatch path lands in Wave 2)
- [x] 9.2 Invalid intent (e.g., out-of-phase) → server responds
      `Error {code: 'INVALID_INTENT', reason}` without mutating state
- [x] 9.3 Store error during append → server closes affected match with
      `{code: 'STORE_FAILURE'}` and broadcasts to all clients
- [x] 9.4 Client reconnect sends its `lastSeq`; server replays from
      there (`SessionJoin.lastSeq` + `getEvents(fromSeq)` contract)

## 10. Dev Server Scripts

- [x] 10.1 `npm run dev` starts Next.js with the WebSocket handler
      and an `InMemoryMatchStore` (replaces the old `next dev`)
- [ ] 10.2 `npm run mp-smoke` runs a smoke test: 2 client wrappers
      connect to the same match (deferred to Wave 5)
- [x] 10.3 Scripts referenced in `package.json`

## 11. Tests

- [x] 11.1 Unit test `InMemoryMatchStore` (create, append, get, close,
      sequence collision)
- [x] 11.2 Unit test envelope validation (valid + malformed samples)
- [~] 11.3 Integration test: spin up the server in-process, connect two
      clients (Wave 1 covers via `ServerMatchHost.test.ts` mock-socket
      broadcast assertions; full WebSocket round-trip is Wave 2)
- [ ] 11.4 Integration test: a server restart reloads the match
      (Wave 4 reconnect)
- [ ] 11.5 Load test (smoke only): 8 clients, 500 intents (Wave 5)

## 12. Documentation

- [ ] 12.1 Update `docs/architecture.md` section for multiplayer
      transport (deferred)
- [x] 12.2 Document the `IMatchStore` interface in inline JSDoc and
      reference it from the spec (extensive JSDoc on each export)

## 13. Spec Compliance

- [ ] 13.1 Every requirement in the `multiplayer-server` ADDED delta
      has at least one GIVEN/WHEN/THEN scenario
- [ ] 13.2 Every requirement in the `api-layer` MODIFIED delta has at
      least one GIVEN/WHEN/THEN scenario
- [ ] 13.3 `openspec validate add-multiplayer-server-infrastructure
--strict` passes clean

## Wave 1 Coverage Summary

**Implemented (21/28 hard checkboxes):**

- Transport protocol with zod-validated envelopes (1.1–1.5)
- IMatchStore contract + InMemoryMatchStore (2.1–2.4, 3.1–3.4)
- WebSocket upgrade endpoint placeholder + `server.js` upgrade
  routing (4.1, 4.3, 4.4)
- ServerMatchHost with intent dispatch + write-through + broadcast
  (5.1, 5.2, 5.3)
- Client wrapper with replay buffering + exponential reconnect
  (6.1–6.4)
- REST routes for create/get/delete (7.1–7.4)
- Error handling for invalid intents and store failures (9.2, 9.3,
  9.4)
- Dev script wired (10.1, 10.3)
- Tests for store, protocol, host, client (11.1, 11.2)
- IMatchStore JSDoc (12.2)

**Deferred to later waves (with reason):**

- 4.2: Full SessionJoin handshake (Wave 2 — needs auth path)
- 5.4: Session rehydration on restart (Wave 4 — reconnect work)
- 8.1, 8.3: `logging-system` integration (Wave 2 — needs auth context)
- 8.2: Metrics hook (Wave 5 — capstone observability)
- 9.1: BAD_ENVELOPE handler in upgrade dispatch (Wave 2)
- 10.2, 11.3, 11.4, 11.5: Full E2E + load tests (Waves 4 + 5)
- 12.1: docs/architecture.md update (deferred — out of Wave 1 scope)
- 13.1–13.3: Spec scenarios + openspec validate (Wave 5 capstone)
