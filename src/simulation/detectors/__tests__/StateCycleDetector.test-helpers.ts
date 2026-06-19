/**
 * StateCycleDetector Test Helpers
 *
 * Comprehensive test suite covering:
 * - State cycle detection and threshold
 * - Snapshot comparison (armor, structure, heat)
 * - Cycle counter and anomaly triggering
 * - Anomaly structure and metadata
 * - Edge cases and boundary conditions
 */

import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameEvent,
  type IDamageAppliedPayload,
  type IHeatPayload,
} from '@/types/gameplay/GameSessionInterfaces';
import { MovementType, Facing } from '@/types/gameplay/HexGridInterfaces';

import { StateCycleDetector, type BattleState } from '../StateCycleDetector';

// =============================================================================
// Test Fixtures
// =============================================================================

export interface DamageEventFixture {
  readonly gameId: string;
  readonly turn: number;
  readonly unitId: string;
  readonly location: string;
  readonly armorRemaining: number;
  readonly structureRemaining: number;
  readonly sequence?: number;
}

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

export const createDamageEvent = ({
  gameId,
  turn,
  unitId,
  location,
  armorRemaining,
  structureRemaining,
  sequence = 1,
}: DamageEventFixture): IGameEvent => ({
  id: `event-damage-${sequence}`,
  gameId,
  sequence,
  timestamp: new Date().toISOString(),
  type: GameEventType.DamageApplied,
  turn,
  phase: GamePhase.WeaponAttack,
  actorId: unitId,
  payload: {
    unitId,
    location,
    damage: 5,
    armorRemaining,
    structureRemaining,
    locationDestroyed: false,
  } as IDamageAppliedPayload,
});

export const createHeatEvent = (
  gameId: string,
  turn: number,
  unitId: string,
  heat: number,
  sequence: number = 1,
): IGameEvent => ({
  id: `event-heat-${sequence}`,
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

export interface StateCycleDetectorTestContext {
  readonly getDetector: () => StateCycleDetector;
}

export {
  StateCycleDetector,
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  MovementType,
};
export type { BattleState, IGameEvent, IDamageAppliedPayload, IHeatPayload };
