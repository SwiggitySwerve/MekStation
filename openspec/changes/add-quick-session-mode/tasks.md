# Tasks: Add Quick Session Mode

## 1. Quick Game Entry Point

- [x] 1.1 Create `/gameplay/quick` page (Quick Game hub)
  - Implemented in: `src/pages/gameplay/quick/index.tsx`
- [x] 1.2 Add "Quick Game" option to Games section or as separate nav item
  - Added QuickGameIcon to NavigationIcons.tsx
  - Added to Sidebar.tsx gameplayItems
- [x] 1.3 Design quick game setup wizard:
  - Select player units (from vault)
  - Configure difficulty
  - Generate or select scenario
  - Start game
  - Implemented with step indicator and multi-step flow

## 2. Temporary Instance Model

- [x] 2.1 Define `IQuickGameInstance` type:
  - Not persisted to database
  - Exists only in memory/session storage
  - Same structure as campaign instance but marked as temporary
  - Implemented in: `src/types/quickgame/QuickGameInterfaces.ts`

- [x] 2.2 Implement temporary instance creation:
  - Create from vault units without campaign reference
  - Track damage within session
  - Dispose on session end
  - Helper functions: createQuickGameInstance, createQuickGameUnit

## 3. Quick Game Store

- [x] 3.1 Create `useQuickGameStore`:
  - Current game state
  - Temporary unit instances
  - Session events
  - Implemented in: `src/stores/useQuickGameStore.ts`

- [x] 3.2 Implement session storage fallback:
  - Store game state in sessionStorage
  - Survive page refresh within session
  - Clear on tab close
  - Using zustand persist middleware with sessionStorage

## 4. Session Event Tracking

- [x] 4.1 Create in-memory event store for session:
  - Same event structure as campaign events
  - Not persisted to database
  - Supports game replay within session
  - Events stored in IQuickGameInstance.events

- [x] 4.2 Implement session timeline view:
  - View events from current quick game
  - Support replay (same as campaign games)
  - Implemented in: `src/components/quickgame/QuickGameTimeline.tsx`
  - Integrated in QuickGamePlay and QuickGameResults

## 5. Quick Game Flow

- [x] 5.1 Implement setup wizard:
  - Force selection (use ForceBuilder or simple unit picker)
  - Scenario configuration (use generators)
  - Preview and confirm
  - Implemented in: `src/components/quickgame/QuickGameSetup.tsx`
  - Review screen in: `src/components/quickgame/QuickGameReview.tsx`

- [x] 5.2 Implement game resolution:
  - Track damage to temporary instances
  - Determine winner
  - Show results summary
  - Simplified interface in: `src/components/quickgame/QuickGamePlay.tsx`
  - (Full hex map integration is TODO)

- [x] 5.3 Implement "Play Again" option:
  - Reset with same units (fresh damage)
  - Reset with same scenario
  - New scenario option
  - Implemented in: `src/components/quickgame/QuickGameResults.tsx`

## 6. Integration

- [x] 6.1 Share scenario generation with campaigns
  - Uses ScenarioGeneratorService from feat/scenario-generators
- [ ] 6.2 Share game resolution logic with campaigns
- [ ] 6.3 Share replay viewer with campaigns

## 7. Testing

- [x] 7.1 Test quick game setup flow
  - 21 tests in: `src/stores/__tests__/useQuickGameStore.test.ts`
- [x] 7.2 Test session persistence (refresh survival)
  - Covered by store tests
- [ ] 7.3 Test event tracking and replay
- [ ] 7.4 Test that no data persists after session ends
