# Tasks: Multiplayer Support

## 1. Protocol Design

- [ ] 1.1 Define multiplayer event types (join, leave, ready, action)
- [ ] 1.2 Design host authority model (host validates all actions)
- [ ] 1.3 Define reconnection protocol
- [ ] 1.4 Design spectator mode protocol
- [ ] 1.5 Document turn synchronization rules

## 2. Connection Layer

- [ ] 2.1 Extend P2P module for game connections
- [ ] 2.2 Implement game room creation (separate from vault sync)
- [ ] 2.3 Add player identity/name handling
- [ ] 2.4 Implement ready-check before game start
- [ ] 2.5 Add latency measurement and display

## 3. Game State Sync

- [ ] 3.1 Implement event broadcast from host
- [ ] 3.2 Implement event validation on host
- [ ] 3.3 Add action acknowledgment protocol
- [ ] 3.4 Implement state snapshot for reconnection
- [ ] 3.5 Add optimistic updates with rollback

## 4. Turn Management

- [ ] 4.1 Implement turn order enforcement
- [ ] 4.2 Add turn timer (optional)
- [ ] 4.3 Implement phase synchronization
- [ ] 4.4 Add "waiting for opponent" indicators
- [ ] 4.5 Handle simultaneous actions in shared phases

## 5. UI - Lobby

- [ ] 5.1 Create `MultiplayerLobbyPage`
- [ ] 5.2 Create `RoomBrowser` component
- [ ] 5.3 Create `GameSetupPanel` for force selection
- [ ] 5.4 Add ready/unready toggle
- [ ] 5.5 Show player connection status

## 6. UI - In-Game

- [ ] 6.1 Add opponent action indicators on hex map
- [ ] 6.2 Create `GameChat` component
- [ ] 6.3 Add "Opponent's Turn" overlay
- [ ] 6.4 Show opponent unit selection highlights
- [ ] 6.5 Add disconnect warning banner

## 7. Spectator Mode

- [ ] 7.1 Implement read-only game state sync
- [ ] 7.2 Add spectator join flow
- [ ] 7.3 Create spectator UI (no action controls)
- [ ] 7.4 Add spectator count display

## 8. Error Handling

- [ ] 8.1 Handle host disconnection (migration or end)
- [ ] 8.2 Handle player disconnection mid-turn
- [ ] 8.3 Add reconnection flow with state catch-up
- [ ] 8.4 Handle desync detection and recovery

## 9. Testing

- [ ] 9.1 Unit tests for multiplayer protocol
- [ ] 9.2 Integration tests for state sync
- [ ] 9.3 E2E tests for two-player game
- [ ] 9.4 Test disconnection/reconnection scenarios
