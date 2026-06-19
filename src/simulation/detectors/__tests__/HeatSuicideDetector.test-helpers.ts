/**
 * HeatSuicideDetector Tests
 *
 * Comprehensive test suite covering:
 * - Heat threshold detection
 * - Last-ditch exemption (3:1 outnumbering)
 * - Anomaly structure and metadata
 * - Edge cases and deduplication
 */

import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameEvent,
  type IHeatPayload,
} from '@/types/gameplay/GameSessionInterfaces';

import { HeatSuicideDetector, type BattleState } from '../HeatSuicideDetector';

// =============================================================================
// Test Fixtures
// =============================================================================

export const createHeatEvent = (
  gameId: string,
  turn: number,
  unitId: string,
  heat: number,
  sequence: number = 1,
): IGameEvent => ({
  id: `event-${sequence}`,
  gameId,
  sequence,
  timestamp: new Date().toISOString(),
  type: GameEventType.HeatGenerated,
  turn,
  phase: GamePhase.Heat,
  actorId: unitId,
  payload: {
    unitId,
    amount: heat,
    source: 'weapons',
    newTotal: heat,
  } as IHeatPayload,
});

export const createDestroyedEvent = (
  gameId: string,
  turn: number,
  unitId: string,
  sequence: number = 1,
): IGameEvent => ({
  id: `event-destroyed-${sequence}`,
  gameId,
  sequence,
  timestamp: new Date().toISOString(),
  type: GameEventType.UnitDestroyed,
  turn,
  phase: GamePhase.End,
  payload: {
    unitId,
    cause: 'damage' as const,
  },
});

export const createBattleState = (
  units: Array<{ id: string; name: string; side: GameSide }>,
): BattleState => ({
  units: units.map((u) => ({
    id: u.id,
    name: u.name,
    side: u.side,
  })),
});

// =============================================================================
// Tests
// =============================================================================

export interface HeatSuicideDetectorTestContext {
  readonly getDetector: () => HeatSuicideDetector;
}

export { HeatSuicideDetector, GameEventType, GamePhase, GameSide };
export type { BattleState, IGameEvent };
