import { VehicleLocation } from '@/types/construction/UnitLocation';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { getEquipmentEntry } from '@/utils/construction/equipmentBV';
import { normalizeEquipmentId } from '@/utils/construction/equipmentBV/normalization';

import {
  combatVehicleSlotErrors,
  supportVehicleSlotErrors,
  type VehicleSlotUnit,
} from './itemSlots';
import { vehicleMotiveErrors } from './motiveCompatibility';
/** TestTank.java:979-981,1079-1089: CASE flags require the body, for CV and SV. */
export function validateVehicleCaseLocations(
  equipment: readonly {
    readonly equipmentId: string;
    readonly location: string;
  }[],
): string[] {
  return equipment.flatMap((item) => {
    const id = normalizeEquipmentId(item.equipmentId).replace(/[^a-z]/g, '');
    if (
      !/^(?:is|cl|clan)?case(?:ii|pprototype)?$/.test(id) ||
      item.location === VehicleLocation.BODY
    )
      return [];
    const name = id.endsWith('ii')
      ? 'CASE II'
      : id.endsWith('prototype')
        ? 'CASE-P (Prototype)'
        : 'CASE';
    return [name + ' must be mounted in the body.'];
  });
}

/** TestTank:979-980,1079-1093: placement does not depend on slot completeness. */
function validateVehicleFireControlLocations(
  equipment: VehicleSlotUnit['equipment'],
): string[] {
  return equipment.flatMap(({ equipmentId, location }) => {
    if (location === VehicleLocation.BODY) return [];
    const record = getEquipmentEntry(equipmentId);
    return record && FIRE_CONTROL.has(record.id)
      ? [`${record.name} must be mounted in the body.`]
      : [];
  });
}

const FIRE_CONTROL = new Set(['basic-fire-control', 'advanced-fire-control']);

/** Combat vehicles and VTOLs: body locations, item slots, motive compatibility. */
export function validateCombatVehicleEquipment(
  unit: VehicleSlotUnit & { readonly motionType: GroundMotionType },
  sideUnknown = false,
): string[] {
  return [
    ...validateVehicleCaseLocations(unit.equipment),
    ...combatVehicleSlotErrors(unit, sideUnknown),
    ...validateVehicleFireControlLocations(unit.equipment),
    ...vehicleMotiveErrors(unit.equipment, unit.motionType, false),
  ];
}

/** Support vehicles: body locations, item slots, then motive compatibility. */
export function validateSupportVehicleEquipment(
  unit: VehicleSlotUnit & { readonly motionType: GroundMotionType },
): string[] {
  return [
    ...validateVehicleCaseLocations(unit.equipment),
    ...supportVehicleSlotErrors(unit),
    ...validateVehicleFireControlLocations(unit.equipment),
    ...vehicleMotiveErrors(unit.equipment, unit.motionType, true),
  ];
}
