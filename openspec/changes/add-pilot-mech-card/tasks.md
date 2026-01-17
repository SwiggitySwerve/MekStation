# Tasks: Pilot-Mech Card

## 1. Data Model
- [ ] 1.1 Create IPilotMechCard interface
- [ ] 1.2 Aggregate pilot data (identity, skills, career)
- [ ] 1.3 Aggregate mech data (via unit card)
- [ ] 1.4 Calculate effective stats (modified by abilities)
- [ ] 1.5 Write tests for data aggregation

## 2. Pilot Section Component
- [ ] 2.1 Create PilotSection component
- [ ] 2.2 Display pilot identity (name, callsign, affiliation)
- [ ] 2.3 Display career stats (missions, kills, XP)
- [ ] 2.4 Display skills (gunnery, piloting)
- [ ] 2.5 Display wounds tracker
- [ ] 2.6 Display abilities list

## 3. Mech Section Component
- [ ] 3.1 Embed UnitCardStandard component
- [ ] 3.2 Add visual connection to pilot section
- [ ] 3.3 Show "No mech assigned" state
- [ ] 3.4 Add "Change Mech" action

## 4. Effective Stats Section
- [ ] 4.1 Calculate base to-hit from gunnery
- [ ] 4.2 Apply ability modifiers
- [ ] 4.3 Calculate consciousness check target
- [ ] 4.4 Show any special rules from abilities
- [ ] 4.5 Write tests for calculations

## 5. Combined Card Component
- [ ] 5.1 Create PilotMechCard component
- [ ] 5.2 Combine pilot, mech, and effective stats sections
- [ ] 5.3 Add action bar (export, share, edit, etc.)
- [ ] 5.4 Handle unassigned states gracefully

## 6. Card Variants
- [ ] 6.1 Compact variant (for lists)
- [ ] 6.2 Standard variant (default)
- [ ] 6.3 Gameplay variant (with current damage/heat/ammo)

## 7. Quick Actions
- [ ] 7.1 Export action (pilot + mech bundle)
- [ ] 7.2 Share action (link to vault sharing)
- [ ] 7.3 Edit Pilot action (navigate to pilot page)
- [ ] 7.4 Change Mech action (mech selector dialog)
- [ ] 7.5 Add to Encounter action

## 8. Integration
- [ ] 8.1 Add to force roster view
- [ ] 8.2 Add to encounter setup
- [ ] 8.3 Add to "Shared with Me" view
- [ ] 8.4 Add to pilot detail page

## 9. Responsive Design
- [ ] 9.1 Desktop layout (side-by-side sections)
- [ ] 9.2 Tablet layout (stacked sections)
- [ ] 9.3 Mobile layout (collapsible sections)
- [ ] 9.4 Print layout
