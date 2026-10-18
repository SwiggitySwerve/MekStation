import type {
  IAITierResourceParameters,
  IAITierCoordinationParameters,
  IAITierObjectiveParameters,
  IAITierAdvancedParameters,
  AITierName,
} from './AITierParameters';

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
 * The inert objective block — every A3b behavior disabled. Used by
 * `resolveObjectiveParameters` when a tier record predates A3b and as the
 * literal value `Green`/`Regular`/`Veteran` carry so the objective planner
 * is never consulted and those tiers play every scenario as `Destroy`.
 */
export const INERT_OBJECTIVE_PARAMETERS: IAITierObjectiveParameters = {
  objectiveAwareness: false,
  objectiveSeekingWeight: 0,
  objectiveHoldWeight: 0,
};

/**
 * The inert advanced block — every A4 behavior disabled. Used by
 * `resolveAdvancedParameters` when a tier record predates A4 and as the
 * literal value `Green`/`Regular`/`Veteran` carry so the jump-tactics gate,
 * ECM advisor, and vision advisor are never consulted and those tiers keep
 * the flat-probability jump roll.
 */
export const INERT_ADVANCED_PARAMETERS: IAITierAdvancedParameters = {
  advancedSystems: false,
  jumpTacticsWeight: 0,
  ecmAvoidanceWeight: 0,
  ecmCoverageWeight: 0,
  visionWeight: 0,
};

/** The tier used when an `IBotBehavior` does not pin one explicitly. */
export const DEFAULT_TIER_NAME: AITierName = 'Regular';
