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
 *                    mp = walkMP + round(jumpMP / 2)
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

import {
  IProtoMechMountedEquipment,
  IProtoMechUnit,
  ProtoChassis,
  ProtoLocation,
} from '@/types/unit/ProtoMechInterfaces';
import { getPilotSkillModifier } from '@/types/validation/BattleValue';

import { calculateTMM } from '../battleValueMovement';
import {
  normalizeEquipmentId,
  resolveEquipmentBV,
} from '../equipmentBVResolver';

// =============================================================================
// Public interfaces
// =============================================================================

/**
 * Breakdown of a ProtoMech BV 2.0 calculation.
 *
 * - `defensiveBV` and `offensiveBV` are the two main components PRE-chassis multiplier.
 * - `baseBV` = round(defensiveBV + offensiveBV) — the integer base before multipliers.
 * - `chassisMultiplier` applies the Glider (0.90) / Ultraheavy (1.15) adjustment.
 * - `pilotMultiplier` applies the shared gunnery/piloting skill multiplier.
 * - `final` is the rounded final BV after both multipliers.
 */
export interface IProtoMechBVBreakdown {
  readonly defensiveBV: number;
  readonly offensiveBV: number;
  readonly baseBV: number;
  readonly chassisMultiplier: number;
  readonly pilotMultiplier: number;
  readonly final: number;

  // Sub-component detail (useful for parity debugging + status bar display).
  readonly armorBV: number;
  readonly structureBV: number;
  readonly defensiveEquipmentBV: number;
  readonly explosivePenalty: number;
  readonly defensiveFactor: number;

  readonly weaponBV: number;
  readonly ammoBV: number;
  readonly physicalWeaponBV: number;
  readonly offensiveEquipmentBV: number;
  readonly speedFactor: number;
}

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

/** Proto armor / structure BV coefficients (Standard only — mult 1.0). */
const ARMOR_BV_PER_POINT = 2.5;
const STRUCTURE_BV_PER_POINT = 1.5;

/**
 * Default gunnery / piloting when the caller omits them — matches the mech
 * BV convention (baseline 4/5 = 1.0 multiplier).
 */
const DEFAULT_GUNNERY = 4;
const DEFAULT_PILOTING = 5;

/** IDs treated as defensive-only equipment (no weapon BV contribution). */
const DEFENSIVE_EQUIPMENT_HINTS: readonly string[] = [
  'ams',
  'amsammo',
  'ecm',
  'guardian-ecm',
  'ecm-suite',
  'angel-ecm',
  'bap',
  'beagle-active-probe',
  'activeprobe',
  'active-probe',
  'light-active-probe',
];

/** IDs treated as offensive non-weapon equipment (e.g. targeting computer). */
const OFFENSIVE_EQUIPMENT_HINTS: readonly string[] = [
  'targeting-computer',
  'tc',
  'c3',
  'c3-master',
  'c3-slave',
  'c3i',
  'tag',
];

/**
 * Explosive weapon hints — any ammo-bearing / explosive weapon on a proto
 * incurs the standard 15 BV per crit penalty (proto slot = 1 crit for these
 * purposes; most relevant categories are AC and Gauss rifles).
 *
 * Protos are Clan-only and typically lack CASE; we treat all main-gun
 * ACs / Gauss as explosive. Ammo crits themselves add penalty equal to
 * number of ammo shots stored but TechManual clamps proto ammo contribution
 * small enough that 15 per ammo mount is a conservative match.
 */
const EXPLOSIVE_SUBTYPE_HINTS: readonly string[] = [
  'auto cannon',
  'ac/',
  'gauss',
  'lbx',
  'lb-x',
  'ultra ac',
];

// =============================================================================
// Helpers
// =============================================================================

function sumNumericRecord(
  rec: Readonly<Record<string, number>> | undefined,
): number {
  if (!rec) return 0;
  let sum = 0;
  for (const k of Object.keys(rec)) {
    const v = (rec as Record<string, unknown>)[k];
    if (typeof v === 'number') sum += v;
  }
  return sum;
}

