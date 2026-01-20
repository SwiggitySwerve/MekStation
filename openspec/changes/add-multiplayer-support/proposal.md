# Change: Add Multiplayer Support

## Why

BattleTech is fundamentally a multiplayer game. While single-player vs AI is useful for practice, the core experience is player-vs-player combat. Real-time multiplayer enables remote play with friends, tournaments, and community engagement.

## What Changes

- Add real-time game state synchronization between players
- Implement turn-based multiplayer protocol
- Add player matchmaking via room codes
- Add spectator mode
- Add game chat/communication
- Handle disconnection and reconnection gracefully

## Dependencies

- `add-p2p-vault-sync` (Phase 5) - P2P infrastructure
- `add-encounter-system` (Phase 4) - Game session management
- `add-gameplay-ui` (Phase 4) - Existing gameplay interface

## Impact

- Affected specs: `multiplayer` (new capability)
- Affected code: `src/lib/multiplayer/`, `src/stores/useGameplayStore.ts`
- New UI: Multiplayer lobby, game chat, player indicators
- Infrastructure: WebRTC for real-time sync

## Success Criteria

- [ ] Two players can play a complete game remotely
- [ ] Game state stays synchronized
- [ ] Turn order is enforced correctly
- [ ] Disconnected players can reconnect
- [ ] Spectators can watch without affecting game

## Technical Approach

1. **Protocol**: Extend event sourcing - sync game events over P2P
2. **Authority**: Host validates and broadcasts events
3. **Connection**: Reuse P2P infrastructure from vault sync
4. **UI**: Overlay indicators for opponent actions, chat panel
5. **Reconnection**: Event log enables catch-up on reconnect
