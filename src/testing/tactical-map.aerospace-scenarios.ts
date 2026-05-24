import type { IGameState, IUnitGameState, IUnitToken } from '@/types/gameplay';

import { unitStateToToken } from '@/lib/gameplay/unitStateToToken';
import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
} from '@/types/gameplay';
import { createAerospaceCombatState } from '@/utils/gameplay/aerospace/state';

import { tacticalMapTokens } from './tactical-map.fixtures';

const aerospaceUnitState: IUnitGameState = {
  id: 'aero-attacker',
  side: GameSide.Player,
  position: { q: 0, r: 0 },
  facing: Facing.Northeast,
  heat: 0,
  movementThisTurn: MovementType.Stationary,
  hexesMovedThisTurn: 0,
  armor: {},
  structure: {},
  destroyedLocations: [],
  destroyedEquipment: [],
  ammo: {},
  pilotWounds: 0,
  pilotConscious: true,
  destroyed: false,
  lockState: LockState.Pending,
  combatState: {
    kind: 'aero',
    state: createAerospaceCombatState({
      maxSI: 8,
      armorByArc: { nose: 20, leftWing: 15, rightWing: 15, aft: 10 },
      heatSinks: 12,
      fuelPoints: 400,
      safeThrust: 5,
      maxThrust: 8,
      altitude: 4,
      currentVelocity: 7,
      nextVelocity: 7,
      airborneState: 'airborne',
    }),
  },
};

const aerospaceToken = unitStateToToken(
  aerospaceUnitState.id,
  aerospaceUnitState,
  {
    name: 'Seydlitz SYD-21',
    side: GameSide.Player,
  },
);

export const tacticalMapAerospaceTokens: readonly IUnitToken[] = [
  aerospaceToken,
  ...tacticalMapTokens
    .filter((token) => token.unitId !== 'attacker')
    .map((token) =>
      token.unitId === 'occluded'
        ? { ...token, position: { q: 2, r: -1 } }
        : token,
    ),
];

export const tacticalMapAerospaceCombatState: IGameState = {
  gameId: 'tactical-map-e2e',
  status: GameStatus.Active,
  turn: 1,
  phase: GamePhase.Movement,
  activationIndex: 0,
  turnEvents: [],
  units: { [aerospaceUnitState.id]: aerospaceUnitState },
};
