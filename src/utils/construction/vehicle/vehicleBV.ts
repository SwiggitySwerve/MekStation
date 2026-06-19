/**
 * Vehicle Battle Value Calculator (BV 2.0)
 *
 * Implements Battle Value computation for combat vehicles, VTOLs, and
 * support vehicles per the TechManual / MegaMek rules. Mirrors the
 * structure of the mech BV calculator in `battleValueCalculations.ts`
 * but substitutes vehicle-specific rules:
 *
 *  - Defensive BV uses armor × 2.5 × armorMult + structure × 1.5 × structureMult
 *    + defensive equipment BV − explosive penalty, then multiplied by a
 *    defensive factor derived from the motion-type TMM.
 *  - Offensive BV sums weapon BV (with turret / sponson / rear-arc modifiers),
 *    ammo BV (capped per weapon family), and offensive equipment BV, then
 *    multiplied by the vehicle speed factor.
 *  - Final BV = (defensive + offensive) × pilot-skill multiplier.
 *  - Support vehicles with BAR < 10 scale armor BV by BAR / 10.
 *
 * @spec openspec/changes/add-vehicle-battle-value/specs/battle-value-system/spec.md
 * @spec openspec/changes/add-vehicle-battle-value/specs/vehicle-unit-system/spec.md
 */

import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { getArmorBVMultiplier } from '@/types/validation/BattleValue';

import { calculateOffensiveSpeedFactor } from '../battleValueMovement';
import {
  calculateAmmoBVWithExcessiveCap,
  type OffensiveBVConfig,
} from '../battleValueOffensive';
import {
  normalizeEquipmentId,
  resolveEquipmentBV,
} from '../equipmentBVResolver';

// =============================================================================
// Public Types
// =============================================================================

/**
 * Rotating turret kind used for turret multiplier selection.
 */
export type VehicleTurretKind = 'single' | 'dual' | 'chin' | 'sponson';

/**
 * A single weapon mount on a vehicle.
 */
export interface VehicleWeaponMount {
  /** Canonical equipment id (e.g. `ppc`, `medium-laser`). */
  id: string;
  /** Mount location — `front`, `left`, `right`, `rear`, `turret`, `body`, `rotor`. */
  location: string;
  /** Whether this mount is rear-facing on a fixed-arc chassis. */
  isRearMounted?: boolean;
  /** Whether this mount rotates on a turret (single/dual/chin). */
  isTurretMounted?: boolean;
  /** Whether this mount is a sponson pair. */
  isSponsonMounted?: boolean;
  /** Override BV — if omitted the resolver provides it. */
  bvOverride?: number;
  /** Artemis type affecting BV, if linked. */
  artemisType?: 'iv' | 'v';
}

/**
 * A single ammunition bin on a vehicle.
 */
export interface VehicleAmmoMount {
  /** Canonical ammo id. */
  id: string;
  /** Location where the ammo is stored. */
  location: string;
  /** Optional explicit BV override. */
  bvOverride?: number;
  /** Optional explicit weaponType override (for ammo mapping). */
  weaponTypeOverride?: string;
}

/**
 * A defensive equipment mount (ECM, AMS, Guardian ECM, CASE, Chaff Pod, etc.)
 */
export interface VehicleDefensiveEquipmentMount {
  id: string;
  location: string;
  /** BV override — omit to resolve via equipment catalog. */
  bvOverride?: number;
}

/**
 * An offensive equipment mount — Targeting Computer, C3, active ECM role, etc.
 */
export interface VehicleOffensiveEquipmentMount {
  id: string;
  location: string;
  /** BV override — omit to resolve via equipment catalog. */
  bvOverride?: number;
  /** Flag the item as a targeting computer — activates +25% direct-fire multiplier. */
  isTargetingComputer?: boolean;
}

/**
 * Turret configuration used for multiplier calculation.
 */
export interface VehicleBVTurret {
  /** Kind of turret — controls +5% / +2.5% multipliers. */
  kind: VehicleTurretKind;
}

/**
 * Input for vehicle BV calculation.
 */
