// @generated — do not edit; run `npm run schema:gen` to regenerate.
// Source: public/data/equipment/_schema/unit-schema.json
// Regeneration: `node scripts/generate-zod-schemas.mjs` (see `scripts/generate-zod-schemas.mjs`).
//
// PR-A1 ships only the weapon shape through round-trip tests + loader
// validation; PR-A2 wires the rest. The schema-bridge CI job verifies
// these files match the JSON Schema source via `--check` mode.

import { z } from 'zod';

export const UnitContract = z
  .object({
    id: z
      .string()
      .regex(new RegExp('^[a-z0-9-]+$'))
      .describe('Unique identifier for the unit (kebab-case)'),
    chassis: z
      .string()
      .min(1)
      .describe("Chassis name (e.g., 'Atlas')")
      .optional(),
    model: z
      .string()
      .min(1)
      .describe("Model designation (e.g., 'AS7-D')")
      .optional(),
    variant: z.string().describe('Optional variant name').optional(),
    unitType: z
      .enum([
        'BattleMech',
        'OmniMech',
        'IndustrialMech',
        'ProtoMech',
        'Vehicle',
        'VTOL',
        'Aerospace',
        'Conventional Fighter',
        'Small Craft',
        'DropShip',
        'JumpShip',
        'WarShip',
        'Space Station',
        'Infantry',
        'Battle Armor',
        'Support Vehicle',
        'BATTLEARMOR',
      ])
      .describe('Type of unit'),
    configuration: z
      .enum(['Biped', 'Quad', 'Tripod', 'LAM', 'QuadVee'])
      .describe('Mech configuration')
      .optional(),
    techBase: z
      .enum(['INNER_SPHERE', 'CLAN', 'MIXED'])
      .describe('Technology base')
      .optional(),
    rulesLevel: z
      .enum([
        'INTRODUCTORY',
        'STANDARD',
        'ADVANCED',
        'EXPERIMENTAL',
        'UNOFFICIAL',
      ])
      .describe('Rules level/complexity')
      .optional(),
    era: z.string().describe('BattleTech era identifier').optional(),
    year: z
      .number()
      .int()
      .gte(1000)
      .lte(9999)
      .describe('Introduction year')
      .optional(),
    tonnage: z.number().gte(0).lte(200).describe('Unit tonnage').optional(),
    engine: z
      .object({
        type: z
          .enum([
            'FUSION',
            'XL',
            'CLAN_XL',
            'LIGHT',
            'COMPACT',
            'XXL',
            'ICE',
            'FUEL_CELL',
            'FISSION',
          ])
          .describe('Engine type'),
        rating: z.number().int().gte(10).lte(500).describe('Engine rating'),
      })
      .strict()
      .optional(),
    gyro: z
      .object({
        type: z
          .enum(['STANDARD', 'XL', 'COMPACT', 'HEAVY_DUTY', 'NONE'])
          .describe('Gyro type'),
      })
      .strict()
      .optional(),
    cockpit: z
      .enum([
        'STANDARD',
        'SMALL',
        'COMMAND_CONSOLE',
        'TORSO_MOUNTED',
        'PRIMITIVE',
        'INDUSTRIAL',
        'SUPERHEAVY',
        'SUPERHEAVY_TRIPOD',
        'INTERFACE',
        'QUADVEE',
        'PRIMITIVE_INDUSTRIAL',
      ])
      .describe('Cockpit type')
      .optional(),
    structure: z
      .object({
        type: z
          .enum([
            'STANDARD',
            'ENDO_STEEL',
            'ENDO_STEEL_CLAN',
            'ENDO_COMPOSITE',
            'REINFORCED',
            'COMPOSITE',
            'INDUSTRIAL',
            'ENDO_COMPOSITE_CLAN',
          ])
          .describe('Internal structure type'),
      })
      .strict()
      .optional(),
    armor: z
      .object({
        type: z
          .enum([
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
          ])
          .describe('Armor type'),
        allocation: z
          .record(
            z.string(),
            z.any().superRefine((x, ctx) => {
              const schemas = [
                z.number().int().gte(0),
                z
                  .object({
                    front: z.number().int().gte(0),
                    rear: z.number().int().gte(0),
                  })
                  .strict(),
              ];
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
            }),
          )
          .describe('Armor points per location'),
      })
      .strict()
      .optional(),
    heatSinks: z
      .object({
        type: z
          .enum(['SINGLE', 'DOUBLE', 'DOUBLE_CLAN', 'COMPACT', 'LASER'])
          .describe('Heat sink type'),
        count: z.number().int().gte(0).describe('Total number of heat sinks'),
      })
      .strict()
      .optional(),
    movement: z
      .object({
        walk: z.number().int().gte(0).describe('Walking MP').optional(),
        jump: z.number().int().gte(0).describe('Jumping MP').optional(),
        jumpJetType: z
          .enum(['STANDARD', 'IMPROVED', 'MECHANICAL', 'UMU'])
          .describe('Jump jet type')
          .optional(),
        enhancements: z
          .array(z.string())
          .describe('Movement enhancements (MASC, Supercharger, etc.)')
          .optional(),
      })
      .catchall(z.any())
      .optional(),
    equipment: z
      .array(
        z
          .object({
            id: z.string().describe('Equipment ID reference'),
            location: z.string().describe('Mounting location'),
            slots: z
              .array(z.number().int())
              .describe('Specific slot indices')
              .optional(),
            isRearMounted: z
              .boolean()
              .describe('Whether weapon is rear-facing')
              .default(false),
            linkedAmmo: z.string().describe('Linked ammunition ID').optional(),
          })
          .strict(),
      )
      .describe('Mounted equipment list')
      .optional(),
    criticalSlots: z
      .record(
        z.string(),
        z.array(
          z.any().superRefine((x, ctx) => {
            const schemas = [z.string(), z.null()];
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
          }),
        ),
      )
      .describe('Critical slot assignments per location')
      .optional(),
    quirks: z.array(z.string()).describe('Unit quirks').optional(),
    fluff: z
      .object({
        overview: z.string().optional(),
        capabilities: z.string().optional(),
        history: z.string().optional(),
        deployment: z.string().optional(),
        variants: z.string().optional(),
        notableUnits: z.string().optional(),
        manufacturer: z.string().optional(),
        primaryFactory: z.string().optional(),
        systemManufacturer: z.record(z.string(), z.string()).optional(),
      })
      .strict()
      .describe('Fluff/flavor text')
      .optional(),
    mulId: z.number().int().describe('Master Unit List ID').optional(),
    role: z.string().describe('Combat role').optional(),
    source: z.string().describe('Source book/publication').optional(),
  })
  .catchall(z.any())
  .and(z.intersection(z.any(), z.any()))
  .describe(
    'Schema for serialized BattleTech unit definitions (BattleMechs, vehicles, etc.)',
  );
export type UnitContract = z.infer<typeof UnitContract>;
