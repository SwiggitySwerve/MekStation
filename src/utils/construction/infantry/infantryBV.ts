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
 *   - Final BV = (platoonBV + fieldGunBV) × pilot-skill multiplier.
 *
 * @spec openspec/changes/add-infantry-battle-value/specs/battle-value-system/spec.md
 * @spec openspec/changes/add-infantry-battle-value/specs/infantry-unit-system/spec.md
 */

import { InfantryMotive } from '@/types/unit/InfantryInterfaces';
import { InfantryArmorKit } from '@/types/unit/PersonnelInterfaces';
import { getPilotSkillModifier } from '@/types/validation/BattleValue';

import { calculateAmmoBVWithExcessiveCap } from '../battleValueOffensive';
import { resolveEquipmentBV } from '../equipmentBVResolver';

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

/**
 * Infantry BV breakdown — populated on unit state for the status bar.
 *
 * Keys called out in the spec delta: perTrooper, motiveMultiplier,
 * antiMechMultiplier, fieldGunBV, platoonBV, pilotMultiplier, final.
 */
export interface IInfantryBVBreakdown {
  /** Per-trooper BV (primary + secondary + armor-kit). */
  perTrooper: number;
  /** Motive-type multiplier (Foot 1.0, Jump 1.1, Motorized 1.05, Mechanized 1.15). */
  motiveMultiplier: number;
  /** Anti-mech training multiplier (1.1 when trained, 1.0 otherwise). */
  antiMechMultiplier: number;
  /** Aggregate field gun BV (weapons + ammo, capped per mech rules). */
  fieldGunBV: number;
  /**
   * Platoon BV BEFORE the pilot multiplier — this is perTrooper × troopers ×
   * motiveMult × antiMechMult + fieldGunBV. The spec phrases this as
   * "platoon BV plus field-gun BV", and this is the sum used for the final
   * multiplier.
   */
  platoonBV: number;
  /** Pilot skill multiplier (shared 9×9 matrix). */
  pilotMultiplier: number;
  /** Final BV — rounded integer. */
  final: number;

  // Supporting fields for the breakdown dialog / tooling.
  /** Raw primary-weapon contribution (bv / damageDivisor). */
  primaryBV: number;
  /** Raw secondary-weapon contribution (bv / damageDivisor × 1/ratio). */
  secondaryBV: number;
  /** Armor-kit flat add to per-trooper. */
  armorKitBV: number;
  /** Raw field gun weapon BV (pre-ammo-cap). */
  fieldGunWeaponBV: number;
  /** Raw field gun ammo BV (post-cap). */
  fieldGunAmmoBV: number;
  /** Total troopers actually counted. */
  troopers: number;
}

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
 * Field guns do NOT receive any speed factor — they are stationary platforms
 * crewed by troopers. The spec calls this out explicitly as "speed factor 1.0".
 */
export function calculateInfantryFieldGunBV(
  fieldGuns: readonly InfantryFieldGunMount[] | undefined,
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
    weapons.push({ id: gun.id, bv: gunBV });

    for (const bin of gun.ammo ?? []) {
      const binBV =
        typeof bin.bvOverride === 'number'
          ? bin.bvOverride
          : resolveEquipmentBV(bin.id).battleValue;
      ammoEntries.push({
        id: bin.id,
        bv: binBV,
        // weaponTypeOverride lets callers route e.g. `isammo-lrm-15` to the LRM-15 weapon family.
        // When absent, we pass the ammo id itself — the helper normalizes via the resolver.
        weaponType: bin.weaponTypeOverride ?? bin.id,
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
 *   5. final = round(platoonBV × pilotMult).
 *
 * Rounding:
 *   - Intermediate values stay as floats for precision.
 *   - `final` is rounded to the nearest integer (Math.round) — consistent with
 *     the mech / vehicle calculators.
 */
export function calculateInfantryBV(
  input: InfantryBVInput,
): IInfantryBVBreakdown {
  const primaryBV = calculateInfantryPrimaryBV(input.primaryWeapon);
  const secondaryBV = calculateInfantrySecondaryBV(input.secondaryWeapon);
  const armorKitBV = ARMOR_KIT_PER_TROOPER_BV[input.armorKit] ?? 0;
  const perTrooper = Math.max(0, primaryBV + secondaryBV + armorKitBV);

  const motiveMultiplier = getInfantryMotiveMultiplier(input.motive);
  const antiMechMultiplier = input.hasAntiMechTraining
    ? ANTI_MECH_MULTIPLIER
    : 1.0;

  const troopers = Math.max(0, input.totalTroopers);
  const platoonCore =
    perTrooper * troopers * motiveMultiplier * antiMechMultiplier;

  const fieldGunResult = calculateInfantryFieldGunBV(input.fieldGuns);
  const platoonBV = platoonCore + fieldGunResult.total;

  const pilotMultiplier = getInfantryPilotMultiplier(
    input.gunnery,
    input.piloting,
  );
  const final = Math.round(platoonBV * pilotMultiplier);

  return {
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
  };
}
