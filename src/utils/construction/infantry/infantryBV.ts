/**
 * Infantry Battle Value Calculator (BV 2.0)
 *
 * Implements Battle Value computation for conventional infantry platoons per
 * the TechManual / MegaMek rules. Mirrors the structure of the mech / vehicle
 * calculators but substitutes infantry-specific rules:
 *
 *   - Per-trooper BV = (primaryWeapon.bv / primaryWeapon.damageDivisor) × 1.0
 *                    + secondary contribution (ratio-adjusted)
 *                    + armor-kit modifier.
 *   - Platoon BV = perTrooperBV × totalTroopers × motiveMultiplier.
 *   - If anti-mech training: platoonBV × 1.1.
 *   - If field gun(s): add full mech-scale weapon BV + ammo BV.
 *   - Source facts use pinned offense and defensive structure; defensive
 *     movement/stealth factors and final specialization apply to source totals.
 *   - Final BV = (defensive structure + platoonBV) × pilot-skill multiplier.
 *
 * @spec openspec/changes/add-infantry-battle-value/specs/battle-value-system/spec.md
 * @spec openspec/changes/add-infantry-battle-value/specs/infantry-unit-system/spec.md
 */

import type { IInfantryBVBreakdown } from '@/types/unit/BVBreakdownTypes';

import { InfantryMotive } from '@/types/unit/InfantryInterfaces';
import { IInfantry, InfantryArmorKit } from '@/types/unit/PersonnelInterfaces';
import { getPilotSkillModifier } from '@/types/validation/BattleValue';

import { getNativeAmmoBVGroup } from '../battleValueAmmo';
import { calculateOffensiveSpeedFactorForMP } from '../battleValueMovement';
import { calculateAmmoBVWithExcessiveCap } from '../battleValueOffensive';
import { resolveAmmoBV, resolveEquipmentBV } from '../equipmentBVResolver';
import { infantryBVTerms } from './bvTrace';
import {
  infantryDefensiveFactor,
  infantrySpecializationModifier,
} from './infantryBVFactors';
import { getInfantryBVWeapon } from './weaponTable';

// =============================================================================
// Public Types
// =============================================================================

/**
 * A single trooper weapon reference — primary or secondary.
 *
 * `damageDivisor` is the infantry weapon damage divisor from the weapon table
 * (e.g. Rifle = 10, SRM Launcher = 6). The BV contribution of a weapon at
 * infantry scale is `bv / damageDivisor` because the damage divisor represents
 * how many troopers share one "weapon-worth" of BV per TechManual.
 */
export interface InfantryWeaponRef {
  /** Catalog id (e.g. `inf-laser-rifle`). */
  id: string;
  /** Weapon BV override — if omitted the resolver provides it. */
  bvOverride?: number;
  /** Damage divisor from the infantry weapon table. */
  damageDivisor: number;
  /**
   * For secondary weapons: troopers-per-weapon ratio (denominator only).
   * `4` means "1 secondary weapon per 4 troopers" → contributes `bv/div × 1/4`.
   * Unused for the primary weapon.
   */
  secondaryRatio?: number;
}

/**
 * A single field-gun mount — crewed by platoon members, adds full weapon BV.
 */
export interface InfantryFieldGunMount {
  /** Canonical equipment id (e.g. `ac5`, `lrm5`). */
  id: string;
  /** BV override for the weapon — omit to resolve via equipment catalog. */
  bvOverride?: number;
  /** Ammo bins crewed with this gun. */
  ammo?: Array<{
    /** Ammo id. */
    id: string;
    /** BV override for the ammo bin. */
    bvOverride?: number;
    /** Weapon-type override for ammo-matching. */
    weaponTypeOverride?: string;
  }>;
}

/**
 * Input to the infantry BV calculator.
 */
export interface InfantryBVInput {
  armorFlags?: IInfantry['bvArmorFlags'];
  hasArmorKit?: boolean;
  sourceOffense?: IInfantry['bvOffense'];
  /** Incoming protection, distinct from the weapon table's damage divisor. */
  damageDivisor?: number;
  hasPheromoneEffuser?: boolean;
  /** Motive type — Foot, Jump, Motorized, Mechanized-*. */
  motive: InfantryMotive;
  /** Total troopers in the platoon (squads × troopersPerSquad). */
  totalTroopers: number;
  /** Primary weapon (every trooper carries one). */
  primaryWeapon: InfantryWeaponRef;
  /**
   * Secondary weapon (ratio-carried — e.g. 1 per 4 troopers).
   * Omit if the platoon has no secondary weapon.
   */
  secondaryWeapon?: InfantryWeaponRef;
  /** Armor kit (drives per-trooper BV modifier). */
  armorKit: InfantryArmorKit;
  /** Has anti-mech training (1.1× platoonBV). */
  hasAntiMechTraining?: boolean;
  /** Field guns crewed by the platoon (empty / omit if none). */
  fieldGuns?: InfantryFieldGunMount[];
  /** Pilot gunnery skill (default 4). */
  gunnery?: number;
  /** Pilot piloting / anti-mech skill (default 5). */
  piloting?: number;
}

