/**
 * AI Difficulty Tier Registry.
 *
 * Per `add-ai-terrain-aware-movement` design D3: a frozen registry mapping
 * each difficulty tier — `Green`, `Regular`, `Veteran`, `Elite` — to an
 * `IAITierParameters` record. The tier is player-selectable per scenario and
 * controls how much depth the bot's decision-making runs at.
 *
 * This registry is the single, all-ADDED extension point for Wave 2 AI work.
 * A1 (this change) defines the `movement` parameter block. Later changes
 * (A2 resource planning, A3a coordination, A3b objectives, A4 advanced
 * systems) each ADD their own optional block to `IAITierParameters` —
 * registration is additive only, and no later change MODIFIES the movement
 * block or A1's requirement. The registry merges blocks by key.
 *
 * `getTierParameters(name)` mirrors `getBehaviorVariant` from
 * `behaviorVariants.ts`: it throws an explicit, diagnostic error on an
 * unknown tier name rather than returning `undefined`.
 *
 * @spec openspec/changes/add-ai-terrain-aware-movement/specs/simulation-system/spec.md
 *   Requirement: AI Difficulty Tier Registry
 */

/** Union of valid AI difficulty tier names. */
export type AITierName = 'Green' | 'Regular' | 'Veteran' | 'Elite';

/**
 * Movement-scoring parameter block — the A1 contribution to a tier's
 * parameter set.
 *
 *   - `pathfinderEnabled`: when `false`, `MoveAI.scoreMove` runs the legacy
 *     straight-line scorer and the three terrain-aware terms below contribute
 *     nothing — the tier reproduces the pre-change bot byte-for-byte. When
 *     `true`, the terrain-cost pathfinder runs and the new terms apply.
 *   - `coverWeight`: bonus added to a destination hex offering partial cover
 *     or better.
 *   - `losDenialWeight`: bonus added when the destination breaks the
 *     highest-threat enemy's line of sight.
 *   - `terrainCostWeight`: multiplier on the path-inefficiency penalty
 *     (`pathMpCost - hexDistance`) so a destination reached by a wasteful
 *     path scores below an equivalent destination reached cheaply.
 */
export interface IAITierMovementParameters {
  readonly pathfinderEnabled: boolean;
  readonly coverWeight: number;
  readonly losDenialWeight: number;
  readonly terrainCostWeight: number;
}

/**
 * Full parameter set for one difficulty tier.
 *
 * Open by design: A1 defines `tier` and `movement`. Later Wave 2 changes ADD
 * their own optional blocks (`resource?`, `coordination?`, `objective?`,
 * `advanced?`) without touching the fields declared here.
 */
export interface IAITierParameters {
  readonly tier: AITierName;
  readonly movement: IAITierMovementParameters;
  // A2..A4 ADD: resource?, coordination?, objective?, advanced? blocks.
}

/**
 * The frozen tier table.
 *
 * Per design D4 — tiered scoring, lower tiers run the legacy scorer:
 *
 *   - `Green` / `Regular`: `pathfinderEnabled: false` with zeroed weights.
 *     These tiers reproduce today's straight-line move scorer exactly so the
 *     SimulationRunner determinism golden traces stay byte-identical.
 *   - `Veteran` / `Elite`: `pathfinderEnabled: true` with tuned weights so
 *     the bot routes around costly terrain, seeks cover, and breaks enemy
 *     line of sight. `Elite` weights the new terms more heavily than
 *     `Veteran`, making it the top tier that accumulates depth as later
 *     Wave 2 changes land.
 *
 * Weight magnitudes are chosen relative to the existing `scoreMove` scale
 * (LOS term `+1000`, forward-arc `+500`, per-hex distance `-100`): the cover
 * and LOS-denial bonuses sit at forward-arc scale so they meaningfully
 * influence the choice without dominating the closing-distance instinct, and
 * the terrain-cost penalty is small (per wasted MP) so it only breaks ties
 * between otherwise-equivalent destinations.
 */
export const AI_TIER_REGISTRY: Readonly<Record<AITierName, IAITierParameters>> =
  {
    Green: {
      tier: 'Green',
      movement: {
        pathfinderEnabled: false,
        coverWeight: 0,
        losDenialWeight: 0,
        terrainCostWeight: 0,
      },
    },
    Regular: {
      tier: 'Regular',
      movement: {
        pathfinderEnabled: false,
        coverWeight: 0,
        losDenialWeight: 0,
        terrainCostWeight: 0,
      },
    },
    Veteran: {
      tier: 'Veteran',
      movement: {
        pathfinderEnabled: true,
        coverWeight: 300,
        losDenialWeight: 400,
        terrainCostWeight: 40,
      },
    },
    Elite: {
      tier: 'Elite',
      movement: {
        pathfinderEnabled: true,
        coverWeight: 450,
        losDenialWeight: 600,
        terrainCostWeight: 60,
      },
    },
  };

/** The tier used when an `IBotBehavior` does not pin one explicitly. */
export const DEFAULT_TIER_NAME: AITierName = 'Regular';

/**
 * Look up a tier's parameter record by name. Throws an explicit error when
 * the name is not in the registry so callers get a clear diagnostic rather
 * than a silent `undefined` access.
 *
 * Per spec scenario "Unknown tier name throws" — the error names the invalid
 * tier and lists the valid tiers. Mirrors `getBehaviorVariant`.
 */
export function getTierParameters(name: AITierName): IAITierParameters {
  const params = AI_TIER_REGISTRY[name];
  // The TypeScript type already constrains `name` to AITierName, but the
  // runtime check is retained for safety when the value comes from an
  // untyped source (e.g. a serialized game-session config or CLI flag).
  if (!params) {
    throw new Error(
      `Unknown AI tier: "${name}". Valid tiers: ${Object.keys(
        AI_TIER_REGISTRY,
      ).join(', ')}`,
    );
  }
  return params;
}

/**
 * Resolve the tier parameters for an optional tier name, falling back to the
 * default tier (`Regular`) when the name is absent.
 *
 * Used by `MoveAI` so an `IBotBehavior` without an explicit `tier` resolves
 * to `Regular` — the legacy-scorer tier — preserving pre-change behavior for
 * every existing caller and test fixture.
 */
export function resolveTierParameters(
  name: AITierName | undefined,
): IAITierParameters {
  return getTierParameters(name ?? DEFAULT_TIER_NAME);
}
