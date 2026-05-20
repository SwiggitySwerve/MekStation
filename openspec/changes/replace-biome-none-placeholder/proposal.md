# Change: Replace `biome=none` Placeholder

## Why

The simulation system has a `biome=none` placeholder value that exists in the BiomeGenerator's value enum but maps to no meaningful terrain generation. The Phase-1 smoke matrix explicitly excludes `biome=none` from its sweeps because the value isn't a real biome variant — it's a "no biome assigned" sentinel that the generator can't actually produce well-formed terrain for.

Playtest gap #5 logged the placeholder. The fix is to remove the sentinel value entirely: `BiomeGenerator` SHALL always return a valid biome (one of `temperate`, `desert`, `mountain`, `urban` per the existing variants), and any callers that pass `'none'` SHALL receive a runtime warning + a deterministic fallback to `temperate`.

## What Changes

- REMOVED `'none'` from the `Biome` enum / type union
- ADDED a defensive fallback in `BiomeGenerator`: if a caller somehow passes `'none'` (e.g. a legacy config), the generator emits a warning and falls back to `temperate`
- MIGRATED any internal call sites currently using `'none'` to one of the real biomes (or to undefined, letting the generator pick)
- ADDED a validator on the scenario-config input boundary that rejects `'none'` with a clear error
- ADDED a regression test asserting all Phase-1 swarm configs work without `'none'` references

## Dependencies

- **Requires (already shipped)**: BiomeGenerator + Scenario config typing
- **No new types, no new transport** — narrows existing type unions

## Impact

- Affected specs: `simulation-system` (the biome generator capability)
- Affected code:
  - `src/simulation/generator/BiomeGenerator.ts` — remove `none` from the enum, add fallback
  - `src/types/simulation/Biome.ts` (or equivalent) — type union narrowing
  - any swarm configs or scenario JSON that references `biome: 'none'` — migrate
- No database migrations (Biome is an enum, not a stored value)
- The type-narrowing is breaking for any external caller that referenced `Biome.NONE`; the migration is a string replace

## Non-Goals

- Adding new biome variants (desert / mountain / urban / temperate are sufficient for Wave 1-5 scope; ice / lava / underwater are post-roadmap candidates)
- Per-biome balance tuning (the existing balance is fine; the fix removes a placeholder, not a real variant)
- Procedural-biome generation beyond the existing four-variant selection (a continuous biome blend is a separate change)
