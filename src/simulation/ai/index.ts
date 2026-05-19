export { MoveAI } from './MoveAI';
export type { IScoreMoveContext } from './MoveAI';
export { AttackAI } from './AttackAI';
export { BotPlayer } from './BotPlayer';
export type { BotGameEvent, IMovementEvent, IAttackEvent } from './BotPlayer';
export { DEFAULT_BEHAVIOR } from './types';
export type {
  IBotBehavior,
  IMove,
  IWeapon,
  IAIUnitState,
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
  getTierParameters,
  resolveTierParameters,
} from './AITierRegistry';
export type {
  AITierName,
  IAITierParameters,
  IAITierMovementParameters,
} from './AITierRegistry';
