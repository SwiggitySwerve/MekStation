# Change: Add Campaign System

## Why

Players want persistent, multi-mission gameplay where outcomes carry forward. Single battles are fun, but campaigns create narrative arcs, pilot progression, and strategic depth. This transforms MekStation from a skirmish tool into a campaign manager.

## What Changes

- Add campaign entity linking multiple encounters
- Implement persistent unit damage between missions
- Add pilot experience and skill progression
- Add resource tracking (C-Bills, salvage, supplies)
- Add campaign timeline and mission tree
- Add victory/defeat conditions for campaigns

## Dependencies

- `add-encounter-system` (Phase 4) - Individual mission setup
- `add-pilot-system` (Phase 1) - Pilot management
- `add-repair-system` (Phase 5) - Damage persistence requires repair

## Impact

- Affected specs: `campaign-system` (new capability)
- Affected code: `src/types/campaign/`, `src/stores/`, `src/pages/campaigns/`
- New pages: Campaign list, campaign detail, mission tree
- Database: Campaign, mission, roster persistence

## Success Criteria

- [ ] Create multi-mission campaigns with narrative
- [ ] Damage carries between missions (or requires repair)
- [ ] Pilots gain XP and improve skills
- [ ] Campaign victory/defeat based on cumulative results
- [ ] Can branch mission tree based on outcomes

## Technical Approach

1. **Data Model**: Campaign contains missions, tracks roster state per mission
2. **State Management**: Campaign store with mission history
3. **Persistence**: Local storage initially, API later
4. **Progression**: XP system integrated with pilot store
5. **UI**: Campaign dashboard, mission tree visualization
