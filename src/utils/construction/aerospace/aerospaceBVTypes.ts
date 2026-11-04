import type {
  AerospaceArc,
  AerospaceSubType,
} from '../../../types/unit/AerospaceInterfaces';

import { UnitType } from '../../../types/unit/BattleMechInterfaces';

export type CapitalShipBVType =
  | UnitType.JUMPSHIP
  | UnitType.WARSHIP
  | UnitType.SPACE_STATION;

export function isCapitalShipBVType(
  value: unknown,
): value is CapitalShipBVType {
  return (
    value === UnitType.JUMPSHIP ||
    value === UnitType.WARSHIP ||
    value === UnitType.SPACE_STATION
  );
}

/**
 * Single piece of aerospace-mounted equipment for BV purposes.
 * Uses raw location strings so both ASF/CF (NOSE/LEFT_WING/RIGHT_WING/AFT/FUSELAGE)
 * and Small Craft (NOSE/LEFT_SIDE/RIGHT_SIDE/AFT/HULL) inputs can be normalized.
 */
export interface IAerospaceBVEquipment {
  /** Canonical equipment ID used to look up catalog BV/heat */
  readonly id: string;
  /** Firing arc / internal location */
  readonly location: AerospaceArc | string;
  /** Source identity survives aliases whose catalog id omits "ammo". */
  readonly isAmmo?: boolean;
}

/**
 * Ammo entry used when computing ammo BV capped against matching weapon BV.
 */
export interface IAerospaceBVAmmo {
  readonly id: string;
  /** BV value from catalog */
  readonly bv: number;
  /** Normalized weapon type this ammo serves (e.g. 'lrm-20') */
  readonly weaponType: string;
}

/**
 * Minimal shape the aerospace BV calculator needs. This is intentionally
 * decoupled from the full Aerospace store/unit interface so it can be called
 * from construction code, the status bar, or parity harnesses with equal ease.
 */
export interface IAerospaceBVInput {
  readonly hasSmallCockpit?: boolean;
  readonly subType: AerospaceSubType;
  readonly techBase?: string;
  readonly year?: number;
  /** Original BLK type retains mixed-tech chassis identity. */
  readonly sourceTechType?: string;
  /** Fixed-wing support aircraft use the support-vehicle defensive type rule. */
  readonly isSupportVehicle?: boolean;
  readonly tonnage: number;
  readonly structuralIntegrity: number;
  readonly safeThrust: number;
  readonly maxThrust: number;
  /** Dissipation per turn; absent cooling retains the legacy unheated pool. */
  readonly heatCapacity?: number;
  readonly armorType: string;
  readonly barRating?: number;
  readonly totalArmorPoints: number;
  readonly equipment: readonly IAerospaceBVEquipment[];
  readonly ammo?: readonly IAerospaceBVAmmo[];
  /** Additional defensive BV not represented in equipment (mounted items are resolved automatically). */
  readonly defensiveEquipmentBV?: number;
  /** BV of offensive-only non-weapon equipment (TAG, Targeting Computer, C3, etc.) */
  readonly offensiveEquipmentBV?: number;
  /** Explosive location penalty total (stacking gauss/ammo penalties) */
  readonly explosivePenalties?: number;
  /** Pilot gunnery skill (0-8, default 4 baseline) */
  readonly pilotGunnery?: number;
  /** Pilot piloting skill (0-8, default 5 baseline) */
  readonly pilotPiloting?: number;
}

/** Defensive facts shared by aircraft and the large-aerospace calculators. */
export type IAerospaceDefensiveBVInput = Pick<
  IAerospaceBVInput,
  | 'isSupportVehicle'
  | 'techBase'
  | 'sourceTechType'
  | 'year'
  | 'armorType'
  | 'barRating'
  | 'totalArmorPoints'
  | 'structuralIntegrity'
  | 'equipment'
  | 'defensiveEquipmentBV'
  | 'explosivePenalties'
> & {
  readonly subType: AerospaceSubType | UnitType.DROPSHIP | CapitalShipBVType;
};

export type {
  IAerospaceArcContribution,
  IAerospaceBVBreakdown,
} from '@/types/unit/BVBreakdownTypes';
