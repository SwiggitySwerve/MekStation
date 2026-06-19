/**
 * LongGameDetector Tests
 *
 * Comprehensive test suite covering:
 * - Threshold detection and anomaly creation
 * - Battle-level anomaly structure (turn=null, unitId=null)
 * - Single anomaly per battle
 * - Edge cases and boundary conditions
 */

import {
  GameEventType,
  GamePhase,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import { LongGameDetector } from '../LongGameDetector';

// =============================================================================
// Test Fixtures
// =============================================================================

export const createGameEvent = (
  gameId: string,
  turn: number,
  type: GameEventType = GameEventType.TurnEnded,
  sequence: number = 1,
): IGameEvent => ({
  id: `event-${sequence}`,
  gameId,
  sequence,
  timestamp: new Date().toISOString(),
  type,
  turn,
  phase: GamePhase.End,
  payload: {},
});

export const createTurnEndedEvent = (
  gameId: string,
  turn: number,
  sequence: number = 1,
): IGameEvent =>
  createGameEvent(gameId, turn, GameEventType.TurnEnded, sequence);

export const createDamageEvent = (
  gameId: string,
  turn: number,
  sequence: number = 1,
): IGameEvent =>
  createGameEvent(gameId, turn, GameEventType.DamageApplied, sequence);

// =============================================================================
// Tests
// =============================================================================

export interface LongGameDetectorTestContext {
  readonly getDetector: () => LongGameDetector;
}

export { LongGameDetector, GameEventType, GamePhase };
export type { IGameEvent };
