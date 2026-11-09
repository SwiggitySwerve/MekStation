import { CapitalArc } from '@/types/unit/CapitalShipInterfaces';

import { sumCappedAmmoBV } from '../battleValueAmmo';
import { calculateOffensiveSpeedFactorForMP } from '../battleValueMovement';
import { calculateArcWeaponBV } from '../battleValueWeapons';

// LargeAeroBVCalculator's BV_LOC_* order also resolves primary-arc ties.
export const LARGE_AEROSPACE_ARCS = [
  CapitalArc.NOSE,
  CapitalArc.FRONT_LEFT,
  CapitalArc.AFT_LEFT,
  CapitalArc.AFT,
  CapitalArc.AFT_RIGHT,
  CapitalArc.FRONT_RIGHT,
] as const;

/** WarShipBVCalculator uses native indices 6/7 for its broadside arcs. */
export function getLargeAerospaceArcs(
  isWarship = false,
): readonly CapitalArc[] {
  return isWarship
    ? [
        ...LARGE_AEROSPACE_ARCS,
        CapitalArc.LEFT_BROADSIDE,
        CapitalArc.RIGHT_BROADSIDE,
      ]
    : LARGE_AEROSPACE_ARCS;
}

/**
 * Equal mounts the pinned calculator sums before valuation
 * (LargeAeroBVCalculator.canBeSummed: type, physical location, rear flag and
 * link type). Facts for native trace terms only; no stage reads them.
 */
export interface ILargeAerospaceWeaponGroup {
  readonly id: string;
  /** Physical location, which can differ from the BV arc for rear mounts. */
  readonly location: CapitalArc;
  readonly count: number;
  /** Sum of the unweighted, link-multiplied mount values. */
  readonly weaponBV: number;
  /** One capacitor addition for the group, applied after arc weighting. */
  readonly capacitorBV: number;
}

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
  /** Native cap entries of defensive launchers; trace-only, never capped against. */
  readonly nonOffensiveCapBVByAmmoType?: Readonly<Record<string, number>>;
  readonly weaponGroups?: readonly ILargeAerospaceWeaponGroup[];
}

export interface ILargeAerospaceFirePoolInput {
  readonly arcs: readonly ILargeAerospaceArcBV[];
  readonly heatCapacity: number;
  readonly maxThrust: number;
  readonly isWarship?: boolean;
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
  const locations = getLargeAerospaceArcs(input.isWarship);
  const byArc = new Map(input.arcs.map((arc) => [arc.arc, arc]));
  if (
    input.arcs.length !== locations.length ||
    byArc.size !== locations.length ||
    locations.some((arc) => !byArc.has(arc))
  ) {
    throw new Error(
      'Large aerospace BV requires each native firing arc exactly once',
    );
  }
  const arcs = locations.map((arc) => {
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
  const candidates = input.isWarship ? [0, 3, 6, 7] : [0, 1, 2, 3, 4, 5];
  const ccwOf = (i: number): number =>
    input.isWarship ? [1, 6, 3, 4, 7, 0, 2, 5][i] : (i + 1) % 6;
  const cwOf = (i: number): number =>
    input.isWarship ? [5, 0, 6, 2, 3, 7, 1, 4][i] : (i + 5) % 6;
  const opposite = (i: number): number =>
    input.isWarship ? [3, 4, 5, 0, 1, 2, 7, 6][i] : (i + 3) % 6;
  let primary = 0;
  for (const i of candidates) {
    if (arcs[i].weaponSelectionBV > arcs[primary].weaponSelectionBV)
      primary = i;
  }
  const ccw = ccwOf(primary);
  const cw = cwOf(primary);
  const left =
    arcs[ccw].weaponSelectionBV > arcs[cw].weaponSelectionBV ? ccw : cw;
  const right = left === ccw ? cw : ccw;
  const rear = opposite(primary);
  const order = input.isWarship
    ? [
        primary,
        left,
        rear,
        ccwOf(rear),
        cwOf(rear),
        ccwOf(ccwOf(rear)),
        cwOf(cwOf(rear)),
        right,
      ]
    : [
        primary,
        left,
        right,
        opposite(primary),
        opposite(left),
        opposite(right),
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
    const weightedWeaponBV = calculateArcWeaponBV(
      arc.weaponBV,
      weight,
      arc.arcIndependentWeaponBV,
    );
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
