/**
 * SwarmConfigSchema validation tests — Task 5.13.
 *
 * Verifies that the Zod schema correctly accepts valid configs, applies
 * defaults, and rejects invalid inputs with descriptive errors.
 *
 * @spec openspec/changes/add-encounter-swarm-harness/specs/quick-session/spec.md
 * @design D9 — JSON config is primary input; Zod validates at parse time
 */

import { SwarmConfigSchema, SwarmSideConfigSchema } from '../swarmConfigSchema';

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

    it('applies default terrainBiome = none', () => {
      const result = SwarmConfigSchema.parse(VALID_CONFIG);
      expect(result.terrainBiome).toBe('none');
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
