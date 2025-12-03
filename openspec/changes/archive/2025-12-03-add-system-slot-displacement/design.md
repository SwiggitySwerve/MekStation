## Context

BattleTech construction rules specify that XL, Light, and XXL engines require slots in the side torsos in addition to the center torso. When a user changes from a Standard engine to an XL engine, the system must handle equipment that is already placed in the slots that the engine will now occupy.

Current behavior:
- `getFixedSlotIndices()` returns empty set for side torsos regardless of engine type
- `setEngineType` and `setGyroType` only update the type without considering slot conflicts
- UI shows all side torso slots as available even with XL engines

## Goals / Non-Goals

Goals:
- Prevent invalid unit states where equipment occupies engine slots
- Automatically unallocate displaced equipment rather than blocking the change
- Update UI to show correct fixed slot state based on configuration
- Handle both engine and gyro type changes

Non-Goals:
- Attempting to relocate displaced equipment automatically (too complex, user should decide)
- Validating total slot capacity before configuration change (separate validation concern)
- Handling cockpit type changes (no slot count changes between types currently)

## Decisions

### Decision 1: Displacement Strategy
**Decision**: Unallocate displaced equipment (set location/slots to undefined) rather than blocking the configuration change.

**Rationale**: 
- Blocking would frustrate users who want to change configurations
- Auto-relocation is complex and may not satisfy user preferences
- Unallocated equipment is visible in the loadout tray for easy re-placement

**Alternatives considered**:
- Block configuration change if slots occupied → Too restrictive
- Auto-relocate to first available slots → Complex, may violate location restrictions

### Decision 2: Slot Index Calculation
**Decision**: Engine side torso slots always start at index 0 and are contiguous.

**Rationale**: This matches how the center torso engine slots work and is consistent with TechManual rules.

### Decision 3: Change Detection Location
**Decision**: Perform displacement detection in the store action itself, not as a middleware or side effect.

**Rationale**:
- Keeps state transition atomic (displacement happens with type change)
- No race conditions or async complications
- Easy to test

## Risks / Trade-offs

- **Risk**: User loses equipment placement unexpectedly
  - **Mitigation**: Unallocated equipment remains in loadout tray, user can re-place it

- **Trade-off**: Performance impact of scanning equipment on every config change
  - **Mitigation**: Equipment arrays are typically small (<50 items), O(n) scan is acceptable

## Migration Plan

No migration needed - this is additive behavior. Existing persisted units may have equipment in invalid slots if they were placed before this change. The displacement logic will correct these on the next configuration change.

## Open Questions

None - design is straightforward based on BattleTech rules.

