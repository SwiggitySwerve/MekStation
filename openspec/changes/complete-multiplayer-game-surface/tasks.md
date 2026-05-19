# Tasks: Complete the Multiplayer Game Surface

## 1. Client Mirror Session

- [ ] 1.1 Add a `mirrorSession: IGameSession | null` field to `useMultiplayerSession`, built by applying received `IGameEvent`s through the `appendEvent` reducer in ascending `sequence` order
- [ ] 1.2 Apply replay-stream events (`ReplayStart` / `ReplayChunk` / `ReplayEnd`) before live `Event` messages, in one continuous sequence order
- [ ] 1.3 Tolerate fog-redacted and omitted events without throwing — reuse the `multiplayer-sync` redacted-payload handling
- [ ] 1.4 Unit tests: mirror built from a fixed event log matches the authoritative session; replay-then-live produces the same mirror as live-only

## 2. Intent Emission

- [ ] 2.1 Add a typed `sendGameIntent(intent: IGameIntent)` to `useMultiplayerSession` that wraps the intent in an `Intent` envelope and sends it over the existing socket
- [ ] 2.2 Map tactical-map player actions (declare movement, declare attack, declare physical, advance phase, concede) onto `IGameIntent` shapes
- [ ] 2.3 Surface a server `Error` envelope (e.g. wrong-phase, unauthorized-unit) as a non-fatal toast; the connection stays open
- [ ] 2.4 Tests: each action produces the correct `Intent` envelope; a rejected intent does not mutate the mirror session

## 3. Networked Game Surface Component

- [ ] 3.1 Add `NetworkedGameSurface` under `src/components/multiplayer/` rendering `HexMapDisplay` from the mirror session
- [ ] 3.2 Wire player controls to `sendGameIntent`; never resolve actions locally
- [ ] 3.3 Render a "loading match…" state until the join replay drains (`ReplayEnd`), then commit the rebuilt board
- [ ] 3.4 Storybook story covering loading, active-play, and opponent-turn states

## 4. Turn-Ownership Gate

- [ ] 4.1 Derive the local player's side from `session.lobbyState.seats` matched on `playerId`
- [ ] 4.2 Enable intent-producing controls only when the local side is the active side for a phase that accepts its intents; otherwise render a passive "waiting for opponent" indicator
- [ ] 4.3 Tests: controls disabled during the opponent's phase; enabled during the local side's phase

## 5. Fog-of-War Rendering

- [ ] 5.1 Render a unit the local player cannot currently see at its last-known position with a "last seen" indicator
- [ ] 5.2 Do not animate an event the client never received; jump a re-revealed unit to its new position
- [ ] 5.3 Tests: a fog-on match where an enemy leaves and re-enters LOS renders coherently and never crashes the surface

## 6. Connection-Lifecycle Surfacing

- [ ] 6.1 Render a blocking overlay on `MatchPaused` naming the pending seat(s) and the grace countdown; disable intent controls
- [ ] 6.2 Restore normal play on `MatchResumed`
- [ ] 6.3 Render a terminal panel on `Close` routing back to the multiplayer hub
- [ ] 6.4 Tests: pause overlay shows on `MatchPaused`, clears on `MatchResumed`, terminal panel shows on `Close`

## 7. Lobby Page Integration

- [ ] 7.1 Replace the hardcoded `active`-state placeholder branch in `src/pages/multiplayer/lobby/[roomCode].tsx` (lines ~307-325) with `NetworkedGameSurface`
- [ ] 7.2 Keep the `!isActive` lobby branch unchanged
- [ ] 7.3 Tests: the page renders the lobby panel while `status === 'lobby'` and the game surface once `status === 'active'`

## 8. Verification

- [ ] 8.1 Integration test: two simulated clients launch a match, exchange movement and attack intents, and both mirrors converge to the same `IGameState` at every event boundary
- [ ] 8.2 Integration test: a client that joins mid-match via replay lands on a board identical to a continuously-connected client
- [ ] 8.3 `openspec validate complete-multiplayer-game-surface --strict` passes
- [ ] 8.4 `npm run build`, lint, and `tsc --noEmit` typecheck all pass
