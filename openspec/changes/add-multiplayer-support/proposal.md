# Change: Add Multiplayer Support

## Why

BattleTech is fundamentally a multiplayer game. While single-player vs AI is useful for practice, the core experience is player-vs-player combat. Real-time multiplayer enables remote play with friends, tournaments, and community engagement.

## What Changes

- Add multiplayer game session creation and joining via room codes
- Extend event-sourced game state for P2P synchronization between players
- Implement host-authoritative turn-based multiplayer protocol
- Add Quick Game multiplayer as the primary entry point ("play with a friend now")
- Add multiplayer UI: lobby, player indicators, opponent turn overlay, quick messages
- Handle disconnection and reconnection gracefully via event log catch-up

## Dependencies

All dependencies are **satisfied** as of 2026-02-11:

- ~~`add-p2p-vault-sync` (Phase 5) - P2P infrastructure~~ → ✅ **IMPLEMENTED**
  - `src/lib/p2p/` — Yjs + y-webrtc, room codes, CRDT sync, offline persistence (y-indexeddb)
  - `src/services/vault/` — P2PTransport (11 message types), SyncEngine, OfflineQueueService
  - WebRTC with public signaling servers, exponential backoff reconnection
- ~~`add-encounter-system` (Phase 4) - Game session management~~ → ✅ **IMPLEMENTED**
  - `src/services/encounter/` — Full CRUD, validation, scenario templates, victory conditions
  - `src/utils/gameplay/gameSession.ts` — Session creation, phase management, turn advancement
  - `src/types/encounter/EncounterInterfaces.ts` — Complete type system
- ~~`add-gameplay-ui` (Phase 4) - Existing gameplay interface~~ → ✅ **IMPLEMENTED**
  - `src/components/gameplay/` — HexMapDisplay, PhaseBanner, ActionBar, HeatTracker, AmmoCounter, ArmorPip, EventLogDisplay
  - `src/pages/gameplay/` — Games list, game detail/play, encounters, quick game
  - `src/utils/gameplay/` — Combat resolution (to-hit, hit location, damage, crits, cluster, heat)

### Additional Infrastructure Available

- **Event sourcing**: 20+ GameEventType values with typed payloads, state derivation from event history (`gameState.ts`, `gameEvents.ts`)
- **Combat resolution**: Complete to-hit, hit location, damage application, critical hits, cluster weapons, heat management
- **AI player**: `SimulationRunner`, `BotPlayer`, `AttackAI` — can serve as opponent fallback
- **Game persistence**: `useGameStatePersistence` hook with autosave
- **Dice**: `roll2d6()` in `gameSession.ts` uses `Math.random()` — **non-deterministic**. `resolveAttack()` has `DiceRoller` injection point. In multiplayer, **host must perform ALL dice rolling** and broadcast results as events.

## Impact

- **Affected specs**: `multiplayer` (new capability)
- **Affected code**:
  - `src/lib/p2p/` — Extend for game room type (separate from vault sync rooms)
  - `src/lib/multiplayer/` — New multiplayer protocol, session management
  - `src/stores/useGameplayStore.ts` — Extend for remote player state
  - `src/stores/useMultiplayerStore.ts` — New Zustand store (follow `useQuickGameStore.ts` pattern)
  - `src/utils/gameplay/gameSession.ts` — Add multiplayer session variant
  - `src/components/gameplay/` — Add multiplayer overlays and indicators
  - `src/components/multiplayer/` — New lobby, quick messages, player roster components
  - `src/pages/gameplay/quick/` — Extend Quick Game for multiplayer variant
- **New UI**: Multiplayer lobby, quick messages, player indicators, opponent turn overlay
- **Infrastructure**: Reuse existing Yjs + y-webrtc P2P from vault sync

## Design Decisions

### DD-1: Movement Phase — Alternating (Traditional)

Classic BattleTech feel. Initiative loser moves first, one unit at a time. Mitigate waiting with lightweight UX: opponent's move animates on your map in real-time, chat available, game stats visible (BV remaining, damage summary).

