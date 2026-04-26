// @generated — do not edit; run `npm run schema:gen` to regenerate.
// Source: public/data/equipment/_schema/ammunition-schema.json
// Regeneration: `node scripts/generate-zod-schemas.mjs` (see `scripts/generate-zod-schemas.mjs`).
//
// PR-A1 ships only the weapon shape through round-trip tests + loader
// validation; PR-A2 wires the rest. The schema-bridge CI job verifies
// these files match the JSON Schema source via `--check` mode.

import { z } from 'zod';

export const AmmunitionContract = z
  .object({
    id: z
      .string()
      .regex(new RegExp('^[a-z0-9-]+$'))
      .describe('Unique identifier for the ammunition (kebab-case)'),
    name: z.string().min(1).describe('Display name of the ammunition'),
    category: z
      .enum([
        'Autocannon',
        'Gauss',
        'Machine Gun',
        'LRM',
        'SRM',
        'MRM',
        'ATM',
        'NARC',
        'Artillery',
        'AMS',
        'Energy',
      ])
      .describe(
        "Ammunition category. 'Energy' covers chemical-laser ammo and similar energy-weapon consumables.",
      ),
    variant: z
      .enum([
        'Standard',
        'Armor-Piercing',
        'Cluster',
        'Precision',
        'Flechette',
        'Inferno',
        'Fragmentation',
        'Incendiary',
        'Smoke',
        'Thunder',
        'Swarm',
        'Tandem-Charge',
        'Extended Range',
        'High Explosive',
      ])
      .describe('Ammunition variant type'),
    techBase: z
      .enum(['INNER_SPHERE', 'CLAN', 'BOTH'])
      .describe('Technology base for the ammunition'),
    rulesLevel: z
      .enum([
        'INTRODUCTORY',
        'STANDARD',
        'ADVANCED',
        'EXPERIMENTAL',
        'UNOFFICIAL',
      ])
      .describe('Rules level/complexity'),
    compatibleWeaponIds: z
      .array(z.string())
      .min(0)
      .describe(
        'List of weapon IDs this ammo is compatible with. Empty array is allowed for ammo whose compatibility is resolved at runtime via name-mappings (e.g. ATM/SRM variants that share a base weapon).',
      ),
    shotsPerTon: z
      .number()
      .int()
      .gte(1)
      .describe('Number of shots per ton of ammunition'),
    weight: z.number().gte(0).describe('Weight per unit in tons (usually 1)'),
    criticalSlots: z
      .number()
      .int()
      .gte(1)
      .describe('Number of critical slots required'),
    costPerTon: z.number().gte(0).describe('Cost in C-Bills per ton'),
    battleValue: z.number().gte(0).describe('Battle Value per ton'),
    isExplosive: z
      .boolean()
      .describe('Whether the ammo causes explosions when hit'),
    damageModifier: z
      .number()
      .describe('Damage modifier applied by this ammo type')
      .optional(),
    rangeModifier: z
      .number()
      .describe('Range modifier applied by this ammo type')
      .optional(),
    introductionYear: z
      .number()
      .int()
      .gte(1000)
      .lte(9999)
      .describe('Year the ammunition was introduced'),
    extinctionYear: z
      .number()
      .int()
      .gte(1000)
      .lte(9999)
      .describe('Year the ammunition became extinct (if applicable)')
      .optional(),
    reintroductionYear: z
      .number()
      .int()
      .gte(1000)
      .lte(9999)
      .describe('Year the ammunition was reintroduced (if applicable)')
      .optional(),
    special: z
      .array(z.string())
      .describe('Special rules for this ammunition type')
      .optional(),
    flags: z
      .array(z.string())
      .describe('Equipment behavior flags (e.g., EXPLOSIVE, INCENDIARY)')
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
        'Unit types that can use this ammunition. If omitted, defaults to BattleMech, Vehicle, Aerospace.',
      )
      .optional(),
  })
  .strict()
  .describe('Schema for BattleTech ammunition definitions');
export type AmmunitionContract = z.infer<typeof AmmunitionContract>;
