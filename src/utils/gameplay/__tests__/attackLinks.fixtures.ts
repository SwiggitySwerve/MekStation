import {
  Facing,
  GameSide,
  type IGameState,
  type IUnitGameState,
} from '@/types/gameplay';

import {
  createInitialGameState,
  createInitialUnitState,
} from '../gameState/initialization';

export function linkUnit(
  id: string,
  patch: Partial<IUnitGameState> = {},
): IUnitGameState {
  return {
    ...createInitialUnitState(
      {
        id,
        name: id,
        unitRef: 'test',
        pilotRef: 'pilot',
        side: GameSide.Player,
        gunnery: 4,
        piloting: 5,
      },
      { q: 0, r: 0 },
      Facing.North,
    ),
    ...patch,
  };
}

export function linkState(...units: IUnitGameState[]): IGameState {
  return {
    ...createInitialGameState('c9'),
    units: Object.fromEntries(units.map((unit) => [unit.id, unit])),
  };
}

export function linkedPair(): IGameState {
  return linkState(
    linkUnit('a', {
      grappledUnitId: 'b',
      isGrappleAttacker: true,
      grappledThisRound: true,
      grappleSide: 'both',
      isChainWhipGrappled: true,
    }),
    linkUnit('b', {
      grappledUnitId: 'a',
      isGrappleAttacker: false,
      grappledThisRound: true,
      grappleSide: 'both',
      isChainWhipGrappled: true,
    }),
    linkUnit('unrelated'),
  );
}

export function swarmSquad(hostId: string): IUnitGameState['combatState'] {
  return {
    kind: 'squad',
    state: {
      unitId: 'squad',
      squadSize: 0,
      troopers: [],
      swarmingUnitId: hostId,
      legAttackCommitted: false,
      mimeticActiveThisTurn: true,
      stealthKind: 'none',
      hasMagneticClamp: true,
      hasVibroClaws: false,
      vibroClawCount: 0,
      destroyed: false,
    },
  };
}
