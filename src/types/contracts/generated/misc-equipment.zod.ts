// @generated — do not edit; run `npm run schema:gen` to regenerate.
// Source: public/data/equipment/_schema/misc-equipment-schema.json
// Regeneration: `node scripts/generate-zod-schemas.mjs` (see `scripts/generate-zod-schemas.mjs`).
//
// PR-A1 ships only the weapon shape through round-trip tests + loader
// validation; PR-A2 wires the rest. The schema-bridge CI job verifies
// these files match the JSON Schema source via `--check` mode.

import { z } from 'zod';

export const MiscEquipmentContract = z
  .object({
    id: z
      .string()
      .regex(new RegExp('^[a-z0-9-]+$'))
      .describe('Unique identifier for the equipment (kebab-case)'),
    name: z.string().min(1).describe('Display name of the equipment'),
    category: z
      .enum([
        'Heat Sink',
        'Jump Jet',
        'Movement Enhancement',
        'Defensive',
        'Myomer',
        'Industrial',
      ])
      .describe('Equipment category'),
    techBase: z
      .enum(['INNER_SPHERE', 'CLAN', 'BOTH'])
      .describe('Technology base for the equipment'),
    rulesLevel: z
      .enum([
        'INTRODUCTORY',
        'STANDARD',
        'ADVANCED',
        'EXPERIMENTAL',
        'UNOFFICIAL',
      ])
      .describe('Rules level/complexity'),
    weight: z
      .number()
      .gte(0)
      .describe('Weight in tons (0 for variable weight equipment)'),
    criticalSlots: z
      .number()
      .int()
      .gte(0)
      .describe('Number of critical slots required (0 for variable)'),
    costCBills: z
      .number()
      .gte(0)
      .describe('Cost in C-Bills (0 for variable cost equipment)'),
    battleValue: z
      .number()
      .gte(0)
      .describe('Battle Value (0 for variable BV equipment)'),
    introductionYear: z
      .number()
      .int()
      .gte(1950)
      .lte(3200)
      .describe('Year the equipment was introduced'),
    extinctionYear: z
      .number()
      .int()
      .gte(1950)
      .lte(3200)
      .describe('Year the equipment became extinct (if applicable)')
      .optional(),
    reintroductionYear: z
      .number()
      .int()
      .gte(1950)
      .lte(3200)
      .describe('Year the equipment was reintroduced (if applicable)')
      .optional(),
    special: z
      .array(z.string())
      .describe('Special abilities or rules')
      .optional(),
    variableEquipmentId: z
      .string()
      .describe('ID for variable equipment formula lookup')
      .optional(),
    flags: z
      .array(z.string())
      .describe(
        'Equipment behavior flags (e.g., HEAT_SINK, JUMP_JET, MASC, CASE)',
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
        'Unit types that can mount this equipment. If omitted, defaults to BattleMech, Vehicle, Aerospace.',
      )
      .optional(),
    allowedLocations: z
      .array(z.string())
      .describe(
        'Specific locations where this equipment can be mounted. If omitted, any valid equipment location is allowed.',
      )
      .optional(),
  })
  .strict()
  .describe(
    'Schema for BattleTech miscellaneous equipment definitions (heat sinks, jump jets, etc.)',
  );
export type MiscEquipmentContract = z.infer<typeof MiscEquipmentContract>;
