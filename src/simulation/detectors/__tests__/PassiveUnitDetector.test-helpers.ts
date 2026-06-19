/**
 * PassiveUnitDetector Test Helpers
 *
 * Comprehensive test suite covering:
 * - Inactivity detection and counter tracking
 * - Counter reset on movement and attack
 * - Destroyed/shutdown unit exemptions
 * - Anomaly structure and metadata
 * - Edge cases and boundary conditions
 */

import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import { PassiveUnitDetector, type BattleState } from '../PassiveUnitDetector';

// =============================================================================
// Test Fixtures
// =============================================================================

export const createMovementEvent = (
  gameId: string,
  turn: number,
  unitId: string,
  sequence: number = 1,
): IGameEvent => ({
  id: `event-movement-${sequence}`,
  gameId,
  sequence,
  timestamp: new Date().toISOString(),
  type: GameEventType.MovementDeclared,
  turn,
  phase: GamePhase.Movement,
  actorId: unitId,
  payload: {
    unitId,
  },
});

export const createAttackEvent = (
  gameId: string,
  turn: number,
  unitId: string,
  sequence: number = 1,
): IGameEvent => ({
  id: `event-attack-${sequence}`,
  gameId,
  sequence,
  timestamp: new Date().toISOString(),
  type: GameEventType.AttackResolved,
  turn,
  phase: GamePhase.WeaponAttack,
  actorId: unitId,
  payload: {
    attackerId: unitId,
    targetId: 'target-unit',
    weaponId: 'weapon-1',
    roll: 10,
    toHitNumber: 8,
    hit: true,
    damage: 15,
  },
});

export const createTurnEndedEvent = (
  gameId: string,
  turn: number,
  sequence: number = 1,
): IGameEvent => ({
  id: `event-turn-ended-${sequence}`,
  gameId,
  sequence,
  timestamp: new Date().toISOString(),
  type: GameEventType.TurnEnded,
  turn,
  phase: GamePhase.End,
  payload: {},
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

export interface PassiveUnitDetectorTestContext {
  readonly getDetector: () => PassiveUnitDetector;
}

export { PassiveUnitDetector, GameEventType, GamePhase, GameSide };
export type { BattleState, IGameEvent };
