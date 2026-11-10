/**
 * Battle Armor BV owner. Defense follows MegaMek 48fcb2f64,
 * BattleArmorBVCalculator.java:84-111,257-278 and BVCalculator.java:650-683.
 * Per trooper: (1 + armor * rate) * (1.1 + maxTMM/10 + stealth + camo).
 * Rate is 3.5 for reactive/reflective/fire-resistant armor, otherwise 2.5.
 * Native mount projection supplies represented offense; catalog/ammo gaps
 * stay explicit. Squad strength follows BattleArmorBVCalculator.java:193-204.
 * @spec openspec/specs/battle-value-system/spec.md
 */

import type {
  BADefensiveBVBreakdown,
  BAOffensiveBVBreakdown,
  BAPerTrooperBV,
  IBABreakdown,
  IBANativeWeaponValue,
} from '@/types/unit/BVBreakdownTypes';

import {
  BAArmorType,
  BAManipulator,
  BAWeightClass,
} from '@/types/unit/BattleArmorInterfaces';
import { getPilotSkillModifier } from '@/types/validation/BattleValue';

import {
  calculateTMM,
  calculateOffensiveSpeedFactorForMP,
} from '../battleValueMovement';
import { resolveEquipmentBV } from '../equipmentBVResolver';
export { battleArmorBVTerms } from './bvTrace';

const BA_ARMOR_BV_MULTIPLIERS: Readonly<Record<BAArmorType, number>> = {
  [BAArmorType.STANDARD]: 1.0,
  [BAArmorType.STEALTH_BASIC]: 1.0,
  [BAArmorType.STEALTH_IMPROVED]: 1.0,
  [BAArmorType.STEALTH_PROTOTYPE]: 1.0,
  [BAArmorType.MIMETIC]: 1.0,
  [BAArmorType.REACTIVE]: 1.4,
  [BAArmorType.REFLECTIVE]: 1.4,
  [BAArmorType.FIRE_RESISTANT]: 1.4,
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
  quantity?: number;
  antiMek?: boolean;
  antiMekOnly?: boolean;
  antiMekQuantity?: number;
}

/**
 * One counted weapon or claw mount with its native facts. The averaged-trooper
 * model above cannot say which trooper carries it, so the mount owner retains
 * the full catalog value, native location and section memberships here.
 */
export interface BANativeWeaponMount {
  id: string;
  /** Native entity location: Squad, Point or `Trooper N`. */
  location: string;
  /** Owning trooper (1-based) of a `Trooper N` location. */
  trooper?: number;
  /** Full undivided catalog BV of one mount. */
  battleValue: number;
  /** Squad-support mount (`SSWM`): divided by the shooting strength. */
  support: boolean;
  claw: boolean;
  infantry: boolean;
  /** Per-mount half of the Anti-Mek filter; the squad's eligibility is separate. */
  antiMek: boolean;
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
  /** Retained input for compatibility; defense does not depend on class. */
  weightClass: BAWeightClass;
  /** Number of troopers (1–6). */
  squadSize: number;

  /** Ground MP per trooper. */
  groundMP: number;
  /** Jump MP per trooper (0 if none). */
  jumpMP: number;
  /** Active UMU MP per trooper (0 if none). */
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

