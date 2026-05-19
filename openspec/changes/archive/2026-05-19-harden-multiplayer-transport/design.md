# Design: Harden the Multiplayer Transport

## Context

The multiplayer server is server-authoritative and mature. `ServerMatchHost` owns one `InteractiveSession` per match, captures rolls, redacts fog events, streams replay, manages per-socket heartbeats, and handles a reconnect lifecycle (`PendingPeerTracker`, `ServerMatchHostReconnectLifecycle`) with per-seat grace timers. `IMatchStore` is a clean async persistence boundary — `createMatch`, `appendEvent`, `getEvents`, `getMatchMeta`, `updateMatchMeta`, `getMatchByRoomCode`, `closeMatch` — but the only implementation is `InMemoryMatchStore`, which warns on construction that it is dev-only.

Three gaps block production use, all called out in the roadmap and the council decomposition: no durable store, host disconnect aborts the match, and no intent rate-limiting or replay protection. This change closes all three without a rewrite, per council decision **DP1**.

### DP1 — Consolidate on the authoritative server (council decision, baked in here)

The codebase has a *finished* server-authoritative stack — per-intent roll capture, fog-of-war redaction, reconnection grace timers, lobby intents, replay streaming. There is **no rewrite**. Wave 3 hardens this server; the P2P / y-webrtc layer is demoted to a fallback that receives no further investment. The P2P `mirrorSession` / `gameSessionChannel` event-application pattern is *kept* — but only as the **client-side** layer, pointed at the server WebSocket instead of y-webrtc (this is exactly what M1 does). Cheating defenses — authoritative roll capture, intent zod-refinement, fog redaction — are structurally impossible on a peer mesh; consolidating on the authoritative server is what makes M2's integrity work meaningful. Every requirement in this change therefore targets the *server* path; the y-webrtc path is documented as a non-authoritative fallback and nothing new is built on it.

## Goals / Non-Goals

**Goals:**

- A durable `IMatchStore` so a server restart never loses an active match.
- Server-startup match recovery that re-instantiates a `ServerMatchHost` for every `active` match from durable storage.
- Host migration + graceful degradation so a host-connection loss does not abort the match.
- Per-connection intent rate-limiting and replay-attack protection on the authoritative server.
- A documented DP1 consolidation contract demoting y-webrtc to a non-authoritative fallback.

**Non-Goals:**

- The networked game surface (M1), match browser / spectators (M3), self-hosted signaling, deleting the P2P code, co-op campaign sync (Wave 5).

## Decisions

### D1. The durable store implements the existing `IMatchStore` contract unchanged

The `IMatchStore` interface is already the persistence boundary and is "deliberately small and async so that future implementations can be transactional / network-backed". The durable store is a new class implementing that exact interface — no interface change, no call-site change. `ServerMatchHost`, the REST routes, and the WebSocket upgrade handler depend only on `IMatchStore` and are agnostic to which implementation is wired. `InMemoryMatchStore` is kept verbatim as the dev-only fallback (`getDefaultMatchStore()` selects the durable store in production, the in-memory store in dev/test).

### D2. Durable store backed by an embedded persistent store, file-layout frozen here

The durable store persists two things per match: the `IMatchMeta` blob and the ordered event log. The backing technology is an embedded persistent store (SQLite-class — single-file, no separate server process, transactional) chosen so the deployment story stays "run one Node process". The persisted shape:
- a `matches` record per match holding the serialized `IMatchMeta`;
- an `events` record per `(matchId, sequence)` holding the serialized `IGameEvent`, with `(matchId, sequence)` as the unique key so `appendEvent`'s sequence-collision guarantee is enforced by the storage layer's unique constraint.
`appendEvent` MUST be transactional all-or-nothing and MUST reject a sequence collision with `MatchStoreSequenceCollisionError`, exactly as `InMemoryMatchStore` does today. `getEvents` MUST return events ordered by ascending `sequence` with no gaps.

### D3. Startup recovery enumerates active matches and rebuilds hosts

On server startup the recovery routine queries the durable store for every match with `status: 'active'`, and for each one constructs a fresh `ServerMatchHost` whose `InteractiveSession` is rebuilt by replaying the stored event log. This satisfies the existing `multiplayer-server` "Server Restart Survives Matches" requirement against a real backend rather than only the in-memory store. A reconnecting client's `SessionJoin` with its `lastSeq` then streams the missing events through the already-built replay path.

### D4. Authority lives on the server, so a host *connection* loss is not an authority loss

The critical insight: in the server-authoritative model the authoritative `InteractiveSession` lives on the *server*, not on the host's client. The "host" is the player holding `hostPlayerId` for privileged operations (close match, lobby overrides). When the host's *socket* drops, the engine keeps running on the server. Host migration is therefore not a state-transfer problem — it is a *privilege reassignment* problem: promote a surviving connected human seat to `hostPlayerId` so privileged operations remain available. The promotion is recorded in `IMatchMeta` via `updateMatchMeta` and broadcast to all clients.

