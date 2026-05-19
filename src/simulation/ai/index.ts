export { MoveAI } from './MoveAI';
export type { IScoreMoveContext } from './MoveAI';
export { AttackAI, scoreTarget, structuralExposure } from './AttackAI';
export type { IFireListEntry } from './AttackAI';
export { BotPlayer } from './BotPlayer';
export type { BotGameEvent, IMovementEvent, IAttackEvent } from './BotPlayer';
export { DEFAULT_BEHAVIOR } from './types';
export type {
  IBotBehavior,
  IMove,
  IWeapon,
  IAIUnitState,
  IAIStructureState,
  IWeaponFiringMode,
  IWeaponFiringModes,
  WeaponModeKind,
  RetreatEdge,
} from './types';

// Per `add-ai-terrain-aware-movement`: the frozen terrain-cost pathfinder
// API (design D2) and the AI Difficulty Tier Registry (design D3). Wave 2
// changes (A2/A3a/A3b/A4) import these.
export { findPath, findAllPaths } from './AITerrainPathfinder';
export type { IAIPath, IAIPathfindRequest } from './AITerrainPathfinder';
export {
  AI_TIER_REGISTRY,
  DEFAULT_TIER_NAME,
  INERT_RESOURCE_PARAMETERS,
  INERT_COORDINATION_PARAMETERS,
  INERT_OBJECTIVE_PARAMETERS,
  getTierParameters,
  resolveTierParameters,
  resolveResourceParameters,
  resolveCoordinationParameters,
  resolveObjectiveParameters,
} from './AITierRegistry';
export type {
  AITierName,
  IAITierParameters,
  IAITierMovementParameters,
  IAITierResourceParameters,
  IAITierCoordinationParameters,
  IAITierObjectiveParameters,
} from './AITierRegistry';

// Per `add-ai-resource-planning` (A2): the resource-planning modules —
// multi-turn heat projection, ammo-runway projection, weapon-mode selection.
export {
  projectHeat,
  effectiveHeatBudget,
  planEffectiveThreshold,
  SHUTDOWN_RISK_HEAT,
} from './AIHeatPlanner';
export type { IHeatProjection } from './AIHeatPlanner';
export {
  projectAmmoRunway,
  computeAmmoRunway,
  SCARCE_RUNWAY_TURNS,
  MIN_CONSERVATION_WEIGHT,
} from './AIAmmoRunway';
export type { IAmmoRunway } from './AIAmmoRunway';
export { selectWeaponMode, collectWeaponModes } from './AIWeaponModeSelector';
export type {
  IWeaponModeSelection,
  IWeaponModeContext,
} from './AIWeaponModeSelector';

// Per `add-ai-coordination-tactics` (A3a): the lance-coordination modules —
// multi-unit threat aggregation, focus-fire assignment, and the per-lance
// turn plan. The `Elite` tier consumes these; lower tiers leave them inert.
export { buildThreatMap } from './AIThreatMap';
export type { IThreatEntry } from './AIThreatMap';
export {
  coordinateFire,
  expectedDamage,
  remainingDurability,
} from './AIFireCoordinator';
export type { IFireAssignment } from './AIFireCoordinator';
export { planTurn, computeLanceCentroid } from './AILancePlanner';
export type {
  ILanceTurnPlan,
  IAILanceContext,
  IObjectivePlanInput,
} from './AILancePlanner';

// Per `add-ai-objective-awareness` (A3b): the objective planner — reads the
// scenario objective map, classifies markers, and assigns objective roles.
// Only the `Elite` tier consumes this; lower tiers leave it inert.
export {
  classifyObjectives,
  assignObjectiveRoles,
  planObjectives,
} from './AIObjectivePlanner';
export type {
  ObjectiveIntent,
  ObjectiveRole,
  ObjectiveCostFn,
  IClassifiedObjective,
  IObjectiveLancePlan,
} from './AIObjectivePlanner';
