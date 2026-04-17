# Tasks: Add Multiplayer Server Infrastructure

## 1. Transport Protocol

- [ ] 1.1 Define `ServerMessage` and `ClientMessage` discriminated
      unions covering: `SessionJoin`, `Intent`, `Event`, `ReplayStart`,
      `ReplayChunk`, `ReplayEnd`, `Heartbeat`, `Error`, `Close`
- [ ] 1.2 Each message carries `kind`, `matchId`, and a `ts` (ISO
      timestamp)
- [ ] 1.3 All messages are JSON-encoded
- [ ] 1.4 Envelope schema validation via zod on both client and server
- [ ] 1.5 Heartbeat every 20 seconds; missed heartbeat after 60s =
      treat connection as dead

## 2. Match Store Contract

- [ ] 2.1 Define `IMatchStore` interface with methods:
      `createMatch(meta): Promise<matchId>`,
      `appendEvent(matchId, event): Promise<void>`,
      `getEvents(matchId, fromSeq?): Promise<IGameEvent[]>`,
      `getMatchMeta(matchId): Promise<IMatchMeta>`,
      `updateMatchMeta(matchId, patch): Promise<void>`,
      `closeMatch(matchId): Promise<void>`
- [ ] 2.2 Define `IMatchMeta` shape: `{matchId, hostPlayerId,
playerIds, sideAssignments, status: 'lobby' | 'active' |
'completed', createdAt, updatedAt, config}`
- [ ] 2.3 Store contract MUST be transactional: `appendEvent` is
      all-or-nothing, sequence collisions SHALL reject
- [ ] 2.4 Store MUST be async; synchronous implementations acceptable
      via `Promise.resolve`

## 3. In-Memory Match Store (Dev Mode)

- [ ] 3.1 Implement `InMemoryMatchStore` satisfying `IMatchStore`
- [ ] 3.2 Backs a `Map<matchId, {meta, events}>`
- [ ] 3.3 Exposed via a factory so a production store can be swapped in
      without touching call sites
- [ ] 3.4 Warn prominently on server startup: `"InMemoryMatchStore is
dev-only; configure a persistent store for production"`

## 4. WebSocket Upgrade Endpoint

- [ ] 4.1 Add `src/pages/api/multiplayer/socket.ts` that handles the
      WebSocket upgrade under Next.js's custom server path
- [ ] 4.2 First message from a client MUST be `SessionJoin`; server
      replies with either `ReplayStart` + log or `Error`
- [ ] 4.3 Server maintains a `Set<WebSocket>` per match id for
      broadcasting
- [ ] 4.4 Disconnection removes the socket from the set but does NOT
      end the match

## 5. Server-Side Engine Host

- [ ] 5.1 New `ServerMatchHost` class: wraps one `InteractiveSession`
      per active match, owns its lifetime
- [ ] 5.2 Hosts receive `Intent` messages, validate, run the engine,
      append the resulting events to the `IMatchStore`, broadcast the
      events to all connected clients for that match
- [ ] 5.3 Host persists after every appended event (write-through)
- [ ] 5.4 Host loads its session from the store on creation so a server
      restart can resume

## 6. Client Wrapper

- [ ] 6.1 New `src/lib/multiplayer/client.ts` exporting `connect(url,
matchId, auth)` → `IMultiplayerClient`
- [ ] 6.2 Client exposes `send(intent)`, `on(event, cb)`, `close()`
- [ ] 6.3 Client handles replay on connect: accumulates events until a
      `ReplayEnd`, then fires `ready`
- [ ] 6.4 Client auto-reconnects with exponential backoff (capped at
      30s)

## 7. Match Creation REST

- [ ] 7.1 `POST /api/multiplayer/matches` body: `{config, players:
IPlayerRef[]}` returns `{matchId, wsUrl}`
- [ ] 7.2 `GET /api/multiplayer/matches/:id` returns match meta (for
      the lobby)
- [ ] 7.3 `DELETE /api/multiplayer/matches/:id` (host-only) closes a
      match
- [ ] 7.4 All endpoints require a valid `playerId` in a bearer token or
      header (full auth is a separate change)

## 8. Observability

- [ ] 8.1 Each `ServerMatchHost` logs key events (session created,
      event appended, player joined/left, match ended) via the
      existing `logging-system`
- [ ] 8.2 A metrics hook exposes active match count and connected
      player count for future dashboards (no dashboard in this change)
- [ ] 8.3 Correlate logs with `matchId` so a failing match can be
      traced end-to-end

## 9. Error Handling

- [ ] 9.1 Malformed message → server responds `Error {code: 'BAD_
ENVELOPE'}` and keeps the connection open
- [ ] 9.2 Invalid intent (e.g., out-of-phase) → server responds
      `Error {code: 'INVALID_INTENT', reason}` without mutating state
- [ ] 9.3 Store error during append → server closes affected match with
      `{code: 'STORE_FAILURE'}` and broadcasts to all clients
- [ ] 9.4 Client reconnect sends its `lastSeq`; server replays from
      there

## 10. Dev Server Scripts

- [ ] 10.1 `npm run mp-dev` starts Next.js with the WebSocket handler
      and an `InMemoryMatchStore`
- [ ] 10.2 `npm run mp-smoke` runs a smoke test: 2 client wrappers
      connect to the same match, fire a few intents, assert state
      matches
- [ ] 10.3 Scripts referenced in `package.json`

## 11. Tests

- [ ] 11.1 Unit test `InMemoryMatchStore` (create, append, get, close,
      sequence collision)
- [ ] 11.2 Unit test envelope validation (valid + malformed samples)
- [ ] 11.3 Integration test: spin up the server in-process, connect two
      clients, play a canned 10-event match, assert both receive
      identical event streams
- [ ] 11.4 Integration test: a server restart reloads the match from
      `IMatchStore` and clients can resume
- [ ] 11.5 Load test (smoke only): 8 clients, 500 intents, no dropped
      events

## 12. Documentation

- [ ] 12.1 Update `docs/architecture.md` section for multiplayer
      transport
- [ ] 12.2 Document the `IMatchStore` interface in inline JSDoc and
      reference it from the spec

## 13. Spec Compliance

- [ ] 13.1 Every requirement in the `multiplayer-server` ADDED delta
      has at least one GIVEN/WHEN/THEN scenario
- [ ] 13.2 Every requirement in the `api-layer` MODIFIED delta has at
      least one GIVEN/WHEN/THEN scenario
- [ ] 13.3 `openspec validate add-multiplayer-server-infrastructure
--strict` passes clean
