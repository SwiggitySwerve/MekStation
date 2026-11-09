import { getUnitSaveState } from '@/stores/unitSaveState';
import { safeGetItem } from '@/stores/utils/clientSafeStorage';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

export interface CustomizerDraftTarget {
  readonly unitId: string;
  readonly unitType: UnitType;
}

function getDraftStoragePrefix(unitType: UnitType): string {
  switch (unitType) {
    case UnitType.BATTLEMECH:
    case UnitType.OMNIMECH:
    case UnitType.INDUSTRIALMECH:
      return 'megamek-unit';
    case UnitType.VEHICLE:
    case UnitType.VTOL:
    case UnitType.SUPPORT_VEHICLE:
      return 'megamek-vehicle';
    case UnitType.AEROSPACE:
    case UnitType.CONVENTIONAL_FIGHTER:
    case UnitType.SMALL_CRAFT:
    case UnitType.DROPSHIP:
    case UnitType.JUMPSHIP:
    case UnitType.WARSHIP:
    case UnitType.SPACE_STATION:
      return 'megamek-aerospace';
    case UnitType.BATTLE_ARMOR:
      return 'megamek-battlearmor';
    case UnitType.INFANTRY:
      return 'megamek-infantry';
    case UnitType.PROTOMECH:
      return 'megamek-protomech';
  }
}

export function getCustomizerDraftStorageKey({
  unitId,
  unitType,
}: CustomizerDraftTarget): string {
  return `${getDraftStoragePrefix(unitType)}-${unitId}`;
}

/** Unknown persisted dirty state must not let a background draft close silently. */
export function isStoredCustomizerDraftModified(
  target: CustomizerDraftTarget,
): boolean {
  try {
    const raw = safeGetItem(getCustomizerDraftStorageKey(target));
    if (raw === null) return false;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !('state' in parsed))
      return true;
    const state = parsed.state;
    if (!state || typeof state !== 'object' || !('isModified' in state))
      return true;
    return (
      getUnitSaveState(
        {
          isModified:
            typeof state.isModified === 'boolean'
              ? state.isModified
              : undefined,
        },
        '',
      ).modification !== 'clean'
    );
  } catch {
    return true;
  }
}
