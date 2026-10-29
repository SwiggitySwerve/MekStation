import { useMemo } from 'react';

import type { IVehicleRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';

import { useVehicleStore } from '@/stores/useVehicleStore';

import { buildVehicleUnitObject } from './buildVehicleUnitObject';

/** Project the active vehicle store into the shared preview and export input. */
export function useVehicleRecordSheetUnit(): IVehicleRecordSheetUnitInput {
  // Read every field the unit object needs directly from the vehicle store.
  const id = useVehicleStore((s) => s.id);
  const name = useVehicleStore((s) => s.name);
  const chassis = useVehicleStore((s) => s.chassis);
  const model = useVehicleStore((s) => s.model);
  const tonnage = useVehicleStore((s) => s.tonnage);
  const techBase = useVehicleStore((s) => s.techBase);
  const rulesLevel = useVehicleStore((s) => s.rulesLevel);
  const year = useVehicleStore((s) => s.year);
  const unitType = useVehicleStore((s) => s.unitType);
  const motionType = useVehicleStore((s) => s.motionType);
  const cruiseMP = useVehicleStore((s) => s.cruiseMP);
  const flankMP = useVehicleStore((s) => s.flankMP);
  const armorType = useVehicleStore((s) => s.armorType);
  const armorAllocation = useVehicleStore((s) => s.armorAllocation);
  const barRating = useVehicleStore((s) => s.barRating);
  const equipment = useVehicleStore((s) => s.equipment);

  // Build the discriminated vehicle unit object for the record-sheet service.
  return useMemo(
    () =>
      buildVehicleUnitObject({
        id,
        name,
        chassis,
        model,
        tonnage,
        techBase,
        rulesLevel,
        year,
        unitType,
        motionType,
        cruiseMP,
        flankMP,
        armorType,
        armorAllocation,
        barRating,
        equipment,
      }),
    [
      id,
      name,
      chassis,
      model,
      tonnage,
      techBase,
      rulesLevel,
      year,
      unitType,
      motionType,
      cruiseMP,
      flankMP,
      armorType,
      armorAllocation,
      barRating,
      equipment,
    ],
  );
}
