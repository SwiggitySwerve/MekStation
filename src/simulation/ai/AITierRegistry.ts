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
 * Resource-planning parameter block — the A2 contribution to a tier's
 * parameter set (`add-ai-resource-planning` design D5).
 *
 *   - `heatLookaheadTurns`: how many turns ahead `AIHeatPlanner.projectHeat`
 *     projects the heat curve. `0` disables multi-turn projection entirely —
 *     the bot falls back to the single-turn `applyHeatBudget` trim only, so
 *     `Green`/`Regular` reproduce pre-change behavior byte-for-byte.
 *   - `ammoConservationWeight`: scales how aggressively a short ammo runway
 *     drops a weapon's selection priority. `0` disables runway weighting —
 *     ammo remains a binary eligibility gate, never a priority modulator.
 *   - `critSeekingWeight`: multiplier on the additive crit-seeking term in
 *     `scoreTarget`. `0` disables crit-seeking — `scoreTarget` returns the
 *     pre-change `threat * killProbability` value exactly.
 *   - `weaponModeSelection`: when `false`, every multi-mode weapon fires its
 *     default mode and `AIWeaponModeSelector` is never consulted. When
 *     `true`, the selector picks the expected-damage-maximizing mode.
 */
export interface IAITierResourceParameters {
  readonly heatLookaheadTurns: number;
  readonly ammoConservationWeight: number;
  readonly critSeekingWeight: number;
  readonly weaponModeSelection: boolean;
}

/**
 * Coordination parameter block — the A3a contribution to a tier's
 * parameter set (`add-ai-coordination-tactics` design D5).
 *
 *   - `lanceCoordination`: when `false`, the lance planner is never
 *     consulted — `BotPlayer` runs the per-unit decisions exactly as the
 *     movement and resource tiers do. When `true`, `AILancePlanner` runs
 *     once per side per turn and feeds the threat map, fire assignment, and
 *     lance centroid into each unit's move/attack decision.
 *   - `cohesionRadius`: the formation radius, in hexes, from the lance
 *     centroid. A destination within this radius pays no cohesion penalty;
 *     a destination beyond it is penalized in proportion to how far past
 *     the radius it sits.
 *   - `cohesionWeight`: multiplier on the formation-cohesion movement term.
 *     `0` disables the cohesion term — the move scorer is byte-identical to
 *     the A1/A2 terrain-aware scorer.
 *   - `focusFireWeight`: multiplier on the focus-fire bias applied to a
 *     unit's assigned target in `playAttackPhase`. `0` disables the bias —
 *     each unit picks its own threat-scored target.
 */
export interface IAITierCoordinationParameters {
  readonly lanceCoordination: boolean;
  readonly cohesionRadius: number;
  readonly cohesionWeight: number;
  readonly focusFireWeight: number;
}

/**
 * Full parameter set for one difficulty tier.
 *
 * Open by design: A1 defines `tier` and `movement`. A2 ADDs the optional
 * `resource` block. A3a ADDs the optional `coordination` block below.
 * Later Wave 2 changes ADD their own optional blocks (`objective?`,
 * `advanced?`) without touching the fields declared here.
 */
export interface IAITierParameters {
  readonly tier: AITierName;
  readonly movement: IAITierMovementParameters;
  /**
   * A2 resource-planning block. Optional so a tier record built before A2
   * (or a hand-rolled test fixture) still type-checks; every entry in
   * `AI_TIER_REGISTRY` populates it. Resolve it through
   * `resolveResourceParameters` to get the inert default when absent.
   */
  readonly resource?: IAITierResourceParameters;
  /**
   * A3a coordination block. Optional so a tier record built before A3a
   * (or a hand-rolled test fixture) still type-checks; every entry in
   * `AI_TIER_REGISTRY` populates it. Resolve it through
   * `resolveCoordinationParameters` to get the inert default when absent.
   */
  readonly coordination?: IAITierCoordinationParameters;
  // A3b..A4 ADD: objective?, advanced? blocks.
}

/**
 * The inert resource block — every A2 behavior disabled. Used by
 * `resolveResourceParameters` when a tier record predates A2 and as the
 * literal value `Green`/`Regular` carry so the legacy bot is unchanged.
 */
export const INERT_RESOURCE_PARAMETERS: IAITierResourceParameters = {
  heatLookaheadTurns: 0,
  ammoConservationWeight: 0,
  critSeekingWeight: 0,
  weaponModeSelection: false,
};

/**
 * The inert coordination block — every A3a behavior disabled. Used by
 * `resolveCoordinationParameters` when a tier record predates A3a and as the
 * literal value `Green`/`Regular`/`Veteran` carry so the lance planner is
 * never consulted and those tiers stay exactly A1+A2 depth.
 */
