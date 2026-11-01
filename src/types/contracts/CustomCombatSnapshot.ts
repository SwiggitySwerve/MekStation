/**
 * Strict biped BattleMech construction snapshot for custom combat.
 *
 * Built from the generated BattleMech/Omni/Industrial contract
 * (`UnitContract.options[0]`). Projection `.strip()` drops library metadata.
 * Recorded/replay validation is `.strict()` including nested movement.
 *
 * @spec openspec/changes/enable-saved-custom-unit-combat/specs/custom-unit-combat/spec.md
 */

import { z } from 'zod';

import { UnitContract } from './generated/unit.zod';

const mech = UnitContract.options[0];

const ARMOR_POINTS = z.number().int().nonnegative();
const ARMOR_LOCATION = z.union([
  ARMOR_POINTS,
  z.object({ front: ARMOR_POINTS, rear: ARMOR_POINTS }).strict(),
]);

const BATTLEMECH_ARMOR_TYPES = [
  'STANDARD',
  'FERRO_FIBROUS',
  'FERRO_FIBROUS_CLAN',
  'LIGHT_FERRO_FIBROUS',
  'HEAVY_FERRO_FIBROUS',
  'STEALTH',
  'REACTIVE',
  'REFLECTIVE',
  'HARDENED',
  'PRIMITIVE',
  'INDUSTRIAL',
  'HEAVY_INDUSTRIAL',
  'COMMERCIAL',
  'IMPACT_RESISTANT',
  'FERRO_LAMELLOR',
  'FIRE_RESISTANT',
  'MIMETIC',
  'STEALTH_IMPROVED',
  'STEALTH_PROTOTYPE',
  'REACTIVE_CLAN',
  'REFLECTIVE_CLAN',
  'BAR_2',
  'BAR_4',
  'BAR_5',
  'BAR_6',
  'BAR_7',
  'BAR_9',
] as const;

/**
 * Recorded GameCreated construction. Unknown keys at the root or on nested
 * movement/armor objects are rejected. Engine, gyro, structure, heatSinks,
 * and equipment items are already strict on the generated mech contract.
 */
export const customCombatSnapshotSchema = mech
  .omit({
    fluff: true,
    source: true,
    mulId: true,
    role: true,
    sourceDefinition: true,
    // BLK source qualifiers (UL-06a) share the unit schema but are not part of
    // a recorded BattleMech construction; keep recorded snapshots unchanged.
    isOmni: true,
    baseChassisTurretWeight: true,
    baseChassisTurret2Weight: true,
    baseChassisSponsonPintleWeight: true,
    baseChassisFireConWeight: true,
    transporters: true,
    fuel: true,
    fuelType: true,
    isTrailer: true,
    clanEngine: true,
    structuralTechRating: true,
    engineTechRating: true,
    armorTechRating: true,
    internalType: true,
  })
  .extend({
    unitType: z.literal('BattleMech'),
    configuration: z.literal('Biped'),
    // The generated engine enum is shared with vehicles; NONE and STEAM
    // (BLKFile.java:88,90) are vehicle-only and refused on a BattleMech.
    engine: mech.shape.engine.extend({
      type: mech.shape.engine.shape.type.exclude(['NONE', 'STEAM']),
    }),
    armor: z
      .object({
        type: z.enum(BATTLEMECH_ARMOR_TYPES),
        allocation: z.record(z.string(), ARMOR_LOCATION),
      })
      .strict(),
    movement: mech.shape.movement.strict(),
    criticalSlots: z.record(
      z.string(),
      z.array(z.union([z.string(), z.null()])),
    ),
  })
  .strict();

export type CustomCombatSnapshot = z.infer<typeof customCombatSnapshotSchema>;

/** Strip unknown/library keys, then accept only the strict recorded snapshot. */
export function projectCustomCombatSnapshot(
  payload: unknown,
): CustomCombatSnapshot | null {
  const projected = customCombatSnapshotSchema.strip().safeParse(payload);
  if (!projected.success) return null;
  const recorded = customCombatSnapshotSchema.safeParse(projected.data);
  return recorded.success ? recorded.data : null;
}
