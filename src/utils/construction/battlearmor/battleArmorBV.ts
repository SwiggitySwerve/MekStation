/**
 * Battle Armor Battle Value Calculator (BV 2.0)
 *
 * Implements the full Battle Value 2.0 formula for BattleArmor squads per the
 * TechManual / MegaMek BA rules. BA BV is structured around a per-trooper
 * calculation that is then scaled by squad size and pilot skill:
 *
 *   trooperBV     = defensiveBV + offensiveBV                              (per trooper)
 *   defensiveBV   = armorBV + moveBV + jumpBV + antiMechBonus              (per trooper)
 *     armorBV     = armorPoints × 2.5 × armorTypeMultiplier
 *     moveBV      = groundMP × classMultiplier  (PA(L)/Light 0.5, Medium 0.75,
 *                                                Heavy 1.0, Assault 1.5)
 *     jumpBV      = max(jumpMP, umuMP) × 0.5
 *     antiMechBonus = 5 BV if Magnetic Clamps present (swarm-capable)
 *   offensiveBV   = weaponBV + ammoBV + manipulatorBV                      (per trooper)
 *     manipulatorBV = Vibro-Claw 3, Heavy Claw 2, Battle Claw 1 (per manipulator)
 *   squadBV       = trooperBV × squadSize
 *   finalBV       = round(squadBV × pilotSkillMultiplier)
 *
 * Armor type multipliers (Standard 1.0, Stealth variants 1.5, Mimetic 1.5,
 * Reactive 1.3, Reflective 1.3, Fire-Resistant 1.1) capture the defensive
 * premium of specialty armor; the combat-time movement modifiers for
 * Stealth/Mimetic are documented in the combat spec, not the BV formula
 * (no double counting).
 *
 * The calculator is intentionally pure — no store or React dependencies — so
 * it can be invoked from construction code, unit tests, the parity harness,
 * or the status bar adapter with equal ease.
 *
 * @spec openspec/changes/add-battlearmor-battle-value/specs/battle-value-system/spec.md
 * @spec openspec/changes/add-battlearmor-battle-value/specs/battle-armor-unit-system/spec.md
 */

import type {
  BADefensiveBVBreakdown,
  BAOffensiveBVBreakdown,
  BAPerTrooperBV,
  IBABreakdown,
} from '@/types/unit/BVBreakdownTypes';

import {
  BAArmorType,
  BAManipulator,
  BAWeightClass,
} from '@/types/unit/BattleArmorInterfaces';
import { getPilotSkillModifier } from '@/types/validation/BattleValue';

import { resolveAmmoBV, resolveEquipmentBV } from '../equipmentBVResolver';

const BA_ARMOR_BV_MULTIPLIERS: Readonly<Record<BAArmorType, number>> = {
  [BAArmorType.STANDARD]: 1.0,
  [BAArmorType.STEALTH_BASIC]: 1.5,
  [BAArmorType.STEALTH_IMPROVED]: 1.5,
  [BAArmorType.STEALTH_PROTOTYPE]: 1.5,
  [BAArmorType.MIMETIC]: 1.5,
  [BAArmorType.REACTIVE]: 1.3,
  [BAArmorType.REFLECTIVE]: 1.3,
  [BAArmorType.FIRE_RESISTANT]: 1.1,
};

// =============================================================================
// Public Types
// =============================================================================

/**
 * A single weapon mount on a BA trooper (homogeneous squad — every trooper
 * carries the same loadout, so this is "per trooper" by convention).
 */
export interface BAWeaponBVMount {
  /** Canonical equipment id (e.g. `srm-2`, `flamer`). */
  id: string;
  /** Optional BV override — if omitted the resolver supplies the value. */
  bvOverride?: number;
}

/**
 * A single ammunition bin per trooper.
 */
export interface BAAmmoBVMount {
  /** Canonical ammo id. */
  id: string;
  /** Optional explicit BV override. */
  bvOverride?: number;
}

/**
 * Manipulator configuration for a single trooper.
 * Quad chassis has no manipulators — pass `BAManipulator.NONE` for both arms.
 */
export interface BAManipulatorConfig {
  left: BAManipulator;
  right: BAManipulator;
}

