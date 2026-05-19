# Design: Complete the Multiplayer Game Surface

## Context

The multiplayer netcode is server-authoritative and complete. `ServerMatchHost` owns one `InteractiveSession`, accepts `Intent` envelopes, runs engine resolution, captures every d6 a resolver consumes, stamps the rolls onto the resulting events, persists them through `IMatchStore`, and broadcasts `Event` envelopes (fog-redacted per recipient when `config.fogOfWar` is set). The lobby UI in `src/pages/multiplayer/lobby/[roomCode].tsx` already drives seat occupancy and `LaunchMatch` through `useMultiplayerSession`.

The gap is the `active`-state branch of that page: when `session.lobbyState.status === 'active'` it renders a static placeholder. There is no component that takes the server's `Event` stream and renders a playable tactical map, and no path for a player's action to become an `Intent` on the wire. The single-player tactical map (`HexMapDisplay` and the gameplay surface) renders an `IGameSession` and is fully built — the missing middle is a *client mirror* of the authoritative session, fed by the network event stream instead of by local engine calls.

The `multiplayer-sync` capability already defines the `mirrorSession` concept (a guest's session whose state is built purely by applying received `IGameEvent`s through the `appendEvent` reducer) and the `IGameIntent` contract. Per council decision DP1, that event-application pattern is kept as the **client layer** — this change points it at the server WebSocket rather than at y-webrtc.

## Goals / Non-Goals

**Goals:**

- Make a launched networked match playable end-to-end for both human players from inside `/multiplayer/lobby/[roomCode]`.
- Drive the tactical map from a client mirror session built solely from the server `Event` stream — never from local engine resolution.
- Encode player actions as `Intent` envelopes on the existing WebSocket; the client never produces authoritative state.
- Gate intent-producing controls by turn ownership so a player cannot act for the opponent's side or out of phase.
- Surface the connection-lifecycle states the server already broadcasts (`MatchPaused`, `MatchResumed`, `Close`) inside the game surface.

**Non-Goals:**

- Durable persistence, host migration, rate-limiting (M2).
- Match browser, matchmaking, spectator seats (M3).
- Any server-side change — the surface consumes the existing broadcast contract.

## Decisions

### D1. A new `multiplayer-game-surface` capability, not a delta on `multiplayer-server`

The work is entirely client-side rendering and intent emission. `multiplayer-server` requirements describe the authoritative server; `multiplayer-sync` describes the per-match transport and the mirror reducer. The game *surface* — the React component tree that renders a networked match and collects player input — is a third concern. A new capability keeps every requirement here purely `## ADDED` and avoids touching server requirements.

### D2. Client mirror session fed by the `Event` stream

`useMultiplayerSession` already accumulates `events` from the server. This change adds a `mirrorSession: IGameSession | null` to the hook's return surface. The mirror is built by feeding each received `IGameEvent` through the same `appendEvent` reducer the engine uses, in `sequence` order. The mirror is **read-only** to the UI — it is the render input for `HexMapDisplay`, never mutated by local controls. This is exactly the `multiplayer-sync` mirror pattern (DP1), with the server WebSocket as the event source.

### D3. Intent emission is a typed forwarder, not a local engine call

The game surface exposes player actions (declare movement, declare attack, declare physical, advance phase, concede) as a `sendGameIntent(intent: IGameIntent)` call that wraps the action in an `Intent` envelope and sends it over the existing socket. The client does **not** resolve the action locally — it waits for the server's broadcast `Event` to update the mirror. This keeps the single source of truth on the server and means an out-of-phase or unauthorized action is rejected by the server with an `Error` envelope, surfaced as a non-fatal toast.

### D4. Turn-ownership gate derived from the mirror session

The local player's side is known from the lobby seat assignment (`session.lobbyState.seats`, matched on `playerId`). The mirror session's `IGameState` carries the current `phase` and the side whose turn it is. Intent-producing controls are enabled only when `(localSide === activeSide)` for a phase that accepts that side's intents; otherwise the surface renders a passive "waiting for opponent" indicator. The gate is advisory UX — the server is still the authority and rejects a smuggled intent regardless.

### D5. Fog-redacted events render without crashing

When `config.fogOfWar` is enabled the server sends per-player redacted or omitted events. The mirror reducer already tolerates redacted payloads (`multiplayer-sync` "Redacted Event Shape"). The surface MUST render a unit the local player cannot currently see at its last-known position with a "last seen" indicator and MUST NOT attempt to animate an event it never received — this is the existing `multiplayer-sync` "Client Gracefully Handles Missing Events" contract, now exercised by a real surface.

### D6. Lifecycle states surfaced in the game surface

`useMultiplayerSession` already collapses lower-level frames into a `status` (`connecting` / `ready` / `paused` / `closed` / `error`) and exposes `MatchPaused` / `MatchResumed` / `Close` payloads. The game surface renders:
- `paused` → a blocking overlay naming the pending seat(s) and the grace countdown; intent controls disabled.
- `ready` → normal play.
- `closed` → a terminal panel routing to a post-match summary or back to the multiplayer hub.

### D7. Replay-on-join produces the same mirror as live play

When a player (re)joins, the server streams `ReplayStart` / `ReplayChunk` / `ReplayEnd` before live events. The mirror session is built by applying the replayed events first, then live events, in one continuous `sequence` order. A reconnecting player therefore lands on a fully-rebuilt board identical to a player who was connected the whole time.

## Risks / Trade-offs

- **[Risk] Mirror divergence from the authoritative session** → Mitigation: the mirror is built only by applying server events in `sequence` order through the same reducer the server uses; it never runs engine resolution. Any divergence is a reducer bug caught by the existing `multiplayer-sync` convergence test, extended here with a surface-level integration test.
- **[Risk] A player acts during the opponent's turn** → Mitigation: the D4 turn-ownership gate disables the controls; the server independently rejects the intent. The gate is UX, the server is the guarantee.
- **[Risk] Fog-redacted stream produces an inconsistent board** → Mitigation: D5 — the surface honors the existing missing-event contract; "last seen" rendering and no-animation-for-unreceived-events keep the board coherent.
- **[Risk] Large replay stream on join blocks first paint** → Mitigation: the mirror applies replay chunks incrementally; the surface shows a "loading match…" state until `ReplayEnd`, then renders the rebuilt board in one commit.
- **[Risk] Scope creep into match persistence / migration** → Mitigation: explicitly deferred to M2; the surface depends on the transport but does not harden it.

## Migration Plan

Purely additive on the client. The `active`-state branch of `src/pages/multiplayer/lobby/[roomCode].tsx` is *replaced* — the placeholder JSX is removed and `NetworkedGameSurface` rendered in its place. The lobby branch (`!isActive`) is unchanged. `useMultiplayerSession` gains a `mirrorSession` field and a `sendGameIntent` method; existing consumers that read only `lobbyState` are unaffected. No server change, no database migration. Rollback = restore the placeholder branch; the lobby and server are untouched.

## Open Questions

- Whether the networked game surface should live at a dedicated route (`/multiplayer/match/[matchId]`) rather than swapping inside the lobby route — proposed: keep it inside the lobby route for Wave 3 so the player never loses the WebSocket; a dedicated route can follow if M3's match browser needs deep links.
- Whether to show a minimal per-side initiative / phase HUD distinct from the single-player one — proposed: reuse the single-player HUD; revisit if the turn-ownership gate needs more prominent affordance.
