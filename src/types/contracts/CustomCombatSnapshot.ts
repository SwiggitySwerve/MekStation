/**
 * Strict saved combat construction; the original Mech record stays pinned.
 *
 * @spec openspec/changes/enable-saved-custom-unit-combat/specs/custom-unit-combat/spec.md
 */

import { z } from 'zod';

import type { UnitFamily } from '@/types/unit/UnitIndex';

import { UNIT_DEFINITION_FAMILIES } from '@/services/units/unitLoaderService/definitionTypes';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { parseUnitReference } from '@/types/unit/UnitIndex';

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
  'BALLISTIC_REINFORCED',
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
    schemaVersion: true,
    fluff: true,
    source: true,
    mulId: true,
    role: true,
    sourceDefinition: true,
    // Portable metadata must not silently widen the recorded combat protocol.
    weaponQuirks: true,
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
    omniPodHeatSinks: true,
    // Editor-only Mixed Tech selections; combat reads the components themselves.
    componentTechBases: true,
    // Editor-only print crew; combat does not read named seats.
    crewSeats: true,
    // Source OmniMek facts (R2): combat reads neither. Without this omit the .strip() projection below would copy the
    // -1 every saved custom mech carries into each recorded GameCreated payload and change recorded bytes (D-8).
    baseChassisHeatSinks: true,
    clanName: true,
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

// Keep the Mech object above unchanged: callers pin its exact 21-key shape.
const native = UnitContract.options[1].def.left;
const mp = mech.shape.movement.shape.walk;
const nativeMovement = native.shape.movement
  .unwrap()
  .extend({
    cruiseMP: mp.optional(),
    flankMP: mp.optional(),
    safeThrust: mp.optional(),
    maxThrust: mp.optional(),
  })
  .strict();
const nativeSnapshot = native
  .omit({
    schemaVersion: true,
    fluff: true,
    source: true,
    mulId: true,
    role: true,
    sourceDefinition: true,
    weaponQuirks: true,
    componentTechBases: true,
    crewSeats: true,
    // Same R2 OmniMek facts as the BattleMech snapshot above: not part of recorded vehicle or aerospace construction.
    baseChassisHeatSinks: true,
    clanName: true,
    configuration: true,
    gyro: true,
    criticalSlots: true,
  })
  .required({
    chassis: true,
    tonnage: true,
    engine: true,
    armor: true,
    equipment: true,
  })
  .extend({ movement: nativeMovement, motionType: z.string().min(1) })
  .strict();
const vehicleSnapshot = nativeSnapshot
  .extend({
    family: z.literal('vehicles'),
    unitType: z.enum(UNIT_DEFINITION_FAMILIES.vehicles.unitTypes),
    motionType: z.enum(GroundMotionType),
    movement: nativeMovement.extend({ cruiseMP: mp }),
  })
  .refine(
    (value) =>
      value.armor.byLocation !== undefined &&
      UnitContract.safeParse(value).success,
    'Vehicle armor.byLocation required',
  );
const aerospaceSnapshot = nativeSnapshot
  .extend({
    family: z.literal('aerospace'),
    unitType: z.enum(UNIT_DEFINITION_FAMILIES.aerospace.unitTypes),
    subType: z.string().optional(),
    structuralIntegrity: ARMOR_POINTS.optional(),
    movement: nativeMovement.extend({ safeThrust: mp }),
    fuel: native.shape.fuel.unwrap(),
    heatSinks: native.shape.heatSinks.unwrap(),
  })
  .refine(
    (value) =>
      value.armor.byArc !== undefined && UnitContract.safeParse(value).success,
    'Aerospace armor.byArc required',
  );

const snapshotSchemas = [
  customCombatSnapshotSchema,
  vehicleSnapshot,
  aerospaceSnapshot,
] as const;
export const recordedCustomCombatSnapshotSchema = z.union(snapshotSchemas);
export type CustomCombatSnapshot = z.infer<
  typeof recordedCustomCombatSnapshotSchema
>;

export function customCombatSnapshotFamily(
  snapshot: CustomCombatSnapshot,
): UnitFamily {
  return 'family' in snapshot ? snapshot.family : 'battlemechs';
}

export function isCustomCombatReference(reference: string): boolean {
  return parseUnitReference(reference).id.startsWith('custom-');
}

export function snapshotRefError(
  snapshot: CustomCombatSnapshot,
  ref: string,
): 'identity' | 'family' | null {
  const { id, family } = parseUnitReference(ref);
  if (!isCustomCombatReference(ref) || snapshot.id !== id) return 'identity';
  return (family ?? 'battlemechs') === customCombatSnapshotFamily(snapshot)
    ? null
    : 'family';
}

/** Strip unknown/library keys, then accept only the strict recorded snapshot. */
export function projectCustomCombatSnapshot(
  payload: unknown,
): CustomCombatSnapshot | null {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'schemaVersion' in payload &&
    !mech.shape.schemaVersion.safeParse(payload.schemaVersion).success
  )
    return null;
  for (const schema of snapshotSchemas) {
    const projected = schema.strip().safeParse(payload);
    if (!projected.success) continue;
    const recorded = recordedCustomCombatSnapshotSchema.safeParse(
      projected.data,
    );
    if (recorded.success) return recorded.data;
  }
  return null;
}
