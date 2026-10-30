/**
 * ProtoMech Battle Value (BV 2.0) calculation.
 *
 * Implements the proto BV path per TechManual BV 2.0, adapted to proto scale:
 *   defensiveBV  = (armorBV + structureBV + defEquipBV − explosive) × defFactor
 *   offensiveBV  = (weaponBV + ammoBV + physicalBonus + offEquipBV) × speedFactor
 *   chassisAdjustedBV = round(defensiveBV + offensiveBV) × chassisMultiplier
 *   finalBV     = round(chassisAdjustedBV × pilotMultiplier)
 *
 * Proto-specific rules (TechManual + ProtoMech errata):
 *   - armorBV      = armorPoints × 2.5 (Standard armor only; mult 1.0)
 *   - structureBV  = structurePoints × 1.5
 *   - defFactor    = 1 + (maxTMM / 10); TMM from run/jump using shared tables
 *   - speed factor = round(pow(1 + (mp − 5) / 10, 1.2) × 100) / 100,
 *                    mp = runMP + round(max(jumpMP, 0) / 2)
 *   - Main gun weapons count at full BV, identical to a mech-mounted instance.
 *   - Physical attack bonus: small flat bonus per the ProtoMech errata
 *     (equal to tonnage − reflects low-damage proto punch).
 *   - Chassis multipliers:
 *        Glider        0.90× (fragile, lower durability)
 *        Ultraheavy    1.15× (heavier armor/firepower)
 *        Biped / Quad  1.00×
 *   - Pilot multiplier reuses the shared gunnery/piloting table via
 *     `getPilotSkillModifier` from `BattleValue`.
 *
 * Exposes {@link calculateProtoMechBV} and {@link calculateProtoPointBV}.
 *
 * @spec openspec/changes/add-protomech-battle-value/specs/battle-value-system/spec.md
 * @spec openspec/changes/add-protomech-battle-value/specs/protomech-unit-system/spec.md
 * @spec openspec/changes/add-protomech-battle-value/tasks.md
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
  /** Piloting skill (default 5 — baseline pilot). */
  readonly piloting?: number;
}

// =============================================================================
// Constants
// =============================================================================

/** Chassis multipliers applied to the rounded base BV. */
const CHASSIS_MULTIPLIER_GLIDER = 0.9;

const CHASSIS_MULTIPLIER_ULTRAHEAVY = 1.15;

const CHASSIS_MULTIPLIER_STANDARD = 1.0;

/**
 * Default gunnery / piloting when the caller omits them — matches the mech
 * BV convention (baseline 4/5 = 1.0 multiplier).
 */
const DEFAULT_GUNNERY = 4;

const DEFAULT_PILOTING = 5;

/** Resolve the chassis multiplier for a proto. */
export function getProtoChassisMultiplier(chassis: ProtoChassis): number {
  switch (chassis) {
    case ProtoChassis.GLIDER:
      return CHASSIS_MULTIPLIER_GLIDER;
    case ProtoChassis.ULTRAHEAVY:
      return CHASSIS_MULTIPLIER_ULTRAHEAVY;
    case ProtoChassis.BIPED:
    case ProtoChassis.QUAD:
    default:
      return CHASSIS_MULTIPLIER_STANDARD;
  }
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
  const piloting = options.piloting ?? DEFAULT_PILOTING;
  const pilotMultiplier = getPilotSkillModifier(gunnery, piloting);

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
