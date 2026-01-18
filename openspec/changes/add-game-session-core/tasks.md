# Tasks: Game Session Core

## 1. Event System
- [ ] 1.1 Define IGameEvent interface
- [ ] 1.2 Define all event types enum
- [ ] 1.3 Create event factory for each event type
- [ ] 1.4 Implement event serialization
- [ ] 1.5 Write tests for event creation

## 2. State Derivation
- [ ] 2.1 Define IGameState interface
- [ ] 2.2 Implement state reducer (events → state)
- [ ] 2.3 Implement per-unit state tracking
- [ ] 2.4 Implement game-level state (phase, turn, initiative)
- [ ] 2.5 Write tests for state derivation

## 3. Game Session
- [ ] 3.1 Define IGameSession interface
- [ ] 3.2 Implement session lifecycle (create, start, end)
- [ ] 3.3 Implement event append
- [ ] 3.4 Implement state query (current, at turn N)
- [ ] 3.5 Write tests for session management

## 4. Phase Management
- [ ] 4.1 Define IPhase interface
- [ ] 4.2 Implement Initiative phase
- [ ] 4.3 Implement Movement phase (alternating locks)
- [ ] 4.4 Implement Weapon Attack phase (simultaneous)
- [ ] 4.5 Implement Heat phase
- [ ] 4.6 Implement End phase
- [ ] 4.7 Implement phase transitions
- [ ] 4.8 Write tests for phase flow

## 5. Lock Mechanics
- [ ] 5.1 Define lock states (pending, planning, locked, revealed, resolved)
- [ ] 5.2 Implement per-unit lock for movement
- [ ] 5.3 Implement simultaneous lock for attacks
- [ ] 5.4 Implement phase advancement triggers
- [ ] 5.5 Write tests for lock mechanics

## 6. Database
- [ ] 6.1 Create games table migration
- [ ] 6.2 Create game_events table migration
- [ ] 6.3 Implement game CRUD operations
- [ ] 6.4 Implement event append operations
- [ ] 6.5 Implement replay query (events by game)

## 7. Game Service
- [ ] 7.1 Create GameService
- [ ] 7.2 Implement create game
- [ ] 7.3 Implement submit action
- [ ] 7.4 Implement get current state
- [ ] 7.5 Implement replay to turn N
- [ ] 7.6 Write tests for game service

## 8. Replay System
- [ ] 8.1 Implement replay controller
- [ ] 8.2 Implement scrub to turn/event
- [ ] 8.3 Implement game log generation
- [ ] 8.4 Write tests for replay

## 9. API Routes
- [ ] 9.1 POST /api/games (create)
- [ ] 9.2 GET /api/games/[id] (get state)
- [ ] 9.3 POST /api/games/[id]/events (submit action)
- [ ] 9.4 GET /api/games/[id]/events (get event log)
- [ ] 9.5 GET /api/games/[id]/replay (get replay data)
