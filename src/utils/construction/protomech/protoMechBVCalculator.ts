/**
 * ProtoMech BV composition and skill adjustment.
 *
 * Pinned MegaMek 48fcb2f6 ProtoMekBVCalculator inherits the base calculator's
 * empty weight/type modifiers. Round defense plus offense, apply the shared
 * skill table with Gunnery and fixed Piloting 5, then round the final value.
 * No generic chassis modifier applies; chassis rules enter through their
 * component owners. Equipment pools and optional bonuses remain separate.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/battle-value-system/spec.md
 */
import type { IProtoMechBVBreakdown } from '@/types/unit/BVBreakdownTypes';

import { IProtoMechUnit, ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import { getPilotSkillModifier } from '@/types/validation/BattleValue';

import { calculateProtoDefensive } from './protoMechBVDefensive';
import { calculateProtoOffensive } from './protoMechBVOffensive';

/**
 * Options controlling the ProtoMech BV calculation.
 */
export interface IProtoMechBVOptions {
  /** Gunnery skill (default 4 — baseline pilot). */
  readonly gunnery?: number;
  /** Accepted for compatibility; ProtoMech BV always uses Piloting 5. */
  readonly piloting?: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_GUNNERY = 4;

/** ProtoMech BV ignores crew Piloting, including an explicit caller value. */
const PROTO_BV_PILOTING = 5;

/** Neutral compatibility output; chassis effects belong to component rules. */
export function getProtoChassisMultiplier(_chassis: ProtoChassis): number {
  return 1;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Calculate the BV 2.0 breakdown for a ProtoMech.
 *
 * The breakdown carries both components and sub-pieces so callers can use it
 * for status bars, the parity harness, and point aggregation.
 */
export function calculateProtoMechBV(
  unit: IProtoMechUnit,
  options: IProtoMechBVOptions = {},
): IProtoMechBVBreakdown {
  const defensive = calculateProtoDefensive(unit);
  const offensive = calculateProtoOffensive(unit);

  const baseBV = Math.round(defensive.defensiveBV + offensive.offensiveBV);

  const chassisMultiplier = getProtoChassisMultiplier(unit.chassisType);

  const gunnery = options.gunnery ?? DEFAULT_GUNNERY;
  const pilotMultiplier = getPilotSkillModifier(gunnery, PROTO_BV_PILOTING);

  const final = Math.round(baseBV * chassisMultiplier * pilotMultiplier);

  return {
    defensiveBV: defensive.defensiveBV,
    offensiveBV: offensive.offensiveBV,
    baseBV,
    chassisMultiplier,
    pilotMultiplier,
    final,
    armorBV: defensive.armorBV,
    structureBV: defensive.structureBV,
    defensiveEquipmentBV: defensive.defensiveEquipmentBV,
    explosivePenalty: defensive.explosivePenalty,
    defensiveFactor: defensive.defensiveFactor,
    weaponBV: offensive.weaponBV,
    ammoBV: offensive.ammoBV,
    physicalWeaponBV: offensive.physicalWeaponBV,
    offensiveEquipmentBV: offensive.offensiveEquipmentBV,
    speedFactor: offensive.speedFactor,
  };
}

/**
 * Sum up to 5 proto BVs into a point BV. Used for force-level reporting only;
 * each proto still fights individually, so the point BV is not used for
 * combat dispatch (see spec §ProtoMech Point BV Aggregation).
 */
export function calculateProtoPointBV(
  units: ReadonlyArray<IProtoMechUnit>,
  options: IProtoMechBVOptions = {},
): number {
  let total = 0;
  for (const u of units) {
    total += calculateProtoMechBV(u, options).final;
  }
  return total;
}
