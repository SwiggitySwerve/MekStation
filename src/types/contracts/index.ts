/**
 * Cross-language schema contracts.
 *
 * The Zod schemas under `./generated/*.zod.ts` are generated from the
 * canonical JSON Schemas at `public/data/equipment/_schema/*.json` via
 * `npm run schema:gen`. Python writers validate the same shapes using
 * `jsonschema.Draft7Validator` (see `scripts/megameklab-conversion/schema_gate.py`).
 *
 * PR-A1 shipped only the weapon shape through this barrel. PR-A2 wires
 * all 6 shapes (weapon + unit + ammunition + electronics + misc-equipment
 * + physical-weapon) so consumers can migrate boundary parses incrementally.
 *
 * Naming convention:
 *  - `WeaponContract`  — runtime Zod schema (parse/safeParse)
 *  - `IWeaponContract` — inferred TypeScript type (boundary shape)
 *
 * Rich domain interfaces (e.g. `IWeapon` in `src/types/equipment/...`)
 * remain the in-memory shape. Contracts are the parse boundary; an
 * adapter layer bridges contract -> domain incrementally so the existing
 * 167 `as any` / `as unknown` casts can migrate file-by-file. PR-A2
 * lands the first such adapter for the unit shape (see
 * `src/services/units/unitLoaderService/unitContractAdapter.ts`).
 */

import type { z } from 'zod';

import { AmmunitionContract as AmmunitionContractSchema } from './generated/ammunition.zod';
import { ElectronicsContract as ElectronicsContractSchema } from './generated/electronics.zod';
import { MiscEquipmentContract as MiscEquipmentContractSchema } from './generated/misc-equipment.zod';
import { NameMappingsContract as NameMappingsContractSchema } from './generated/name-mappings.zod';
import { PhysicalWeaponContract as PhysicalWeaponContractSchema } from './generated/physical-weapon.zod';
import { UnitContract as UnitContractSchema } from './generated/unit.zod';
import { WeaponContract as WeaponContractSchema } from './generated/weapon.zod';

// Re-export the runtime schemas under the canonical contract names.
export const WeaponContract = WeaponContractSchema;
export const UnitContract = UnitContractSchema;
export const AmmunitionContract = AmmunitionContractSchema;
export const ElectronicsContract = ElectronicsContractSchema;
export const MiscEquipmentContract = MiscEquipmentContractSchema;
export const PhysicalWeaponContract = PhysicalWeaponContractSchema;
export const NameMappingsContract = NameMappingsContractSchema;

// Inferred boundary types. The generator emits a `type <Name>Contract`
// alongside each schema; we re-export them under the conventional `I`
// prefix used elsewhere in `src/types/`.
export type IWeaponContract = z.infer<typeof WeaponContractSchema>;
export type IUnitContract = z.infer<typeof UnitContractSchema>;
export type IAmmunitionContract = z.infer<typeof AmmunitionContractSchema>;
export type IElectronicsContract = z.infer<typeof ElectronicsContractSchema>;
export type IMiscEquipmentContract = z.infer<
  typeof MiscEquipmentContractSchema
>;
export type IPhysicalWeaponContract = z.infer<
  typeof PhysicalWeaponContractSchema
>;
export type INameMappingsContract = z.infer<typeof NameMappingsContractSchema>;
