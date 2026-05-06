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
   * Terrain biome name. Currently "none" (default weighted-terrain hex grid)
   * is the only implemented value. Unknown biomes produce a warning and fall
   * back to "none" (Phase 7 will wire the Perlin biome generator).
   */
  terrainBiome: z.string().default('none'),
  /** Side A configuration (player side) */
  sideA: SwarmSideConfigSchema,
  /** Side B configuration (opponent side) */
  sideB: SwarmSideConfigSchema,
  /** Output file path for the results JSON. Default: './swarm-output.json'. */
  output: z.string().default('./swarm-output.json'),
});

export type SwarmConfig = z.infer<typeof SwarmConfigSchema>;
