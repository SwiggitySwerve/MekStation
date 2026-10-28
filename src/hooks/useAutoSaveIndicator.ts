import { useEffect } from 'react';

import { DRAFT_LABEL } from '@/components/customizer/shared/BrowserDraftStatus';
import { useToast } from '@/components/shared/Toast';
import { subscribeToStorageWriteReceipts } from '@/stores/utils/clientSafeStorage';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

export interface AutoSaveIndicatorTarget {
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
}: AutoSaveIndicatorTarget): string {
  return `${getDraftStoragePrefix(unitType)}-${unitId}`;
}

/**
 * Reports failed browser-draft writes for the active customizer unit.
 *
 * A successful write is confirmed in the header save state ("Draft Saved"
 * brightens for a moment, see `useDraftSavePulse`) rather than in a toast, so
 * nothing floats over the page on every edit. A failure is driven by the
 * localStorage write receipt and still raises an error toast, because the
 * user's changes are at risk. The explicit library-save flow has its own API
 * result and toast, so the two destinations stay unambiguous.
 */
export function useAutoSaveIndicator(
  target: AutoSaveIndicatorTarget | null,
): void {
  const { showToast } = useToast();
  const storageKey = target ? getCustomizerDraftStorageKey(target) : null;

  useEffect(() => {
    if (!storageKey) return;
    return subscribeToStorageWriteReceipts((receipt) => {
      if (receipt.key !== storageKey || receipt.status !== 'failed') return;
      showToast({
        message: DRAFT_LABEL.failed,
        variant: 'error',
      });
    });
  }, [showToast, storageKey]);
}
