# Tasks: Add Matchmaking and Spectator Support

## 1. Joinable-Lobby Query

- [ ] 1.1 Add a `getJoinableLobbies()` query over the durable match store returning matches in `status: 'lobby'` with at least one open human seat
- [ ] 1.2 Project each result to a compact shape: match id, room code, layout, host display name, seat-occupancy summary
- [ ] 1.3 Exclude matches that have transitioned out of `status: 'lobby'`
- [ ] 1.4 Tests: only joinable lobbies are returned; a full lobby and a launched match are excluded

## 2. Joinable-Lobby Endpoint

- [ ] 2.1 Add a REST route under `src/pages/api/multiplayer/` that returns the `getJoinableLobbies()` result, authenticated like the other multiplayer endpoints
- [ ] 2.2 Tests: the route returns the joinable-lobby projection; an unauthenticated request is rejected `401`

## 3. Match Browser Surface

- [ ] 3.1 Add a match-browser component under `src/components/multiplayer/` rendering the joinable-lobby list with layout, host, and seat occupancy
- [ ] 3.2 Mount the browser on the multiplayer hub (`src/pages/multiplayer/index.tsx`)
- [ ] 3.3 Refresh the list on an interval and on an explicit user refresh
- [ ] 3.4 Add a one-click "Join" per row that navigates to `/multiplayer/lobby/[roomCode]`, reusing the existing room-code path
- [ ] 3.5 Storybook story covering populated, empty, and refreshing states

## 4. Spectator Seat Kind

- [ ] 4.1 Extend the seat-model `kind` union in `src/types/multiplayer/Lobby.ts` with `'spectator'`
- [ ] 4.2 Exclude `spectator` seats from side assignment and from `recordMatchParticipation`
- [ ] 4.3 Exclude `spectator` seats from the readiness gate (`canLaunch`) and from the layout player-seat budget
- [ ] 4.4 Tests: a match with spectator seats launches with exactly its human seats ready; a spectator seat owns no units and produces no participation record

## 5. Spectator Connection

- [ ] 5.1 Allow a `spectator`-kind seat to connect over the existing WebSocket via `SessionJoin`, bound to the authenticated player id at upgrade time
- [ ] 5.2 Stream the replay history then live events to the spectator exactly as for a player
- [ ] 5.3 Reject any `Intent` from a `spectator`-kind seat as unauthorized
- [ ] 5.4 Tests: a spectator receives the replay then live events; a spectator intent is rejected with no event appended

## 6. Spectator Fog-of-War Scope

- [ ] 6.1 Define the spectator as a distinct fog audience receiving the most-redacted view — never more than the least-informed participant
- [ ] 6.2 In a fog-off match a spectator receives the full unredacted stream
- [ ] 6.3 Tests: a spectator of a fog-on match never receives an event about a unit hidden from a participant; a fog-off spectator receives every event

## 7. Spectator Surface

- [ ] 7.1 Render the spectator view by reusing M1's `NetworkedGameSurface` with intent-emit controls disabled
- [ ] 7.2 Show a spectator indicator so the observer knows they are watching, not playing
- [ ] 7.3 Tests: the spectator surface renders the mirror session and exposes no movement, attack, phase, or concede controls

## 8. Verification

- [ ] 8.1 Integration test: a player discovers a lobby in the browser, joins it, and the match launches and plays
- [ ] 8.2 Integration test: a spectator connects to an active fog-on match and observes it without receiving hidden-unit events
- [ ] 8.3 `openspec validate add-matchmaking-and-spectator --strict` passes
- [ ] 8.4 `npm run build`, lint, and `tsc --noEmit` typecheck all pass