### DD-2: Play Mode — Hybrid (Real-time v1, Async-Ready Protocol)

Build real-time first using existing WebRTC P2P. Design event protocol to be serializable/storable for future async support. Event log must be self-contained (no transient state).

### DD-3: Entry Point — Quick Game Multiplayer First

Quick Game is the primary multiplayer entry point. Fastest path to "play with a friend" — pick units from compendium, auto-generate scenario, go. Encounter-based multiplayer is future scope.

### DD-4: Force Selection — Host Sets BV Limit, Guest Mirrors

Host sets BV limit and picks their own units. Guest sees the BV limit and picks independently. Host validates guest's force BV before game start (prevents cheating).

### DD-5: Weapon Reveal — Cinematic Mode (v1.1)

Full cinematic reveal (targeting lines → countdown → per-attack dice/hit/damage/crit) is deferred to v1.1. v1 uses sequential text-based attack resolution via EventLogDisplay — each attack resolves and appears in the event log with clear hit/miss/damage information.

### DD-6: Player Count — 2-Player Protocol

Protocol is strictly 2-player in v1. The existing `GameSide` enum (`Player | Opponent`) is binary and deeply embedded (14+ references across types, event factories, state reducers, UI). N-player would require massive refactor. Map: host → `GameSide.Player`, guest → `GameSide.Opponent`.

### DD-7: Waiting State UX — Lightweight

During opponent's turn: show their move animating on your map in real-time, chat with quick messages, view current game stats (BV remaining, damage summary, unit status).

### DD-8: Chat — Quick Messages Only (v1)

5 predefined messages: "Good game", "Nice shot", "Thinking...", "Ready", "Rematch?". No free-text chat in v1 (adds scope for moderation, UI, rate limiting).

### DD-9: Spectator Mode — Deferred to v1.1

Read-only event stream is architecturally trivial (event sourcing supports it). But lobby UI, spectator join flow, and spectator count display add significant scope. Defer to v1.1.

### DD-10: Turn Timer — Deferred to v1.1

Real-time alternating turns with WebRTC are already fast enough. Timer sync between peers and auto-lock logic adds complexity. Defer.

### DD-11: Test Strategy — Tests After Implementation

Implement features first, add unit tests for protocol logic and integration tests for sync. Use existing MockSyncProvider for E2E (extend with `simulateDisconnect()` / `simulateReconnect()`).

## Key Architecture Decisions

### Transport Architecture: Yjs Y.Array as Event Log

The codebase has two P2P systems:

| Layer        | File                                 | Purpose                | Status                          |
| ------------ | ------------------------------------ | ---------------------- | ------------------------------- |
| Yjs/y-webrtc | `src/lib/p2p/SyncProvider.ts`        | CRDT-based vault sync  | Fully working                   |
| P2PTransport | `src/services/vault/P2PTransport.ts` | Message-based protocol | **Stubbed** (send returns true) |

**Decision**: Use **Yjs Y.Array** as an append-only event log. Host appends confirmed game events to a shared Y.Array. Clients observe the array and derive state. CRDT guarantees convergence and ordering. Reconnection becomes "read the whole Y.Array from index 0." This is consistent with the existing codebase and requires no new WebRTC setup.

A **transport architecture spike** (Task 0) will validate this approach before any protocol work begins.

### Event Sourcing as Sync Primitive

The existing event-sourced game state is the ideal foundation for multiplayer:

1. **Deterministic replay**: Both players derive state from the same event log → guaranteed consistency
2. **Reconnection**: Disconnected player reads full Y.Array and replays to catch up
3. **Future spectators**: Read-only Y.Array observer, no special handling needed
4. **No conflicts**: Host validates events before appending → no divergence possible

### Host Authority Model

- Host creates game room, validates all incoming actions
- Clients send proposed actions → Host validates → Host appends confirmed events to Y.Array
- **Host performs ALL dice rolling** (initiative, to-hit, hit location, critical hits) — no client-side randomness
- No client-side state divergence possible (all state derived from Y.Array events)
- If host disconnects: game pauses (no host migration in v1)

