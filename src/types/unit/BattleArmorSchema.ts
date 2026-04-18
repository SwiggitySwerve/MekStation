/**
 * Battle Armor Zod Schemas
 *
 * Runtime-validatable Zod schemas that mirror all interfaces and enums in
 * BattleArmorInterfaces.ts.  Useful for deserialising saved units, validating
 * API payloads, and generating TypeScript types via z.infer.
 *
 * @spec openspec/changes/add-battlearmor-construction/specs/battle-armor-unit-system/spec.md
 */

import { z } from "zod";

import { TechBase } from "@/types/enums/TechBase";

import {
  BAArmorType,
  BAChassisType,
  BALocation,
  BAManipulator,
  BAMovementType,
  BAWeightClass,
} from "./BattleArmorInterfaces";

// ============================================================================
// Enum schemas
// ============================================================================

/** Battle Armor chassis type (Biped / Quad) */
export const BAChassisTypeSchema = z.nativeEnum(BAChassisType);

/** Battle Armor weight class */
export const BAWeightClassSchema = z.nativeEnum(BAWeightClass);

/** Battle Armor movement type */
export const BAMovementTypeSchema = z.nativeEnum(BAMovementType);

/** Battle Armor armor type */
export const BAArmorTypeSchema = z.nativeEnum(BAArmorType);

/** Battle Armor manipulator type */
export const BAManipulatorSchema = z.nativeEnum(BAManipulator);

/** Battle Armor mounting location */
export const BALocationSchema = z.nativeEnum(BALocation);

/** Tech base (shared with other unit types) */
export const TechBaseSchema = z.nativeEnum(TechBase);

// ============================================================================
// Weapon / equipment mount schemas
// ============================================================================

/**
 * Weapon weight classification — light weapons use a regular slot,
 * heavy weapons require Battle Claw or Heavy Claw on the arm.
 */
export const BAWeaponWeightSchema = z.union([
  z.literal("light"),
  z.literal("heavy"),
]);

/**
 * A single weapon mounted on a Battle Armor trooper.
 */
export const IBAWeaponMountSchema = z.object({
  /** Equipment catalog ID */
  equipmentId: z.string().min(1),
  /** Display name */
  name: z.string().min(1),
  /** Mounting location */
  location: BALocationSchema,
  /** Per-trooper mass contribution in kg */
  massKg: z.number().nonnegative(),
  /** Whether the weapon requires Battle Claw or Heavy Claw */
  weaponWeight: BAWeaponWeightSchema,
  /** True when mounted in the anti-personnel weapon slot */
  isAPWeapon: z.boolean(),
});

/**
 * A non-weapon equipment item mounted on a Battle Armor trooper.
 */
export const IBAEquipmentMountSchema = z.object({
  /** Equipment catalog ID */
  equipmentId: z.string().min(1),
  /** Display name */
  name: z.string().min(1),
  /** Mounting location */
  location: BALocationSchema,
  /** Per-trooper mass contribution in kg */
  massKg: z.number().nonnegative(),
  /** Slots consumed at the mounting location */
  slotsUsed: z.number().int().nonnegative(),
});

// ============================================================================
// Top-level IBattleArmorUnit schema
// ============================================================================

/**
 * Full construction-time schema for a Battle Armor squad.
 * Mirrors IBattleArmorUnit exactly; use z.infer<typeof IBattleArmorUnitSchema>
 * to derive the TypeScript type from the schema rather than duplicating it.
 */
export const IBattleArmorUnitSchema = z.object({
  // --- Identity ---
  id: z.string().min(1),
  name: z.string().min(1),
  chassis: z.string().min(1),
  model: z.string(),
  techBase: TechBaseSchema,

  // --- Classification ---
  chassisType: BAChassisTypeSchema,
  weightClass: BAWeightClassSchema,

  // --- Squad ---
  /** Squad size 1–6; values outside 4 (IS) / 5 (Clan) generate warnings */
  squadSize: z.number().int().min(1).max(6),

  // --- Movement ---
  movementType: BAMovementTypeSchema,
  groundMP: z.number().int().nonnegative(),
  jumpMP: z.number().int().nonnegative(),
  umuMP: z.number().int().nonnegative(),
  hasMechanicalJumpBoosters: z.boolean(),

  // --- Armor ---
  armorType: BAArmorTypeSchema,
  armorPointsPerTrooper: z.number().int().nonnegative(),

  // --- Manipulators (Biped only; Quad always uses NONE) ---
  leftManipulator: BAManipulatorSchema,
  rightManipulator: BAManipulatorSchema,

  // --- Weapons & Equipment ---
  weapons: z.array(IBAWeaponMountSchema),
  equipment: z.array(IBAEquipmentMountSchema),

  // --- Anti-Mech flags ---
  hasMagneticClamp: z.boolean(),
  hasMechanicalJumpBooster: z.boolean(),
  hasPartialWing: z.boolean(),
  hasDetachableWeaponPack: z.boolean(),
});

/** TypeScript type derived from the Zod schema — matches IBattleArmorUnit */
export type IBattleArmorUnitDto = z.infer<typeof IBattleArmorUnitSchema>;
