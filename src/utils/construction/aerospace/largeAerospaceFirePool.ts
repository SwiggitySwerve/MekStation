import { CapitalArc } from '@/types/unit/CapitalShipInterfaces';

import { sumCappedAmmoBV } from '../battleValueAmmo';
import { calculateOffensiveSpeedFactorForMP } from '../battleValueMovement';

// LargeAeroBVCalculator's BV_LOC_* order also resolves primary-arc ties.
export const LARGE_AEROSPACE_ARCS = [
  CapitalArc.NOSE,
  CapitalArc.FRONT_LEFT,
  CapitalArc.AFT_LEFT,
  CapitalArc.AFT,
  CapitalArc.AFT_RIGHT,
  CapitalArc.FRONT_RIGHT,
] as const;

/** Native type/rack keys and mount valuation must be supplied by their owner. */
export interface ILargeAerospaceArcBV {
  readonly arc: CapitalArc;
  readonly weaponBV: number;
  /** Ungrouped, full-arc value used only for nominal arc selection. */
  readonly weaponSelectionBV?: number;
  /** Grouped additions applied after arc weighting (e.g. PPC capacitors). */
  readonly arcIndependentWeaponBV?: number;
  readonly heat: number;
  readonly ammoBVByType?: Readonly<Record<string, number>>;
  /** Unmodified ammo-using weapon type BV, not the modified weaponBV above. */
  readonly weaponBVByAmmoType?: Readonly<Record<string, number>>;
}

export interface ILargeAerospaceFirePoolInput {
  readonly arcs: readonly ILargeAerospaceArcBV[];
  readonly heatCapacity: number;
  readonly maxThrust: number;
  readonly offensiveEquipmentBV?: number;
}

export interface ILargeAerospaceFirePool {
  readonly primaryArc: CapitalArc;
  readonly arcContributions: readonly {
    readonly arc: CapitalArc;
    readonly weight: number;
    readonly weaponBV: number;
    readonly ammoBV: number;
    readonly weightedBV: number;
  }[];
  readonly weaponFirePoolBV: number;
  readonly ammoBV: number;
  readonly speedFactor: number;
  readonly offensive: number;
}

function requireNonnegative(value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(
      'Large aerospace BV requires finite nonnegative stage facts',
    );
  }
}

/**
 * LargeAeroBVCalculator.determineFront/processArc/processAmmo (48fcb2f64).
 * This stage consumes valued arc facts, not raw mounts or bays. Inherited
 * weapon/link valuation and final unit adjustments are separate stages.
 * @spec establish-all-unit-data-parity: Large aerospace offensive fire pool
 */
export function calculateLargeAerospaceFirePool(
  input: ILargeAerospaceFirePoolInput,
): ILargeAerospaceFirePool {
  requireNonnegative(input.heatCapacity);
  requireNonnegative(input.maxThrust);
  requireNonnegative(input.offensiveEquipmentBV ?? 0);
  const byArc = new Map(input.arcs.map((arc) => [arc.arc, arc]));
  if (
    input.arcs.length !== 6 ||
    byArc.size !== 6 ||
    LARGE_AEROSPACE_ARCS.some((arc) => !byArc.has(arc))
  ) {
    throw new Error(
      'Large aerospace BV requires each of the six firing arcs exactly once',
    );
  }
  const arcs = LARGE_AEROSPACE_ARCS.map((arc) => {
    const facts = byArc.get(arc);
    if (!facts) throw new Error('Missing large aerospace firing arc');
    const weaponSelectionBV = facts.weaponSelectionBV ?? facts.weaponBV;
    const arcIndependentWeaponBV = facts.arcIndependentWeaponBV ?? 0;
    for (const value of [
      facts.weaponBV,
      weaponSelectionBV,
      arcIndependentWeaponBV,
      facts.heat,
      ...Object.values(facts.ammoBVByType ?? {}),
      ...Object.values(facts.weaponBVByAmmoType ?? {}),
    ])
      requireNonnegative(value);
    return { ...facts, weaponSelectionBV, arcIndependentWeaponBV };
  });
  let primary = 0;
  for (let i = 1; i < 6; i++) {
    if (arcs[i].weaponSelectionBV > arcs[primary].weaponSelectionBV)
      primary = i;
  }
  const ccw = (primary + 1) % 6;
  const cw = (primary + 5) % 6;
  const left =
    arcs[ccw].weaponSelectionBV > arcs[cw].weaponSelectionBV ? ccw : cw;
  const right = left === ccw ? cw : ccw;
  const order = [
    primary,
    left,
    right,
    (primary + 3) % 6,
    (left + 3) % 6,
    (right + 3) % 6,
  ];
  let heat = 0;
  const arcContributions = order.map((index, position) => {
    const arc = arcs[index];
    // Native heat is checked after each entire arc, strictly greater than capacity.
    const exceeded = heat > input.heatCapacity;
    const weight =
      position === 0
        ? 1
        : position === 1
          ? exceeded
            ? 0.5
            : 1
          : position === 2
            ? exceeded
              ? 0.25
              : 0.5
            : 0.25;
    const ammoBV = sumCappedAmmoBV(
      arc.ammoBVByType ?? {},
      (key) => arc.weaponBVByAmmoType?.[key],
    );
    heat += arc.heat;
    const weightedWeaponBV = arc.weaponBV * weight + arc.arcIndependentWeaponBV;
    const weightedAmmoBV = ammoBV * weight;
    return {
      arc: arc.arc,
      weight,
      weaponBV: weightedWeaponBV,
      ammoBV: weightedAmmoBV,
      weightedBV: weightedWeaponBV + weightedAmmoBV,
    };
  });
  const weaponFirePoolBV = arcContributions.reduce(
    (sum, arc) => sum + arc.weaponBV,
    0,
  );
  const ammoBV = arcContributions.reduce((sum, arc) => sum + arc.ammoBV, 0);
  const speedFactor = calculateOffensiveSpeedFactorForMP(input.maxThrust);
  return {
    primaryArc: arcs[primary].arc,
    arcContributions,
    weaponFirePoolBV,
    ammoBV,
    speedFactor,
    offensive:
      (weaponFirePoolBV + ammoBV + (input.offensiveEquipmentBV ?? 0)) *
      speedFactor,
  };
}
