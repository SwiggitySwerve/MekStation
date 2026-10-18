import type { AITierName, IAITierParameters } from './AITierParameters';

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
      // A3b: fully inert — `objectiveAwareness: false` means the objective
      // planner is never consulted; the bot is blind to the objective map
      // and plays every scenario as pure attrition (`Destroy`).
      objective: {
        objectiveAwareness: false,
        objectiveSeekingWeight: 0,
        objectiveHoldWeight: 0,
      },
      // A4: fully inert — `advancedSystems: false` means the jump-tactics
      // gate, ECM advisor, and vision advisor are never consulted; the bot
      // keeps the flat 20% jump roll and the three advanced move terms
      // contribute nothing.
      advanced: {
        advancedSystems: false,
        jumpTacticsWeight: 0,
        ecmAvoidanceWeight: 0,
        ecmCoverageWeight: 0,
        visionWeight: 0,
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
      // A3b: fully inert — see `Green`. The determinism golden traces are
      // pinned to this tier, so the bot must stay blind to the objective map.
      objective: {
        objectiveAwareness: false,
        objectiveSeekingWeight: 0,
        objectiveHoldWeight: 0,
      },
      // A4: fully inert — see `Green`. The determinism golden traces are
      // pinned to this tier, so the jump roll must stay the flat 20% draw
      // and every A4 weight must stay zero here.
      advanced: {
        advancedSystems: false,
        jumpTacticsWeight: 0,
        ecmAvoidanceWeight: 0,
        ecmCoverageWeight: 0,
        visionWeight: 0,
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
      // A3b: fully inert. Per `add-ai-objective-awareness` design D5, the
      // `Veteran` tier plays every scenario as `Destroy` — `objectiveAwareness`
      // is `false`, so the objective planner is never consulted and the
      // objective movement terms contribute nothing. `Elite` is the only tier
      // that reads the objective map.
      objective: {
        objectiveAwareness: false,
        objectiveSeekingWeight: 0,
        objectiveHoldWeight: 0,
      },
      // A4: fully inert. Per `add-ai-advanced-systems` design D5, the
      // `Veteran` tier stays exactly A1+A2 depth — `advancedSystems` is
      // `false` so the jump-tactics gate, ECM advisor, and vision advisor
      // are never consulted and `selectMovementType` keeps the flat 20%
      // jump roll. `Elite` is the only tier that runs the advanced systems.
      advanced: {
        advancedSystems: false,
        jumpTacticsWeight: 0,
        ecmAvoidanceWeight: 0,
        ecmCoverageWeight: 0,
        visionWeight: 0,
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
      // A3b: objective awareness active — `Elite` is the only tier that
      // reads the scenario objective map and plays the scenario. Weight
      // magnitudes sit relative to the existing `scoreMove` scale (LOS
      // `+1000`, forward-arc `+500`, per-hex distance `-100`):
      //   - `objectiveSeekingWeight: 120` is applied per hex of pathfinder
      //     distance reduced toward a `take` marker, so a unit closing on
      //     its objective outscores backing off (which pays only the
      //     `-100`/hex distance term) — yet a single LOS opportunity can
      //     still tilt a tie. A destination ON the marker earns a large
      //     flat bonus (see `MoveAI.objectiveScore`) that dominates.
      //   - `objectiveHoldWeight: 800` keeps a hold-role unit planted on
      //     its marker: staying on it outscores chasing an enemy off it,
      //     since abandoning the marker forfeits the whole term.
      objective: {
        objectiveAwareness: true,
        objectiveSeekingWeight: 120,
        objectiveHoldWeight: 800,
      },
      // A4: advanced systems active — `Elite` is the only tier that runs the
      // jump-tactics gate, the ECM advisor, and the vision advisor. Weight
      // magnitudes sit relative to the existing `scoreMove` scale (LOS
      // `+1000`, forward-arc `+500`, per-hex distance `-100`):
      //   - `jumpTacticsWeight: 1` multiplies the raw `AIJumpTactics` score,
      //     whose terms (terrain-clearing, elevation, charge-escape) are
      //     already sized in the hundreds so a purposeful jump competes
      //     with — without dwarfing — the LOS / forward-arc instincts.
      //   - `ecmAvoidanceWeight: 350` puts a hostile-ECM hex below an
      //     otherwise-equal clean hex by forward-arc scale: meaningful, but
      //     a strong shot can still pull the bot into the bubble.
      //   - `ecmCoverageWeight: 250` rewards an ECM/probe carrier for
      //     covering the lance — below the avoidance weight so a carrier
      //     does not chase coverage into a worse tactical hex.
      //   - `visionWeight: 300` makes scouting an unspotted enemy a
      //     forward-arc-scale draw; the LOS-break share is a fraction of it
      //     (see `AIVisionAdvisor`) so it only breaks ties.
      advanced: {
        advancedSystems: true,
        jumpTacticsWeight: 1,
        ecmAvoidanceWeight: 350,
        ecmCoverageWeight: 250,
        visionWeight: 300,
      },
    },
  };
