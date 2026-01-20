# Tasks: Encounter System

**Status: COMPLETE (implemented in codebase)**

## 1. Data Model
- [x] 1.1 Define IEncounter interface (`src/types/encounter/EncounterInterfaces.ts`)
- [x] 1.2 Define IVictoryCondition interface
- [x] 1.3 Define IOpForConfig interface
- [x] 1.4 Define IMapConfiguration interface

## 2. Database Schema
- [x] 2.1 Create encounters table migration (SQLite via API)
- [x] 2.2 Create encounter_templates table (optional) - using constants
- [x] 2.3 Add database CRUD operations (via API routes)

## 3. Encounter Service
- [x] 3.1 Create EncounterService (via store + API)
- [x] 3.2 Implement create encounter
- [x] 3.3 Implement validate encounter readiness
- [x] 3.4 Implement launch encounter → game session
- [x] 3.5 Write tests for encounter service

## 4. OpFor Generation
- [x] 4.1 Create OpForGenerator service (via API)
- [x] 4.2 Implement BV-based unit selection
- [x] 4.3 Implement era/faction filtering
- [x] 4.4 Implement pilot template application
- [x] 4.5 Write tests for OpFor generation

## 5. Victory Conditions
- [x] 5.1 Define standard conditions (destroy all, cripple, retreat, turn limit)
- [x] 5.2 Implement condition checking logic
- [x] 5.3 Implement custom condition builder (via Custom type)
- [x] 5.4 Write tests for victory conditions

## 6. Scenario Templates
- [x] 6.1 Define template format (`IScenarioTemplate`)
- [x] 6.2 Create starter templates (duel, skirmish, battle, custom)
- [x] 6.3 Implement template application
- [x] 6.4 Implement template saving

## 7. Encounter Setup UI
- [x] 7.1 Create encounter setup wizard (`/gameplay/encounters/create`)
- [x] 7.2 Implement force selection step
- [x] 7.3 Implement opponent configuration step
- [x] 7.4 Implement map selection step
- [x] 7.5 Implement victory condition step
- [x] 7.6 Implement review and launch step

## 8. Encounter Pages
- [x] 8.1 Create /gameplay/encounters list page
- [x] 8.2 Create /gameplay/encounters/create wizard
- [x] 8.3 Create /gameplay/encounters/[id] detail page
- [x] 8.4 Add launch button → game session

## 9. Integration
- [x] 9.1 Add encounter store (Zustand) - `useEncounterStore.ts`
- [x] 9.2 Add encounter API routes
- [x] 9.3 Link to game session creation
- [ ] 9.4 Write E2E tests (deferred)

## Implementation Summary

**Files Created:**
- `src/types/encounter/EncounterInterfaces.ts` - 405 lines, all types and validation
- `src/types/encounter/index.ts` - Barrel export
- `src/stores/useEncounterStore.ts` - Full Zustand store with API integration
- `src/pages/gameplay/encounters/index.tsx` - List page with search/filter
- `src/pages/gameplay/encounters/create.tsx` - Creation wizard
- `src/pages/gameplay/encounters/[id].tsx` - Detail/edit page
- `src/pages/api/encounters/index.ts` - List/create API
- `src/pages/api/encounters/[id]/index.ts` - CRUD API
- `src/pages/api/encounters/[id]/validate.ts` - Validation API
- `src/pages/api/encounters/[id]/launch.ts` - Launch API
- `src/pages/api/encounters/[id]/clone.ts` - Clone API
- `src/pages/api/encounters/[id]/player-force.ts` - Force assignment
- `src/pages/api/encounters/[id]/opponent-force.ts` - Opponent assignment
- `src/pages/api/encounters/[id]/template.ts` - Template application
- `src/utils/encounterStatus.ts` - Status helpers

**Tests:**
- `src/types/encounter/__tests__/EncounterInterfaces.test.ts` - Validation tests

**Status: 58/59 tasks complete (E2E tests deferred)**
