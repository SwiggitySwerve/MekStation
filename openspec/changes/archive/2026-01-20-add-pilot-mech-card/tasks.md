# Tasks: Pilot-Mech Card

## 1. Data Model

- [x] 1.1 Create IPilotMechCard interface
- [x] 1.2 Aggregate pilot data (identity, skills, career)
- [x] 1.3 Aggregate mech data (via unit card)
- [x] 1.4 Calculate effective stats (modified by abilities)
- [x] 1.5 Write tests for data aggregation

## 2. Pilot Section Component

- [x] 2.1 Create PilotSection component
- [x] 2.2 Display pilot identity (name, callsign, affiliation)
- [x] 2.3 Display career stats (missions, kills, XP)
- [x] 2.4 Display skills (gunnery, piloting)
- [x] 2.5 Display wounds tracker
- [x] 2.6 Display abilities list

## 3. Mech Section Component

- [x] 3.1 Embed UnitCardCompact-style component
- [x] 3.2 Add visual connection to pilot section
- [x] 3.3 Show "No mech assigned" state
- [x] 3.4 Add "Change Mech" action

## 4. Effective Stats Section

- [x] 4.1 Calculate base to-hit from gunnery
- [x] 4.2 Apply ability modifiers (placeholder for future)
- [x] 4.3 Calculate consciousness check target
- [x] 4.4 Show any special rules from abilities
- [x] 4.5 Write tests for calculations

## 5. Combined Card Component

- [x] 5.1 Create PilotMechCard component
- [x] 5.2 Combine pilot, mech, and effective stats sections
- [x] 5.3 Add action bar (export, share, edit, etc.)
- [x] 5.4 Handle unassigned states gracefully

## 6. Card Variants

- [x] 6.1 Compact variant (for lists)
- [x] 6.2 Standard variant (default)
- [x] 6.3 Gameplay variant (with current damage/heat/ammo placeholders)

## 7. Quick Actions

- [x] 7.1 Export action (pilot + mech bundle) - handler prop
- [x] 7.2 Share action (link to vault sharing) - handler prop
- [x] 7.3 Edit Pilot action (navigate to pilot page) - handler prop
- [x] 7.4 Change Mech action (mech selector dialog) - handler prop
- [ ] 7.5 Add to Encounter action (DEFERRED - requires encounter system)

## 8. Integration

- [x] 8.1 Add to force roster view (exports added to force/index.ts)
- [ ] 8.2 Add to encounter setup (DEFERRED - requires encounter system)
- [ ] 8.3 Add to "Shared with Me" view (DEFERRED - requires vault UI)
- [ ] 8.4 Add to pilot detail page (DEFERRED - separate integration task)

## 9. Responsive Design

- [x] 9.1 Desktop layout (side-by-side sections)
- [x] 9.2 Tablet layout (stacked sections via grid breakpoints)
- [x] 9.3 Mobile layout (stacked sections)
- [ ] 9.4 Print layout (DEFERRED - future enhancement)

## Implementation Summary

**Files Created:**

- `src/types/pilot-mech-card.ts` - IPilotMechCardData interface and component props
- `src/services/pilot-mech-card/PilotMechCardDataService.ts` - Data service with calculations
- `src/services/pilot-mech-card/index.ts` - Service exports
- `src/services/pilot-mech-card/__tests__/PilotMechCardDataService.test.ts` - Test suite
- `src/components/pilot-mech-card/PilotSection.tsx` - Pilot identity/skills/wounds display
- `src/components/pilot-mech-card/MechSection.tsx` - Mech display or empty state
- `src/components/pilot-mech-card/EffectiveStatsSection.tsx` - Combat stats calculations
- `src/components/pilot-mech-card/PilotMechCard.tsx` - Main component with 3 variants
- `src/components/pilot-mech-card/index.ts` - Component exports

**Files Modified:**

- `src/components/force/index.ts` - Added PilotMechCard exports for force integration

**Status: 36/40 tasks complete (4 deferred for future phases)**
