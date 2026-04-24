/**
 * ProtoMech Construction Interfaces
 *
 * Canonical data shapes for ProtoMech units (Clan-only per BattleTech canon).
 * Covers chassis type, weight class, armor-by-location, movement, and main gun.
 *
 * @spec openspec/changes/add-protomech-construction/specs/protomech-unit-system/spec.md
 */

// Type-only import avoids a runtime cycle with `protoMechBV.ts`, which imports
// runtime values (enums) from this file. BV breakdown is erased at runtime.
import type { IProtoMechBVBreakdown } from '@/utils/construction/protomech/protoMechBV';

import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

// =============================================================================
// Enumerations
// =============================================================================

/**
 * ProtoMech chassis type.
 *
 * - Biped: default; supports arm weapons
 * - Quad: no arms; all equipment on Torso or Legs
 * - Glider: Light class only; adds Glider Wings granting bonus jump MP; no arms
 * - Ultraheavy: 10–15 tons; no jump MP; increased armor capacity
 */
export enum ProtoChassis {
  BIPED = 'Biped',
  QUAD = 'Quad',
  GLIDER = 'Glider',
  ULTRAHEAVY = 'Ultraheavy',
}

/**
 * ProtoMech weight class derived from tonnage.
 *
 * - Light: 2–4 tons (MP cap walk 8, jump 8)
 * - Medium: 5–7 tons (MP cap walk 6, jump 6)
 * - Heavy: 8–9 tons (MP cap walk 4, jump 4)
 * - Ultraheavy: 10–15 tons (MP cap walk 3, jump 0)
 */
export enum ProtoWeightClass {
  LIGHT = 'Light',
  MEDIUM = 'Medium',
  HEAVY = 'Heavy',
  ULTRAHEAVY = 'Ultraheavy',
}

/**
 * ProtoMech armor / structure locations.
 *
 * HEAD, TORSO, LEFT_ARM, RIGHT_ARM, LEGS are always present.
 * MAIN_GUN is only present when the unit has a main gun mount.
 * Quad chassis substitutes FRONT_LEGS / REAR_LEGS for arms + legs.
 */
export enum ProtoLocation {
  HEAD = 'Head',
  TORSO = 'Torso',
  LEFT_ARM = 'Left Arm',
  RIGHT_ARM = 'Right Arm',
  LEGS = 'Legs',
  /** Present only when hasMainGun === true */
  MAIN_GUN = 'Main Gun',
  /** Quad chassis front legs (replaces Left Arm + Right Arm) */
  FRONT_LEGS = 'Front Legs',
  /** Quad chassis rear legs (replaces Legs) */
  REAR_LEGS = 'Rear Legs',
}

// =============================================================================
// Armor by location
// =============================================================================

/**
 * Armor allocation for a standard (Biped / Glider / Ultraheavy) ProtoMech.
 * mainGun is present in the record but treated as 0 when hasMainGun is false.
 */
export interface IProtoArmorByLocation {
  [ProtoLocation.HEAD]: number;
  [ProtoLocation.TORSO]: number;
  [ProtoLocation.LEFT_ARM]: number;
  [ProtoLocation.RIGHT_ARM]: number;
  [ProtoLocation.LEGS]: number;
  [ProtoLocation.MAIN_GUN]: number;
}

/**
 * Armor allocation for a Quad ProtoMech.
 * Front Legs replace arms; Rear Legs replace legs.
 */
export interface IProtoQuadArmorByLocation {
  [ProtoLocation.HEAD]: number;
  [ProtoLocation.TORSO]: number;
  [ProtoLocation.FRONT_LEGS]: number;
  [ProtoLocation.REAR_LEGS]: number;
  [ProtoLocation.MAIN_GUN]: number;
}

// =============================================================================
// Per-tonnage armor maximums (constant table)
// =============================================================================

/**
 * Maximum armor points per location, indexed by tonnage (2–15).
 * Source: BattleTech Total Warfare ProtoMech construction rules.
 *
 * Format: { head, torso, arm, legs, mainGun }
 */
export interface IProtoArmorMaxByTonnage {
  /** Max armor on the Head location */
  head: number;
  /** Max armor on the Torso location */
  torso: number;
  /** Max armor on each arm (Biped) or Front Legs pair (Quad) */
  arm: number;
  /** Max armor on the Legs location (Biped) or Rear Legs (Quad) */
  legs: number;
  /** Max armor on the Main Gun location (when present) */
  mainGun: number;
}

// =============================================================================
// Main gun
// =============================================================================