export interface VehicleBVInput {
  /** Motion type — Tracked, Wheeled, Hover, VTOL, Hydrofoil, WiGE, Naval, Submarine, Rail, Maglev. */
  motionType: GroundMotionType;
  /** Cruise MP (walk equivalent). */
  cruiseMP: number;
  /** Flank MP — typically `floor(cruise × 1.5)`. */
  flankMP: number;
  /** Jump MP (0 for tracked/wheeled/naval/rail). */
  jumpMP?: number;
  /** Submarine depth MP — overrides cruise for TMM when relevant. */
  submarineMP?: number;
  /** Tonnage (used for weight-independent modifiers). */
  tonnage: number;
  /** Total allocated armor points. */
  totalArmorPoints: number;
  /** Total internal structure points. */
  totalStructurePoints: number;
  /** Armor type — lowercase normalized (`standard`, `ferro-fibrous`, `hardened`, `reactive`, `reflective`, `ferro-lamellor`, …). */
  armorType?: string;
  /** Internal structure type — `standard`, `endo-steel`, `composite`, `reinforced`. */
  structureType?: string;
  /** BAR rating 1-10 for support vehicles; `null` for combat vehicles. */
  barRating?: number | null;
  /** Weapon mounts. */
  weapons: VehicleWeaponMount[];
  /** Ammo bins. */
  ammo?: VehicleAmmoMount[];
  /** Defensive equipment. */
  defensiveEquipment?: VehicleDefensiveEquipmentMount[];
  /** Offensive equipment — TC, C3, Narc, active ECM, etc. */
  offensiveEquipment?: VehicleOffensiveEquipmentMount[];
  /** Explosive ammo penalty BV — MegaMek-style, already computed upstream. */
  explosivePenalty?: number;
  /** Primary turret configuration. */
  turret?: VehicleBVTurret;
  /** Secondary turret (dual-turret vehicles). */
  secondaryTurret?: VehicleBVTurret;
  /** Pilot gunnery skill (default 4). */
  gunnery?: number;
  /** Pilot piloting skill (default 5). */
  piloting?: number;
}

/**
 * Vehicle BV breakdown — populated on unit state.
 *
 * Keys called out in the spec delta: defensive, offensive, pilotMultiplier,
 * turretModifier, final (plus supporting fields for the status-bar dialog).
 */
export interface IVehicleBVBreakdown {
  /** Defensive BV component (post-defensive-factor). */
  defensive: number;
  /** Offensive BV component (post-speed-factor). */
  offensive: number;
  /** Pilot skill multiplier (gunnery × piloting matrix). */
  pilotMultiplier: number;
  /** Turret-modifier scalar applied to turret-mounted offensive BV. */
  turretModifier: number;
  /** Final BV — rounded integer. */
  final: number;

  /** Raw armor BV (pre-defensive-factor). */
  armorBV: number;
  /** Raw structure BV (pre-defensive-factor). */
  structureBV: number;
  /** Resolved defensive equipment BV. */
  defensiveEquipmentBV: number;
  /** Defensive factor = 1 + (TMM × 0.5 / 10). */
  defensiveFactor: number;
  /** Effective TMM used for the defensive factor and speed factor. */
  tmm: number;

  /** Weapon BV (turret-adjusted, rear-adjusted, TC-adjusted). */
  weaponBV: number;
  /** Ammo BV (capped per weapon family). */
  ammoBV: number;
  /** Resolved offensive equipment BV. */
  offensiveEquipmentBV: number;
  /** Speed factor scalar. */
  speedFactor: number;
}

// =============================================================================
// Movement Helpers
// =============================================================================

/**
 * Vehicle TMM table — same as mech table, indexed by run MP.
 */
function vehicleRunMPtoTMM(mp: number): number {
  if (mp <= 2) return 0;
  if (mp <= 4) return 1;
  if (mp <= 6) return 2;
  if (mp <= 9) return 3;
  if (mp <= 17) return 4;
  if (mp <= 24) return 5;
  return 6;
}

/**
 * Effective MP used for TMM and speed factor.
 *
 * Rules:
 *   - Tracked / wheeled / naval / rail / maglev: flank MP.
 *   - VTOL: flank MP (altitude delta is 0 at construction time —
 *           the +1 TMM bonus is added downstream).
 *   - Hover / hydrofoil / WiGE: flank MP.
 *   - Submarine: submarineMP override (defaults to flank MP).
 */
export function getVehicleEffectiveMP(input: VehicleBVInput): number {
  if (input.motionType === GroundMotionType.SUBMARINE) {
    return input.submarineMP ?? input.flankMP;
  }
  return input.flankMP;
}

