import type {
  IComponentDestroyedPayload,
  IGameSession,
} from '@/types/gameplay';

import { GameEventType, MovementType } from '@/types/gameplay';

import type { IMovementEvent } from './AIPlayerEvents';
import type { IAIUnitState } from './types';

export const VITAL_COMPONENT_TYPES = new Set(['cockpit', 'engine', 'gyro']);

export function createVoluntaryGoProneEvent(
  unit: IAIUnitState,
): IMovementEvent {
  return {
    type: GameEventType.MovementDeclared,
    payload: {
      unitId: unit.unitId,
      from: unit.position,
      to: unit.position,
      facing: unit.facing,
      movementType: MovementType.Stationary,
      mpUsed: 1,
      heatGenerated: 0,
      steps: [
        {
          kind: 'goProne',
          index: 0,
          at: { q: unit.position.q, r: unit.position.r },
          mpCost: 1,
        },
      ],
    },
  };
}

export function computeRetreatSignals(
  unitId: string,
  session: IGameSession,
  currentStructure: Readonly<Record<string, number>>,
  startingStructure: Readonly<Record<string, number>>,
): { ratio: number; hasVitalCrit: boolean } {
  let sumStarting = 0;
  let sumCurrent = 0;
  for (const [location, starting] of Object.entries(startingStructure)) {
    if (typeof starting !== 'number') continue;
    sumStarting += starting;
    const current = currentStructure[location];
    sumCurrent += typeof current === 'number' ? current : 0;
  }
  const ratio = sumStarting > 0 ? (sumStarting - sumCurrent) / sumStarting : 0;

  let hasVitalCrit = false;
  for (const event of session.events) {
    if (event.type !== GameEventType.ComponentDestroyed) continue;
    const payload = event.payload as IComponentDestroyedPayload;
    if (payload.unitId !== unitId) continue;
    if (VITAL_COMPONENT_TYPES.has(payload.componentType)) {
      hasVitalCrit = true;
      break;
    }
  }

  return { ratio, hasVitalCrit };
}

export function computeMovementHeat(
  movementType: MovementType,
  hexesMoved: number,
): number {
  switch (movementType) {
    case MovementType.Stationary:
      return 0;
    case MovementType.Walk:
      return 1;
    case MovementType.Run:
      return 2;
    case MovementType.Sprint:
      return 3;
    case MovementType.Evade:
      return 4;
    case MovementType.Jump:
      return Math.max(hexesMoved, 3);
    default:
      return 0;
  }
}