  /** Retained equipment fact; clamps do not add defensive BV. */
  hasMagneticClamp?: boolean;
  /** Camouflage adds 0.2 to the defensive factor, independently of armor. */
  hasCamoSystem?: boolean;
  /** Per-trooper sensor/ECM/AMS bonus, added before the defensive factor. */
  defensiveEquipmentBV?: number;
  /** Per-trooper offensive equipment, averaged over the squad. */
  offensiveEquipmentBV?: number;
  canAntiMek?: boolean;
  unresolvedEquipment?: readonly string[];
  /** Diagnostic pass-through for the trace: pre-cap ammo BV per native pool. */
  ammoAvailableBVByPool?: Readonly<Record<string, number>>;
  /** Diagnostic pass-through for the trace: launcher BV per native pool. */
  ammoCapBVByPool?: Readonly<Record<string, number>>;
  /** Diagnostic pass-through for the trace: native mounts for per-trooper weapon values. */
  nativeWeapons?: readonly BANativeWeaponMount[];
  /**
   * True when no counted weapon mount lacks a native location, so the native
   * facts describe every pass and the section totals can be traced.
   */
  nativeWeaponsComplete?: boolean;

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

/** Armor rate relative to 2.5; stealth affects the defensive factor. */
export function getBAArmorBVMultiplier(type: BAArmorType): number {
  return BA_ARMOR_BV_MULTIPLIERS[type] ?? 1.0;
}

// =============================================================================
// Move Class Multipliers
// =============================================================================

/**
 * Legacy move-class lookup, retained for public API compatibility.
 * The pinned defensive calculation no longer uses this table.
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

/** Anti-Mek claw BV only; MiscType.java:11768-11783 (pin 48fcb2f64). */
export function getBAManipulatorMeleeBV(manipulator: BAManipulator): number {
  switch (manipulator) {
    case BAManipulator.VIBRO_CLAW:
    case BAManipulator.MAGNET:
      return 1;
    default:
      return 0;
  }
}

// =============================================================================
// Defensive BV (Per Trooper)
// =============================================================================

/** Armor/internal BV multiplied by movement, stealth and camouflage. */
export function calculateBADefensiveBV(
  input: IBattleArmorBVInput,
): BADefensiveBVBreakdown {
  const armorMult = getBAArmorBVMultiplier(input.armorType);
  // MegaMek 48fcb2f64 BattleArmorBVCalculator.java:257-278: armor plus
  // one internal point. Specialty protection costs 3.5 rather than 2.5.
  const armorBV =
    1 + Math.max(0, input.armorPointsPerTrooper) * 2.5 * armorMult;
  const groundTMM = calculateTMM(input.groundMP);
  const tmm = Math.max(
    calculateTMM(input.groundMP, input.jumpMP),
    calculateTMM(input.umuMP ?? 0),
  );
  // BattleArmorBVCalculator.java:84-111. Stealth affects the factor, not
  // the armor rate. Clamps and weight class give no defensive BV bonus.
  const stealth =
    input.armorType === BAArmorType.STEALTH_IMPROVED ||
    input.armorType === BAArmorType.MIMETIC
      ? 0.3
      : [BAArmorType.STEALTH_BASIC, BAArmorType.STEALTH_PROTOTYPE].includes(
            input.armorType,
          )
        ? 0.2
        : 0;
  const bonus = 0.1 + stealth + (input.hasCamoSystem ? 0.2 : 0);
  // BVCalculator.java:274-281: defensive equipment precedes the factor.
  const defensiveEquipmentBV = input.defensiveEquipmentBV ?? 0;
  const base = armorBV + defensiveEquipmentBV;
  // Preserve the public breakdown: moveBV is the ground/system premium;
  // jumpBV is only the additional premium over ground TMM (including UMU).
  const moveBV = base * (groundTMM / 10 + bonus);
  const jumpBV = base * ((tmm - groundTMM) / 10);
  const antiMechBonus = 0;
  const defensiveFactor = 1 + tmm / 10 + bonus;
  const total = base * defensiveFactor;

  return {
    armorBV,
    defensiveEquipmentBV,
    moveBV,
    jumpBV,
    antiMechBonus,
    total,
    defensiveFactor,
  };
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
  // AmmoType.java:17103-17105 requires kgPerShot, absent from this catalog.
  // Pre-valued inputs remain supported; native gaps are reported by projection.
  return 0;
}

/**
 * Compute per-trooper offensive BV.
 *
 *   weaponBV      = resolved per-trooper mounts plus eligible anti-Mek attacks
 *   ammoBV        = represented pre-valued bins; native gaps stay explicit
 *   manipulatorBV = eligible vibro/magnetic claws
 *   total         = (weaponBV + ammoBV + manipulatorBV) * offensiveSpeedFactor
 */
export function calculateBAOffensiveBV(
  input: IBattleArmorBVInput,
): BAOffensiveBVBreakdown {
  let weaponBV = 0;
  let clawBV = 0;
  for (const w of input.weapons) {
    const bv = resolveWeaponBV(w);
    const anti =
      input.canAntiMek && w.antiMek
        ? bv * (w.antiMekQuantity ?? w.quantity ?? 1)
        : 0;
    if (w.antiMekOnly) clawBV += anti;
    else weaponBV += bv * (w.quantity ?? 1) + anti;
  }

  let ammoBV = 0;
  for (const a of input.ammo ?? []) {
    ammoBV += resolveAmmoMountBV(a);
  }

  // Raw claw mounts take precedence over editor manipulator selections.
  const manipulatorBV =
    clawBV +
    (input.canAntiMek && !input.weapons.some((w) => w.antiMekOnly)
      ? getBAManipulatorMeleeBV(input.manipulators.left) +
        getBAManipulatorMeleeBV(input.manipulators.right)
      : 0);
  // BattleArmorBVCalculator.java:334-337; BVCalculator.java:1113-1118.
  const speed = calculateOffensiveSpeedFactorForMP(
    Math.max(input.groundMP, input.jumpMP, input.umuMP ?? 0),
  );
  // BVCalculator.java:283-292: offensive equipment precedes the speed factor.
  const offensiveEquipmentBV = input.offensiveEquipmentBV ?? 0;
  const total =
    (weaponBV + ammoBV + manipulatorBV + offensiveEquipmentBV) * speed;

  return {
    weaponBV,
    ammoBV,
    manipulatorBV,
    offensiveEquipmentBV,
    total,
    speedFactor: speed,
  };
}

/** Section labels as the Java probe names them (BattleArmorBVCalculator.java:156-159). */
export const BA_SECTION_WEAPONS = 'Weapons:';
export const BA_SECTION_SQUAD_SUPPORT = 'Squad Support:';
export const BA_SECTION_ANTI_MEK = 'Anti-Mek:';

/**
 * What one mount adds to each pinned pass for one trooper
 * (BattleArmorBVCalculator.java:133-160): Weapons (squad-located, not support,
 * not a claw), Squad Support (non-infantry weapons at the trooper or marked
 * support, divided by the shooting strength for support) and Anti-Mek (only when
 * the squad may make anti-Mek attacks; squad or own-trooper mounts). A pass that
 * does not count the mount is absent. The one owner of the per-pass rules: the
 * weapon terms and the section terms both read it.
 */
function nativeMountPasses(
  mount: BANativeWeaponMount,
  trooper: number,
  strength: number,
  canAntiMek: boolean,
): { weapons?: number; support?: number; antiMek?: number } {
  const atSquad = mount.trooper === undefined;
  const divisor = mount.support ? strength : 1;
  return {
    ...(atSquad &&
      !mount.support &&
      !mount.claw && { weapons: mount.battleValue }),
    ...(!mount.claw &&
      !mount.infantry &&
      (mount.trooper === trooper || mount.support) && {
        support: mount.battleValue / divisor,
      }),
    ...(canAntiMek &&
      mount.antiMek &&
      (atSquad || mount.trooper === trooper) && {
        antiMek: mount.claw ? mount.battleValue : mount.battleValue / divisor,
      }),
  };
}

/**
 * Per-trooper native weapon values. A mount in several passes reports their
 * sum, as Java merges `weapon.*` terms. Mounts no pass counts are absent;
 * `index` keeps the mount order across troopers.
 */
export function battleArmorNativeWeaponBV(
  mounts: readonly BANativeWeaponMount[],
  squadSize: number,
  canAntiMek: boolean,
): IBANativeWeaponValue[][] {
  const strength = Math.max(1, Math.floor(squadSize));
  return Array.from({ length: strength }, (_, offset) => {
    const values: IBANativeWeaponValue[] = [];
    mounts.forEach((mount, index) => {
      const passes = nativeMountPasses(mount, offset + 1, strength, canAntiMek);
      if (Object.keys(passes).length > 0)
        values.push({
          index,
          id: mount.id,
          location: mount.location,
          battleValue:
            (passes.weapons ?? 0) +
            (passes.support ?? 0) +
            (passes.antiMek ?? 0),
        });
    });
    return values;
  });
}

/**
 * Per-trooper section totals: the offensive value each pass adds, which the
 * Java probe records as `section.<label>` (java_bv_terms.py:107-108) even when
 * the pass adds 0. The Anti-Mek label exists only for squads that may make
 * anti-Mek attacks (BattleArmorBVCalculator.java:158-160).
 */
export function battleArmorNativeSectionBV(
  mounts: readonly BANativeWeaponMount[],
  squadSize: number,
  canAntiMek: boolean,
): Record<string, number>[] {
  const strength = Math.max(1, Math.floor(squadSize));
  return Array.from({ length: strength }, (_, offset) => {
    let weapons = 0;
    let support = 0;
    let antiMek = 0;
    for (const mount of mounts) {
      const passes = nativeMountPasses(mount, offset + 1, strength, canAntiMek);
      weapons += passes.weapons ?? 0;
      support += passes.support ?? 0;
      antiMek += passes.antiMek ?? 0;
    }
    return {
      [BA_SECTION_WEAPONS]: weapons,
      [BA_SECTION_SQUAD_SUPPORT]: support,
      ...(canAntiMek && { [BA_SECTION_ANTI_MEK]: antiMek }),
    };
  });
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
  // MegaMek 48fcb2f64 BattleArmorBVCalculator.java:193-204.
  const squadFactor = (0.9 + 0.1 * squadSize) * squadSize;
  const squadTotal = perTrooper.total * squadFactor;

  const gunnery = input.gunnery ?? 4;
  const piloting = input.piloting ?? 5;
  const pilotMultiplier = getPilotSkillModifier(gunnery, piloting);

  const final = Math.round(squadTotal * pilotMultiplier);

  return {
    perTrooper,
    squadSize,
    squadFactor,
    squadTotal,
    pilotMultiplier,
    final,
    ...(input.ammoAvailableBVByPool && {
      ammoAvailableBVByPool: input.ammoAvailableBVByPool,
    }),
    ...(input.ammoCapBVByPool && { ammoCapBVByPool: input.ammoCapBVByPool }),
    ...(input.nativeWeapons && {
      nativeWeaponBVByTrooper: battleArmorNativeWeaponBV(
        input.nativeWeapons,
        squadSize,
        input.canAntiMek ?? false,
      ),
    }),
    ...(input.nativeWeapons &&
      input.nativeWeaponsComplete && {
        nativeSectionBVByTrooper: battleArmorNativeSectionBV(
          input.nativeWeapons,
          squadSize,
          input.canAntiMek ?? false,
        ),
      }),
  };
}
