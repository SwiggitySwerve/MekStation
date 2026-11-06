import type { IFullUnit } from '@/services/units/CanonicalUnitService';

import { equipmentSignalsFromFullUnit } from './UnitHydrationEquipment';
import { normalizeCriticalSlotText } from './UnitHydrationText';

/** MegaMek 48fcb2f6 MiscType.java:5008-5017; EquipmentTypeLookup.java:172.
 * BABattleMechNIU is a distinct item with F_BATTLEMEK_NIU, not F_DNI_COCKPIT_MOD.
 * Its local catalog display name is ambiguous, so only native identities qualify.
 */
export function hydrateDNICockpitModFromFullUnit(
  fullUnit: IFullUnit,
): boolean | undefined {
  const slots = fullUnit.criticalSlots;
  if (
    !Array.isArray(fullUnit.equipment) &&
    !(slots && typeof slots === 'object' && !Array.isArray(slots))
  )
    return undefined;
  return equipmentSignalsFromFullUnit(fullUnit).some(({ id }) => {
    const key = normalizeCriticalSlotText(id);
    return (
      key === 'dnicockpitmodification' ||
      key === 'directneuralinterfacecockpitmodification'
    );
  });
}
