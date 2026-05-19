# Design: Add Matchmaking and Spectator Support

## Context

By the end of M2 the multiplayer transport is durable and hardened: a durable `IMatchStore` survives restarts, host migration prevents aborts, and intents are rate-limited and replay-protected. M1 already made matches playable through `NetworkedGameSurface`, which renders a read-only mirror session from the server `Event` stream and emits intents over the WebSocket.

Two gaps remain. First, *discovery*: the only way into a networked match is a 6-character room code passed out-of-band — the multiplayer hub (`src/pages/multiplayer/index.tsx`) has no list of open lobbies. Second, *observation*: the server already broadcasts per-player fog-redacted events (`fogOfWar.ts`, `FogOfWarVisibilityCache`, `filterEventForPlayer`) and the seat model has a `kind` discriminant (`'human' | 'ai'`), but there is no `spectator` kind and no path for a non-player to connect and watch.

Both gaps are *additive surfaces over existing infrastructure*. The match browser is a query over the durable store (M2) plus a list UI. The spectator is a new seat kind plus a read-only reuse of M1's game surface, fed by the fog-redaction filter that already exists.

## Goals / Non-Goals

**Goals:**

- A match browser on the multiplayer hub listing joinable lobbies, with one-click join.
- A server query over the durable store returning joinable lobbies.
- A `spectator` seat kind for non-playing observers that own no game units.
- Spectator connection over the existing WebSocket, building a read-only mirror like a player.
- A defined spectator fog-of-war visibility scope so spectating a fog-on match leaks no hidden information.
- A spectator surface reusing M1's `NetworkedGameSurface` in a no-controls mode.

**Non-Goals:**

- Ranked / skill-based matchmaking, spectator chat or casting, mid-match seat-kind changes, persisting spectator participation, modifying the fog algorithm.

## Decisions

### D1. A new `multiplayer-matchmaking` capability for the browser; spectator requirements go on `multiplayer-server`

The match browser and matchmaking surface are a distinct discovery concern with no existing home — a new `multiplayer-matchmaking` capability. The spectator *seat kind* and spectator *broadcast* are intrinsic to the server seat model and the per-player broadcast that already live in `multiplayer-server`; those requirements are added there. Both deltas are purely `## ADDED` — the `spectator` kind is a *new* requirement added alongside the existing "Seat Slot Model" requirement, not a modification of it.

### D2. The match browser is a query over the durable store, not a new index

M2's durable store already holds every `IMatchMeta` including `status`, `layout`, `seats`, and `roomCode`. A joinable lobby is a match where `status === 'lobby'` and at least one `kind: 'human'` seat has no occupant. The browser endpoint is a `getJoinableLobbies()` query that filters the store's matches by that predicate and returns a compact projection (match id, layout, host display name, seat occupancy summary) — no leaked internal detail beyond what a joiner needs. No separate index structure is introduced; the query reads existing metadata.

### D3. One-click join reuses the existing room-code path

A browser row carries the match's `roomCode`. Clicking "Join" navigates to `/multiplayer/lobby/[roomCode]` — exactly the route a shared invite code would open. The browser is therefore a *discovery* layer; the join mechanics, auth, and seat occupancy are the unchanged M1 lobby flow. This keeps one join path and avoids a parallel matchmaking-only join code branch.

### D4. `spectator` is a third seat `kind`

The seat model's `kind` union (`'human' | 'ai'`) gains `'spectator'`. A spectator seat:
- owns no game units — it is excluded from side assignment and from `recordMatchParticipation`;
- is excluded from the readiness gate (`canLaunch`) — spectators never block or enable launch;
- does not count toward the layout's player-seat budget — a `1v1` match still has exactly two human-playable seats regardless of spectator count.
A spectator seat is occupied by an authenticated player id, bound at WebSocket-upgrade time exactly as a human seat is, so the existing identity-binding requirement applies unchanged.

### D5. Spectator connection reuses the player join + replay path

