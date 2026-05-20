# Tasks: Replace `biome=none` Placeholder

## 1. Type-union narrowing

- [x] 1.1 N/A — there is no `Biome` union type containing `'none'` in this codebase. The actual placeholder lived in the swarm config schema (`terrainBiome: z.string().default('none')`). Equivalent surface is migrated in task 2.x.
- [x] 1.2 N/A as a compile error path — instead, validator-side `normalizeTerrainBiome` throws at runtime for unknown biomes and emits a warn+fallback for legacy `'none'`. 16 swarm-config JSON files migrated; `npx tsc --noEmit` clean.

## 2. Generator fallback

- [x] 2.1 `src/simulation/generator/BiomeGenerator.ts`: at the public boundary, if a caller passes `'none'` (e.g. a legacy serialized config), emit a `console.warn` with the offending caller's stack and fall back to `'temperate'`
- [x] 2.2 The fallback SHALL NOT silently corrupt — the warning is mandatory so a regression case in legacy data surfaces in CI logs

## 3. Migration

- [x] 3.1 Grep for `biome.*none|'none'` across `scripts/swarm-configs/`, `playtest/`, `src/__tests__/` and migrate each occurrence to a deterministic real biome (or `undefined` if the caller doesn't care)
- [x] 3.2 Validator on the scenario-config input boundary: reject `biome: 'none'` with an error pointing to this change as the migration path
- [x] 3.3 Regression test: assert all Phase-1 swarm configs run without producing the legacy-warning

## 4. Spec delta + archive

- [x] 4.1 Author delta at `openspec/changes/replace-biome-none-placeholder/specs/simulation-system/spec.md` REMOVING / MODIFYING the existing Biome variants requirement to drop `'none'`
- [x] 4.2 `openspec validate replace-biome-none-placeholder --strict` passes
- [x] 4.3 `npm run verify:full` passes
- [ ] 4.4 Archive after merge
- [ ] 4.5 Trim gap #5 from `playtest/CLOSEOUT.md`