/**
 * Input for BA BV calculation.
 *
 * BA squads are homogeneous (every trooper has the same loadout), so the
 * calculator accepts a single trooper's configuration plus the squad size.
 */
export interface IBattleArmorBVInput {
  /** Weight class governs the move-BV class multiplier. */
  weightClass: BAWeightClass;
  /** Number of troopers (1–6). */
  squadSize: number;

  /** Ground MP per trooper. */
  groundMP: number;
  /** Jump MP per trooper (0 if none). */
  jumpMP: number;
  /** UMU MP per trooper (0 if none). UMU and Jump share the /2 slot. */
  umuMP?: number;

  /** Armor points per trooper. */
  armorPointsPerTrooper: number;
  /** Armor type — drives the armor-type multiplier. */
  armorType: BAArmorType;

  /** Manipulator configuration per trooper. */
  manipulators: BAManipulatorConfig;

  /** Weapons carried per trooper. */
  weapons: readonly BAWeaponBVMount[];
  /** Ammo bins per trooper. */
  ammo?: readonly BAAmmoBVMount[];

  /** True if the squad carries Magnetic Clamps (adds anti-mech bonus). */
  hasMagneticClamp?: boolean;

  /** Pilot gunnery skill (default 4). */
  gunnery?: number;
  /** Pilot piloting skill (default 5). */
  piloting?: number;
}

export type {
  BADefensiveBVBreakdown,
  BAOffensiveBVBreakdown,
  BAPerTrooperBV,
  IBABreakdown,
} from '@/types/unit/BVBreakdownTypes';

// =============================================================================
// Armor-Type Multipliers
// =============================================================================

/**
 * BA armor-type BV multipliers.
 *
 *   Standard           = 1.0
 *   Stealth (any)      = 1.5  (Basic / Improved / Prototype)
 *   Mimetic            = 1.5
 *   Reactive           = 1.3
 *   Reflective         = 1.3
 *   Fire-Resistant     = 1.1
 *
 * Stealth/Mimetic target-movement modifiers are applied in combat, not in BV,
 * so the defensive premium shows up entirely in this multiplier.
 */
export function getBAArmorBVMultiplier(type: BAArmorType): number {
  return BA_ARMOR_BV_MULTIPLIERS[type] ?? 1.0;
}

// =============================================================================
// Move Class Multipliers
// =============================================================================

/**
 * BA move-BV class multiplier.
 *
 *   PA(L) / Light      = 0.5
 *   Medium             = 0.75
 *   Heavy              = 1.0
 *   Assault            = 1.5
 */
export function getBAMoveClassMultiplier(weightClass: BAWeightClass): number {
  switch (weightClass) {
    case BAWeightClass.PA_L:
    case BAWeightClass.LIGHT:
      return 0.5;
    case BAWeightClass.MEDIUM:
      return 0.75;
    case BAWeightClass.HEAVY:
      return 1.0;
    case BAWeightClass.ASSAULT:
      return 1.5;
    default:
      return 0.5;
  }
}

// =============================================================================
// Manipulator Melee BV
// =============================================================================

/**
 * Melee BV contribution for a single manipulator.
 *
 *   Vibro-Claw                  = 3
 *   Heavy Claw / Heavy Battle   = 2
 *   Battle Claw / Battle        = 1
 *   everything else (Basic,
 *   Armored Glove, Cargo Lifter, …) = 0
 *
 * Both arms contribute independently — a Biped with Vibro-Claws on both
 * arms gets 3 + 3 = 6 melee BV.
 */
export function getBAManipulatorMeleeBV(manipulator: BAManipulator): number {
  switch (manipulator) {
    case BAManipulator.VIBRO_CLAW:
      return 3;
    case BAManipulator.HEAVY_CLAW:
      return 2;
    case BAManipulator.BATTLE_CLAW:
      return 1;
    default:
      return 0;
  }
}

// =============================================================================
// Defensive BV (Per Trooper)
// =============================================================================

