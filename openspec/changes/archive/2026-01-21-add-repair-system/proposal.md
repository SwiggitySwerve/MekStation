# Change: Add Repair System

## Why

In campaigns, damage persistence creates meaningful consequences. But without repairs, units would quickly become unusable. The repair system adds resource management, strategic decisions about repair priorities, and post-battle gameplay between missions.

## What Changes

- Add repair workflow for damaged units
- Implement repair costs (time, C-Bills, parts)
- Add repair bay/facility concept
- Track component damage and replacement
- Add partial repair options (field repairs vs full)
- Integrate with campaign resource management

## Dependencies

- `add-campaign-system` (Phase 5) - Campaign resource tracking
- `add-encounter-system` (Phase 4) - Damage tracking from battles
- Existing unit customizer for component access

## Impact

- Affected specs: `repair` (new capability)
- Affected code: `src/types/repair/`, `src/services/repair/`, campaign store
- New UI: Repair bay page, damage assessment, repair queue
- Storage: Repair state per unit in campaign

## Success Criteria

- [ ] Damaged units can be repaired between missions
- [ ] Repair costs resources (C-Bills, time)
- [ ] Players can prioritize which units to repair
- [ ] Partial repairs possible when resources limited
- [ ] Destroyed components require replacement

## Repair Types

1. **Armor Repair**: Restore armor points (cheapest)
2. **Structure Repair**: Restore internal structure
3. **Component Repair**: Fix damaged components
4. **Component Replacement**: Replace destroyed components
5. **Field Repair**: Quick partial repair between missions
