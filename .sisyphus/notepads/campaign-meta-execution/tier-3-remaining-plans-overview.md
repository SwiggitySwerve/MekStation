# Tier 3 Remaining Plans - Quick Reference

**Status**: All OpenSpec proposals merged, awaiting PR #195 merge to start Phase B  
**Date**: 2026-01-27

---

## Execution Order

After Plan 11 and 12 complete:

1. **Plan 14**: Awards & Auto-Granting (independent)
2. **Plan 15**: Rank System (independent)
3. **Plan 16**: Random Events (independent)
4. **Plan 17**: Markets System (independent)

All four can be implemented in any order (no dependencies between them).

---

## Plan 14: Awards & Auto-Granting

**Change-ID**: `add-awards-auto-granting`  
**OpenSpec**: Merged in PR #190 (bundled with Plan 11)  
**Sisyphus Plan**: `awards-auto-granting.md`

### Quick Summary
Auto-award engine that checks personnel against award criteria on configurable triggers (monthly, post-mission, post-scenario).

### Key Deliverables
- 13 award categories (contract, faction hunter, injury, kill, scenario kill, rank, scenario, skill, theatre of war, time, training, misc, combat)
- 5 trigger types (monthly, post-mission, post-scenario, post-promotion, manual)
- "Best Award Only" option per category
- ~30 new awards in expanded categories
- Monthly auto-check as day processor

### Estimated Effort
~12-15 hours

### Task Count
6 tasks (14.1-14.6)

### Dependencies
- Plan 7 (Skills) - for skill-based awards ✅
- Plan 5 (Faction Standing) - for faction hunter awards ✅
- Existing award system - extends IAward interface

### Key Files to Create
- `src/types/campaign/awards/autoAwardTypes.ts`
- `src/lib/campaign/awards/autoAwardEngine.ts`
- `src/lib/campaign/awards/categoryCheckers.ts`
- `src/lib/campaign/processors/autoAwardsProcessor.ts`

---

## Plan 15: Rank System

**Change-ID**: `add-rank-system`  
**OpenSpec**: Merged in PR #190 (bundled with Plan 11)  
**Sisyphus Plan**: `rank-system.md`

### Quick Summary
Formal rank structure with 6 rank systems (IS, Clan, Mercenary, Pirate, Civilian, Custom) and automatic promotion based on time-in-grade and performance.

### Key Deliverables
- 6 rank systems with ~10-15 ranks each
- Time-in-grade requirements
- Performance-based promotion criteria
- Rank insignia/display
- Promotion events

### Estimated Effort
~8-10 hours

### Task Count
5 tasks (15.1-15.5)

### Dependencies
- Plan 13 (Personnel Status/Roles) - for role-based ranks ✅
- Plan 7 (Skills) - for skill requirements ✅

### Key Files to Create
- `src/types/campaign/personnel/rankTypes.ts`
- `src/lib/campaign/personnel/rankSystem.ts`
- `src/lib/campaign/personnel/promotionEngine.ts`
- `src/lib/campaign/processors/promotionProcessor.ts`

---

## Plan 16: Random Events

**Change-ID**: `add-random-events`  
**OpenSpec**: Merged in PR #191  
**Sisyphus Plan**: `random-events.md`

### Quick Summary
Random event system with 50+ event types across 8 categories (personnel, unit, financial, contract, faction, natural disaster, special, campaign).

### Key Deliverables
- 8 event categories
- 50+ event types with gameplay effects
- Frequency control (rare, uncommon, common)
- Event history tracking
- Day processor for daily event checks

### Estimated Effort
~15-18 hours (large event catalog)

### Task Count
6 tasks (16.1-16.6)

### Dependencies
- Plan 5 (Faction Standing) - for faction events ✅
- Plan 11 (Scenario Generation) - for scenario events ✅
- Plan 12 (Contract Types) - for contract events (awaiting)

### Key Files to Create
- `src/types/campaign/events/randomEventTypes.ts`
- `src/lib/campaign/events/eventCatalog.ts`
- `src/lib/campaign/events/eventEngine.ts`
- `src/lib/campaign/processors/randomEventsProcessor.ts`

---

## Plan 17: Markets System

**Change-ID**: `add-markets-system`  
**OpenSpec**: Merged in PR #192  
**Sisyphus Plan**: `markets-system.md`

### Quick Summary
Personnel, unit, and parts markets with dynamic pricing, availability, and refresh cycles.

### Key Deliverables
- 3 market types (personnel, unit, parts)
- Dynamic pricing based on supply/demand
- Market refresh cycles (weekly/monthly)
- Faction-specific availability
- Market quality tiers

### Estimated Effort
~12-15 hours

### Task Count
6 tasks (17.1-17.6)

### Dependencies
- Plan 9 (Acquisition) - for parts market integration ✅
- Plan 5 (Faction Standing) - for faction-specific markets ✅
- Plan 12 (Contract Types) - for contract-based market access (awaiting)

### Key Files to Create
- `src/types/campaign/markets/marketTypes.ts`
- `src/lib/campaign/markets/personnelMarket.ts`
- `src/lib/campaign/markets/unitMarket.ts`
- `src/lib/campaign/markets/partsMarket.ts`
- `src/lib/campaign/processors/marketRefreshProcessor.ts`

---

## Implementation Priority Recommendation

After Plans 11 and 12 complete, suggested order:

1. **Plan 15 (Rank System)** - Smallest scope (8-10 hours), good warm-up
2. **Plan 14 (Awards)** - Medium scope (12-15 hours), extends existing system
3. **Plan 17 (Markets)** - Medium scope (12-15 hours), independent
4. **Plan 16 (Random Events)** - Largest scope (15-18 hours), integrates with others

**Rationale**: Start with smaller plans to build momentum, save largest/most complex for last when patterns are well-established.

---

## Common Patterns Across All Plans

### TDD Approach
- Write tests first (RED)
- Implement minimal code (GREEN)
- Refactor for clarity (REFACTOR)

### Injectable Dependencies
- Use `RandomFn = () => number` for deterministic testing
- Pass dependencies as function parameters

### Day Processor Pattern
- Implement `IDayProcessor` interface
- Register with appropriate phase
- Include option gating

### Type Safety
- String-based enums for serialization
- Type guards for runtime validation
- Avoid `any` types

### Backward Compatibility
- All new fields optional
- Default values documented
- No breaking changes to existing campaigns

---

## Total Remaining Effort Estimate

| Plan | Effort | Status |
|------|--------|--------|
| Plan 11 | Complete | ✅ PR #195 |
| Plan 12 | 15-20h | Prepared |
| Plan 14 | 12-15h | Ready |
| Plan 15 | 8-10h | Ready |
| Plan 16 | 15-18h | Ready |
| Plan 17 | 12-15h | Ready |
| **Total** | **62-78h** | **6 plans** |

**Average**: ~12-13 hours per plan

---

## Next Steps After PR #195 Merges

1. Complete Plan 11 Phase C (archive)
2. Implement Plan 12 (Contract Types) - 15-20 hours
3. Implement Plans 14-17 in recommended order - 47-58 hours
4. Move to Tier 4 (Plan 6: Campaign Presets)

**Estimated time to complete all Tier 3**: ~62-78 hours of focused work

---

**Status**: All Tier 3 plans analyzed and ready for implementation once merge gate clears.
