# Change: Add Matchmaking and Spectator Support

## Why

After M1 (`complete-multiplayer-game-surface`) makes networked matches playable and M2 (`harden-multiplayer-transport`) makes the transport durable and abuse-resistant, two discovery / observation gaps remain before multiplayer is feature-complete:

1. **No way to find a match.** Today the only entry into a networked match is a 6-character room code shared out-of-band — a player must already know a code to join. There is no match browser and no matchmaking page; the multiplayer hub (`src/pages/multiplayer/index.tsx`) cannot list open lobbies a player could join.
2. **No way to watch a match.** The server already redacts events per-player for fog-of-war (`fogOfWar.ts`, `FogOfWarVisibilityCache`), and the seat model has a `kind` discriminant (`human` | `ai`). But there is no spectator seat type — a third person cannot connect to an in-progress match to observe it, even though the per-player broadcast infrastructure that would feed a spectator already exists.

This change adds a match browser / matchmaking surface so players can discover and join open lobbies, and a spectator seat type so non-players can watch a match through the server's existing fog-of-war redaction.

## What Changes

- ADDED a match browser: a surface on the multiplayer hub that lists joinable lobbies (matches in `status: 'lobby'` with at least one open human seat), with their layout, host, and seat occupancy
- ADDED a server endpoint backing the browser — a query over the durable match store for joinable lobbies, returning the same shape the browser renders
- ADDED a one-click join from a browser row that resolves the lobby and navigates the player into it, reusing the existing room-code-resolution path internally
- ADDED a `spectator` seat kind alongside the existing `human` and `ai` kinds — a seat a non-playing observer occupies that owns no game units
- ADDED spectator connection: a spectator joins an `active` match over the existing WebSocket and receives the server `Event` stream, building a read-only mirror session like a player but with no intent-emit controls
- ADDED spectator fog-of-war handling: a spectator sees the match through the server's existing per-player redaction with a defined spectator visibility scope, so spectating a fog-on match does not leak hidden information that a participant would not see
- ADDED a spectator surface that renders the networked game surface (from M1) in a read-only, no-controls mode

## Dependencies

- **Requires**: `complete-multiplayer-game-surface` (M1) — the spectator surface reuses the networked game surface and its read-only mirror path; `harden-multiplayer-transport` (M2) — the match browser queries the durable match store, and spectators rely on the non-aborting transport; `multiplayer-server` (the seat model, per-player broadcast, fog redaction — all source-of-truth)
- **Required By**: none in Wave 3 — M3 closes the Wave 3 multiplayer set

## Impact

- Affected specs: `multiplayer-matchmaking` (new capability) for the match browser and matchmaking surface; `multiplayer-server` (new `## ADDED` requirements for the spectator seat kind, the joinable-lobby query, and spectator broadcast). No `MODIFIED` or `REMOVED` — the `spectator` kind is added as a new requirement alongside the existing seat-model requirement rather than editing it.
- Affected code: `src/pages/multiplayer/index.tsx` (match browser surface), a new browser component under `src/components/multiplayer/`, a new REST route under `src/pages/api/multiplayer/` for the joinable-lobby query, the seat model in `src/types/multiplayer/Lobby.ts` (extend the `kind` union with `spectator`), `ServerMatchHost` / its socket-lifecycle satellites for spectator connection, `src/lib/multiplayer/server/fogOfWar.ts` consumption for spectator visibility scope, and the spectator render path reusing M1's `NetworkedGameSurface`
- No new database migrations beyond what M2's durable store already introduced — the joinable-lobby query reads existing match metadata
- Reproducibility preserved: spectators are read-only observers; they never produce intents, rolls, or authoritative state

## Non-Goals

- Skill-based or ranked matchmaking — the "matchmaking" here is a browse-and-join lobby list, not an automatic pairing or rating system
- Spectator chat, casting tools, or delayed/replay-style spectating — spectators receive the live redacted stream only
- Letting a spectator convert into a player mid-match, or a player into a spectator — seat kind is fixed for the match
- Persisting spectator participation in the `IPlayerStore` — only human players are recorded as participants
- Any change to the authoritative engine, roll capture, or the fog redaction algorithm itself — M3 consumes the existing fog filter, it does not modify it