/**
 * Compute per-trooper defensive BV.
 *
 *   armorBV       = armorPoints × 2.5 × armorTypeMultiplier
 *   moveBV        = groundMP × classMultiplier
 *   jumpBV        = max(jumpMP, umuMP) × 0.5
 *   antiMechBonus = 5 BV if Magnetic Clamps (swarm-capable)
 *   total         = armorBV + moveBV + jumpBV + antiMechBonus
 */
export function calculateBADefensiveBV(
  input: IBattleArmorBVInput,
): BADefensiveBVBreakdown {
  const armorMult = getBAArmorBVMultiplier(input.armorType);
  const classMult = getBAMoveClassMultiplier(input.weightClass);

  const armorBV = input.armorPointsPerTrooper * 2.5 * armorMult;
  const moveBV = input.groundMP * classMult;

  // Jump and UMU share the /2 slot — BA treats the higher of the two.
  const jumpLike = Math.max(input.jumpMP, input.umuMP ?? 0);
  const jumpBV = jumpLike * 0.5;

  const antiMechBonus = input.hasMagneticClamp ? 5 : 0;

  const total = armorBV + moveBV + jumpBV + antiMechBonus;

  return { armorBV, moveBV, jumpBV, antiMechBonus, total };
}

// =============================================================================
// Offensive BV (Per Trooper)
// =============================================================================

/**
 * Resolve weapon BV — uses the shared catalog resolver so BA weapons pick up
 * the same catalog values as mechs. Callers may pass `bvOverride` to bypass
 * the resolver (used by tests and hand-tuned canonical cases).
 */
function resolveWeaponBV(mount: BAWeaponBVMount): number {
  if (mount.bvOverride !== undefined) return mount.bvOverride;
  return resolveEquipmentBV(mount.id).battleValue;
}

/**
 * Resolve ammo BV — uses the shared catalog resolver.
 */
function resolveAmmoMountBV(mount: BAAmmoBVMount): number {
  if (mount.bvOverride !== undefined) return mount.bvOverride;
  const r = resolveAmmoBV(mount.id);
  if (r.resolved) return r.battleValue;
  // Fallback to generic equipment resolver (some ammo entries live under non-ammo ids).
  return resolveEquipmentBV(mount.id).battleValue;
}

/**
 * Compute per-trooper offensive BV.
 *
 *   weaponBV      = sum of resolved weapon BVs
 *   ammoBV        = sum of resolved ammo BVs
 *   manipulatorBV = left + right melee BV
 *   total         = weaponBV + ammoBV + manipulatorBV
 */
export function calculateBAOffensiveBV(
  input: IBattleArmorBVInput,
): BAOffensiveBVBreakdown {
  let weaponBV = 0;
  for (const w of input.weapons) {
    weaponBV += resolveWeaponBV(w);
  }

  let ammoBV = 0;
  for (const a of input.ammo ?? []) {
    ammoBV += resolveAmmoMountBV(a);
  }

  const manipulatorBV =
    getBAManipulatorMeleeBV(input.manipulators.left) +
    getBAManipulatorMeleeBV(input.manipulators.right);

  const total = weaponBV + ammoBV + manipulatorBV;

  return { weaponBV, ammoBV, manipulatorBV, total };
}

// =============================================================================
// Full BA BV
// =============================================================================

/**
 * Compute full BA BV with per-trooper breakdown, squad scaling, and pilot skill.
 *
 * The final BV is rounded to an integer at the very end so intermediate
 * calculations stay in floating-point.
 */
export function calculateBattleArmorBV(
  input: IBattleArmorBVInput,
): IBABreakdown {
  const defensive = calculateBADefensiveBV(input);
  const offensive = calculateBAOffensiveBV(input);

  const perTrooper: BAPerTrooperBV = {
    defensive,
    offensive,
    total: defensive.total + offensive.total,
  };

  const squadSize = Math.max(1, Math.floor(input.squadSize));
  const squadTotal = perTrooper.total * squadSize;

  const gunnery = input.gunnery ?? 4;
  const piloting = input.piloting ?? 5;
  const pilotMultiplier = getPilotSkillModifier(gunnery, piloting);

  const final = Math.round(squadTotal * pilotMultiplier);

  return {
    perTrooper,
    squadSize,
    squadTotal,
    pilotMultiplier,
    final,
  };
}
