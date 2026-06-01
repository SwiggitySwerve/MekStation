export {
  createGameSession,
  hydrateGameSessionFromEvents,
  startGame,
  endGame,
  appendEvent,
  getEventsForTurn,
  getEventsForPhase,
  getNextPhase,
  advancePhase,
  canAdvancePhase,
  roll2d6,
  rollInitiative,
  declareMovement,
  lockMovement,
  declareAttack,
  lockAttack,
  requestSpot,
  type ICreateGameSessionOptions,
} from './gameSessionCore';

export { buildGameSessionFromLobbyState } from './lobbySessionBuilder';

export {
  resolveAttack,
  resolveAllAttacks,
} from './gameSessionAttackResolution';

export {
  attemptStandUp,
  checkAndQueueDamagePSRs,
  resolvePendingPSRs,
} from './gameSessionPSR';

export { goProne } from './gameSessionProne';

export { activateMovementEnhancement } from './gameSessionMovementEnhancements';

export {
  torsoTwist,
  validateTorsoTwist,
  type TorsoTwistLegality,
  type TorsoTwistLegalityReason,
} from './gameSessionTorsoTwist';

export { resolveHeatPhase } from './gameSessionHeat';

export {
  declarePhysicalAttack,
  resolveAllPhysicalAttacks,
  type IPhysicalAttackContext,
} from './gameSessionPhysical';

export {
  replayToSequence,
  replayToTurn,
  generateGameLog,
} from './gameSessionReplay';

export type { DiceRoller } from './diceTypes';
