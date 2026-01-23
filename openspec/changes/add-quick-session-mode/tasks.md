# Tasks: Add Quick Session Mode

## 1. Quick Game Entry Point

- [ ] 1.1 Create `/gameplay/quick` page (Quick Game hub)
- [ ] 1.2 Add "Quick Game" option to Games section or as separate nav item
- [ ] 1.3 Design quick game setup wizard:
  - Select player units (from vault)
  - Configure difficulty
  - Generate or select scenario
  - Start game

## 2. Temporary Instance Model

- [ ] 2.1 Define `IQuickGameInstance` type:
  - Not persisted to database
  - Exists only in memory/session storage
  - Same structure as campaign instance but marked as temporary

- [ ] 2.2 Implement temporary instance creation:
  - Create from vault units without campaign reference
  - Track damage within session
  - Dispose on session end

## 3. Quick Game Store

- [ ] 3.1 Create `useQuickGameStore`:
  - Current game state
  - Temporary unit instances
  - Session events

- [ ] 3.2 Implement session storage fallback:
  - Store game state in sessionStorage
  - Survive page refresh within session
  - Clear on tab close

## 4. Session Event Tracking

- [ ] 4.1 Create in-memory event store for session:
  - Same event structure as campaign events
  - Not persisted to database
  - Supports game replay within session

- [ ] 4.2 Implement session timeline view:
  - View events from current quick game
  - Support replay (same as campaign games)

## 5. Quick Game Flow

- [ ] 5.1 Implement setup wizard:
  - Force selection (use ForceBuilder or simple unit picker)
  - Scenario configuration (use generators)
  - Preview and confirm

- [ ] 5.2 Implement game resolution:
  - Track damage to temporary instances
  - Determine winner
  - Show results summary

- [ ] 5.3 Implement "Play Again" option:
  - Reset with same units (fresh damage)
  - Reset with same scenario
  - New scenario option

## 6. Integration

- [ ] 6.1 Share scenario generation with campaigns
- [ ] 6.2 Share game resolution logic with campaigns
- [ ] 6.3 Share replay viewer with campaigns

## 7. Testing

- [ ] 7.1 Test quick game setup flow
- [ ] 7.2 Test session persistence (refresh survival)
- [ ] 7.3 Test event tracking and replay
- [ ] 7.4 Test that no data persists after session ends
