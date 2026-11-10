// @generated — do not edit; run `npm run schema:gen` to regenerate.
// Source: public/data/equipment/_schema/weapon-schema.json
// Regeneration: `node scripts/generate-zod-schemas.mjs` (see `scripts/generate-zod-schemas.mjs`).
//
// PR-A1 ships only the weapon shape through round-trip tests + loader
// validation; PR-A2 wires the rest. The schema-bridge CI job verifies
// these files match the JSON Schema source via `--check` mode.

import { z } from 'zod';
const SchemaRef_0_nativeTechnologyNames = z
  .array(z.string().min(1))
  .min(1)
  .refine(
    (arr) => arr.every((item, i) => arr.indexOf(item) == i),
    'All items must be unique!',
  )
  .describe(
    'Exact native internal names referencing the runtime technology-advancements sidecar. Missing metadata remains unavailable; parsing does not resolve references or derive legality.',
  );
const once = <T>(make: () => T): (() => T) => {
  let value: T | undefined;
  return () => (value ??= make());
};
const unionBranches1 = once(() => [
  z.number().gte(0),
  z.string().describe("Variable damage like '1/missile'"),
]);

export const WeaponContract = z
  .object({
    nativeTechnologyNames: SchemaRef_0_nativeTechnologyNames.optional(),
    id: z
      .string()
      .regex(new RegExp('^[a-z0-9-]+$'))
      .describe('Unique identifier for the weapon (kebab-case)'),
    name: z.string().min(1).describe('Display name of the weapon'),
    category: z
      .enum(['Energy', 'Ballistic', 'Missile', 'Physical', 'Artillery'])
      .describe('Primary weapon category'),
    subType: z
      .string()
      .describe('Specific weapon sub-type within the category'),
    techBase: z
      .enum(['INNER_SPHERE', 'CLAN', 'BOTH'])
      .describe('Technology base for the weapon'),
    rulesLevel: z
      .enum([
        'INTRODUCTORY',
        'STANDARD',
        'ADVANCED',
        'EXPERIMENTAL',
        'UNOFFICIAL',
      ])
      .describe('Rules level/complexity'),
    damage: z
      .any()
      .superRefine((x, ctx) => {
        const schemas = unionBranches1();
        const { errors, failed } = schemas.reduce<{
          errors: z.core.$ZodIssue[];
          failed: number;
        }>(
          ({ errors, failed }, schema) =>
            ((result) =>
              result.error
                ? {
                    errors: [...errors, ...result.error.issues],
                    failed: failed + 1,
                  }
                : { errors, failed })(schema.safeParse(x)),
          { errors: [], failed: 0 },
        );
        const passed = schemas.length - failed;
        if (passed !== 1) {
          ctx.addIssue(
            errors.length
              ? {
                  path: [],
                  code: 'invalid_union',
                  errors: [errors],
                  message:
                    'Invalid input: Should pass single schema. Passed ' +
                    passed,
                }
              : {
                  path: [],
                  code: 'custom',
                  errors: [errors],
                  message:
                    'Invalid input: Should pass single schema. Passed ' +
                    passed,
                },
          );
        }
      })
      .describe('Damage value or formula'),
    heat: z.number().gte(0).describe('Heat generated when firing'),
    ranges: z
      .object({
        minimum: z
          .number()
          .gte(0)
          .describe('Minimum range (no penalty inside)'),
        short: z.number().gte(0).describe('Short range bracket'),
        medium: z.number().gte(0).describe('Medium range bracket'),
        long: z.number().gte(0).describe('Long range bracket'),
        extreme: z
          .number()
          .gte(0)
          .describe('Extreme range bracket (optional)')
          .optional(),
      })
      .strict(),
    weight: z.number().gte(0).describe('Weight in tons'),
    criticalSlots: z
      .number()
      .int()
      .gte(0)
      .describe('Number of critical slots required'),
    vehicleSlots: z
      .object({
        tank: z
          .union([
            z
              .number()
              .int()
              .gte(0)
              .describe(
                'Combat-vehicle slots (Java getTankSlots); null when Java computes them from the unit',
              ),
            z
              .null()
              .describe(
                'Combat-vehicle slots (Java getTankSlots); null when Java computes them from the unit',
              ),
          ])
          .describe(
            'Combat-vehicle slots (Java getTankSlots); null when Java computes them from the unit',
          ),
        supportVehicle: z
          .union([
            z
              .number()
              .int()
              .gte(0)
              .describe(
                'Support-vehicle slots (Java getSupportVeeSlots); null when Java computes them from the unit',
              ),
            z
              .null()
              .describe(
                'Support-vehicle slots (Java getSupportVeeSlots); null when Java computes them from the unit',
              ),
          ])
          .describe(
            'Support-vehicle slots (Java getSupportVeeSlots); null when Java computes them from the unit',
          ),
      })
      .strict()
      .describe(
        'Pinned Java per-item vehicle slots, generated by scripts/equipment-catalog/vehicle-slots.mjs',
      )
      .optional(),
    motiveCompatibility: z
      .object({
        incompatibleCombat: z
          .array(z.string())
          .describe(
            'Java EntityMovementMode names (TRACKED ... MAGLEV) it cannot mount on for combat vehicles',
          ),
        incompatibleSupport: z
          .array(z.string())
          .describe(
            'Java EntityMovementMode names (TRACKED ... MAGLEV) it cannot mount on for support vehicles',
          ),
      })
      .strict()
      .describe(
        'Pinned Java TestTank.legalForMotiveType restrictions, generated by scripts/equipment-catalog/vehicle-slots.mjs; absent when Java imposes none',
      )
      .optional(),
    ammoPerTon: z
      .number()
      .int()
      .gte(1)
      .describe('Shots per ton of ammunition (if applicable)')
      .optional(),
    costCBills: z.number().gte(0).describe('Cost in C-Bills'),
    battleValue: z.number().gte(0).describe('Battle Value for the weapon'),
    introductionYear: z
      .number()
      .int()
      .gte(1000)
      .lte(9999)
      .describe('Year the weapon was introduced'),
    extinctionYear: z
      .number()
      .int()
      .gte(1000)
      .lte(9999)
      .describe('Year the weapon became extinct (if applicable)')
      .optional(),
    reintroductionYear: z
      .number()
      .int()
      .gte(1000)
      .lte(9999)
      .describe('Year the weapon was reintroduced (if applicable)')
      .optional(),
    isExplosive: z
      .boolean()
      .describe('Whether the weapon causes ammo explosions')
      .default(false),
    special: z
      .array(z.string())
      .describe('Special abilities or rules')
      .optional(),
    flags: z
      .array(z.string())
      .describe(
        'Equipment behavior flags for rules processing (e.g., PULSE, DIRECT_FIRE, AMS)',
      )
      .optional(),
    allowedUnitTypes: z
      .array(
        z.enum([
          'BattleMech',
          'OmniMech',
          'IndustrialMech',
          'ProtoMech',
          'Vehicle',
          'VTOL',
          'Support Vehicle',
          'Aerospace',
          'Conventional Fighter',
          'Small Craft',
          'DropShip',
          'JumpShip',
          'WarShip',
          'Space Station',
          'Infantry',
          'Battle Armor',
        ]),
      )
      .describe(
        'Unit types that can mount this weapon. If omitted, defaults to BattleMech, Vehicle, Aerospace.',
      )
      .optional(),
    allowedLocations: z
      .array(z.string())
      .describe(
        'Specific locations where this weapon can be mounted. If omitted, any valid weapon location is allowed.',
      )
      .optional(),
  })
  .strict()
  .describe('Schema for BattleTech weapon equipment definitions');
export type WeaponContract = z.infer<typeof WeaponContract>;
