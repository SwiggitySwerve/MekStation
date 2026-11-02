import type { CapitalShipBVType, IAerospaceBVInput } from './aerospaceBVTypes';
import type {
  IDropShipBVUnit,
  IDropShipDefensiveBVBreakdown,
} from './dropShipBV';

import { calculateAerospaceDefensiveBV } from './aerospaceBVCalculator';
import { resolveAerospaceArmorTypeKey } from './aerospaceBVUnitAdapter';

/** Capital families share the existing minimal large-aerospace defense facts. */
export interface ICapitalShipBVUnit
  extends
    Omit<IDropShipBVUnit, 'unitType'>,
    Pick<IAerospaceBVInput, 'defensiveEquipmentBV'> {
  readonly unitType: CapitalShipBVType;
}
export type ICapitalShipDefensiveBVBreakdown = IDropShipDefensiveBVBreakdown;

/** @spec establish-all-unit-data-parity: Capital ship defensive BV dispatch */
export function calculateCapitalShipDefensiveBV(
  unit: ICapitalShipBVUnit,
): ICapitalShipDefensiveBVBreakdown {
  if (
    !Number.isFinite(unit.structuralIntegrity) ||
    !Number.isFinite(unit.totalArmorPoints)
  ) {
    throw new Error('Capital ship BV requires finite SI and total armor');
  }
  return {
    ...calculateAerospaceDefensiveBV({
      subType: unit.unitType,
      structuralIntegrity: unit.structuralIntegrity,
      totalArmorPoints: unit.totalArmorPoints,
      armorType: resolveAerospaceArmorTypeKey(unit.armorType),
      defensiveEquipmentBV: unit.defensiveEquipmentBV,
      equipment: (unit.equipment ?? []).map((item) => ({
        id: item.equipmentId,
        location: item.location ?? item.arc ?? '',
      })),
    }),
    calculationScope: 'defensive-only',
    offensive: undefined,
    final: undefined,
  };
}
