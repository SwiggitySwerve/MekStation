# Tasks: Multiplayer Support

> **Updated 2026-02-11**: Comprehensive rewrite based on codebase research, design interview, and Metis gap analysis.
> All dependencies (P2P, encounters, gameplay UI, combat) are implemented.
> Scope reduced: spectator mode, cinematic animations, turn timers, N-player, and free-text chat deferred to v1.1.

## Existing Infrastructure (no work needed)

- **P2P transport**: `src/lib/p2p/` — Yjs + y-webrtc, room codes, CRDT, reconnection, offline queue
- **Event sourcing**: `src/utils/gameplay/gameEvents.ts`, `gameState.ts` — 20+ event types, deterministic state derivation
- **Game sessions**: `src/utils/gameplay/gameSession.ts` — Session creation, phase/turn management, initiative
- **Combat resolution**: `src/utils/gameplay/toHit.ts`, `damage.ts`, `hitLocation.ts` — Complete single-player combat
- **Gameplay UI**: `src/components/gameplay/` — HexMapDisplay, PhaseBanner, ActionBar, EventLogDisplay, etc.
- **Encounter system**: `src/services/encounter/` — Full CRUD, templates, victory conditions
- **Quick Game**: `src/stores/useQuickGameStore.ts`, `src/components/quickgame/` — Unit selection, scenario gen, game launch

## Key Constraints

- **GameSide enum is binary** (`Player | Opponent`) — deeply embedded (14+ refs). Map host→Player, guest→Opponent. Do NOT refactor to string-based IDs.
- **All new fields on existing interfaces MUST be optional** (`isMultiplayer?: boolean`) — 11,000+ existing tests must not break.
- **Host performs ALL dice rolling** — `roll2d6()` uses `Math.random()`, non-deterministic. No client-side randomness.
- **Follow existing patterns**: Zustand stores (`useQuickGameStore.ts`), event factories (`gameEvents.ts`), singleton services (`createSingleton.ts`).

---

## Milestone 0: Transport Architecture Spike

Validate the Yjs Y.Array approach before building anything else. This unblocks all subsequent work.

- [ ] 0.1 Create minimal POC: two SyncProvider instances sharing a Y.Array
  - Host appends a game event object to Y.Array
  - Client observes the Y.Array and receives the event
  - Measure round-trip latency (target: <200ms on local network)
  - Test with MockSyncProvider (BroadcastChannel) for unit tests
  - Test with real y-webrtc for manual integration test
  - **Output**: Decision document confirming Y.Array works OR alternative approach

---

## Milestone 1: Two Instances Sync a Game Event (Transport Works)

- [ ] 1.1 Create `src/lib/multiplayer/types.ts` — Multiplayer message/event types:
  - Lobby messages: `game_create`, `game_join`, `game_leave`, `player_ready`, `player_unready`, `force_selected`, `game_start`
  - Game messages: `action_propose` (client→host), `action_confirm` (host→client), `action_reject` (host→client with reason)
  - Meta messages: `chat_quick` (predefined message ID), `game_leave_intentional` (tab close)
  - Player identity: `IMultiplayerPlayer` { id, name, side: GameSide, isHost, isReady, forceBV? }
- [ ] 1.2 Create `src/lib/multiplayer/GameTransport.ts` — Game-specific transport wrapping Yjs Y.Array:
  - Create/join game room (separate room type prefix from vault sync)
  - Shared Y.Array for confirmed game events (host writes, all read)
  - Separate Y.Map for lobby state (player info, ready status, force BV)
  - Awareness for presence (online/offline indicator)
  - `proposeAction(event)` — client sends to host via Y.Map proposal slot
  - `onEventConfirmed(callback)` — observe Y.Array for new confirmed events
