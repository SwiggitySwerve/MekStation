/**
 * Cross-language schema contracts.
 *
 * The Zod schemas under `./generated/*.zod.ts` are generated from the
 * canonical JSON Schemas at `public/data/equipment/_schema/*.json` via
 * `npm run schema:gen`. Python writers validate the same shapes using
 * `jsonschema.Draft7Validator` (see `scripts/megameklab-conversion/schema_gate.py`).
 *
 * In PR-A1 only the weapon shape is exported here. The remaining 5
 * shapes (unit, ammunition, electronics, misc-equipment, physical-weapon)
 * are generated alongside but stay un-exported until PR-A2 wires their
 * round-trip tests and consumer migrations.
 *
 * Naming convention:
 *  - `WeaponContract`  — runtime Zod schema (parse/safeParse)
 *  - `IWeaponContract` — inferred TypeScript type (boundary shape)
 *
 * Rich domain interfaces (e.g. `IWeapon` in `src/types/equipment/...`)
 * remain the in-memory shape. Contracts are the parse boundary; an
 * adapter layer bridges contract -> domain incrementally so the existing
 * 167 `as any` / `as unknown` casts can migrate file-by-file.
 */

import type { z } from 'zod';

import { WeaponContract as WeaponContractSchema } from './generated/weapon.zod';

// Re-export the runtime schema under the canonical contract name.
export const WeaponContract = WeaponContractSchema;

// Inferred boundary type. The generator emits a `type WeaponContract`
// alongside the schema; we re-export it under the conventional `I`
// prefix used elsewhere in `src/types/`.
export type IWeaponContract = z.infer<typeof WeaponContractSchema>;