export type { IInfantryBVBreakdown } from '@/types/unit/BVBreakdownTypes';

// =============================================================================
// Constant tables
// =============================================================================

/**
 * Motive-type BV multiplier.
 *
 * Applied to `perTrooperBV × totalTroopers` to produce the pre-field-gun,
 * pre-anti-mech platoon BV.
 *
 * Source: TechManual p.315, MegaMek `Infantry.getMotiveBVMultiplier()`.
 */
const MOTIVE_MULTIPLIERS: Record<InfantryMotive, number> = {
  [InfantryMotive.FOOT]: 1.0,
  [InfantryMotive.JUMP]: 1.1,
  [InfantryMotive.MOTORIZED]: 1.05,
  [InfantryMotive.MECHANIZED_TRACKED]: 1.15,
  [InfantryMotive.MECHANIZED_WHEELED]: 1.15,
  [InfantryMotive.MECHANIZED_HOVER]: 1.15,
  [InfantryMotive.MECHANIZED_VTOL]: 1.15,
};

/**
 * Per-trooper BV additive modifier from armor kit.
 *
 * Source: TechManual p.316 (armor kit table) / MegaMek `Infantry.getArmorKitBVModifier()`.
 * Flak +2, Camo +1, Sneak-Camo +3 (IR/ECM variants scale up), Clan 2
 * (already high damage-divisor — bv modifier remains modest).
 */
const ARMOR_KIT_PER_TROOPER_BV: Record<InfantryArmorKit, number> = {
  [InfantryArmorKit.NONE]: 0,
  [InfantryArmorKit.STANDARD]: 0,
  [InfantryArmorKit.FLAK]: 2,
  [InfantryArmorKit.ABLATIVE]: 1,
  [InfantryArmorKit.SNEAK_CAMO]: 3,
  [InfantryArmorKit.SNEAK_IR]: 3,
  [InfantryArmorKit.SNEAK_ECM]: 3,
  [InfantryArmorKit.SNEAK_CAMO_IR]: 4,
  [InfantryArmorKit.SNEAK_IR_ECM]: 4,
  [InfantryArmorKit.SNEAK_COMPLETE]: 5,
  [InfantryArmorKit.CLAN]: 2,
  [InfantryArmorKit.ENVIRONMENTAL]: 1,
};

/**
 * Anti-mech training multiplier.
 * Applied to `platoonBV` (pre-field-gun, post-motive) per TW.
 */
const ANTI_MECH_MULTIPLIER = 1.1;

// =============================================================================
// Weapon BV helpers
// =============================================================================

/**
 * Resolve an infantry weapon's BV — prefers `bvOverride`, falls back to catalog.
 * Returns 0 on unresolvable ids (logged by resolver in non-test envs).
 */
function resolveWeaponBV(weapon: InfantryWeaponRef): number {
  if (typeof weapon.bvOverride === 'number') return weapon.bvOverride;
  const result = resolveEquipmentBV(weapon.id);
  return result.battleValue;
}

/**
 * Primary weapon contribution = weaponBV / damageDivisor.
 *
 * A Laser Rifle (BV 12, divisor 1) contributes `12 / 1 = 12` per trooper.
 * A Rifle (BV 0 at catalog level) contributes 0 — per-trooper BV falls back to
 * the floor set by armor-kit additions in that case.
 */
export function calculateInfantryPrimaryBV(weapon: InfantryWeaponRef): number {
  if (weapon.damageDivisor <= 0) return 0;
  return resolveWeaponBV(weapon) / weapon.damageDivisor;
}

/**
 * Secondary weapon contribution per trooper = (weaponBV / damageDivisor) × (1 / ratio).
 *
 * An SRM Launcher (BV 25, divisor 6) at ratio 1-per-4 → 25 / 6 × 1/4 ≈ 1.04 per trooper.
 * Spec example uses an abstracted weapon "BV 25 / divisor 1.0" so the scenario evaluates to
 * `25 × (1 / 4) = 6.25` — matching this formula with divisor = 1.
 *
 * Returns 0 when no ratio is specified or ratio is 0.
 */
