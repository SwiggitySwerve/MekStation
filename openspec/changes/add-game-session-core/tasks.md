# Tasks: Game Session Core

## 1. Event System
- [x] 1.1 Define IGameEvent interface
- [x] 1.2 Define all event types enum
- [x] 1.3 Create event factory for each event type
- [x] 1.4 Implement event serialization
- [x] 1.5 Write tests for event creation

## 2. State Derivation
- [x] 2.1 Define IGameState interface
- [x] 2.2 Implement state reducer (events → state)
- [x] 2.3 Implement per-unit state tracking
- [x] 2.4 Implement game-level state (phase, turn, initiative)
- [x] 2.5 Write tests for state derivation

## 3. Game Session
- [x] 3.1 Define IGameSession interface
- [x] 3.2 Implement session lifecycle (create, start, end)
- [x] 3.3 Implement event append
- [x] 3.4 Implement state query (current, at turn N)
- [x] 3.5 Write tests for session management

## 4. Phase Management
- [x] 4.1 Define IPhase interface
- [x] 4.2 Implement Initiative phase
- [x] 4.3 Implement Movement phase (alternating locks)
- [x] 4.4 Implement Weapon Attack phase (simultaneous)
- [x] 4.5 Implement Heat phase
- [x] 4.6 Implement End phase
- [x] 4.7 Implement phase transitions
- [x] 4.8 Write tests for phase flow

## 5. Lock Mechanics
- [x] 5.1 Define lock states (pending, planning, locked, revealed, resolved)
- [x] 5.2 Implement per-unit lock for movement
- [x] 5.3 Implement simultaneous lock for attacks
- [x] 5.4 Implement phase advancement triggers
- [x] 5.5 Write tests for lock mechanics

## 6. Database (DEFERRED - MVP uses in-memory)
- [ ] 6.1 Create games table migration
- [ ] 6.2 Create game_events table migration
- [ ] 6.3 Implement game CRUD operations
- [ ] 6.4 Implement event append operations
- [ ] 6.5 Implement replay query (events by game)

## 7. Game Service (DEFERRED - MVP uses direct session functions)
- [ ] 7.1 Create GameService
- [ ] 7.2 Implement create game
- [ ] 7.3 Implement submit action
- [ ] 7.4 Implement get current state
- [ ] 7.5 Implement replay to turn N
- [ ] 7.6 Write tests for game service

## 8. Replay System
- [x] 8.1 Implement replay controller (replayToSequence, replayToTurn)
- [x] 8.2 Implement scrub to turn/event
- [x] 8.3 Implement game log generation (generateGameLog)
- [x] 8.4 Write tests for replay

## 9. API Routes (DEFERRED - MVP uses direct functions)
- [ ] 9.1 POST /api/games (create)
- [ ] 9.2 GET /api/games/[id] (get state)
- [ ] 9.3 POST /api/games/[id]/events (submit action)
- [ ] 9.4 GET /api/games/[id]/events (get event log)
- [ ] 9.5 GET /api/games/[id]/replay (get replay data)
