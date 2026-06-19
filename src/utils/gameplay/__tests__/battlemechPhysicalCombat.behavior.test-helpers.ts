import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  type IComponentDamageState,
  type IDamageAppliedPayload,
  type IGameSession,
  type IGameUnit,
  type IPhysicalAttackDeclaredPayload,
  type IPilotHitPayload,
  type IPhysicalAttackResolvedPayload,
  type IPSRTriggeredPayload,
  type IUnitDestroyedPayload,
  type IUnitFellPayload,
  type IUnitGameState,
  LockState,
  MovementType,
  PSRTrigger,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import type { DiceRoller } from '../diceTypes';

import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '../gameSession';
import {
  declarePhysicalAttack,
  resolveAllPhysicalAttacks,
  type IPhysicalAttackContext,
} from '../gameSessionPhysical';
import { resolvePendingPSRs } from '../gameSessionPSR';
import { createHexGrid, placeUnit } from '../hexGrid';
import {
  chooseBestPhysicalAttack,
  getEligiblePhysicalAttacks,
  type PhysicalAttackType,
} from '../physicalAttacks';

export const DEFAULT_COMPONENT_DAMAGE: IComponentDamageState = {
  engineHits: 0,
  gyroHits: 0,
  sensorHits: 0,
  lifeSupport: 0,
  cockpitHit: false,
  actuators: {},
  weaponsDestroyed: [],
  heatSinksDestroyed: 0,
  jumpJetsDestroyed: 0,
};

export const STANDARD_ARMOR = {
  head: 9,
  center_torso: 31,
  left_torso: 22,
  right_torso: 22,
  left_arm: 17,
  right_arm: 17,
  left_leg: 21,
  right_leg: 21,
};

export const STANDARD_STRUCTURE = {
  head: 3,
  center_torso: 21,
  left_torso: 14,
  right_torso: 14,
  left_arm: 11,
  right_arm: 11,
  left_leg: 14,
  right_leg: 14,
};

export function unitState(
  id: string,
  side: GameSide,
  position = { q: 0, r: 0 },
  overrides: Partial<IUnitGameState> = {},
): IUnitGameState {
  return {
    id,
    side,
    position,
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    gunnery: 4,
    piloting: 5,
    armor: {},
    structure: {},
    startingInternalStructure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    damageThisPhase: 0,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    prone: false,
    shutdown: false,
    ammoState: {},
    pendingPSRs: [],
    weaponsFiredThisTurn: [],
    jammedWeapons: [],
    narcedBy: [],
    tagDesignated: false,
    isRetreating: false,
    hasRetreated: false,
    ...overrides,
  };
}

export function gameUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'attacker',
      name: 'Physical Attacker',
      side: GameSide.Player,
      unitRef: 'attacker-ref',
      pilotRef: 'attacker-pilot',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'target',
      name: 'Physical Target',
      side: GameSide.Opponent,
      unitRef: 'target-ref',
      pilotRef: 'target-pilot',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

export function physicalPhaseSession(
  extraUnits: readonly IGameUnit[] = [],
): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 10,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    [...gameUnits(), ...extraUnits],
    { id: 'physical-validation' },
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player, scriptedD6([6, 1, 6, 1]));
  session = advancePhase(session);
  session = advancePhase(session);
  session = advancePhase(session);
  expect(session.currentState.phase).toBe(GamePhase.PhysicalAttack);
  return session;
}

export function scriptedD6(values: readonly number[]) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

export function scriptedDice(firstDice: readonly number[]): DiceRoller {
  let i = 0;
  return () => {
    const first = firstDice[Math.min(i++, firstDice.length - 1)];
    return {
      dice: [first, 1],
      total: first + 1,
      isSnakeEyes: first === 1,
      isBoxcars: first === 6,
    };
  };
}

export function physicalContext(
  overrides: Partial<IPhysicalAttackContext> = {},
): IPhysicalAttackContext {
  return {
    attackerTonnage: 80,
    targetTonnage: 75,
    pilotingSkill: 5,
    ...overrides,
  };
}

export function adjacentPhysicalGrid() {
  let grid = createHexGrid({ radius: 3 });
  grid = placeUnit(grid, { q: 0, r: 0 }, 'attacker');
  grid = placeUnit(grid, { q: 1, r: 0 }, 'target');
  return grid;
}

export function sameHexPhysicalGrid(terrain = 'clear') {
  let grid = createHexGrid({ radius: 3 });
  grid = placeUnit(grid, { q: 0, r: 0 }, 'attacker');
  const hexes = new Map(grid.hexes);
  const hex = hexes.get('0,0');
  if (hex) {
    hexes.set('0,0', { ...hex, terrain });
  }
  return { ...grid, hexes };
}

export function breakGrapplePhysicalGrid() {
  const grid = sameHexPhysicalGrid();
  const hexes = new Map(grid.hexes);
  const dangerousHex = hexes.get('1,0');
  if (dangerousHex) {
    hexes.set('1,0', { ...dangerousHex, terrain: 'magma' });
  }
  return { ...grid, hexes };
}

