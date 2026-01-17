# Tasks: Encounter System

## 1. Data Model
- [ ] 1.1 Define IEncounter interface
- [ ] 1.2 Define IVictoryCondition interface
- [ ] 1.3 Define IOpForConfig interface
- [ ] 1.4 Define IMapConfiguration interface

## 2. Database Schema
- [ ] 2.1 Create encounters table migration
- [ ] 2.2 Create encounter_templates table (optional)
- [ ] 2.3 Add database CRUD operations

## 3. Encounter Service
- [ ] 3.1 Create EncounterService
- [ ] 3.2 Implement create encounter
- [ ] 3.3 Implement validate encounter readiness
- [ ] 3.4 Implement launch encounter → game session
- [ ] 3.5 Write tests for encounter service

## 4. OpFor Generation
- [ ] 4.1 Create OpForGenerator service
- [ ] 4.2 Implement BV-based unit selection
- [ ] 4.3 Implement era/faction filtering
- [ ] 4.4 Implement pilot template application
- [ ] 4.5 Write tests for OpFor generation

## 5. Victory Conditions
- [ ] 5.1 Define standard conditions (destroy all, cripple, retreat)
- [ ] 5.2 Implement condition checking logic
- [ ] 5.3 Implement custom condition builder
- [ ] 5.4 Write tests for victory conditions

## 6. Scenario Templates
- [ ] 6.1 Define template format
- [ ] 6.2 Create starter templates (duel, skirmish, ambush)
- [ ] 6.3 Implement template application
- [ ] 6.4 Implement template saving

## 7. Encounter Setup UI
- [ ] 7.1 Create encounter setup wizard
- [ ] 7.2 Implement force selection step
- [ ] 7.3 Implement opponent configuration step
- [ ] 7.4 Implement map selection step
- [ ] 7.5 Implement victory condition step
- [ ] 7.6 Implement review and launch step

## 8. Encounter Pages
- [ ] 8.1 Create /gameplay/encounters list page
- [ ] 8.2 Create /gameplay/encounters/create wizard
- [ ] 8.3 Create /gameplay/encounters/[id] detail page
- [ ] 8.4 Add launch button → game session

## 9. Integration
- [ ] 9.1 Add encounter store (Zustand)
- [ ] 9.2 Add encounter API routes
- [ ] 9.3 Link to game session creation
- [ ] 9.4 Write E2E tests
