import { z } from 'zod';

import { WeightClass } from '@/types/enums/WeightClass';
import { VehicleStructureType } from '@/utils/construction/vehicle/structure';

import { TurretType } from './VehicleInterfaces';

/** Saved editor facts absent from, or not derivable from, the catalog contract.
 * Canonical armor, engine, movement and equipment identities stay in that contract. */
const turretSchema = z
  .object({
    type: z.enum(TurretType),
    rotationArc: z.number().nonnegative(),
  })
  .nullable();
export const vehicleEditorSchema = z.object({
  name: z.string(),
  weightClass: z.enum(WeightClass),
  flankMP: z.number().nonnegative(),
  armorTonnage: z.number().nonnegative(),
  turret: turretSchema,
  secondaryTurret: turretSchema,
  hasNoControlSystems: z.boolean().optional(),
  isSuperheavy: z.boolean(),
  hasEnvironmentalSealing: z.boolean(),
  hasFlotationHull: z.boolean(),
  isAmphibious: z.boolean(),
  hasTrailerHitch: z.boolean(),
  structureType: z.enum(VehicleStructureType),
  crewSize: z.number().int().nonnegative(),
  passengerSlots: z.number().int().nonnegative(),
  barRating: z.number().nullable(),
  powerAmpWeight: z.number().nonnegative(),
  mounts: z.array(
    z.object({
      name: z.string(),
      isAmmo: z.boolean().optional(),
      sourceIdentity: z
        .object({ sourceId: z.string(), resolvedId: z.string() })
        .optional(),
      isTurretMounted: z.boolean(),
      isSponsonMounted: z.boolean(),
      isChinTurretMounted: z.boolean().optional(),
      isPintleTurretMounted: z.boolean().optional(),
      resolutionWarning: z
        .object({
          code: z.literal('unresolved-equipment'),
          sourceId: z.string(),
          attemptedId: z.string(),
        })
        .optional(),
    }),
  ),
});

export type VehicleSourceIdentity = NonNullable<
  z.output<typeof vehicleEditorSchema>['mounts'][number]['sourceIdentity']
>;

/** Parse saved editor facts and reject misaligned mount metadata at the boundary. */
export function parseVehicleEditor(
  input: unknown,
  mountCount: number,
): z.output<typeof vehicleEditorSchema> | undefined {
  if (input === undefined) return undefined;
  const editor = vehicleEditorSchema.parse(input);
  if (editor.mounts.length !== mountCount)
    throw new TypeError('Saved vehicle mount count does not match equipment');
  return editor;
}