export function calculateInfantrySecondaryBV(
  weapon: InfantryWeaponRef | undefined,
): number {
  if (!weapon) return 0;
  const ratio = weapon.secondaryRatio ?? 0;
  if (ratio <= 0 || weapon.damageDivisor <= 0) return 0;
  return (resolveWeaponBV(weapon) / weapon.damageDivisor) * (1 / ratio);
}

/**
 * Per-trooper BV — primary + secondary (ratio) + armor-kit additive.
 *
 * Clamped to 0 at the floor — the sum cannot go negative even if a weapon
 * has a negative override (sanity guard for catalog quirks).
 */
export function calculateInfantryPerTrooperBV(input: InfantryBVInput): number {
  const primary = calculateInfantryPrimaryBV(input.primaryWeapon);
  const secondary = calculateInfantrySecondaryBV(input.secondaryWeapon);
  const armor = ARMOR_KIT_PER_TROOPER_BV[input.armorKit] ?? 0;
  return Math.max(0, primary + secondary + armor);
}

// =============================================================================
// Platoon / motive helpers
// =============================================================================

/** Return the motive multiplier for a given motive type. */
export function getInfantryMotiveMultiplier(motive: InfantryMotive): number {
  return MOTIVE_MULTIPLIERS[motive] ?? 1.0;
}

// =============================================================================
// Field gun BV
// =============================================================================

/**
 * Field gun aggregate BV — full mech-scale weapon BV + ammo (capped per weapon).
 *
 * The ammo cap reuses the mech "excessive ammo" rule:
 *   ammoBV contribution per weapon family ≤ matching weapon BV.
 *
 * Source guns and ammunition receive the platoon speed factor in the caller.
 * InfantryBVCalculator.java:233-240, 316-318 (48fcb2f64).
 */
export function calculateInfantryFieldGunBV(
  fieldGuns: readonly InfantryFieldGunMount[] | undefined,
  onWeapon?: (battleValue: number, gun: InfantryFieldGunMount) => void,
): { weaponBV: number; ammoBV: number; total: number } {
  if (!fieldGuns || fieldGuns.length === 0) {
    return { weaponBV: 0, ammoBV: 0, total: 0 };
  }

  const weapons: Array<{ id: string; bv: number }> = [];
  const ammoEntries: Array<{ id: string; bv: number; weaponType: string }> = [];

  let weaponBV = 0;
  for (const gun of fieldGuns) {
    const gunBV =
      typeof gun.bvOverride === 'number'
        ? gun.bvOverride
        : resolveEquipmentBV(gun.id).battleValue;
    weaponBV += gunBV;
    onWeapon?.(gunBV, gun);
    weapons.push({ id: getNativeAmmoBVGroup(gun.id) ?? gun.id, bv: gunBV });

    for (const bin of gun.ammo ?? []) {
      const resolved = resolveAmmoBV(bin.id);
      const binBV =
        typeof bin.bvOverride === 'number'
          ? bin.bvOverride
          : resolved.battleValue;
      ammoEntries.push({
        id: bin.id,
        bv: binBV,
        weaponType:
          getNativeAmmoBVGroup(bin.weaponTypeOverride ?? bin.id) ??
          bin.weaponTypeOverride ??
          (resolved.weaponType || bin.id),
      });
    }
  }

  const ammoBV = calculateAmmoBVWithExcessiveCap(weapons, ammoEntries);
  return { weaponBV, ammoBV, total: weaponBV + ammoBV };
}

// =============================================================================
// Pilot multiplier
// =============================================================================

/** Pilot skill multiplier — reuses the shared 9×9 gunnery × piloting table. */
export function getInfantryPilotMultiplier(
  gunnery: number | undefined,
  piloting: number | undefined,
): number {
  return getPilotSkillModifier(gunnery ?? 4, piloting ?? 5);
}