### D5. Host-connection loss enters the grace path, never an immediate abort

A host-socket loss is routed through the *same* pending/grace mechanism already used for any human seat (`maybeMarkPlayerPending`, `PendingPeerTracker`). The match pauses (existing `MatchPaused` broadcast) rather than aborting. Resolution:
- host reconnects within grace → match resumes (`MatchResumed`), `hostPlayerId` may revert or stay migrated;
- grace expires → the match completes cleanly through the existing outcome path, **not** with the legacy `reason: 'aborted'` abort.
The `multiplayer-sync` "Abort on Host Disconnect" requirement describes the *legacy y-webrtc* path; this change adds a new server-path requirement for graceful degradation rather than modifying the old one (DP1: y-webrtc is the demoted fallback).

### D6. Intent rate-limiting per connection

The authoritative intent dispatch (`ServerMatchHostIntent`) gains a per-connection token-bucket rate limiter. An intent that exceeds the configured budget is rejected with a non-fatal `Error {code: 'RATE_LIMITED'}`; the connection stays open and no event is appended. The budget is generous enough that legitimate fast play never trips it (a human cannot out-click the budget) and is configured, not hardcoded, so a stress test can tune it. Heartbeats and replay traffic are exempt.

### D7. Replay-attack protection via per-intent unique ids

Every `Intent` envelope already correlates via an intent id (the `Error` envelope carries an optional `intentId`). The server maintains a per-match set of accepted intent ids. An inbound intent whose id is already in the set is rejected with `Error {code: 'DUPLICATE_INTENT'}` and produces no event — a replayed envelope cannot re-trigger a movement or attack. The accepted-id set is bounded (it only needs to cover the window an attacker could realistically replay within); it is reconstructed from the event log on recovery so a restart does not reopen the replay window.

### D8. y-webrtc demoted to a documented fallback

No P2P code is deleted. The `multiplayer-sync` capability gains one new requirement stating that the authoritative server WebSocket is the supported transport for networked matches, that y-webrtc is a non-authoritative fallback receiving no further hardening, and that the `mirrorSession` / `gameSessionChannel` pattern is retained only as the client-side event-application layer pointed at the server WebSocket. This is the DP1 contract made explicit in spec form.

## Risks / Trade-offs

- **[Risk] Durable-store write latency on the hot `appendEvent` path** → Mitigation: an embedded transactional store (D2) keeps `appendEvent` a local synchronous-class write; the existing `appendEvent` is already async so latency is absorbed by the contract. A stress test in the verification section measures it.
- **[Risk] Host migration promotes a player who then also disconnects** → Mitigation: D4 promotion picks the longest-connected surviving human seat; if that seat also drops, migration repeats; if no human seat survives, the match enters the grace path (D5) and completes cleanly.
- **[Risk] Rate-limit budget too tight breaks legitimate fast play** → Mitigation: D6 — the budget is configured and generous; the verification suite asserts a worst-case human play rate never trips it.
- **[Risk] Accepted-intent-id set grows unbounded** → Mitigation: D7 — the set is bounded to the realistic replay window and rebuilt from the event log on recovery.
- **[Risk] Recovery rebuilds a corrupt session from a partial log** → Mitigation: D2's transactional `appendEvent` means the log never contains a torn write; recovery replays only fully-committed events.

## Migration Plan

Additive. The new durable store implements `IMatchStore` with no interface change, so `ServerMatchHost` and all call sites are untouched. `getDefaultMatchStore()` selects the durable store in production and `InMemoryMatchStore` in dev/test — existing tests that construct their own `InMemoryMatchStore` are unaffected. Host migration, rate-limiting, and replay protection are new code paths in `ServerMatchHost` / its satellites that no existing test exercises, so they are purely additive. The first production deployment starts with an empty durable store; there is no data to migrate from the in-memory store (it never persisted anything). Rollback = wire `getDefaultMatchStore()` back to `InMemoryMatchStore` and the new code paths go dormant.

## Open Questions

- Whether `hostPlayerId` should revert to the original host on their reconnect or stay with the migrated holder — proposed: stay migrated for the rest of the match to avoid a privilege ping-pong; revisit if testers find it confusing.
- The exact rate-limit budget numbers — proposed: design freezes the *mechanism* (token bucket, per-connection, configured) and leaves the numbers to the stress test in verification task 6.
- Whether the durable store should also persist completed-match logs for the 7-day retention window the `multiplayer-sync` spec describes for IndexedDB — proposed: yes, the durable store honors the same 7-day retention so server-side post-match inspection works; confirm during implementation.
