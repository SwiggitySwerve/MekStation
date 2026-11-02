import { z } from 'zod';

import { EngineType } from '@/types/construction/EngineType';
import { WeightClass } from '@/types/enums/WeightClass';

import {
  AerospaceEngineType,
  isAerospace,
  isConventionalFighter,
  isSmallCraft,
} from './AerospaceInterfaces';
import { UnitType } from './BattleMechInterfaces';
import { BayType } from './CapitalShipInterfaces';

/** The editable aerospace family; capital ships have separate read-only stores. */
export function isEditableAerospace(unit: { unitType: UnitType }): boolean {
  return isAerospace(unit) || isConventionalFighter(unit) || isSmallCraft(unit);
}

/** Saved editor facts which the catalog contract cannot represent exactly. */
export const aerospaceEditorSchema = z.object({
  name: z.string(),
  weightClass: z.enum(WeightClass),
  isFixedWingSupport: z.boolean().optional(),
  engineType: z.enum(EngineType),
  aerospaceEngineType: z.enum(AerospaceEngineType),
  engineRating: z.number().nonnegative(),
  fuelTons: z.number().nonnegative(),
  structuralIntegrity: z.number().nonnegative(),
  heatSinkPool: z.number().nonnegative(),
  armorTonnage: z.number().nonnegative(),
  hasReinforcedCockpit: z.boolean(),
  hasEjectionSeat: z.boolean(),
  crew: z
    .object({
      crew: z.number().int().nonnegative(),
      passengers: z.number().int().nonnegative(),
      marines: z.number().int().nonnegative(),
      quartersTons: z.number().nonnegative(),
    })
    .nullable(),
  bays: z
    .array(
      z.object({
        type: z.enum(BayType),
        capacity: z.number().nonnegative(),
        // Three catalog-derived stores have NaN doors; JSON null retains "unknown".
        doors: z.number().int().nonnegative().nullable(),
        bayNumber: z.number().int().nonnegative(),
      }),
    )
    .optional(),
  mounts: z.array(
    z.object({
      name: z.string(),
      isRearMounted: z.boolean().optional(),
      linkedAmmoIndex: z.number().int().nonnegative().optional(),
      linkedAmmoId: z.string().optional(),
    }),
  ),
});
