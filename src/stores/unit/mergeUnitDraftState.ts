import type { UnitState } from '@/stores/unitState';

/** Optional metadata in version-zero drafts: absence means unknown, not a new unit's empty list. */
export function mergeUnitDraftState<T extends UnitState>(
  current: T,
  persisted: Partial<UnitState>,
): T {
  return {
    ...current,
    ...persisted,
    unrecoveredCriticalSlots: persisted.unrecoveredCriticalSlots,
  };
}
