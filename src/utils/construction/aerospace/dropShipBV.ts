import type { HeatSinkType } from '@/types/construction/HeatSinkType';

import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { calculateAerospaceDefensiveBV } from './aerospaceBVCalculator';
import { resolveAerospaceArmorTypeKey } from './aerospaceBVUnitAdapter';

/** Minimal domain shape; both contract locations and capital arc mounts fit. */
export interface IDropShipBVUnit {
  readonly unitType: UnitType.DROPSHIP;
  readonly structuralIntegrity: number;
  readonly totalArmorPoints: number;
  readonly armorType?: string | number;
  readonly maxThrust?: number;
  readonly heatSinks?: { readonly type: HeatSinkType; readonly count: number };
  readonly cockpit?: string;
  readonly year?: number;
  readonly equipment?: readonly {
    readonly equipmentId: string;
    readonly location?: string;
    readonly arc?: string;
  }[];
}

export type IDropShipDefensiveBVBreakdown = ReturnType<
  typeof calculateAerospaceDefensiveBV
> & {
  readonly calculationScope: 'defensive-only';
  readonly offensive: undefined;
  readonly final: undefined;
};

/**
 * Defensive component of DropShip -> LargeAero -> Aero BV.
 * Complete composition lives in dropShipComplete.ts.
 * @spec establish-all-unit-data-parity: DropShip defensive BV dispatch
 */
export function calculateDropShipDefensiveBV(
  unit: IDropShipBVUnit,
): IDropShipDefensiveBVBreakdown {
  if (
    !Number.isFinite(unit.structuralIntegrity) ||
    !Number.isFinite(unit.totalArmorPoints)
  ) {
    throw new Error('DropShip BV requires finite SI and total armor');
  }
  const defensive = calculateAerospaceDefensiveBV({
    subType: UnitType.DROPSHIP,
    structuralIntegrity: unit.structuralIntegrity,
    totalArmorPoints: unit.totalArmorPoints,
    armorType: resolveAerospaceArmorTypeKey(unit.armorType),
    equipment: (unit.equipment ?? []).map((item) => ({
      id: item.equipmentId,
      location: item.location ?? item.arc ?? '',
    })),
  });
  return {
    ...defensive,
    calculationScope: 'defensive-only',
    offensive: undefined,
    final: undefined,
  };
}