export function blockedDfaDisplacementGrid() {
  let grid = adjacentPhysicalGrid();
  [
    { q: 1, r: 1 },
    { q: 0, r: 1 },
    { q: 2, r: 0 },
    { q: 1, r: -1 },
    { q: 2, r: -1 },
  ].forEach((coord, index) => {
    grid = placeUnit(grid, coord, `blocker-${index}`);
  });
  const hexes = new Map(grid.hexes);
  for (const key of ['1,1', '0,1', '2,0', '0,0', '1,-1', '2,-1']) {
    const hex = hexes.get(key);
    if (hex) {
      hexes.set(key, { ...hex, terrain: 'impassable' });
    }
  }
  grid = { ...grid, hexes };
  return grid;
}

export function blockedChargeDisplacementGrid() {
  let grid = placeUnit(
    adjacentPhysicalGrid(),
    { q: 1, r: 1 },
    'charge-blocker',
  );
  grid = placeUnit(grid, { q: 1, r: 2 }, 'charge-domino-blocker');
  return grid;
}

export function dominoChargeDisplacementGrid() {
  return placeUnit(adjacentPhysicalGrid(), { q: 1, r: 1 }, 'domino-blocker');
}

export function friendlyDfaMissDisplacementGrid() {
  return placeUnit(adjacentPhysicalGrid(), { q: 1, r: 1 }, 'target-friend');
}

export function elevatedChargeDisplacementGrid() {
  const grid = adjacentPhysicalGrid();
  const hexes = new Map(grid.hexes);
  const destination = hexes.get('1,1');
  if (destination) {
    hexes.set('1,1', { ...destination, elevation: 3 });
  }
  return { ...grid, hexes };
}

export function prohibitedChargeDisplacementGrid(
  terrain: string = 'impassable',
) {
  const grid = adjacentPhysicalGrid();
  const hexes = new Map(grid.hexes);
  const destination = hexes.get('1,1');
  if (destination) {
    hexes.set('1,1', { ...destination, terrain });
  }
  return { ...grid, hexes };
}

export function withUnitState(
  session: IGameSession,
  unitId: string,
  overrides: Partial<IUnitGameState>,
): IGameSession {
  return {
    ...session,
    currentState: {
      ...session.currentState,
      units: {
        ...session.currentState.units,
        [unitId]: {
          ...session.currentState.units[unitId],
          ...overrides,
        },
      },
    },
  };
}

export function withPhysicalPositions(
  session: IGameSession,
  attackerOverrides: Partial<IUnitGameState> = {},
  targetOverrides: Partial<IUnitGameState> = {},
): IGameSession {
  let positioned = withUnitState(session, 'attacker', {
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
    ...attackerOverrides,
  });
  positioned = withUnitState(positioned, 'target', {
    position: { q: 1, r: 0 },
    ...targetOverrides,
  });
  return positioned;
}

export function withoutUnitState(
  session: IGameSession,
  unitId: string,
): IGameSession {
  const { [unitId]: _removed, ...units } = session.currentState.units;
  return {
    ...session,
    currentState: {
      ...session.currentState,
      units,
    },
  };
}

export function declareAdjacentPhysicalAttack(
  attackType: PhysicalAttackType,
  context: IPhysicalAttackContext,
  attackerOverrides: Partial<IUnitGameState> = {},
  targetOverrides: Partial<IUnitGameState> = {},
): IGameSession {
  const session = withPhysicalPositions(
    physicalPhaseSession(),
    attackerOverrides,
    targetOverrides,
  );
  const declared = declarePhysicalAttack(
    session,
    'attacker',
    'target',
    attackType,
    context,
  );

  // Declaration appends an event and rebuilds state from the event log; keep
  // the resolver fixture positions aligned with the declaration fixture.
  return withPhysicalPositions(declared, attackerOverrides, targetOverrides);
}

export { ActuatorType } from '@/types/construction/MechConfigurationSystem';
export {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  LockState,
  MovementType,
  PSRTrigger,
} from '@/types/gameplay';
export type {
  IComponentDamageState,
  IDamageAppliedPayload,
  IGameSession,
  IGameUnit,
  IPhysicalAttackDeclaredPayload,
  IPilotHitPayload,
  IPhysicalAttackResolvedPayload,
  IPSRTriggeredPayload,
  IUnitDestroyedPayload,
  IUnitFellPayload,
  IUnitGameState,
} from '@/types/gameplay';
export { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
export { UnitType } from '@/types/unit/BattleMechInterfaces';
export type { DiceRoller } from '../diceTypes';
export {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '../gameSession';
export {
  declarePhysicalAttack,
  resolveAllPhysicalAttacks,
} from '../gameSessionPhysical';
export type { IPhysicalAttackContext } from '../gameSessionPhysical';
export { resolvePendingPSRs } from '../gameSessionPSR';
export { createHexGrid, placeUnit } from '../hexGrid';
export {
  chooseBestPhysicalAttack,
  getEligiblePhysicalAttacks,
} from '../physicalAttacks';
export type { PhysicalAttackType } from '../physicalAttacks';
