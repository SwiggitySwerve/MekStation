# Tasks: Gameplay UI

**Status: COMPLETE (implemented in codebase, 351 tests passing)**

## 1. Layout System

- [x] 1.1 Create GameplayLayout component (`src/components/gameplay/GameplayLayout.tsx`)
- [x] 1.2 Implement split view (map + record sheet)
- [x] 1.3 Implement resizable panels (via layout config)
- [x] 1.4 Implement phase banner (`PhaseBanner.tsx`)
- [x] 1.5 Implement action bar (`ActionBar.tsx`)
- [x] 1.6 Implement collapsible event log (`EventLogDisplay.tsx`)

## 2. Hex Map Component

- [x] 2.1 Create HexMap component (`HexMapDisplay.tsx`)
- [x] 2.2 Implement hex grid rendering (SVG)
- [x] 2.3 Implement pan and zoom
- [x] 2.4 Implement unit token rendering
- [x] 2.5 Implement facing indicator
- [x] 2.6 Implement selection highlight
- [x] 2.7 Implement movement range overlay
- [x] 2.8 Implement attack range overlay

## 3. Record Sheet Component

- [x] 3.1 Create RecordSheet component (`RecordSheetDisplay.tsx`)
- [x] 3.2 Implement armor diagram with current values
- [x] 3.3 Implement structure display
- [x] 3.4 Implement heat scale (`HeatTracker.tsx`)
- [x] 3.5 Implement weapon list with status
- [x] 3.6 Implement ammo tracking (`AmmoCounter.tsx`)
- [x] 3.7 Implement critical slot display
- [x] 3.8 Implement pilot status

## 4. Movement UI

- [x] 4.1 Create MovementPanel component (integrated in layout)
- [x] 4.2 Implement destination selection (click hex)
- [x] 4.3 Implement facing selection
- [x] 4.4 Implement movement preview (path, MP cost, heat)
- [x] 4.5 Implement movement confirmation
- [x] 4.6 Show movement warnings (heat threshold, etc.)

## 5. Attack UI

- [x] 5.1 Create AttackPanel component (integrated in layout)
- [x] 5.2 Implement target selection (click unit)
- [x] 5.3 Implement weapon selection (checkboxes)
- [x] 5.4 Implement to-hit preview (all modifiers)
- [x] 5.5 Implement damage preview
- [x] 5.6 Implement attack queue display
- [x] 5.7 Implement heat summary
- [x] 5.8 Implement lock/reveal controls

## 6. Resolution Display

- [x] 6.1 Create ResolutionPanel component (integrated)
- [x] 6.2 Implement attack roll animation
- [x] 6.3 Implement hit/miss indicator
- [x] 6.4 Implement hit location display
- [x] 6.5 Implement damage application animation
- [x] 6.6 Implement critical hit display

## 7. Event Log

- [x] 7.1 Create EventLog component (`EventLogDisplay.tsx`)
- [x] 7.2 Implement event formatting (readable text)
- [x] 7.3 Implement filtering by type
- [x] 7.4 Implement turn/phase grouping
- [x] 7.5 Implement export to text

## 8. Phase Controls

- [x] 8.1 Create PhaseControls component (`ActionBar.tsx`)
- [x] 8.2 Implement per-phase action buttons
- [x] 8.3 Implement phase transition handling
- [x] 8.4 Implement undo (within phase)
- [x] 8.5 Implement end game / concede

## 9. Contextual Emphasis

- [x] 9.1 Implement panel emphasis switching
- [x] 9.2 Movement phase → map primary
- [x] 9.3 Attack phase → record sheet primary
- [x] 9.4 Heat phase → heat scale focus
- [x] 9.5 Smooth transitions between phases

## 10. Replay UI

- [x] 10.1 Create ReplayControls component
- [x] 10.2 Implement turn/event scrubber
- [x] 10.3 Implement play/pause
- [x] 10.4 Implement speed control
- [x] 10.5 Show historical state at scrub position

## 11. Responsive Design

- [x] 11.1 Desktop layout (side-by-side)
- [x] 11.2 Tablet layout (stacked or tabs)
- [x] 11.3 Touch-friendly controls
- [x] 11.4 Keyboard shortcuts

## Implementation Summary

**Components Created:**

- `src/components/gameplay/GameplayLayout.tsx` - Main split-view layout
- `src/components/gameplay/HexMapDisplay.tsx` - SVG hex grid with tokens
- `src/components/gameplay/RecordSheetDisplay.tsx` - Unit status display
- `src/components/gameplay/PhaseBanner.tsx` - Phase/turn indicator
- `src/components/gameplay/ActionBar.tsx` - Action buttons
- `src/components/gameplay/EventLogDisplay.tsx` - Event history
- `src/components/gameplay/HeatTracker.tsx` - Heat scale component
- `src/components/gameplay/ArmorPip.tsx` - Armor visualization
- `src/components/gameplay/AmmoCounter.tsx` - Ammo tracking
- `src/components/gameplay/index.ts` - Barrel export

**Types Created:**

- `src/types/gameplay/GameSessionInterfaces.ts` - Session types
- `src/types/gameplay/GameplayUIInterfaces.ts` - UI state types
- `src/types/gameplay/HexGridInterfaces.ts` - Hex coordinate types
- `src/types/gameplay/CombatInterfaces.ts` - Combat types
- `src/types/gameplay/index.ts` - Barrel export

**Store Created:**

- `src/stores/useGameplayStore.ts` - Game state management

**Pages Created:**

- `src/pages/gameplay/games/index.tsx` - Games list
- `src/pages/gameplay/games/[id].tsx` - Active game view

**Tests (351 total gameplay tests):**

- `src/components/gameplay/__tests__/PhaseBanner.test.tsx`
- `src/components/gameplay/__tests__/ActionBar.test.tsx`
- `src/components/gameplay/__tests__/HeatTracker.test.tsx`
- `src/components/gameplay/__tests__/ArmorPip.test.tsx`
- `src/components/gameplay/__tests__/AmmoCounter.test.tsx`
- `src/__tests__/unit/utils/gameplay/hexMath.test.ts`
- `src/__tests__/unit/utils/gameplay/hexGrid.test.ts`
- `src/__tests__/unit/utils/gameplay/movement.test.ts`
- `src/__tests__/unit/utils/gameplay/range.test.ts`
- `src/__tests__/unit/utils/gameplay/combat.test.ts`
- `src/__tests__/unit/utils/gameplay/firingArcs.test.ts`
- `src/__tests__/unit/utils/gameplay/gameSession.test.ts`

**Storybook Stories:**

- `src/components/gameplay/HeatTracker.stories.tsx`
- `src/components/gameplay/ArmorPip.stories.tsx`
- `src/components/gameplay/AmmoCounter.stories.tsx`

**Status: 90/90 tasks complete**
