/**
 * Aerospace Unit Zod Schemas
 *
 * Zod validation schemas for aerospace construction data shapes.
 * Used at API/persistence boundaries to validate before trusting.
 *
 * @spec openspec/changes/add-aerospace-construction/specs/aerospace-unit-system/spec.md
 */

import { z } from 'zod';

import {
  AerospaceArc,
  AerospaceEngineType,
  AerospaceSubType,
} from './AerospaceInterfaces';
import { AerospaceCockpitType } from './AerospaceInterfaces';

// ============================================================================
// Enum Schemas
// ============================================================================

export const AerospaceSubTypeSchema = z.nativeEnum(AerospaceSubType);
export const AerospaceArcSchema = z.nativeEnum(AerospaceArc);
export const AerospaceEngineTypeSchema = z.nativeEnum(AerospaceEngineType);
export const AerospaceCockpitTypeSchema = z.nativeEnum(AerospaceCockpitType);

// ============================================================================
// Arc Armor Allocation Schema
// ============================================================================

/**
 * Partial record of arc → armor points.
 * Only the arcs relevant to the sub-type need be present.
 *
 * We use a plain z.record keyed by string (not native enum) with optional value
 * so not every arc need be present. A `.default(() => ({}))` supplies an empty
 * allocation when absent. Validation of allowed arc keys is performed by the
 * construction-rule validators, not by Zod.
 */
export const ArcArmorAllocationSchema = z
  .record(z.string(), z.number().int().nonnegative())
  .default(() => ({}));

// ============================================================================
// Small Craft Crew Schema
// ============================================================================

export const SmallCraftCrewSchema = z.object({
  crew: z.number().int().nonnegative(),
  passengers: z.number().int().nonnegative(),
  marines: z.number().int().nonnegative(),
  quartersTons: z.number().nonnegative(),
});

// ============================================================================
// Weight Breakdown Schema (read-only, computed)
// ============================================================================

export const AerospaceBreakdownSchema = z.object({
  engineTons: z.number().nonnegative(),
  siTons: z.number().nonnegative(),
  fuelTons: z.number().nonnegative(),
  armorTons: z.number().nonnegative(),
  heatSinkTons: z.number().nonnegative(),
  cockpitTons: z.number().nonnegative(),
  quartersTons: z.number().nonnegative(),
  equipmentTons: z.number().nonnegative(),
  totalUsed: z.number().nonnegative(),
  remaining: z.number(),
});

// ============================================================================
// Aerospace Construction State Schema
// ============================================================================

/**
 * Validates the persisted construction state for any aerospace sub-type.
 * This is the shape that crosses the store/persistence boundary.
 */
export const AerospaceConstructionStateSchema = z.object({
  subType: AerospaceSubTypeSchema,
  tonnage: z.number().int().positive().min(5).max(200),
  engineType: AerospaceEngineTypeSchema,
  engineRating: z.number().int().positive(),
  safeThrust: z.number().int().nonnegative(),
  maxThrust: z.number().int().nonnegative(),
  structuralIntegrity: z.number().int().positive(),
  fuelTons: z.number().nonnegative(),
  fuelPoints: z.number().int().nonnegative(),
  heatSinkPool: z.number().int().nonnegative(),
  doubleHeatSinks: z.boolean(),
  cockpitType: AerospaceCockpitTypeSchema,
  armorTons: z.number().nonnegative(),
  arcArmor: ArcArmorAllocationSchema,
  crew: SmallCraftCrewSchema.nullable(),
});

export type AerospaceConstructionState = z.infer<
  typeof AerospaceConstructionStateSchema
>;

// ============================================================================
// Validation Error Schema
// ============================================================================

export const AerospaceValidationErrorSchema = z.object({
  ruleId: z.string(),
  message: z.string(),
});

export const AerospaceValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(AerospaceValidationErrorSchema),
});

export type AerospaceValidationResult = z.infer<
  typeof AerospaceValidationResultSchema
>;
