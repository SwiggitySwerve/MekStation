export {
  createGameSession,
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
