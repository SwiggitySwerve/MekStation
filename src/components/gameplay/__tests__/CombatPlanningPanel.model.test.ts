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
import { buildDefaultComponentDamageState } from '@/utils/gameplay/gameSessionAttackResolutionHelpers';
import { createHexGrid } from '@/utils/gameplay/hexGrid';

import {
  attackerStateForSelected,
  combatProjectionForAttackTarget,
  forecastOptionsForAttackPlan,
  rangeToAttackTarget,
  targetStateForAttackPlan,
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

describe('to-hit forecast state hydration', () => {
  it('builds modal attacker and target state with the shared engine builders', () => {
    const session = makeSession();
    session.currentState.units.attacker = {
      ...session.currentState.units.attacker,
      pilotWounds: 2,
      componentDamage: {
        ...buildDefaultComponentDamageState(),
        sensorHits: 1,
      },
    };
    session.currentState.units.target = {
      ...session.currentState.units.target,
      movementThisTurn: MovementType.Walk,
      hexesMovedThisTurn: 5,
      shutdown: true,
      tagDesignated: true,
    };
    const selected = selectedFromSession(session);

    const attackerState = attackerStateForSelected(selected, {
      weaponId: 'semi-guided-lrm-15',
      weaponName: 'Semi-Guided LRM-15',
    });
    const targetState = targetStateForAttackPlan('target', session, true);
    const forecastOptions = forecastOptionsForAttackPlan({
      isIndirectFire: true,
      indirectFirePenalty: 1,
      selected,
      session,
      targetUnitId: 'target',
    });

    expect(attackerState).toMatchObject({
      pilotWounds: 2,
      sensorHits: 1,
      targetId: undefined,
      weaponType: 'Semi-Guided LRM-15',
    });
    expect(targetState).toMatchObject({
      hexesMoved: 5,
      immobile: true,
      partialCover: true,
    });
    expect(
      forecastOptions?.semiGuidedTagContext instanceof Function
        ? forecastOptions.semiGuidedTagContext({
            weaponId: 'semi-guided-lrm-15',
            weaponName: 'Semi-Guided LRM-15',
            minRange: 0,
            shortRange: 7,
            mediumRange: 14,
            longRange: 21,
          })
        : undefined,
    ).toMatchObject({
      isIndirectFire: true,
      indirectFirePenalty: 1,
      isSemiGuided: true,
      targetTagDesignated: true,
    });
  });
});
