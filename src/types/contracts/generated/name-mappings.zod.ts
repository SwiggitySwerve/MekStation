// @generated — do not edit; run `npm run schema:gen` to regenerate.
// Source: public/data/equipment/_schema/name-mappings-schema.json
// Regeneration: `node scripts/generate-zod-schemas.mjs` (see `scripts/generate-zod-schemas.mjs`).
//
// PR-A1 ships only the weapon shape through round-trip tests + loader
// validation; PR-A2 wires the rest. The schema-bridge CI job verifies
// these files match the JSON Schema source via `--check` mode.

import { z } from 'zod';

export const NameMappingsContract = z
  .object({
    $schema: z
      .string()
      .describe(
        'JSON-Schema reference for editor tooling. Stripped at runtime by `loadNameMappings`.',
      )
      .optional(),
    mappings: z
      .record(z.string(), z.string().min(1))
      .describe(
        'Legacy nested alias dictionary. Currently unused by `loadNameMappings` (top-level entries supersede), but kept in the schema so historical data round-trips without parse errors.',
      )
      .optional(),
  })
  .catchall(
    z
      .string()
      .min(1)
      .describe(
        'Canonical kebab-case equipment id. Should match the `id` field of an entry in one of the equipment catalog files under `public/data/equipment/official/`.',
      ),
  )
  .describe(
    'Alias dictionary mapping legacy / variant equipment names (the source-of-truth keys MegaMek emits in MTF/BLK files) to the canonical kebab-case equipment id used internally. Six thousand-plus top-level entries; new ones land via name-mapping audits when MegaMek releases or imports surface unmapped variants. The schema also tolerates a single nested `mappings` object retained from an earlier two-tier dictionary layout — current readers (`loadNameMappings`) iterate top-level keys only and ignore the nested block.',
  );
export type NameMappingsContract = z.infer<typeof NameMappingsContract>;
