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
 * Objective-awareness parameter block — the A3b contribution to a tier's
 * parameter set (`add-ai-objective-awareness` design D5).
 *
 *   - `objectiveAwareness`: when `false`, the bot is blind to the scenario
 *     objective map — `AIObjectivePlanner` is never consulted, the lance
 *     plan carries no objective layer, and the bot plays every scenario as
 *     `Destroy` (pure attrition). When `true`, the bot reads the objective
 *     markers and plays the scenario (capture / defend / breakthrough).
 *   - `objectiveSeekingWeight`: multiplier on the move-scoring term that
 *     rewards a capture-role unit for closing on (and ending on) a `take`
 *     marker. `0` disables objective-seeking movement.
 *   - `objectiveHoldWeight`: multiplier on the move-scoring term that
 *     rewards a hold-role unit for staying on its `hold` marker. `0`
 *     disables objective-holding movement.
 */
export interface IAITierObjectiveParameters {
  readonly objectiveAwareness: boolean;
  readonly objectiveSeekingWeight: number;
  readonly objectiveHoldWeight: number;
}

/**
 * Advanced-systems parameter block — the A4 contribution to a tier's
 * parameter set (`add-ai-advanced-systems` design D5).
 *
 *   - `advancedSystems`: when `false`, the jump-tactics, ECM-awareness, and
 *     vision advisors are never consulted — `BotPlayer.selectMovementType`
 *     keeps the flat-probability jump roll and `scoreMove`'s three advanced
 *     terms contribute nothing, so `Green`/`Regular`/`Veteran` reproduce
 *     pre-A4 behavior byte-for-byte. When `true`, the bot evaluates jump
 *     moves with `AIJumpTactics`, avoids hostile ECM bubbles, and values
 *     scouting / LOS-breaking.
 *   - `jumpTacticsWeight`: multiplier on the jump-tactics term in
 *     `scoreMove` (applied to jump moves only). `0` disables it.
 *   - `ecmAvoidanceWeight`: scales the penalty for a destination inside a
 *     hostile ECM bubble. `0` disables ECM avoidance.
 *   - `ecmCoverageWeight`: scales the bonus for an ECM/probe carrier whose
 *     destination covers lancemates or counters an enemy ECM source. `0`
 *     disables ECM-coverage rewards.
 *   - `visionWeight`: scales the scouting and LOS-break bonuses from
 *     `AIVisionAdvisor`. `0` disables vision awareness.
 */
export interface IAITierAdvancedParameters {
  readonly advancedSystems: boolean;
  readonly jumpTacticsWeight: number;
  readonly ecmAvoidanceWeight: number;
  readonly ecmCoverageWeight: number;
  readonly visionWeight: number;
}

/**
 * Full parameter set for one difficulty tier.
 *
 * Open by design: A1 defines `tier` and `movement`. A2 ADDs the optional
 * `resource` block. A3a ADDs the optional `coordination` block. A3b ADDs the
 * optional `objective` block. A4 ADDs the optional `advanced` block below,
 * without touching the fields declared above it.
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
  /**
   * A3b objective-awareness block. Optional so a tier record built before
   * A3b (or a hand-rolled test fixture) still type-checks; every entry in
   * `AI_TIER_REGISTRY` populates it. Resolve it through
   * `resolveObjectiveParameters` to get the inert default when absent.
   */
  readonly objective?: IAITierObjectiveParameters;
  /**
   * A4 advanced-systems block. Optional so a tier record built before A4
   * (or a hand-rolled test fixture) still type-checks; every entry in
   * `AI_TIER_REGISTRY` populates it. Resolve it through
   * `resolveAdvancedParameters` to get the inert default when absent.
   */
  readonly advanced?: IAITierAdvancedParameters;
}
