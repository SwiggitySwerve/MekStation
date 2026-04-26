// @generated — do not edit; run `npm run schema:gen` to regenerate.
// Source: public/data/equipment/_schema/physical-weapon-schema.json
// Regeneration: `node scripts/generate-zod-schemas.mjs` (see `scripts/generate-zod-schemas.mjs`).
//
// PR-A1 ships only the weapon shape through round-trip tests + loader
// validation; PR-A2 wires the rest. The schema-bridge CI job verifies
// these files match the JSON Schema source via `--check` mode.

import { z } from 'zod';

export const PhysicalWeaponContract = z
  .object({
    id: z
      .string()
      .regex(new RegExp('^[a-z0-9-]+$'))
      .describe('Unique identifier for the physical weapon (kebab-case)'),
    type: z
      .enum([
        'Hatchet',
        'Sword',
        'Claws',
        'Mace',
        'Lance',
        'Flail',
        'Wrecking Ball',
        'Talons',
        'Retractable Blade',
      ])
      .describe('Physical weapon type'),
    name: z.string().min(1).describe('Display name of the weapon'),
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
    weightFormula: z
      .enum(['tonnage_divisor', 'fixed'])
      .describe('How weight is calculated'),
    tonnageDivisor: z
      .number()
      .gte(1)
      .describe('Divisor for tonnage-based weight calculation')
      .optional(),
    fixedWeight: z
      .number()
      .gte(0)
      .describe("Fixed weight if weightFormula is 'fixed'")
      .optional(),
    damageFormula: z
      .enum(['tonnage_divisor', 'tonnage_divisor_plus', 'fixed'])
      .describe('How damage is calculated'),
    damageDivisor: z
      .number()
      .gte(1)
      .describe('Divisor for tonnage-based damage calculation')
      .optional(),
    damageBonus: z
      .number()
      .describe('Bonus damage added (for tonnage_divisor_plus)')
      .optional(),
    fixedDamage: z
      .number()
      .gte(0)
      .describe("Fixed damage if damageFormula is 'fixed'")
      .optional(),
    criticalSlots: z
      .number()
      .int()
      .gte(0)
      .describe('Critical slots (0 if calculated from tonnage)'),
    requiresLowerArm: z
      .boolean()
      .describe('Whether lower arm actuator is required'),
    requiresHand: z.boolean().describe('Whether hand actuator is required'),
    validLocations: z
      .array(z.string())
      .min(1)
      .describe('Valid mounting locations'),
    introductionYear: z
      .number()
      .int()
      .gte(1000)
      .lte(9999)
      .describe('Year the weapon was introduced'),
    costFormula: z.string().describe('Cost calculation formula').optional(),
    special: z
      .array(z.string())
      .describe('Special rules for this weapon')
      .optional(),
    flags: z.array(z.string()).describe('Equipment behavior flags').optional(),
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
        'Unit types that can mount this weapon. Physical weapons are typically limited to BattleMechs.',
      )
      .optional(),
  })
  .strict()
  .describe('Schema for BattleTech physical/melee weapon definitions');
export type PhysicalWeaponContract = z.infer<typeof PhysicalWeaponContract>;