- [ ] 1.3 Create `src/lib/multiplayer/HostAuthority.ts` — Host-side validation:
  - Validate proposed actions against current game state
  - Check: is it this player's turn? Is the action legal for current phase?
  - Check: is the proposed phase correct? (EC-2: phase mismatch rejection)
  - If valid: host creates confirmed game event (with host's dice rolls) and appends to Y.Array
  - If invalid: host writes rejection to proposer's Y.Map slot with reason string
  - Handle simultaneous concede (EC-6): process first, reject second

---

## Milestone 2: Lobby with Room Code, Ready Check, Game Start

- [ ] 2.1 Create `src/stores/useMultiplayerStore.ts` — Zustand store (follow `useQuickGameStore.ts` pattern):
  - Room info (code, connection state)
  - Player list (host + guest with ready status, force BV)
  - Lobby state machine: `idle → creating/joining → lobby → starting → playing → ended`
  - Quick message log
  - Error state
- [ ] 2.2 Create `src/lib/multiplayer/MultiplayerSession.ts` — Session lifecycle:
  - `createGame(hostName, bvLimit)` → generates room code, creates Yjs room, returns code
  - `joinGame(guestName, roomCode)` → connects to room, exchanges player info via Y.Map
  - `setReady(ready)` → updates Y.Map, triggers ready check
  - `selectForce(units[])` → writes force to Y.Map, host validates BV ≤ limit (EC-4: host BV is authoritative)
  - `startGame()` → host only, requires both ready. Creates IGameSession, writes initial events to Y.Array
  - `leaveGame()` → cleanup, notify peer. Distinguish intentional leave from disconnect (EC-3)
- [ ] 2.3 Create `src/pages/gameplay/multiplayer/index.tsx` — Multiplayer entry page:
  - "Create Game" and "Join Game" options
  - Room code display (host) / room code input (guest)
- [ ] 2.4 Create `src/components/multiplayer/MultiplayerLobby.tsx` — Lobby UI:
  - Player cards showing name, ready state, connection indicator
  - BV limit display
  - Force selection (reuse Quick Game unit selection components)
  - Force summary (unit count, total BV — host-computed)
  - Ready toggle button
  - "Start Game" button (host only, both must be ready)
- [ ] 2.5 Extend Quick Game flow for multiplayer variant:
  - Add "Multiplayer" option to Quick Game welcome screen
  - Reuse `QuickGameSetup` unit selection for both host and guest force picking
  - Auto-generate scenario on host side when both forces selected
  - Route to multiplayer game page on start

---

## Milestone 3: Complete Alternating Turn Cycle (Protocol Works)

- [ ] 3.1 Create `src/lib/multiplayer/GameSyncClient.ts` — Client-side sync:
  - Observe Y.Array for new confirmed events
  - Apply each confirmed event to local game state via existing `appendEvent()` / `deriveState()`
  - Send proposed actions to host via Y.Map proposal slot
  - Handle rejection: revert optimistic UI state, show rejection reason
  - On disconnect: buffer continues via Yjs offline persistence
- [ ] 3.2 Extend game session for multiplayer — Add optional multiplayer fields to `IGameSession`:
  - `isMultiplayer?: boolean`
  - `hostPlayerId?: string`
  - `players?: IMultiplayerPlayer[]`
  - All fields OPTIONAL to avoid breaking existing tests
- [ ] 3.3 Implement alternating movement sync:
  - Host determines activation order (initiative-based, existing logic)
  - Host broadcasts which unit should move next
  - Active player proposes movement → host validates → host confirms
  - Opponent sees movement animate on their hex map in real-time (lightweight waiting UX)
  - Phase advances when all units have locked movement
- [ ] 3.4 Implement weapon attack sync:
  - Both players declare attacks for their units (existing lock state machine)
  - Declarations are private until both sides lock (hidden in per-player Y.Map slots)
  - When both locked: host reads both declarations, resolves all attacks sequentially
  - Host performs ALL dice rolls (to-hit, hit location, critical hits)
  - Host appends resolution events to Y.Array one by one
  - Both players see attacks resolve sequentially in EventLogDisplay
- [ ] 3.5 Fix initiative tie handling (EC-1):
  - Detect tied 2d6 rolls in multiplayer context
  - Re-roll automatically (BattleTech rules) instead of "player wins" shortcut
  - Broadcast re-roll as game event
- [ ] 3.6 Add `'forfeit' | 'abandoned'` to GameEndedPayload reason (EC-7):
  - `'forfeit'`: disconnect timeout expired
  - `'abandoned'`: host disconnected, timeout expired

---

## Milestone 4: Full Game with Reconnection and Error Handling

- [ ] 4.1 Implement reconnection protocol:
  - Disconnected peer re-joins Yjs room (existing y-webrtc reconnection with exponential backoff)
  - Y.Array CRDT auto-syncs — client reads full event log
  - Client replays all events via `deriveState()` to rebuild current state
  - Resume from current phase
  - Profile: assert `deriveState()` with 500 events completes in <100ms
- [ ] 4.2 Handle host disconnection:
  - Client detects via Yjs awareness (peer disappears)
  - Show "Host disconnected — waiting for reconnection" banner
  - No actions accepted (host is authoritative)
  - Configurable timeout (default 2 min) → game ends as `'abandoned'`
- [ ] 4.3 Handle client disconnection mid-turn:
  - Host detects via Yjs awareness
  - Show "Opponent disconnected — waiting..." banner
  - Same timeout logic → game ends as `'forfeit'` (opponent forfeits)
  - If client was mid-action, their pending proposal is discarded
- [ ] 4.4 Add intentional leave detection (EC-3):
  - `beforeunload` event handler sends `game_leave_intentional` via Y.Map
  - Peer receives immediate "Opponent left the game" (no 2-min wait)
  - Game ends as `'concede'`
- [ ] 4.5 Add desync detection (simplified):
  - Periodic check: compare Y.Array length between peers
  - If mismatch detected: client triggers full Y.Array re-read
  - Log desync events for debugging (not shown to user unless unrecoverable)

---

## Milestone 5: Multiplayer UI Polish and Quick Messages

- [ ] 5.1 Create `src/components/multiplayer/OpponentTurnOverlay.tsx`:
  - Semi-transparent overlay during opponent's action
  - "Waiting for opponent..." with current phase info
  - Shows opponent's last confirmed action
- [ ] 5.2 Extend gameplay UI for multiplayer indicators:
  - Opponent unit markers on HexMapDisplay (different color scheme)
  - Movement trails for opponent moves as they're confirmed
  - "Your Turn" / "Opponent's Turn" indicator in PhaseBanner
  - Game stats sidebar: BV remaining per side, damage summary
- [ ] 5.3 Create `src/components/multiplayer/QuickMessages.tsx`:
  - 5 predefined messages: "Good game", "Nice shot", "Thinking...", "Ready", "Rematch?"
  - Collapsible panel, rate-limited (1 per 5 seconds)
  - Messages routed via Y.Map, displayed as toasts
- [ ] 5.4 Create `src/components/multiplayer/DisconnectBanner.tsx`:
  - Warning banner when opponent disconnects (or host disconnects)
  - Countdown timer to forfeit/abandon
  - Auto-dismiss on reconnection

---

## Milestone T: Testing (After Implementation)

- [ ] T.1 Extend `MockSyncProvider` with `simulateDisconnect()` and `simulateReconnect()`:
  - `simulateDisconnect()`: stop BroadcastChannel listening, clear awareness
  - `simulateReconnect()`: resume listening, re-sync Y.Array
- [ ] T.2 Unit tests for protocol logic (GameTransport, HostAuthority, GameSyncClient):
  - Host validates and rejects out-of-turn actions
  - Host validates and rejects wrong-phase actions
  - Host validates guest force BV ≤ limit
  - Host handles simultaneous concede (first wins, second rejected)
  - Initiative tie triggers re-roll
- [ ] T.3 Integration tests for state sync:
  - Two MockSyncProvider instances on same BroadcastChannel
  - Host appends events, client receives and derives identical state
  - Event log consistency check (length and IDs match)
- [ ] T.4 E2E test: two-player Quick Game flow:
  - Create room → join room → select forces → ready → start → play 1 turn → verify sync
  - Assert: both instances have identical event logs
- [ ] T.5 E2E test: disconnection and reconnection:
  - Simulate client disconnect via MockSyncProvider
  - Assert: host shows "Opponent disconnected" banner
  - Simulate reconnect
  - Assert: client state matches host state after reconnection