function infantryWeaponStages(input: InfantryBVInput) {
  const source = input.sourceOffense;
  const primary = source
    ? getInfantryBVWeapon(input.primaryWeapon.id)
    : undefined;
  const secondary =
    source && input.secondaryWeapon
      ? getInfantryBVWeapon(input.secondaryWeapon.id)
      : undefined;
  const ratio = source ? source.secondaryShooters / input.totalTroopers : 0;
  // InfantryBVCalculator.java:117-158 and BVCalculator.java:805-829 (48fcb2f64):
  // BV per shooter, not combat damage or incoming armor divisor. Secondary
  // shooters replace primary shooters; archaic weapons get no anti-mek repeat.
  const primaryBV = primary
    ? primary.bv * (1 - ratio)
    : calculateInfantryPrimaryBV(input.primaryWeapon);
  const secondaryBV = source
    ? (secondary?.bv ?? 0) * ratio
    : calculateInfantrySecondaryBV(input.secondaryWeapon);
  const armorKitBV = source
    ? 0
    : (ARMOR_KIT_PER_TROOPER_BV[input.armorKit] ?? 0);
  const perTrooper = Math.max(0, primaryBV + secondaryBV + armorKitBV);
  return {
    primary,
    secondary,
    primaryBV,
    secondaryBV,
    armorKitBV,
    perTrooper,
    canRepeatPrimary: primary !== undefined && !primary.archaic,
    canRepeatSecondary: secondary !== undefined && !secondary.archaic,
  };
}

function infantryWeaponBonuses(
  source: NonNullable<InfantryBVInput['sourceOffense']>,
) {
  return [
    source.augmentations.includes('gas_effuser_toxin') ? 0.23 : 0,
    source.augmentations.includes('tsm_implant') ? 0.1 : 0,
    source.augmentations.includes('suicide_implants') ? 0.12 : 0,
    source.prostheticDamage ?? 0,
  ] as const;
}

const PROSTHETIC_ANTI_MEK_MULTIPLIER = 1.2;

/** Native raw stages retain Java's operation order independently of the old
 * per-trooper arithmetic. Reordering either changes floating-point residuals.
 * InfantryBVCalculator.java:128-237 (48fcb2f64).
 */
function infantrySourceWeaponStage(
  input: InfantryBVInput,
  stages: ReturnType<typeof infantryWeaponStages>,
  antiMechMultiplier: number,
) {
  const source = input.sourceOffense;
  if (!source || !stages.primary) return undefined;
  const troopers = Math.max(0, input.totalTroopers);
  const primary = stages.primary.bv * (troopers - source.secondaryShooters);
  const secondary = stages.secondary
    ? stages.secondary.bv * source.secondaryShooters
    : undefined;
  // Retain each native processWeapon call, including zero-valued weapons.
  // Temporary trooper mounts share an identity across the anti-Mek repeat.
  const trooperWeapons = new Map<string, number>();
  const recordWeapon = (id: string, value: number) => {
    trooperWeapons.set(id, (trooperWeapons.get(id) ?? 0) + value);
  };
  recordWeapon(input.primaryWeapon.id, primary);
  if (input.secondaryWeapon && secondary !== undefined)
    recordWeapon(input.secondaryWeapon.id, secondary);
  const fieldGunWeapons: Array<{ id: string; battleValue: number }> = [];
  let weaponBV = primary + (secondary ?? 0);
  let antiMek = 0;
  if (antiMechMultiplier > 1) {
    const before = weaponBV;
    for (const [value, canRepeat, id] of [
      [primary, stages.canRepeatPrimary, input.primaryWeapon.id],
      [secondary ?? 0, stages.canRepeatSecondary, input.secondaryWeapon?.id],
    ] as const) {
      if (!canRepeat || id === undefined) continue;
      weaponBV += value;
      antiMek += value;
      recordWeapon(id, value);
    }
    if (source.prostheticAntiMek) {
      const repeat = weaponBV - before;
      weaponBV += repeat * PROSTHETIC_ANTI_MEK_MULTIPLIER - repeat;
    }
  }
  for (const bonus of infantryWeaponBonuses(source)) {
    if (bonus > 0) weaponBV += troopers * bonus;
  }
  return {
    primary,
    secondary,
    antiMek,
    weaponBV,
    trooperWeapons,
    fieldGunWeapons,
  };
}

// =============================================================================
// Top-level calculator
// =============================================================================

/**
 * Compute the full infantry BV breakdown.
 *
 * Pipeline:
 *   1. perTrooperBV = primary + secondary + armorKit.
 *   2. platoonCore = perTrooperBV × troopers × motiveMult.
 *   3. platoonWithTraining = platoonCore × (antiMech ? 1.1 : 1.0).
 *   4. platoonBV (pre-pilot) = platoonWithTraining + fieldGunBV.
 *   5. final = round((defensive structure + platoonBV) × pilotMult).
 *
 * Rounding:
 *   - Intermediate values stay as floats for precision.
 *   - `final` is rounded to the nearest integer (Math.round) — consistent with
 *     the mech / vehicle calculators.
 */
