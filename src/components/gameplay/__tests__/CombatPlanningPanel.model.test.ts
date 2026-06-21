import { describe, expect, it } from '@jest/globals';

import type { ISelectedUnitProjection } from '@/stores/useGameplayStore.selectors';
import type {
  ICombatRangeHex,
  IGameSession,
  IWeaponStatus,
} from '@/types/gameplay';

import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  RangeBracket,
} from '@/types/gameplay';
import { createHexGrid } from '@/utils/gameplay/hexGrid';

import {
  combatProjectionForAttackTarget,
  rangeToAttackTarget,
} from '../CombatPlanningPanel.model';

const mediumLaserStatus: IWeaponStatus = {
  id: 'med-laser-1',
  name: 'Medium Laser',
  location: 'Right Arm',
  destroyed: false,
  firedThisTurn: false,
  heat: 3,
  damage: 5,
  ranges: {
    short: 3,
    medium: 6,
    long: 9,
  },
};

function makeUnitState(
  id: string,
  side: GameSide,
  position: { readonly q: number; readonly r: number },
) {
  return {
    id,
    side,
    position,
    facing: Facing.Southeast,
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
  };
}

function makeSession(): IGameSession {
  const attackerState = makeUnitState('attacker', GameSide.Player, {
    q: 0,
    r: 0,
  });
  const targetState = makeUnitState('target', GameSide.Opponent, {
    q: 2,
    r: 0,
  });

  return {
    id: 'projection-panel-test',
    createdAt: '',
    updatedAt: '',
    config: {
      mapRadius: 4,
      turnLimit: 0,
      victoryConditions: [],
      optionalRules: [],
    },
    units: [
      {
        id: 'attacker',
        name: 'Attacker',
        side: GameSide.Player,
        unitRef: 'attacker-ref',
        pilotRef: 'attacker-pilot',
        gunnery: 4,
        piloting: 5,
      },
      {
        id: 'target',
        name: 'Target',
        side: GameSide.Opponent,
        unitRef: 'target-ref',
        pilotRef: 'target-pilot',
        gunnery: 4,
        piloting: 5,
      },
    ],
    events: [],
    currentState: {
      gameId: 'projection-panel-test',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.WeaponAttack,
      activationIndex: 0,
      units: {
        attacker: attackerState,
        target: targetState,
      },
      turnEvents: [],
    },
  };
}

function selectedFromSession(session: IGameSession): ISelectedUnitProjection {
  return {
    id: 'attacker',
    unit: session.units[0],
    state: session.currentState.units.attacker,
  };
}

describe('combatProjectionForAttackTarget', () => {
  it('uses supplied combat projection lookup before deriving a fallback', () => {
    const lookupProjection = {
      distance: 8,
      rangeBracket: RangeBracket.Long,
    } as ICombatRangeHex;

    const input = {
      selected: null,
      targetUnitId: 'target',
      session: null,
      grid: null,
      unitWeaponStatuses: [],
      combatProjectionByTargetId: { target: lookupProjection },
    };

    expect(combatProjectionForAttackTarget(input)).toBe(lookupProjection);
    expect(rangeToAttackTarget(input)).toBe(8);
  });

  it('derives the target range through the combat projection fallback', () => {
    const session = makeSession();
    const projection = combatProjectionForAttackTarget({
      selected: selectedFromSession(session),
      targetUnitId: 'target',
      session,
      grid: createHexGrid({ radius: 4 }),
      unitWeaponStatuses: [mediumLaserStatus],
      selectedWeaponIds: ['med-laser-1'],
    });

    expect(projection).toMatchObject({
      distance: 2,
      rangeBracket: RangeBracket.Short,
      hasTarget: true,
      targetUnitIds: ['target'],
    });
  });
});
