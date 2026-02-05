# Tasks: Pilot System

## 1. Data Model

- [x] 1.1 Define IPilot interface with all attributes
- [x] 1.2 Define IPilotSkills interface (gunnery, piloting)
- [x] 1.3 Define IPilotCareer interface (missions, kills, XP)
- [x] 1.4 Define ISpecialAbility interface
- [x] 1.5 Define pilot type enum (persistent, statblock)

## 2. Database Schema

- [x] 2.1 Create pilots table migration
- [x] 2.2 Create pilot_abilities junction table
- [x] 2.3 Create pilot_history table for career events
- [x] 2.4 Add database CRUD operations

## 3. Pilot Service

- [x] 3.1 Create PilotService with CRUD operations
- [x] 3.2 Implement pilot validation rules
- [x] 3.3 Implement XP calculation formulas
- [x] 3.4 Implement skill advancement logic
- [ ] 3.5 Write tests for pilot service

## 4. Pilot Creation

- [x] 4.1 Create pilot creation wizard component
- [x] 4.2 Implement template-based generation (Green/Regular/Veteran/Elite)
- [x] 4.3 Implement custom point-buy creation
- [x] 4.4 Implement random generation
- [x] 4.5 Implement statblock quick-entry mode

## 5. Special Abilities

- [x] 5.1 Define starter abilities (16 abilities across 4 categories)
- [x] 5.2 Implement ability prerequisites
- [x] 5.3 Implement ability effects interface
- [x] 5.4 Create ability selection UI (AbilityPurchaseModal)
- [ ] 5.5 Write tests for ability system

## 6. Pilot Progression

- [x] 6.1 Implement XP earning (missions, kills, bonuses)
- [x] 6.2 Implement skill improvement purchase
- [x] 6.3 Implement ability purchase
- [x] 6.4 Create progression UI (PilotProgressionPanel)
- [ ] 6.5 Write tests for progression system

## 7. UI Pages

- [x] 7.1 Create /gameplay/pilots roster page
- [x] 7.2 Create /gameplay/pilots/create wizard page
- [x] 7.3 Create /gameplay/pilots/[id] detail page
- [x] 7.4 Add pilot card component for lists
- [x] 7.5 Add pilot detail component for full view

## 8. Integration

- [x] 8.1 Add pilot store (Zustand)
- [x] 8.2 Add pilot API routes
- [x] 8.3 Add pilot to navigation
- [ ] 8.4 Write E2E tests for pilot workflow

## Implementation Notes

### Existing Infrastructure (Already Complete)

- **Types**: `src/types/pilot/PilotInterfaces.ts`, `PilotConstants.ts`, `SpecialAbilities.ts`
- **Store**: `src/stores/usePilotStore.ts` (full Zustand store with CRUD)
- **Service**: `src/services/pilots/PilotService.ts` (business logic)
- **Repository**: `src/services/pilots/PilotRepository.ts` (SQLite persistence)
- **Components**:
  - `src/components/pilots/PilotCreationWizard.tsx` (multi-mode wizard)
  - `src/components/pilots/PilotProgressionPanel.tsx` (skill/XP management)
  - `src/components/pilots/AbilityPurchaseModal.tsx` (ability purchase UI)
- **Pages**:
  - `src/pages/gameplay/pilots/index.tsx` (roster)
  - `src/pages/gameplay/pilots/create.tsx` (creation wizard)
  - `src/pages/gameplay/pilots/[id].tsx` (detail view)
- **API Routes**:
  - `src/pages/api/pilots/index.ts` (list/create)
  - `src/pages/api/pilots/[id].ts` (get/update/delete)
  - `src/pages/api/pilots/[id]/improve-gunnery.ts`
  - `src/pages/api/pilots/[id]/improve-piloting.ts`
  - `src/pages/api/pilots/[id]/purchase-ability.ts`

### 16 Special Abilities (Task 5.1)

**Gunnery**: Weapon Specialist, Marksman, Sniper, Multi-Target, Cluster Hitter
**Piloting**: Evasive, Jumping Jack, Acrobat, Terrain Master
**Toughness**: Iron Will, Pain Tolerance, Edge
**Tactical**: Tactical Genius, Speed Demon, Cool Under Fire, Hot Dog

### Remaining Work

- Unit tests for PilotService (3.5)
- Unit tests for ability system (5.5)
- Unit tests for progression (6.5)
- E2E tests for full workflow (8.4)