export function calculateInfantryBV(
  input: InfantryBVInput,
): IInfantryBVBreakdown {
  const source = input.sourceOffense;
  const stages = infantryWeaponStages(input);
  const { primaryBV, secondaryBV, armorKitBV, perTrooper } = stages;

  const motiveMultiplier = source
    ? calculateOffensiveSpeedFactorForMP(source.mp)
    : getInfantryMotiveMultiplier(input.motive);
  const antiMechMultiplier = source
    ? source.antiMek && !input.fieldGuns?.length
      ? 1 + (source.prostheticAntiMek ? PROSTHETIC_ANTI_MEK_MULTIPLIER : 1)
      : 1
    : input.hasAntiMechTraining
      ? ANTI_MECH_MULTIPLIER
      : 1.0;

  const troopers = Math.max(0, input.totalTroopers);
  let platoonCore =
    perTrooper * troopers * motiveMultiplier * antiMechMultiplier;
  let sourceCoreWeaponBV: number | undefined;
  if (source) {
    const repeat =
      ((stages.canRepeatPrimary ? primaryBV : 0) +
        (stages.canRepeatSecondary ? secondaryBV : 0)) *
      (antiMechMultiplier - 1);
    // InfantryBVCalculator.java:170-235; movement max selection :329-331.
    const [toxin, tsm, suicide, prosthetic] = infantryWeaponBonuses(source);
    const bonus = toxin + tsm + suicide + prosthetic;
    sourceCoreWeaponBV = (perTrooper + repeat + bonus) * troopers;
    platoonCore = sourceCoreWeaponBV * motiveMultiplier;
  }

  const sourceWeaponStage = infantrySourceWeaponStage(
    input,
    stages,
    antiMechMultiplier,
  );
  const fieldGunResult = calculateInfantryFieldGunBV(
    input.fieldGuns,
    sourceWeaponStage
      ? (battleValue, gun) => {
          sourceWeaponStage.weaponBV += battleValue;
          sourceWeaponStage.fieldGunWeapons.push({ id: gun.id, battleValue });
        }
      : undefined,
  );
  // ConvInfantry.java:288-290: active guns block anti-mek, never subtract crew
  // from original shooters. InfantryBVCalculator.java:117-158, 233-240, 316-318.
  const platoonBV =
    platoonCore + fieldGunResult.total * (source ? motiveMultiplier : 1);

  const pilotMultiplier = getInfantryPilotMultiplier(
    input.gunnery,
    input.piloting,
  );
  // InfantryBVCalculator.java:65-113, 247-301; BVCalculator.java:1253-1276.
  const structureBV =
    troopers *
    (1.5 * (input.damageDivisor ?? 1) + (input.hasPheromoneEffuser ? 0.05 : 0));
  const defensiveFactor = infantryDefensiveFactor(
    source,
    input.armorFlags,
    input.hasArmorKit,
  );
  const defensiveBV = structureBV * defensiveFactor;
  const summaryModifier = infantrySpecializationModifier(
    source?.specializations ?? 0,
  );
  const baseBV = (defensiveBV + platoonBV) * summaryModifier;
  const final = Math.round(
    (source ? Math.round(baseBV) : baseBV) * pilotMultiplier,
  );

  return infantryBVTerms(
    {
      baseBV,
      structureBV,
      defensiveFactor,
      summaryModifier,
      ...(sourceCoreWeaponBV === undefined
        ? {}
        : { weaponBV: sourceCoreWeaponBV + fieldGunResult.weaponBV }),
      defensiveBV,
      perTrooper,
      motiveMultiplier,
      antiMechMultiplier,
      fieldGunBV: fieldGunResult.total,
      platoonBV,
      pilotMultiplier,
      final,
      primaryBV,
      secondaryBV,
      armorKitBV,
      fieldGunWeaponBV: fieldGunResult.weaponBV,
      fieldGunAmmoBV: fieldGunResult.ammoBV,
      troopers,
    },
    sourceWeaponStage
      ? {
          ...sourceWeaponStage,
          // Same left-associative subtraction as finishInfantryWeapons in the oracle.
          remainder:
            sourceWeaponStage.weaponBV -
            sourceWeaponStage.primary -
            (sourceWeaponStage.secondary ?? 0) -
            fieldGunResult.weaponBV -
            sourceWeaponStage.antiMek,
        }
      : undefined,
  );
}