A spectator connects over the existing WebSocket with `SessionJoin` and `lastSeq`, receives the replay stream, and then live events — identical to a player's connection. The spectator builds the same read-only mirror session M1 already produces. The only difference is the *surface*: a spectator gets `NetworkedGameSurface` rendered with intent-emit controls disabled (no movement, attack, phase, or concede controls). A spectator can never produce an `Intent`.

### D6. Spectator fog-of-war scope is defined and conservative

The server's fog filter (`filterEventForPlayer`) is keyed on a `playerId` mapped to a game side via `sideOwners` / `sideAssignments`. A spectator owns no side, so it has no natural side-based visibility. The conservative rule: a spectator of a **fog-on** match sees the *intersection* of what no single side would consider hidden — i.e. only events classified `public` plus events whose subject unit is currently visible to *at least one participant is not* the rule; instead a spectator sees the **union is not** used either. The defined scope: a spectator of a fog-on match receives only `public`-classified events and events about units, so that spectating never reveals a unit a participant on the field could not yet see. A spectator of a **fog-off** match receives the full unredacted stream like any participant. The exact classification is: spectators are treated as a distinct fog audience that receives the *most-redacted* view — never more than the least-informed participant — so spectating cannot be used to scout for a player.

### D7. The match browser refreshes on lobby lifecycle changes

The browser is a snapshot of joinable lobbies at fetch time. It refreshes on an interval and on an explicit user refresh so a lobby that fills up or launches disappears from the list. A match that has transitioned out of `status: 'lobby'` (per the existing room-code expiry-at-launch rule) is never returned by the joinable-lobby query.

## Risks / Trade-offs

- **[Risk] Spectator fog scope leaks scouting information** → Mitigation: D6 — a spectator of a fog-on match receives the most-redacted view, never more than the least-informed participant; a verification test asserts a spectator never receives an event a hidden-unit participant would not.
- **[Risk] The joinable-lobby query is slow as match volume grows** → Mitigation: D2 — the query is a filtered read over `IMatchMeta`; if volume warrants it, M2's durable store can index `status`, but for Wave 3 scale a scan is sufficient and is measured in verification.
- **[Risk] A spectator seat is mistaken for a player seat by the readiness gate** → Mitigation: D4 — `canLaunch` and `recordMatchParticipation` explicitly exclude `kind: 'spectator'`; tests assert a match with spectators launches with exactly its human seats ready.
- **[Risk] A spectator finds a way to emit an intent** → Mitigation: D5 — the spectator surface renders no intent controls, and the server independently rejects any intent from a `spectator`-kind seat as unauthorized.
- **[Risk] Browser shows a lobby that just launched** → Mitigation: D7 — the query filters on `status: 'lobby'` and the browser refreshes; a launched match drops off, consistent with the existing room-code expiry-at-launch behavior.

## Migration Plan

Additive. The `spectator` value is a new member of an existing union — code that switches on `kind` gains a case but existing `human` / `ai` handling is untouched; `canLaunch` and participation recording add an explicit exclusion. The match browser is a new surface on the existing multiplayer hub plus a new REST route; no existing route changes. Spectator connection reuses the unchanged player join + replay path. No new database migration — the joinable-lobby query reads metadata M2's durable store already persists. Rollback = remove the browser surface and the `spectator` kind; M1 and M2 are unaffected.

## Open Questions

- Whether spectator count should be capped per match — proposed: a generous configured cap so a popular match cannot exhaust server sockets; the number is left to the verification stress test.
- Whether the match browser should also surface `active` matches as spectatable (not just `lobby` matches as joinable) — proposed: yes, a second browser tab lists `active` matches with their spectator-join action; confirm during implementation that the joinable-lobby query and a separate spectatable-match query stay cleanly separated.
- Whether a spectator of a fog-on match should optionally be allowed a full "director's view" when the host opts in — proposed: out of scope for Wave 3; the conservative most-redacted view is the only spectator scope shipped.
