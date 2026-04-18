import type { IWeapon, IAIUnitState } from '@/simulation/ai/types';
import type { IUnitGameState } from '@/types/gameplay/GameSessionInterfaces';
import type {
  IHex,
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';

import type { IAdaptedUnit } from './types';

export function createMinimalGrid(radius: number): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) {
        const key = `${q},${r}`;
        hexes.set(key, {
          coord: { q, r },
          occupantId: null,
          terrain: 'clear',
          elevation: 0,
        });
      }
    }
  }
  return { config: { radius }, hexes };
}

export function toAIUnitState(
  unit: IUnitGameState,
  weapons: readonly IWeapon[],
  gunnery: number,
): IAIUnitState {
  return {
    unitId: unit.id,
    position: unit.position,
    facing: unit.facing,
    heat: unit.heat,
    weapons,
    ammo: unit.ammo,
    destroyed: unit.destroyed,
    gunnery,
    movementType: unit.movementThisTurn,
    hexesMoved: unit.hexesMovedThisTurn,
    // Per `wire-bot-ai-helpers-and-capstone`: propagate retreat latch
    // through to the AI so RetreatAI helpers can read it without a
    // round-trip through the session lookup.
    isRetreating: unit.isRetreating,
    retreatTargetEdge: unit.retreatTargetEdge,
  };
}

export function toMovementCapability(
  adapted: IAdaptedUnit,
): IMovementCapability {
  return {
    walkMP: adapted.walkMP,
    runMP: adapted.runMP,
    jumpMP: adapted.jumpMP,
  };
}
