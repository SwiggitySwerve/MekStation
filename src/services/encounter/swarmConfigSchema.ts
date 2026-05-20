/**
 * Swarm Configuration Schema
 *
 * Zod-validated shape for `scripts/swarm-configs/*.json` files consumed by
 * the CLI swarm runner (`scripts/run-simulation.ts --config <path>`).
 *
 * D9: JSON config file is the primary input; CLI flags override individual
 * keys. D10: sequential execution only — no worker_threads.
 *
 * @spec openspec/changes/add-encounter-swarm-harness/specs/quick-session/spec.md
 */

import { z } from 'zod';

/**
 * Per `replace-biome-none-placeholder` (closes playtest gap #5): the four
 * canonical biome variants. The placeholder `'none'` value is no longer
 * a member of the union — legacy callers that pass `'none'` receive a
 * deterministic fallback to `'temperate'` with a console.warn (see
 * `normalizeTerrainBiome` below).
 *
 * Aligned with `BiomeType` in `src/utils/gameplay/terrainGeneratorTypes.ts`,
 * minus the two callers don't currently exercise from swarm configs
 * (`arctic` and `jungle` remain valid in the terrain generator but were
 * never wired through the swarm config surface; future scenarios extend
 * this union when needed).
 */
export const CANONICAL_BIOMES = [
  'temperate',
  'desert',
  'mountain',
  'urban',
] as const;

export type CanonicalBiome = (typeof CANONICAL_BIOMES)[number];

/**
 * Per `replace-biome-none-placeholder` (closes playtest gap #5): the
 * boundary normalizer for swarm-config `terrainBiome` values. The
 * placeholder `'none'` was a "no biome assigned" sentinel that the
 * BiomeGenerator could not produce well-formed terrain for. Phase-1
 * smoke sweeps excluded `'none'` from their matrices for exactly this
 * reason.
 *
 * Behavior:
 *   - `'none'` (legacy) → emits a `console.warn` identifying the offending
 *     caller and returns `'temperate'`. The warning is mandatory — silent
 *     fallback would let regressions in legacy data sit invisible in CI.
 *   - any other value not in `CANONICAL_BIOMES` → throws (caught upstream
 *     by the validator surface, which converts to a user-facing error).
 *   - a valid canonical biome → returned unchanged.
 */
export function normalizeTerrainBiome(value: string): CanonicalBiome {
  if (value === 'none') {
    // eslint-disable-next-line no-console
    console.warn(
      `[swarmConfigSchema] biome 'none' is no longer supported — falling back to 'temperate'. ` +
        `Update the calling config (or omit terrainBiome to accept the default).`,
    );
    return 'temperate';
  }
  if ((CANONICAL_BIOMES as readonly string[]).includes(value)) {
    return value as CanonicalBiome;
  }
  throw new Error(
    `biome '${value}' is no longer supported — use one of ` +
      `${CANONICAL_BIOMES.join(', ')}. See openspec change ` +
      `replace-biome-none-placeholder for the migration path.`,
  );
}

// =============================================================================
// Per-side configuration schema
// =============================================================================

/**
 * Configuration for one side of a swarm duel.
 * All filters are optional; omitting a filter means "any value is acceptable".
 */
export const SwarmSideConfigSchema = z.object({
  /** Target total BV for the generated force */
  bvBudget: z.number().int().positive(),
  /** Number of units to generate for this side */
  unitCount: z.number().int().positive(),
  /**
   * AI behavior variant key. Must match a registered AIVariantName from
   * behaviorVariants.ts: 'default' | 'aggressive' | 'defensive' | 'skirmisher'.
   */
  aiVariant: z.enum(['default', 'aggressive', 'defensive', 'skirmisher']),
  /**
   * Pilot generation strategy.
   * - 'vault'     : sample from an externally-provided pilot vault (NYI in CLI)
   * - 'template'  : synthesize fresh pilots from the skill band (default)
   */
  pilotStrategy: z.enum(['vault', 'template']).default('template'),
  /** Minimum unit tonnage filter (inclusive). Omit to skip. */
  tonnageMin: z.number().int().nonnegative().optional(),
  /** Maximum unit tonnage filter (inclusive). Omit to skip. */
  tonnageMax: z.number().int().positive().optional(),
  /**
   * Era year string (e.g. "3050"). Only units with entry.year <= this value
   * are eligible. Omit to allow all eras.
   */
  era: z.string().optional(),
  /**
   * Tech base filter. "IS" = Inner Sphere only, "Clan" = Clan only,
   * "Mixed" (or omitted) = no filter applied.
   */
  techBase: z.enum(['IS', 'Clan', 'Mixed']).optional(),
  /**
   * Pilot skill band for template-synthesis strategy.
   * Maps to SKILL_BAND_MAP in pilotSkillBands.ts.
   * Default: 'regular' (gunnery 4–5 / piloting 5–6).
   */
  pilotSkillBand: z
    .enum(['green', 'regular', 'veteran', 'elite'])
    .default('regular'),
});

export type SwarmSideConfig = z.infer<typeof SwarmSideConfigSchema>;

// =============================================================================
// Top-level swarm configuration schema
// =============================================================================

/**
 * Top-level config for a swarm run. Consumed by
 * `scripts/run-simulation.ts --config <path>`.
 *
 * All keys except `sideA` and `sideB` have sane defaults so a minimal config
 * only needs to specify the two sides and a seed.
 */
export const SwarmConfigSchema = z.object({
  /** Total number of sequential simulations to run */
  runs: z.number().int().positive(),
  /**
   * Base RNG seed. Run i receives seed = seed + i, so all runs are
   * deterministically reproducible from this single value.
   */
  seed: z.number().int().nonnegative(),
  /** Hex-grid radius for the generated map. Default: 12. */
  mapRadius: z.number().int().positive().default(12),
  /**
   * Terrain biome name. Per `replace-biome-none-placeholder` (closes
   * playtest gap #5): valid values are the four canonical variants
   * (`temperate`, `desert`, `mountain`, `urban`). The legacy placeholder
   * `'none'` is no longer accepted — the `terrainBiome` field passes
   * through `normalizeTerrainBiome` at the boundary which warns and
   * falls back to `'temperate'` for legacy `'none'` configs, and rejects
   * any other unknown value with a migration-path error.
   *
   * Default: `'temperate'` (replaces the legacy `'none'` sentinel).
   */
  terrainBiome: z
    .string()
    .default('temperate')
    .transform((value) => normalizeTerrainBiome(value)),
  /** Side A configuration (player side) */
  sideA: SwarmSideConfigSchema,
  /** Side B configuration (opponent side) */
  sideB: SwarmSideConfigSchema,
  /** Output file path for the results JSON. Default: './swarm-output.json'. */
  output: z.string().default('./swarm-output.json'),
});

export type SwarmConfig = z.infer<typeof SwarmConfigSchema>;