/**
 * Vehicle TMM including motion-type bonuses.
 *
 *   - VTOL: +1 TMM (altitude bonus).
 *   - Hover / Hydrofoil / WiGE: +0 at construction BV (terrain-dependent
 *     bonus is applied in combat, not in BV per MegaMek rules).
 */
export function calculateVehicleTMM(input: VehicleBVInput): number {
  const runMP = getVehicleEffectiveMP(input);
  let tmm = vehicleRunMPtoTMM(runMP);

  if (input.motionType === GroundMotionType.VTOL) {
    tmm += 1;
  }

  // Include jump bonus (rare on vehicles, but WiGE/VTOL jet-equipped can have it).
  const jumpMP = input.jumpMP ?? 0;
  if (jumpMP > 0) {
    const jumpTMM = vehicleRunMPtoTMM(jumpMP) + 1;
    if (jumpTMM > tmm) tmm = jumpTMM;
  }

  return tmm;
}

/**
 * Vehicle speed factor — round(pow(1 + (mp - 5) / 10, 1.2) × 100) / 100.
 */
export function calculateVehicleSpeedFactor(input: VehicleBVInput): number {
  const mp = getVehicleEffectiveMP(input);
  const jumpMP = input.jumpMP ?? 0;
  // Reuse shared mech formula — vehicles never get a UMU; jump contributes as mp + round(jump/2).
  return calculateOffensiveSpeedFactor(mp, jumpMP, 0);
}

// =============================================================================
// Structure Multiplier
// =============================================================================

/**
 * Structure-type BV multiplier for vehicles.
 * Same table as mechs for the overlapping types; vehicles have no industrial structure.
 */
function getVehicleStructureBVMultiplier(structureType?: string): number {
  const key = (structureType ?? 'standard').toLowerCase();
  switch (key) {
    case 'endo-steel':
      return 1.0; // vehicles: Endo-Steel structure has no BV penalty
    case 'composite':
      return 0.5;
    case 'reinforced':
      return 2.0;
    case 'standard':
    default:
      return 1.0;
  }
}

// =============================================================================
// Pilot skill table (vehicle crew — same matrix as mech pilots)
// =============================================================================

const VEHICLE_PILOT_MATRIX: number[][] = [
  [2.42, 2.31, 2.21, 2.1, 1.93, 1.75, 1.68, 1.59, 1.5],
  [2.21, 2.11, 2.02, 1.92, 1.76, 1.6, 1.54, 1.46, 1.38],
  [1.93, 1.85, 1.76, 1.68, 1.54, 1.4, 1.35, 1.28, 1.21],
  [1.66, 1.58, 1.51, 1.44, 1.32, 1.2, 1.16, 1.1, 1.04],
  [1.38, 1.32, 1.26, 1.2, 1.1, 1.0, 0.95, 0.9, 0.85],
  [1.31, 1.19, 1.13, 1.08, 0.99, 0.9, 0.86, 0.81, 0.77],
  [1.24, 1.12, 1.07, 1.02, 0.94, 0.85, 0.81, 0.77, 0.72],
  [1.17, 1.06, 1.01, 0.96, 0.88, 0.8, 0.76, 0.72, 0.68],
  [1.1, 0.99, 0.95, 0.9, 0.83, 0.75, 0.71, 0.68, 0.64],
];

function getVehiclePilotMultiplier(gunnery: number, piloting: number): number {
  const g = Math.max(0, Math.min(8, Math.floor(gunnery)));
  const p = Math.max(0, Math.min(8, Math.floor(piloting)));
  return VEHICLE_PILOT_MATRIX[g][p];
}

// =============================================================================
// Turret Multipliers
// =============================================================================

/**
 * Multiplier for a turret-mounted weapon.
 *
 *   - Single / Dual / Chin: 1.05 (+5% rotating turret bonus)
 *   - Sponson: 1.025 (+2.5% sponson bonus)
 *   - None: 1.0
 */
function turretMultiplier(turret?: VehicleBVTurret): number {
  if (!turret) return 1.0;
  switch (turret.kind) {
    case 'single':
    case 'dual':
    case 'chin':
      return 1.05;
    case 'sponson':
      return 1.025;
    default:
      return 1.0;
  }
}

/**
 * Determine whether a weapon mount is direct-fire for TC bonus.
 * Mirrors the mech-side rule: LRM/SRM/MRM/Machine-Gun/Flamer/AMS/TAG do NOT get TC.
 */
