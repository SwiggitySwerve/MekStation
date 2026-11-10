// @generated — do not edit; run `npm run schema:gen` to regenerate.
// Source: public/data/equipment/_schema/technology-advancements-schema.json
// Regeneration: `node scripts/generate-zod-schemas.mjs` (see `scripts/generate-zod-schemas.mjs`).
//
// PR-A1 ships only the weapon shape through round-trip tests + loader
// validation; PR-A2 wires the rest. The schema-bridge CI job verifies
// these files match the JSON Schema source via `--check` mode.

import { z } from 'zod';
const SchemaDef_stage = z
  .object({ year: z.number().int().gte(-1), approximate: z.boolean() })
  .strict();
const SchemaDef_rawSide = z
  .object({
    prototype: SchemaDef_stage,
    production: SchemaDef_stage,
    common: SchemaDef_stage,
    extinct: SchemaDef_stage,
    reintroduced: SchemaDef_stage,
  })
  .strict();
const SchemaDef_factionSet = z
  .array(z.string().regex(new RegExp('^[A-Z][A-Z0-9_]*$')))
  .refine(
    (arr) => arr.every((item, i) => arr.indexOf(item) == i),
    'All items must be unique!',
  );
const SchemaDef_fact = z
  .object({
    techBase: z.enum(['IS', 'CLAN', 'ALL']),
    staticTechLevel: z.enum([
      'INTRO',
      'STANDARD',
      'ADVANCED',
      'EXPERIMENTAL',
      'UNOFFICIAL',
    ]),
    advancement: z
      .object({ IS: SchemaDef_rawSide, CLAN: SchemaDef_rawSide })
      .strict(),
    factions: z
      .object({
        prototype: SchemaDef_factionSet,
        production: SchemaDef_factionSet,
        extinct: SchemaDef_factionSet,
        reintroduced: SchemaDef_factionSet,
      })
      .strict(),
  })
  .strict();

export const TechnologyAdvancementsContract = z
  .record(z.string().min(1), SchemaDef_fact)
  .refine((value) => Object.keys(value).length >= 1, 'minProperties')
  .describe(
    'Raw pinned Java facts keyed by exact native internal name. Missing metadata is unresolved; this contract supplies no defaults, derived legality, minimum rules level or getter view.',
  );
export type TechnologyAdvancementsContract = z.infer<
  typeof TechnologyAdvancementsContract
>;
