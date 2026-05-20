/**
 * SwarmConfigSchema validation tests — Task 5.13.
 *
 * Verifies that the Zod schema correctly accepts valid configs, applies
 * defaults, and rejects invalid inputs with descriptive errors.
 *
 * @spec openspec/changes/add-encounter-swarm-harness/specs/quick-session/spec.md
 * @design D9 — JSON config is primary input; Zod validates at parse time
 */

import {
  CANONICAL_BIOMES,
  SwarmConfigSchema,
  SwarmSideConfigSchema,
  normalizeTerrainBiome,
} from '../swarmConfigSchema';

// =============================================================================
// Minimal valid inputs used across multiple tests
// =============================================================================

const VALID_SIDE = {
  bvBudget: 3000,
  unitCount: 2,
  aiVariant: 'default',
};

const VALID_CONFIG = {
  runs: 10,
  seed: 42,
  sideA: VALID_SIDE,
  sideB: VALID_SIDE,
};

// =============================================================================
// SwarmSideConfigSchema
// =============================================================================

describe('SwarmSideConfigSchema', () => {
  describe('accepts valid side configs', () => {
    it('parses minimal required fields', () => {
      const result = SwarmSideConfigSchema.safeParse(VALID_SIDE);
      expect(result.success).toBe(true);
    });

    it('applies default pilotStrategy = template', () => {
      const result = SwarmSideConfigSchema.parse(VALID_SIDE);
      expect(result.pilotStrategy).toBe('template');
    });

    it('applies default pilotSkillBand = regular', () => {
      const result = SwarmSideConfigSchema.parse(VALID_SIDE);
      expect(result.pilotSkillBand).toBe('regular');
    });

    it('accepts all aiVariant values', () => {
      for (const variant of [
        'default',
        'aggressive',
        'defensive',
        'skirmisher',
      ]) {
        const result = SwarmSideConfigSchema.safeParse({
          ...VALID_SIDE,
          aiVariant: variant,
        });
        expect(result.success).toBe(true);
      }
    });

    it('accepts all pilotSkillBand values', () => {
      for (const band of ['green', 'regular', 'veteran', 'elite']) {
        const result = SwarmSideConfigSchema.safeParse({
          ...VALID_SIDE,
          pilotSkillBand: band,
        });
        expect(result.success).toBe(true);
      }
    });

    // Spec Fix 5 — `--pilots` (strategy) and `--pilot-skill-band` (band) are
    // distinct CLI inputs that map to two different schema fields. The CLI
    // parser writes one or the other into the per-side config; the schema
    // must accept the full value set for both axes independently.
    it('accepts all pilotStrategy values (--pilots flag axis)', () => {
      for (const strategy of ['vault', 'template']) {
        const result = SwarmSideConfigSchema.safeParse({
          ...VALID_SIDE,
          pilotStrategy: strategy,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.pilotStrategy).toBe(strategy);
        }
      }
    });

    it('rejects invalid pilotStrategy values (--pilots flag axis)', () => {
      const result = SwarmSideConfigSchema.safeParse({
        ...VALID_SIDE,
        pilotStrategy: 'random',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid pilotSkillBand values (--pilot-skill-band flag axis)', () => {
      const result = SwarmSideConfigSchema.safeParse({
        ...VALID_SIDE,
        pilotSkillBand: 'godlike',
      });
      expect(result.success).toBe(false);
    });

    it('pilotStrategy and pilotSkillBand are independent fields', () => {
      // Setting one should not constrain the other; both can be set together.
      const result = SwarmSideConfigSchema.safeParse({
        ...VALID_SIDE,
        pilotStrategy: 'vault',
        pilotSkillBand: 'elite',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pilotStrategy).toBe('vault');
        expect(result.data.pilotSkillBand).toBe('elite');
      }
    });

    it('accepts optional tonnageMin and tonnageMax', () => {
      const result = SwarmSideConfigSchema.safeParse({
        ...VALID_SIDE,
        tonnageMin: 35,
        tonnageMax: 75,
      });
      expect(result.success).toBe(true);
    });

    it('accepts optional era', () => {
      const result = SwarmSideConfigSchema.safeParse({
        ...VALID_SIDE,
        era: '3050',
      });
      expect(result.success).toBe(true);
    });

    it('accepts optional techBase IS/Clan/Mixed', () => {
      for (const tb of ['IS', 'Clan', 'Mixed']) {
        const result = SwarmSideConfigSchema.safeParse({
          ...VALID_SIDE,
          techBase: tb,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('rejects invalid side configs', () => {
    it('rejects missing bvBudget', () => {
      const { bvBudget: _omit, ...rest } = VALID_SIDE as Record<
        string,
        unknown
      >;
      expect(SwarmSideConfigSchema.safeParse(rest).success).toBe(false);
    });

    it('rejects missing unitCount', () => {
      const { unitCount: _omit, ...rest } = VALID_SIDE as Record<
        string,
        unknown
      >;
      expect(SwarmSideConfigSchema.safeParse(rest).success).toBe(false);
    });

    it('rejects invalid aiVariant', () => {
      const result = SwarmSideConfigSchema.safeParse({
        ...VALID_SIDE,
        aiVariant: 'berserker',
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer bvBudget', () => {
      expect(
        SwarmSideConfigSchema.safeParse({ ...VALID_SIDE, bvBudget: 3000.5 })
          .success,
      ).toBe(false);
    });

    it('rejects negative bvBudget', () => {
      expect(
        SwarmSideConfigSchema.safeParse({ ...VALID_SIDE, bvBudget: -1 })
          .success,
      ).toBe(false);
    });

    it('rejects zero unitCount', () => {
      expect(
        SwarmSideConfigSchema.safeParse({ ...VALID_SIDE, unitCount: 0 })
          .success,
      ).toBe(false);
    });

    it('rejects invalid techBase value', () => {
      expect(
        SwarmSideConfigSchema.safeParse({
          ...VALID_SIDE,
          techBase: 'Periphery',
        }).success,
      ).toBe(false);
    });
  });
});

// =============================================================================
// SwarmConfigSchema
// =============================================================================

describe('SwarmConfigSchema', () => {
  describe('accepts valid top-level configs', () => {
    it('parses minimal required fields', () => {
      const result = SwarmConfigSchema.safeParse(VALID_CONFIG);
      expect(result.success).toBe(true);
    });

    it('applies default mapRadius = 12', () => {
      const result = SwarmConfigSchema.parse(VALID_CONFIG);
      expect(result.mapRadius).toBe(12);
    });

    it('applies default terrainBiome = temperate (replace-biome-none-placeholder)', () => {
      // Per `replace-biome-none-placeholder` (closes playtest gap #5):
      // the default biome is `'temperate'`. The legacy `'none'` placeholder
      // is no longer a valid variant.
      const result = SwarmConfigSchema.parse(VALID_CONFIG);
      expect(result.terrainBiome).toBe('temperate');
    });

    it('applies default output path', () => {
      const result = SwarmConfigSchema.parse(VALID_CONFIG);
      expect(result.output).toBe('./swarm-output.json');
    });

    it('preserves explicit mapRadius when provided', () => {
      const result = SwarmConfigSchema.parse({ ...VALID_CONFIG, mapRadius: 8 });
      expect(result.mapRadius).toBe(8);
    });

    it('preserves explicit output path when provided', () => {
      const result = SwarmConfigSchema.parse({
        ...VALID_CONFIG,
        output: './custom-out.json',
      });
      expect(result.output).toBe('./custom-out.json');
    });

    it('parses the example swarm config file without errors', async () => {
      // Load the canonical example from the repo and validate it round-trips.
      const fs = await import('fs');
      const path = await import('path');
      const configPath = path.resolve(
        process.cwd(),
        'scripts/swarm-configs/duel-3kbv-temperate.json',
      );
      if (!fs.existsSync(configPath)) {
        // Skip if running from a different cwd — not a test failure.
        return;
      }
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const result = SwarmConfigSchema.safeParse(raw);
      expect(result.success).toBe(true);
    });
  });

  describe('rejects invalid top-level configs', () => {
    it('rejects missing sideA', () => {
      const { sideA: _omit, ...rest } = VALID_CONFIG as Record<string, unknown>;
      expect(SwarmConfigSchema.safeParse(rest).success).toBe(false);
    });

    it('rejects missing sideB', () => {
      const { sideB: _omit, ...rest } = VALID_CONFIG as Record<string, unknown>;
      expect(SwarmConfigSchema.safeParse(rest).success).toBe(false);
    });

    it('rejects runs = 0', () => {
      expect(
        SwarmConfigSchema.safeParse({ ...VALID_CONFIG, runs: 0 }).success,
      ).toBe(false);
    });

    it('rejects negative seed', () => {
      expect(
        SwarmConfigSchema.safeParse({ ...VALID_CONFIG, seed: -1 }).success,
      ).toBe(false);
    });

    it('rejects non-integer runs', () => {
      expect(
        SwarmConfigSchema.safeParse({ ...VALID_CONFIG, runs: 2.5 }).success,
      ).toBe(false);
    });

    it('rejects invalid nested aiVariant in sideA', () => {
      const result = SwarmConfigSchema.safeParse({
        ...VALID_CONFIG,
        sideA: { ...VALID_SIDE, aiVariant: 'rampage' },
      });
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// replace-biome-none-placeholder (closes playtest gap #5)
// =============================================================================
//
// The placeholder 'none' is no longer a valid terrainBiome value. Legacy
// configs that pass 'none' receive a deterministic fallback to 'temperate'
// with a mandatory console.warn (the warning is the regression signal in
// CI logs — silent fallback would let stale data hide). Any other unknown
// biome rejects with a migration-path error.

describe("normalizeTerrainBiome — biome 'none' migration", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('returns each canonical biome unchanged', () => {
    for (const biome of CANONICAL_BIOMES) {
      expect(normalizeTerrainBiome(biome)).toBe(biome);
    }
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("legacy 'none' emits console.warn and falls back to 'temperate'", () => {
    expect(normalizeTerrainBiome('none')).toBe('temperate');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    // The warning identifies the offending caller surface so the CI log
    // makes the regression source obvious.
    expect(warnSpy.mock.calls[0][0]).toMatch(/swarmConfigSchema/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/biome 'none'/);
  });

  it("rejects an unknown non-'none' biome with a migration-path error", () => {
    expect(() => normalizeTerrainBiome('lunar')).toThrow(/no longer supported/);
    expect(() => normalizeTerrainBiome('lunar')).toThrow(
      /replace-biome-none-placeholder/,
    );
  });
});

describe("SwarmConfigSchema — biome 'none' migration through the validator", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("legacy terrainBiome: 'none' parses through to 'temperate' with a warning", () => {
    const result = SwarmConfigSchema.parse({
      ...VALID_CONFIG,
      terrainBiome: 'none',
    });
    expect(result.terrainBiome).toBe('temperate');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('accepts each canonical biome explicitly', () => {
    for (const biome of CANONICAL_BIOMES) {
      const result = SwarmConfigSchema.parse({
        ...VALID_CONFIG,
        terrainBiome: biome,
      });
      expect(result.terrainBiome).toBe(biome);
    }
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("rejects an unknown non-'none' biome with the migration-path error", () => {
    expect(() =>
      SwarmConfigSchema.parse({
        ...VALID_CONFIG,
        terrainBiome: 'tropical-rainforest',
      }),
    ).toThrow(/no longer supported/);
  });
});