function armorTotal(unit: IProtoMechUnit): number {
  // Cast via unknown because `IProtoArmorByLocation` uses enum-string keys
  // that don't match the wider `Record<string, number>` index signature.
  return sumNumericRecord(
    unit.armorByLocation as unknown as Record<string, number>,
  );
}

function structureTotal(unit: IProtoMechUnit): number {
  return sumNumericRecord(
    unit.structureByLocation as unknown as Record<string, number>,
  );
}

function classifyEquipment(
  mount: IProtoMechMountedEquipment,
): 'weapon' | 'defensive' | 'offensive' | 'ammo' | 'other' {
  const id = mount.equipmentId.toLowerCase();

  if (id.includes('ammo')) return 'ammo';

  for (const hint of DEFENSIVE_EQUIPMENT_HINTS) {
    if (id.includes(hint)) return 'defensive';
  }
  for (const hint of OFFENSIVE_EQUIPMENT_HINTS) {
    if (id.includes(hint)) return 'offensive';
  }

  // The resolver is the source of truth: if it returns a nonzero BV, assume
  // weapon. Anything else (structure, special) contributes 0 and gets tagged
  // 'other' to keep the breakdown honest.
  const resolved = resolveEquipmentBV(mount.equipmentId);
  if (resolved.resolved && resolved.battleValue > 0) return 'weapon';
  return 'other';
}

function isExplosiveWeapon(mount: IProtoMechMountedEquipment): boolean {
  const id = mount.equipmentId.toLowerCase();
  for (const hint of EXPLOSIVE_SUBTYPE_HINTS) {
    if (id.includes(hint)) return true;
  }
  return false;
}

function isMainGunMount(mount: IProtoMechMountedEquipment): boolean {
  return mount.isMainGun || mount.location === ProtoLocation.MAIN_GUN;
}

/**
 * Compute the proto offensive speed factor.
 *
 * `mp = walkMP + round(jumpMP / 2)`
 * `sf = round(pow(1 + (mp − 5) / 10, 1.2) × 100) / 100`
 */
export function calculateProtoSpeedFactor(
  walkMP: number,
  jumpMP: number,
): number {
  const mp = walkMP + Math.round(jumpMP / 2);
  return Math.round(Math.pow(1 + (mp - 5) / 10, 1.2) * 100) / 100;
}

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
// BV sub-calculations
// =============================================================================

interface DefensivePieces {
  readonly armorBV: number;
  readonly structureBV: number;
  readonly defensiveEquipmentBV: number;
  readonly explosivePenalty: number;
  readonly defensiveFactor: number;
  readonly defensiveBV: number;
}

function calculateProtoDefensive(unit: IProtoMechUnit): DefensivePieces {
  const armorPoints = armorTotal(unit);
  const structurePoints = structureTotal(unit);

  const armorBV = armorPoints * ARMOR_BV_PER_POINT;
  const structureBV = structurePoints * STRUCTURE_BV_PER_POINT;

  let defensiveEquipmentBV = 0;
  let explosivePenalty = 0;

  for (const mount of unit.equipment) {
    const kind = classifyEquipment(mount);
    if (kind === 'defensive') {
      const resolved = resolveEquipmentBV(mount.equipmentId);
      if (resolved.resolved) defensiveEquipmentBV += resolved.battleValue;
    }
    if (kind === 'weapon' && isExplosiveWeapon(mount)) {
      // Standard TechManual explosive penalty is 15 BV per critical slot of
      // explosive equipment; protos have 1 slot per mount so 15 per weapon.
      explosivePenalty += 15;
    }
  }

  const tmm = calculateTMM(unit.runMP, unit.jumpMP);
  const defensiveFactor = 1 + tmm / 10;

  const defensiveBV =
    (armorBV + structureBV + defensiveEquipmentBV - explosivePenalty) *
    defensiveFactor;

  return {
    armorBV,
    structureBV,
    defensiveEquipmentBV,
    explosivePenalty,
    defensiveFactor,
    defensiveBV,
  };
}