function isDirectFireWeapon(id: string): boolean {
  const n = id.toLowerCase();
  return (
    !n.includes('lrm') &&
    !n.includes('srm') &&
    !n.includes('mrm') &&
    !n.includes('machine-gun') &&
    !n.includes('machinegun') &&
    !n.includes('mg-') &&
    !n.includes('flamer') &&
    !n.includes('ams') &&
    !n.includes('tag') &&
    !n.includes('narc')
  );
}

// =============================================================================
// Defensive BV
// =============================================================================

export interface VehicleDefensiveBVBreakdown {
  armorBV: number;
  structureBV: number;
  defensiveEquipmentBV: number;
  explosivePenalty: number;
  defensiveFactor: number;
  tmm: number;
  total: number;
}

/**
 * Compute defensive BV per the vehicle rules.
 *
 * armorBV = totalArmor × 2.5 × armorMult × barScale
 * structureBV = totalStructure × 1.5 × structureMult
 * baseDef = armorBV + structureBV + defEquipBV − explosivePenalty
 * defensiveFactor = 1 + ((TMM × 0.5) / 10)
 * defensiveBV = baseDef × defensiveFactor
 */
export function calculateVehicleDefensiveBV(
  input: VehicleBVInput,
): VehicleDefensiveBVBreakdown {
  const armorMult = getArmorBVMultiplier(input.armorType ?? 'standard');
  const structureMult = getVehicleStructureBVMultiplier(input.structureType);

  // Support vehicle BAR scaling: multiply armor BV by BAR/10 when BAR < 10.
  const bar = input.barRating;
  const barScale = bar !== null && bar !== undefined && bar < 10 ? bar / 10 : 1;

  const armorBV = input.totalArmorPoints * 2.5 * armorMult * barScale;
  const structureBV = input.totalStructurePoints * 1.5 * structureMult;

  let defensiveEquipmentBV = 0;
  for (const entry of input.defensiveEquipment ?? []) {
    if (entry.bvOverride !== undefined) {
      defensiveEquipmentBV += entry.bvOverride;
      continue;
    }
    defensiveEquipmentBV += resolveEquipmentBV(entry.id).battleValue;
  }

  const explosivePenalty = input.explosivePenalty ?? 0;

  // TMM and defensive factor — vehicles use TMM × 0.5 / 10 (not the mech TMM/10).
  const tmm = calculateVehicleTMM(input);
  const defensiveFactor = 1 + (tmm * 0.5) / 10;

  const baseDef =
    armorBV + structureBV + defensiveEquipmentBV - explosivePenalty;
  const total = baseDef * defensiveFactor;

  return {
    armorBV,
    structureBV,
    defensiveEquipmentBV,
    explosivePenalty,
    defensiveFactor,
    tmm,
    total,
  };
}

// =============================================================================
// Offensive BV
// =============================================================================

export interface VehicleOffensiveBVBreakdown {
  weaponBV: number;
  ammoBV: number;
  offensiveEquipmentBV: number;
  speedFactor: number;
  turretModifier: number;
  total: number;
}

type VehicleAmmoBVEntries = NonNullable<OffensiveBVConfig['ammo']>;

function resolveMountBattleValue(mount: {
  id: string;
  bvOverride?: number;
}): number {
  return mount.bvOverride ?? resolveEquipmentBV(mount.id).battleValue;
}

function calculateWeaponBVEntry(
  weapon: VehicleWeaponMount,
  targetingComputerMounted: boolean,
  primaryTurretMult: number,
  secondaryTurretMult: number,
) {
  const listedBV = resolveMountBattleValue(weapon);
  let adjustedBV = listedBV;

  if (weapon.artemisType === 'iv') {
    adjustedBV *= 1.2;
  } else if (weapon.artemisType === 'v') {
    adjustedBV *= 1.3;
  }

  if (weapon.isRearMounted && !weapon.isTurretMounted) {
    adjustedBV *= 0.5;
  }

  if (targetingComputerMounted && isDirectFireWeapon(weapon.id)) {
    adjustedBV *= 1.25;
  }

  let locationMult = 1.0;
  if (weapon.isTurretMounted) {
    locationMult = primaryTurretMult;
  } else if (weapon.isSponsonMounted) {
    locationMult = secondaryTurretMult || 1.025;
  }

  return {
    id: weapon.id,
    listedBV,
    finalBV: adjustedBV * locationMult,
  };
}

