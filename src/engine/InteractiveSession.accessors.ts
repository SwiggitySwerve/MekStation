import type {
  IGameSession,
  IGameState,
} from '@/types/gameplay/GameSessionInterfaces';
import type {
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';
import type { IIndirectFireResolution } from '@/types/gameplay/IndirectFireInterfaces';

import { resolveRuntimeMovementCapability } from '@/utils/gameplay/movement';

import type { IInteractiveSessionRuntimeContext } from './InteractiveSession.runtime';
import type { IAvailableActions } from './types';

import { computeIndirectFireContext as computeIndirectFireContextImpl } from './InteractiveSession.indirectFire';
import { getAvailableActionsForState } from './InteractiveSession.queries';

export function getInteractiveSessionState(
  context: IInteractiveSessionRuntimeContext,
): IGameState {
  return context.getSession().currentState;
}

export function getInteractiveSessionSession(
  context: IInteractiveSessionRuntimeContext,
): IGameSession {
  return context.getSession();
}

export function getInteractiveSessionMovementCapability(
  context: IInteractiveSessionRuntimeContext,
  unitId: string,
): IMovementCapability | null {
  const capability = context.movementByUnit.get(unitId);
  if (!capability) return null;
  const unit = context.getSession().currentState.units[unitId];
  return unit
    ? (resolveRuntimeMovementCapability(unit, capability) ?? capability)
    : capability;
}

export function getInteractiveSessionGrid(
  context: IInteractiveSessionRuntimeContext,
): IHexGrid {
  return context.grid;
}

export function getInteractiveSessionAvailableActions(
  context: IInteractiveSessionRuntimeContext,
  unitId: string,
): IAvailableActions {
  return getAvailableActionsForState(
    context.getSession().currentState,
    unitId,
    context.weaponsByUnit,
  );
}

export function computeInteractiveSessionIndirectFireContext(
  context: IInteractiveSessionRuntimeContext,
  attackerId: string,
  weaponId: string,
  targetHex: IHexCoordinate,
): IIndirectFireResolution {
  return computeIndirectFireContextImpl(
    attackerId,
    weaponId,
    targetHex,
    context.getSession().currentState,
    context.grid,
    undefined,
    undefined,
    context.getSession().config.optionalRules,
  );
}