## Known Technical Risks

### Risk 1: P2P Signaling Reliability (Medium)

Yjs public signaling servers are designed for CRDT sync, not real-time gaming. Vault sync is tolerant of delays; gameplay is not. **Mitigation**: Transport spike will measure round-trip latency. If >500ms, consider self-hosted signaling.

### Risk 2: State Derivation Performance (Medium)

`deriveState()` replays ALL events from genesis on every `appendEvent()`. A typical 4v4 game produces ~200-500 events. **Mitigation**: Profile with 500 events, assert <100ms. Add checkpoint optimization only if needed.

### Risk 3: Existing Test Breakage (Medium)

25+ test files in gameplay utils. Adding multiplayer fields to interfaces risks breaking them. **Mitigation**: ALL new fields must be optional (`isMultiplayer?: boolean`). Never change existing field semantics.

### Risk 4: Event Timestamps Use Local Clock (Low)

Events use `new Date().toISOString()`, different players have different clocks. **Mitigation**: In host-authoritative model, host creates all confirmed events → host's clock is canonical.

### Risk 5: Scope Exceeds Budget (Medium)

Even with deferrals, ~22 tasks is significant. **Mitigation**: Milestone structure with clear "done" checkpoints allows shipping incrementally.

## Edge Cases

### EC-1: Initiative Tie in Multiplayer

Current code: "player wins ties" (`gameSession.ts:273`). In multiplayer, who is "player"? BattleTech rules say **re-roll on ties**. Host must detect tie and broadcast re-roll.

### EC-2: Phase Mismatch Race Condition

Client sends `action_propose` for Movement phase while host has already broadcast `phase_changed` to WeaponAttack. Host must reject with "phase mismatch" reason.

### EC-3: Browser Tab Close vs Network Disconnect

`beforeunload` event should send `game_leave` to distinguish intentional quit from network drop. Without this, every tab close triggers 2-minute reconnection timeout.

### EC-4: Guest BV Calculation Mismatch

If host and guest have different unit databases (different MekStation versions), BV calculations might differ. **Host's calculation is authoritative**. Guest should see host-computed BV in lobby.

### EC-5: Event Log Unbounded Growth

Long game with many units could produce 1000+ events. Immutable `appendEvent` creates full copy + re-derives state each time. **Performance budget**: v1 supports games up to 1000 events.

### EC-6: Simultaneous Concede

Two `game_end` proposals arrive at host. Host must process first, reject second.

### EC-7: Missing GameEndedPayload Reasons

Current `reason` types: `'destruction' | 'concede' | 'turn_limit' | 'objective'`. Need to add `'forfeit'` (disconnect timeout) and `'abandoned'` (host disconnect).

## Success Criteria

- [ ] Two players can play a complete Quick Game remotely
- [ ] Game state stays synchronized (event-sourced via Yjs Y.Array)
- [ ] Turn order is enforced correctly (host-authoritative, alternating movement)
- [ ] Disconnected players can reconnect within timeout (event log catch-up)
- [ ] Host validates all actions and dice rolls (no client-side randomness)
- [ ] Guest force BV is validated by host before game start

## Out of Scope (v1)

- **Spectator mode** — deferred to v1.1 (architecturally supported, UI not built)
- **Cinematic weapon reveal animations** — v1.1. v1 uses text-based event log resolution
- **Turn timers** — v1.1. Real-time alternating turns are fast enough
- **Free-text chat** — v1.1. v1 has 5 predefined quick messages only
- **N-player / team games** — future. GameSide is binary, protocol is 2-player
- **Async / correspondence play** — future. Protocol is async-ready (serializable events)
- **Encounter-based multiplayer** — future. v1 is Quick Game only
- **Campaign multiplayer** — future. v1 is one-off battles only
- **Host migration** — if host disconnects, game pauses/ends
- **Matchmaking / ranked play / ELO** — future
- **Replay sharing** — future (event sourcing supports it trivially)
- **Fog of war** — future
- **STUN/TURN server deployment** — public signaling only
- **End-to-end encryption** — beyond WSS
