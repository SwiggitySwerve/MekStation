# Tasks: Pilot System

## 1. Data Model
- [ ] 1.1 Define IPilot interface with all attributes
- [ ] 1.2 Define IPilotSkills interface (gunnery, piloting)
- [ ] 1.3 Define IPilotCareer interface (missions, kills, XP)
- [ ] 1.4 Define ISpecialAbility interface
- [ ] 1.5 Define pilot type enum (persistent, statblock)

## 2. Database Schema
- [ ] 2.1 Create pilots table migration
- [ ] 2.2 Create pilot_abilities junction table
- [ ] 2.3 Create pilot_history table for career events
- [ ] 2.4 Add database CRUD operations

## 3. Pilot Service
- [ ] 3.1 Create PilotService with CRUD operations
- [ ] 3.2 Implement pilot validation rules
- [ ] 3.3 Implement XP calculation formulas
- [ ] 3.4 Implement skill advancement logic
- [ ] 3.5 Write tests for pilot service

## 4. Pilot Creation
- [ ] 4.1 Create pilot creation wizard component
- [ ] 4.2 Implement template-based generation (Green/Regular/Veteran/Elite)
- [ ] 4.3 Implement custom point-buy creation
- [ ] 4.4 Implement random generation
- [ ] 4.5 Implement statblock quick-entry mode

## 5. Special Abilities
- [ ] 5.1 Define starter abilities (10-15)
- [ ] 5.2 Implement ability prerequisites
- [ ] 5.3 Implement ability effects interface
- [ ] 5.4 Create ability selection UI
- [ ] 5.5 Write tests for ability system

## 6. Pilot Progression
- [ ] 6.1 Implement XP earning (missions, kills, bonuses)
- [ ] 6.2 Implement skill improvement purchase
- [ ] 6.3 Implement ability purchase
- [ ] 6.4 Create progression UI
- [ ] 6.5 Write tests for progression system

## 7. UI Pages
- [ ] 7.1 Create /gameplay/pilots roster page
- [ ] 7.2 Create /gameplay/pilots/create wizard page
- [ ] 7.3 Create /gameplay/pilots/[id] detail page
- [ ] 7.4 Add pilot card component for lists
- [ ] 7.5 Add pilot detail component for full view

## 8. Integration
- [ ] 8.1 Add pilot store (Zustand)
- [ ] 8.2 Add pilot API routes
- [ ] 8.3 Add pilot to navigation
- [ ] 8.4 Write E2E tests for pilot workflow