/**
 * Approved weapon IDs that may be installed in the MainGun location.
 * Weapons not in this list are rejected by VAL-PROTO-MAIN-GUN.
 */
export const PROTO_MAIN_GUN_APPROVED_WEAPON_IDS: ReadonlySet<string> = new Set([
  'clan-lrm-5',
  'clan-lrm-10',
  'clan-ac-2',
  'clan-ac-5',
  'clan-gauss-rifle',
  'clan-ppc',
  'clan-er-ppc',
  'clan-medium-pulse-laser',
  'clan-er-medium-laser',
]);

/**
 * Weapon size classes for arm-placement enforcement.
 * Heavy weapons (PPC, Gauss, AC, LRM-10+) may NOT be placed in arm mounts;
 * they must go in the MainGun location.
 */
export enum ProtoWeaponSizeClass {
  LIGHT = 'Light',
  MEDIUM = 'Medium',
  HEAVY = 'Heavy',
}

// =============================================================================
// Core ProtoMech unit interface
// =============================================================================

/**
 * Canonical ProtoMech unit data shape.
 *
 * Uses a discriminated union on `chassisType` so Quad and non-Quad instances
 * carry the correct armor-by-location type at compile time.
 */
export interface IProtoMechUnit {
  // ---- Identity ----
  readonly id: string;
  readonly name: string;
  readonly chassis: string;
  readonly model: string;
  readonly mulId: string;
  readonly year: number;

  // ---- Classification ----
  /** Always PROTOMECH */
  readonly unitType: UnitType.PROTOMECH;
  /** Always Clan for canonical ProtoMechs */
  readonly techBase: TechBase;
  /** Tons per individual unit (2–15) */
  readonly tonnage: number;
  /** Derived weight class */
  readonly weightClass: ProtoWeightClass;
  /** Chassis configuration */
  readonly chassisType: ProtoChassis;
  /** Point size (default 5) */
  readonly pointSize: number;

  // ---- Movement ----
  /** Walk MP (before myomer booster) */
  readonly walkMP: number;
  /** Run MP = walkMP + 1 (or +1 from booster, applied separately) */
  readonly runMP: number;
  /** Jump MP (0 for Ultraheavy) */
  readonly jumpMP: number;
  /** Engine rating = tonnage × walkMP */
  readonly engineRating: number;
  /** Engine weight in tons = engineRating × 0.025 */
  readonly engineWeight: number;

  // ---- Special equipment ----
  /** Myomer Booster: Light/Medium only; +1 walk MP, costs 1 ton */
  readonly myomerBooster: boolean;
  /** Glider Wings: Glider chassis only; folded into jump MP computation */
  readonly glidingWings: boolean;

  // ---- Armor ----
  /** Armor always Standard for ProtoMechs */
  readonly armorType: 'Standard';
  readonly armorByLocation: IProtoArmorByLocation;
  readonly structureByLocation: IProtoArmorByLocation;

  // ---- Main gun ----
  /** Whether a MainGun location is present */
  readonly hasMainGun: boolean;
  /** Equipment ID of the main gun weapon, or undefined if no main gun */
  readonly mainGunWeaponId: string | undefined;

  // ---- Equipment ----
  readonly equipment: ReadonlyArray<IProtoMechMountedEquipment>;

  // ---- BV ----
  /**
   * Last-computed BV 2.0 breakdown for this ProtoMech. Populated by the proto
   * BV path (see {@link calculateProtoMechBV}) and persisted on the unit so
   * status bars, force-level tools, and the parity harness can read the
   * breakdown without recomputing. Optional because legacy fixtures and
   * freshly-parsed units may not yet have a breakdown attached.
   *
   * @spec openspec/changes/add-protomech-battle-value/specs/protomech-unit-system/spec.md
   *       — Requirement: ProtoMech BV Breakdown on Unit State
   */
  readonly bvBreakdown?: IProtoMechBVBreakdown;

  // ---- Metadata ----
  readonly isModified: boolean;
  readonly createdAt: number;
  readonly lastModifiedAt: number;
}

// =============================================================================
// Mounted equipment
// =============================================================================

/**
 * A single equipment item mounted on a ProtoMech.
 */
export interface IProtoMechMountedEquipment {
  /** Unique mount instance ID */
  readonly id: string;
  /** Equipment catalog ID */
  readonly equipmentId: string;
  /** Display name */
  readonly name: string;
  /** Location on the ProtoMech */
  readonly location: ProtoLocation;
  /** Linked ammo instance ID (weapons with ammo) */
  readonly linkedAmmoId: string | undefined;
  /** True when installed in the MainGun slot */
  readonly isMainGun: boolean;
}
