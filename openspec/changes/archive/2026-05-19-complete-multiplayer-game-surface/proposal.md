# Change: Complete the Multiplayer Game Surface

## Why

The multiplayer stack is finished on the server side — `ServerMatchHost` runs an authoritative `InteractiveSession`, captures rolls, redacts fog-of-war events, streams replay, and broadcasts `Event` envelopes. The lobby works end-to-end: room-code invites, seat occupancy, readiness, and `LaunchMatch`. But the moment a match flips to `status === 'active'` the player surface dead-ends — `src/pages/multiplayer/lobby/[roomCode].tsx` (lines ~307-325) renders a hardcoded "Match starting…" placeholder that tells the user to "hop over to the existing gameplay surface" (the single-player UI, which has no connection to the running networked match).

Two human players can fill a lobby and launch, but there is no way to actually *play* the resulting match against each other. This is the single critical gap in Wave 3 — every other piece of the netcode exists and is exercised by the integration suite. This change replaces the placeholder with a real networked game surface: it consumes the server's `Event` broadcast stream to drive the tactical map, sends player actions back as `Intent` envelopes, and renders the opponent's moves as they arrive.

## What Changes

- ADDED a networked game surface rendered when a lobby's `status` flips to `'active'` — replacing the placeholder in `src/pages/multiplayer/lobby/[roomCode].tsx`
- ADDED a client-side mirror game session: the `mirrorSession` / `gameSessionChannel` event-application pattern, fed by the server `Event` stream rather than by y-webrtc, producing the `IGameSession` the tactical map renders
- ADDED an intent-emit path from the tactical map UI — a player's movement / attack / phase-advance / concede action is encoded as an `Intent` envelope and sent over the existing WebSocket
- ADDED opponent-move rendering: events broadcast from the server (including fog-redacted ones) are applied to the mirror session so the opponent's units animate and update on the local map
- ADDED a turn-ownership gate so the UI only enables intent-producing controls for the local player's side during that side's phase, and shows a passive "waiting for opponent" state otherwise
- ADDED handling for the connection-lifecycle states the server already broadcasts — `MatchPaused`, `MatchResumed`, `Close` — surfaced in the game surface rather than only the lobby

## Dependencies

- **Requires**: `multiplayer-server` (the `ServerMatchHost` authoritative session, `Event` broadcast, replay stream — all source-of-truth) and `multiplayer-sync` (the `mirrorSession` event-application reducer and `IGameIntent` contract)
- **Required By**: `harden-multiplayer-transport` (M2) — the durable-store / host-migration / rate-limiting work hardens the transport this surface depends on; `add-matchmaking-and-spectator` (M3) — the spectator surface reuses the read-only path established here

## Impact

- Affected specs: `multiplayer-game-surface` (new capability) — the client-side game surface is a distinct concern from the server (`multiplayer-server`) and from per-match sync transport (`multiplayer-sync`); a new capability keeps the delta clean and avoids modifying server requirements
- Affected code: `src/pages/multiplayer/lobby/[roomCode].tsx` (replace the `active`-state branch), `src/hooks/useMultiplayerSession.ts` (expose the mirror session + a typed `sendGameIntent`), `src/components/multiplayer/` (new `NetworkedGameSurface` component), `src/lib/multiplayer/client.ts` (mirror-session wiring from the `Event` stream)
- No new server code — the surface consumes the existing `ServerMatchHost` broadcast contract unchanged
- No database migrations — the surface is a read/render layer over the server's event stream
- Reproducibility preserved: the surface never produces rolls or authoritative state; it only renders the server's events and emits intents

## Non-Goals

- Durable match persistence, host migration, rate-limiting, replay-attack protection — all M2 (`harden-multiplayer-transport`)
- Match browser / matchmaking and the spectator seat type — M3 (`add-matchmaking-and-spectator`)
- Post-match summary / replay-library integration for networked matches — out of Wave 3 scope
- Any change to the server's authoritative engine, roll capture, or fog redaction — this change is client-surface only
- New UI for AI-occupied seats beyond what the existing single-player tactical map already renders