interface OffensivePieces {
  readonly weaponBV: number;
  readonly ammoBV: number;
  readonly physicalWeaponBV: number;
  readonly offensiveEquipmentBV: number;
  readonly speedFactor: number;
  readonly offensiveBV: number;
}

function calculateProtoOffensive(unit: IProtoMechUnit): OffensivePieces {
  let rawWeaponBV = 0;
  let offensiveEquipmentBV = 0;

  const weaponsForAmmo: Array<{ id: string; bv: number }> = [];
  const ammoForCap: Array<{ id: string; bv: number; weaponType: string }> = [];

  for (const mount of unit.equipment) {
    const kind = classifyEquipment(mount);

    if (kind === 'weapon') {
      // Main gun weapons count at full BV, identical to mech-mounted.
      // (Note: arm / torso weapons also at full BV for protos — proto scale
      //  is baked into the damage value in the catalog, not a BV discount.)
      const resolved = resolveEquipmentBV(mount.equipmentId);
      if (resolved.resolved) {
        rawWeaponBV += resolved.battleValue;
        weaponsForAmmo.push({
          id: mount.equipmentId,
          bv: resolved.battleValue,
        });
      }
      continue;
    }

    if (kind === 'offensive') {
      const resolved = resolveEquipmentBV(mount.equipmentId);
      if (resolved.resolved) offensiveEquipmentBV += resolved.battleValue;
      continue;
    }

    if (kind === 'ammo') {
      const resolved = resolveEquipmentBV(mount.equipmentId);
      if (resolved.resolved) {
        const weaponType = normalizeEquipmentId(mount.equipmentId)
          .replace(/-ammo$/, '')
          .replace(/^ammo-/, '');
        ammoForCap.push({
          id: mount.equipmentId,
          bv: resolved.battleValue,
          weaponType,
        });
      }
      continue;
    }
  }

  // Apply targeting-computer multiplier if present — proto targeting
  // computers exist but are rare; the OFFENSIVE_EQUIPMENT_HINTS list catches
  // them and adds their BV. We do NOT apply the 1.25× per-weapon boost at
  // the proto scale (TechManual does not grant this to protos).

  // Ammo cap: each ammo type's contribution is capped at the matching
  // weapon's BV. We mirror the mech calculation but keep it conservative
  // since protos rarely ship with more than 1 mount per weapon type.
  let ammoBV = 0;
  if (ammoForCap.length > 0 && weaponsForAmmo.length > 0) {
    const weaponBVByType: Record<string, number> = {};
    for (const w of weaponsForAmmo) {
      const type = normalizeEquipmentId(w.id);
      weaponBVByType[type] = (weaponBVByType[type] ?? 0) + w.bv;
    }
    const ammoBVByType: Record<string, number> = {};
    for (const a of ammoForCap) {
      ammoBVByType[a.weaponType] = (ammoBVByType[a.weaponType] ?? 0) + a.bv;
    }
    for (const t of Object.keys(ammoBVByType)) {
      const cap = weaponBVByType[t];
      if (cap === undefined) continue;
      ammoBV += Math.min(ammoBVByType[t], cap);
    }
  }

  // Physical attack bonus: small flat bonus equal to tonnage.
  // Rationale (TechManual proto errata): protos inherit a weight-based
  // physical attack contribution, matching the mech BV "weight bonus" term
  // but scaled to proto combat (no TSM, no AES, no industrial bump).
  const physicalWeaponBV = unit.tonnage;

  const speedFactor = calculateProtoSpeedFactor(unit.walkMP, unit.jumpMP);

  const weaponBV = rawWeaponBV;
  const offensiveBV =
    (weaponBV + ammoBV + physicalWeaponBV + offensiveEquipmentBV) * speedFactor;

  return {
    weaponBV,
    ammoBV,
    physicalWeaponBV,
    offensiveEquipmentBV,
    speedFactor,
    offensiveBV,
  };
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

// Re-export dispatch helper used by the router in battleValueCalculations.
export { isMainGunMount as isProtoMechMainGunMount };