function getAmmoWeaponType(ammo: VehicleAmmoMount): string {
  return (
    ammo.weaponTypeOverride ??
    normalizeEquipmentId(ammo.id)
      .replace(/^is-/, '')
      .replace(/^cl-/, '')
      .replace(/-ammo$/, '')
      .replace(/^ammo-/, '')
  );
}

function buildVehicleAmmoEntries(
  ammo: VehicleAmmoMount[] = [],
): VehicleAmmoBVEntries {
  return ammo.map((entry) => ({
    id: entry.id,
    bv: resolveMountBattleValue(entry),
    weaponType: getAmmoWeaponType(entry),
  }));
}

function calculateVehicleOffensiveEquipmentBV(
  equipment: VehicleOffensiveEquipmentMount[] = [],
): number {
  let total = 0;

  for (const entry of equipment) {
    if (entry.isTargetingComputer) {
      // TC itself is modeled via the +25% weapon multiplier, not a flat BV add.
      continue;
    }
    total += resolveMountBattleValue(entry);
  }

  return total;
}

/**
 * Compute offensive BV per vehicle rules.
 *
 *   weaponBV  = sum of (per-weapon BV × turretMult × rearMult × artemisMult × tcMult)
 *   ammoBV    = capped-per-weapon-family sum (delegates to mech ammo cap)
 *   offEquipBV = targeting-computer and misc equipment BV
 *   turretModifier = weighted-average multiplier (for the breakdown only)
 *   offensiveBV = (weaponBV + ammoBV + offEquipBV) × speedFactor
 */
export function calculateVehicleOffensiveBV(
  input: VehicleBVInput,
): VehicleOffensiveBVBreakdown {
  const targetingComputerMounted = (input.offensiveEquipment ?? []).some(
    (entry) => entry.isTargetingComputer === true,
  );
  const primaryTurretMult = turretMultiplier(input.turret);
  const secondaryTurretMult = turretMultiplier(input.secondaryTurret);
  const weaponEntries = input.weapons.map((weapon) =>
    calculateWeaponBVEntry(
      weapon,
      targetingComputerMounted,
      primaryTurretMult,
      secondaryTurretMult,
    ),
  );

  const weaponBV = weaponEntries.reduce((sum, entry) => sum + entry.finalBV, 0);
  const perWeaponBVs = weaponEntries.map((entry) => ({
    id: entry.id,
    bv: entry.listedBV,
  }));
  const ammoEntries = buildVehicleAmmoEntries(input.ammo);
  const ammoBV = calculateAmmoBVWithExcessiveCap(perWeaponBVs, ammoEntries);
  const offensiveEquipmentBV = calculateVehicleOffensiveEquipmentBV(
    input.offensiveEquipment,
  );

  const speedFactor = calculateVehicleSpeedFactor(input);
  const total = (weaponBV + ammoBV + offensiveEquipmentBV) * speedFactor;
  const turretModifier = input.turret
    ? primaryTurretMult
    : input.secondaryTurret
      ? secondaryTurretMult
      : 1.0;

  return {
    weaponBV,
    ammoBV,
    offensiveEquipmentBV,
    speedFactor,
    turretModifier,
    total,
  };
}

// =============================================================================
// Unified Calculator
// =============================================================================

/**
 * Compute the full vehicle BV breakdown.
 */
export function calculateVehicleBV(input: VehicleBVInput): IVehicleBVBreakdown {
  const def = calculateVehicleDefensiveBV(input);
  const off = calculateVehicleOffensiveBV(input);

  const gunnery = input.gunnery ?? 4;
  const piloting = input.piloting ?? 5;
  const pilotMultiplier = getVehiclePilotMultiplier(gunnery, piloting);

  const base = def.total + off.total;
  const final = Math.round(base * pilotMultiplier);

  return {
    defensive: def.total,
    offensive: off.total,
    pilotMultiplier,
    turretModifier: off.turretModifier,
    final,

    armorBV: def.armorBV,
    structureBV: def.structureBV,
    defensiveEquipmentBV: def.defensiveEquipmentBV,
    defensiveFactor: def.defensiveFactor,
    tmm: def.tmm,

    weaponBV: off.weaponBV,
    ammoBV: off.ammoBV,
    offensiveEquipmentBV: off.offensiveEquipmentBV,
    speedFactor: off.speedFactor,
  };
}