export const INERT_COORDINATION_PARAMETERS: IAITierCoordinationParameters = {
  lanceCoordination: false,
  cohesionRadius: 0,
  cohesionWeight: 0,
  focusFireWeight: 0,
};

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
      // A2: fully inert — the legacy bot's single-turn heat trim, binary
      // ammo gate, threat-only target score, and default weapon modes.
      resource: {
        heatLookaheadTurns: 0,
        ammoConservationWeight: 0,
        critSeekingWeight: 0,
        weaponModeSelection: false,
      },
      // A3a: fully inert — `lanceCoordination: false` means the lance
      // planner is never consulted; the bot fights every unit as an island.
      coordination: {
        lanceCoordination: false,
        cohesionRadius: 0,
        cohesionWeight: 0,
        focusFireWeight: 0,
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
      // A2: fully inert — see `Green`. The determinism golden traces are
      // pinned to this tier, so every A2 weight must stay zero here.
      resource: {
        heatLookaheadTurns: 0,
        ammoConservationWeight: 0,
        critSeekingWeight: 0,
        weaponModeSelection: false,
      },
      // A3a: fully inert — see `Green`. The determinism golden traces are
      // pinned to this tier, so every coordination weight must stay zero.
      coordination: {
        lanceCoordination: false,
        cohesionRadius: 0,
        cohesionWeight: 0,
        focusFireWeight: 0,
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
      // A2: resource planning active. `heatLookaheadTurns: 3` (design open
      // question — long enough to catch a building curve, short enough to
      // stay relevant). Conservation and crit-seeking weights are tuned to
      // `scoreTarget`'s scale (threat * killProbability is typically
      // O(1-50)); a crit-seeking weight of `8` makes a fully-exposed target
      // competitive without overruling a much larger threat.
      resource: {
        heatLookaheadTurns: 3,
        ammoConservationWeight: 0.6,
        critSeekingWeight: 8,
        weaponModeSelection: true,
      },
      // A3a: fully inert. Per `add-ai-coordination-tactics` design D5, the
      // `Veteran` tier stays exactly A1+A2 depth — `lanceCoordination` is
      // `false` so the lance planner is never consulted and the cohesion /
      // focus-fire terms contribute nothing.
      coordination: {
        lanceCoordination: false,
        cohesionRadius: 0,
        cohesionWeight: 0,
        focusFireWeight: 0,
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
      // A2: resource planning active, weighted at least as heavily as
      // `Veteran` — `Elite` looks one turn further ahead, rations ammo and
      // hunts crits more aggressively.
      resource: {
        heatLookaheadTurns: 4,
        ammoConservationWeight: 0.8,
        critSeekingWeight: 12,
        weaponModeSelection: true,
      },
      // A3a: coordination active — `Elite` is the first tier to run the
      // lance planner. `cohesionRadius: 4` (design open question) keeps the
      // lance tight enough to mass fire while loose enough to use terrain.
      // `cohesionWeight: 200` sits below A1's LOS (`+1000`) and forward-arc
      // (`+500`) terms so cohesion biases the choice without overriding a
      // strong shot. `focusFireWeight: 400` is at forward-arc scale so the
      // assigned target meaningfully outweighs a marginally-higher
      // self-scored pick.
      coordination: {
        lanceCoordination: true,
        cohesionRadius: 4,
        cohesionWeight: 200,
        focusFireWeight: 400,
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

/**
 * Resolve the A2 resource-planning block for a tier parameter record,
 * falling back to `INERT_RESOURCE_PARAMETERS` when the record predates A2
 * (the optional `resource` field is absent).
 *
 * Used by `AttackAI` so a hand-rolled `IAITierParameters` fixture without a
 * `resource` block resolves to fully-inert resource planning — the legacy
 * bot behavior — rather than throwing on an undefined access. Every entry in
 * `AI_TIER_REGISTRY` populates `resource`, so production callers always get
 * the real tier values.
 */
export function resolveResourceParameters(
  params: IAITierParameters,
): IAITierResourceParameters {
  return params.resource ?? INERT_RESOURCE_PARAMETERS;
}

/**
 * Resolve the A3a coordination block for a tier parameter record, falling
 * back to `INERT_COORDINATION_PARAMETERS` when the record predates A3a (the
 * optional `coordination` field is absent).
 *
 * Used by `BotPlayer` and `MoveAI` so a hand-rolled `IAITierParameters`
 * fixture without a `coordination` block resolves to fully-inert
 * coordination — the per-unit (A1+A2) bot behavior — rather than throwing on
 * an undefined access. Every entry in `AI_TIER_REGISTRY` populates
 * `coordination`, so production callers always get the real tier values.
 */
export function resolveCoordinationParameters(
  params: IAITierParameters,
): IAITierCoordinationParameters {
  return params.coordination ?? INERT_COORDINATION_PARAMETERS;
}
