# Design: Add Procedural Map Variety

## Context

The `terrain-generation` spec defines a complete Perlin-noise pipeline: seeded RNG, octave noise, biome weights, elevation, and weighted terrain selection. It is deterministic and correct — but it is also the *only* input to a generated map. The map-preset system (`mapPresets.ts`) was built to vary maps by scenario, yet `generateTerrain()` never reads it. This change closes that gap without disturbing the existing pipeline: presets become a deterministic overlay applied after base generation.

## Goals / Non-Goals

**Goals:**

- Make the 17 existing presets actually shape generated terrain.
- Keep generation fully deterministic and seed-reproducible.
- Leave the 13 existing `terrain-generation` requirements intact — this change is purely additive.

**Non-Goals:**

- New terrain types, dynamic terrain, imported boards, biome-weight changes.

## Decisions

### D1. The feature pass is an overlay, not a replacement

Base biome generation runs unchanged and produces the grid exactly as today. The feature pass then takes that grid and stamps clustered features onto a copy. Every existing `terrain-generation` requirement (biome weights, elevation, determinism, distribution accuracy) still holds for the base pass; the feature pass is described entirely by new ADDED requirements.

### D2. `presetFeatures` directive shape

```typescript
interface IFeatureDirective {
  readonly type: TerrainType;   // Woods, Water, Building, Road, Pavement, Rough, ...
  readonly density: number;     // target fraction of grid hexes [0, 1]
  readonly clusterSize: number; // mean cluster radius in hexes
}

interface TerrainGeneratorConfig {
  // ...existing width, height, biome, seed
  readonly presetFeatures?: readonly IFeatureDirective[];
}
```

When `presetFeatures` is omitted, generation is byte-identical to current behavior.

### D3. Deterministic clustering algorithm

For each directive: derive `K = ceil(density × hexCount / max(1, clusterSize²))` cluster origins by drawing hex coordinates from the seeded RNG; grow each origin via seeded flood-fill to roughly `clusterSize` hexes. The RNG used is the same `SeededRandom` already specified by `terrain-generation`, advanced past the base pass — so the whole map (base + features) is one deterministic function of the seed.

### D4. Structure placement

- **Buildings** — stamped as rectangular footprints of 1–4 hexes at seeded positions.
- **Roads** — a path traced between two map edges (seeded edge pair); hexes along the path are set to `Road`.
- **Pavement** — every hex orthogonally adjacent to a `Building` hex that is still natural terrain becomes `Pavement`.

### D5. Fixed application order

Directives are applied in a fixed order regardless of input order: natural features (Woods, Water, Rough) first, then `Building`, then `Road`, then `Pavement` auto-fill. Structures override natural terrain. The fixed order guarantees determinism independent of how the preset lists its features.

### D6. Preset → directive mapping

`IMapPreset.features` already carries `{ type, density, clusterSize }`-shaped entries. The change maps `IMapPreset.features` directly to `IFeatureDirective[]` and passes `selectMapPreset()`'s output into `generateTerrain` from both scenario-generation entry points (`ScenarioGeneratorService`, `ScenarioGenerator`).

### D7. Distinctness invariant

Verified by tests that build a terrain-type histogram for two different presets at the same seed and biome and assert the histograms differ beyond a tolerance. This is the regression guard that the presets are genuinely consumed.

### D8. `presetId` recorded on the generated map

The generated map records the originating `presetId` for replay and debugging. Optional and additive.

## Risks / Trade-offs

- **[Risk] The feature pass perturbs `terrain-generation`'s distribution-accuracy requirement** → Mitigation: the distribution-accuracy scenarios measure the *base* pass; the feature pass is governed by its own density tolerance requirement. They are independent and both verifiable.
- **[Risk] Road tracing fails to connect on tiny grids** → Mitigation: on grids too small to trace a path the directive is skipped without error; covered by an edge-case scenario.
- **[Risk] Buildings overrunning the deployment zones used by `scenario-objectives`** → Mitigation: structure placement avoids deployment-zone hexes when the config supplies them; otherwise placement is unconstrained (skirmish maps).
- **[Risk] Determinism drift if directives are applied in list order** → Mitigation: fixed application order (D5).

## Migration Plan

Purely additive. `presetFeatures` is optional — every existing `generateTerrain` call without it produces identical output. No new event types, no database migrations. Rollback = revert the change-set; presets return to being dead code.

## Open Questions

- Whether `density` should be measured against total hexes or against non-structure hexes — proposed: total hexes, for predictability.
- Whether road count should scale with map size — proposed: one road per preset directive for now; revisit if large maps look sparse.
