/**
 * ProtoMech Zod Schemas
 *
 * Runtime-validated schemas for ProtoMech construction data.
 * All exported schema types are inferred from their Zod definitions so that
 * compile-time and runtime representations stay in sync.
 *
 * @spec openspec/changes/add-protomech-construction/specs/protomech-unit-system/spec.md
 */

import { z } from "zod";

import {
  ProtoChassis,
  ProtoLocation,
  ProtoWeightClass,
} from "./ProtoMechInterfaces";

// =============================================================================
// Enum schemas
// =============================================================================

export const ProtoChassisSchema = z.enum([
  ProtoChassis.BIPED,
  ProtoChassis.QUAD,
  ProtoChassis.GLIDER,
  ProtoChassis.ULTRAHEAVY,
]);

export const ProtoWeightClassSchema = z.enum([
  ProtoWeightClass.LIGHT,
  ProtoWeightClass.MEDIUM,
  ProtoWeightClass.HEAVY,
  ProtoWeightClass.ULTRAHEAVY,
]);

export const ProtoLocationSchema = z.enum([
  ProtoLocation.HEAD,
  ProtoLocation.TORSO,
  ProtoLocation.LEFT_ARM,
  ProtoLocation.RIGHT_ARM,
  ProtoLocation.LEGS,
  ProtoLocation.MAIN_GUN,
  ProtoLocation.FRONT_LEGS,
  ProtoLocation.REAR_LEGS,
]);

// =============================================================================
// Armor-by-location schema
// =============================================================================

/** Armor/structure allocation for standard (non-Quad) chassis */
export const ProtoArmorByLocationSchema = z.object({
  [ProtoLocation.HEAD]: z.number().int().min(0),
  [ProtoLocation.TORSO]: z.number().int().min(0),
  [ProtoLocation.LEFT_ARM]: z.number().int().min(0),
  [ProtoLocation.RIGHT_ARM]: z.number().int().min(0),
  [ProtoLocation.LEGS]: z.number().int().min(0),
  [ProtoLocation.MAIN_GUN]: z.number().int().min(0),
});

export type ProtoArmorByLocation = z.infer<typeof ProtoArmorByLocationSchema>;

// =============================================================================
// Mounted equipment schema
// =============================================================================

export const ProtoMechMountedEquipmentSchema = z.object({
  id: z.string().min(1),
  equipmentId: z.string().min(1),
  name: z.string().min(1),
  location: ProtoLocationSchema,
  linkedAmmoId: z.string().optional(),
  isMainGun: z.boolean(),
});

export type ProtoMechMountedEquipmentData = z.infer<
  typeof ProtoMechMountedEquipmentSchema
>;

// =============================================================================
// Main ProtoMech unit schema
// =============================================================================

export const ProtoMechUnitSchema = z.object({
  // Identity
  id: z.string().min(1),
  name: z.string().min(1),
  chassis: z.string().min(1),
  model: z.string(),
  mulId: z.string(),
  year: z.number().int().min(2000),

  // Classification
  unitType: z.literal("ProtoMech"),
  techBase: z.enum(["Clan", "Inner Sphere", "Mixed"]),
  tonnage: z.number().int().min(2).max(15),
  weightClass: ProtoWeightClassSchema,
  chassisType: ProtoChassisSchema,
  pointSize: z.number().int().min(1).max(5),

  // Movement
  walkMP: z.number().int().min(1),
  runMP: z.number().int().min(1),
  jumpMP: z.number().int().min(0),
  engineRating: z.number().int().min(1),
  engineWeight: z.number().min(0),

  // Special equipment
  myomerBooster: z.boolean(),
  glidingWings: z.boolean(),

  // Armor
  armorType: z.literal("Standard"),
  armorByLocation: ProtoArmorByLocationSchema,
  structureByLocation: ProtoArmorByLocationSchema,

  // Main gun
  hasMainGun: z.boolean(),
  mainGunWeaponId: z.string().optional(),

  // Equipment
  equipment: z.array(ProtoMechMountedEquipmentSchema),

  // Metadata
  isModified: z.boolean(),
  createdAt: z.number().int().positive(),
  lastModifiedAt: z.number().int().positive(),
});

export type ProtoMechUnitData = z.infer<typeof ProtoMechUnitSchema>;

// =============================================================================
// Construction-input schema (partial — for user input before full validation)
// =============================================================================

/**
 * Minimal input needed to initialise a new ProtoMech in the store.
 * All omitted fields receive construction-rule defaults.
 */
export const CreateProtoMechInputSchema = z.object({
  chassis: z.string().min(1).optional(),
  model: z.string().optional(),
  tonnage: z.number().int().min(2).max(15).optional(),
  chassisType: ProtoChassisSchema.optional(),
  walkMP: z.number().int().min(1).optional(),
});

export type CreateProtoMechInput = z.infer<typeof CreateProtoMechInputSchema>;
