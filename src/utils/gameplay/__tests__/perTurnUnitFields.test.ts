/**
 * C7 PR 2: `resetPerTurnUnitFields` replaces two hand-written turn-boundary
 * resets (the reducer's `applyTurnStarted` and the runner's `resetTurnState`).
 * The extraction must be behaviour-neutral, so this test freezes verbatim
 * copies of both old inline resets (origin/main 03647bfcc) and requires the
 * shared function to match them on a matrix of units, including which keys are
 * present. The copies are deleted when a later change deliberately moves the
 * runner onto the reducer's behaviour (D2-D4 in the C7 characterization).
 */

import {
  GameSide,
  LockState,
  MovementType,
  type IPendingPSR,
  type IUnitGameState,
} from '@/types/gameplay';

import { runtimeMovementUnit } from '../gameState/__tests__/runtimeMovementState.helpers';
import { resetPerTurnMovementState } from '../movement/perTurnMovementState';
import { resetPerTurnUnitFields } from '../perTurnUnitFields';
import { advanceEmpShutdownTurns } from '../shutdownStartup';

const PSR: IPendingPSR = {
  entityId: 'u',
  reason: 'twenty-plus-damage',
  additionalModifier: 0,
  triggerSource: '20+_damage',
};

const DIRTY: Partial<IUnitGameState> = {
  movementThisTurn: MovementType.Run,
  hexesMovedThisTurn: 5,
  movedBackwardThisTurn: true,
  usedMechanicalJumpBoosterThisTurn: true,
  sprintedThisTurn: true,
  isEvading: true,
  evasionBonus: 1,
  hasMASC: true,
  activeMASC: true,
  mascTurnsUsed: 2,
  hasSupercharger: true,
  superchargerTurnsUsed: 3,
  weaponsFiredThisTurn: ['w1'],
  pendingPSRs: [PSR],
  tagDesignated: true,
  externalHeatThisTurn: 10,
  pendingExternalHeat: 4,
  isSpotting: true,
  spotTargetId: 'opponent-1',
  isLoadingOrUnloadingCargo: true,
  empInterferenceTurns: 3,
  empShutdownTurns: 2,
  lockState: LockState.Locked,
  pendingAction: { kind: 'declared' },
};

const MATRIX: Record<string, IUnitGameState> = {
  'never-set unit': runtimeMovementUnit({ id: 'u' }),
  'fully dirtied unit': runtimeMovementUnit({ id: 'u', ...DIRTY }),
  'EMP counters only': runtimeMovementUnit({
    id: 'u',
    empInterferenceTurns: 2,
    empShutdownTurns: 1,
  }),
  'EMP counters at zero': runtimeMovementUnit({
    id: 'u',
    empInterferenceTurns: 0,
    empShutdownTurns: 0,
  }),
  'fractional EMP interference': runtimeMovementUnit({
    id: 'u',
    empInterferenceTurns: 1.9,
  }),
  'explicit inactive sprint': runtimeMovementUnit({
    id: 'u',
    sprintedThisTurn: false,
  }),
  'idle boosters carrying counters': runtimeMovementUnit({
    id: 'u',
    mascTurnsUsed: 3,
    mascFailureLevelIncreasedLastTurn: true,
    superchargerTurnsUsed: 1,
  }),
};

/** The reducer's old `applyTurnStarted` per-unit body, verbatim. */
function legacyReducerReset(unit: IUnitGameState): IUnitGameState {
  const empInterferenceTurns = Math.max(
    0,
    Math.trunc(unit.empInterferenceTurns ?? 0) - 1,
  );
  const empShutdownTurns = advanceEmpShutdownTurns(unit.empShutdownTurns);
  return {
    ...resetPerTurnMovementState(unit),
    weaponsFiredThisTurn: [],
    pendingPSRs: [],
    isLoadingOrUnloadingCargo: false,
    tagDesignated: false,
    externalHeatThisTurn: 0,
    pendingExternalHeat: 0,
    empInterferenceTurns,
    empShutdownTurns,
    isSpotting: false,
    spotTargetId: undefined,
  };
}

/** The runner's old `resetTurnState` per-unit body, minus damageThisPhase. */
function legacyRunnerReset(unit: IUnitGameState): IUnitGameState {
  return resetPerTurnMovementState({
    ...unit,
    weaponsFiredThisTurn: [],
    pendingPSRs: [],
    tagDesignated: false,
    externalHeatThisTurn: 0,
    pendingExternalHeat: 0,
    ...(unit.empShutdownTurns !== undefined
      ? { empShutdownTurns: advanceEmpShutdownTurns(unit.empShutdownTurns) }
      : {}),
  });
}

function sortedKeys(unit: IUnitGameState): string[] {
  return Object.keys(unit).sort();
}

describe('resetPerTurnUnitFields', () => {
  describe.each(Object.entries(MATRIX))('%s', (_label, unit) => {
    it("explicit presence matches the reducer's old inline reset, key for key and in order", () => {
      const reset = resetPerTurnUnitFields(unit, { presence: 'explicit' });
      expect(reset).toStrictEqual(legacyReducerReset(unit));
      expect(JSON.stringify(reset)).toBe(
        JSON.stringify(legacyReducerReset(unit)),
      );
    });

    it("sparse presence matches the runner's old inline reset, including which keys exist", () => {
      const reset = resetPerTurnUnitFields(unit, { presence: 'sparse' });
      expect(reset).toStrictEqual(legacyRunnerReset(unit));
      expect(sortedKeys(reset)).toEqual(sortedKeys(legacyRunnerReset(unit)));
    });
  });

  it('sparse never materializes a field the unit did not carry', () => {
    const reset = resetPerTurnUnitFields(MATRIX['never-set unit'], {
      presence: 'sparse',
    });
    for (const key of [
      'empShutdownTurns',
      'empInterferenceTurns',
      'isSpotting',
      'spotTargetId',
      'isLoadingOrUnloadingCargo',
    ]) {
      expect(reset).not.toHaveProperty(key);
    }
  });

  it('explicit materializes every cleared field even on a never-set unit', () => {
    expect(
      resetPerTurnUnitFields(MATRIX['never-set unit'], {
        presence: 'explicit',
      }),
    ).toMatchObject({
      empShutdownTurns: 0,
      empInterferenceTurns: 0,
      isSpotting: false,
      isLoadingOrUnloadingCargo: false,
      weaponsFiredThisTurn: [],
      pendingPSRs: [],
    });
  });

  it('clears the turn fields both shapes own', () => {
    for (const presence of ['explicit', 'sparse'] as const) {
      expect(
        resetPerTurnUnitFields(MATRIX['fully dirtied unit'], { presence }),
      ).toMatchObject({
        movementThisTurn: MovementType.Stationary,
        hexesMovedThisTurn: 0,
        sprintedThisTurn: false,
        isEvading: false,
        activeMASC: false,
        weaponsFiredThisTurn: [],
        pendingPSRs: [],
        tagDesignated: false,
        externalHeatThisTurn: 0,
        pendingExternalHeat: 0,
        empShutdownTurns: 1,
      });
    }
  });

  it('only the reducer shape clears spotting and cargo and decrements EMP interference (D2-D4, pending a ruling)', () => {
    const dirty = MATRIX['fully dirtied unit'];
    expect(
      resetPerTurnUnitFields(dirty, { presence: 'explicit' }),
    ).toMatchObject({
      isSpotting: false,
      isLoadingOrUnloadingCargo: false,
      empInterferenceTurns: 2,
    });
    expect(resetPerTurnUnitFields(dirty, { presence: 'sparse' })).toMatchObject(
      {
        isSpotting: true,
        spotTargetId: 'opponent-1',
        isLoadingOrUnloadingCargo: true,
        empInterferenceTurns: 3,
      },
    );
  });

  it('never touches persistent state or the lock protocol', () => {
    const persistent = runtimeMovementUnit({
      id: 'u',
      isStuck: true,
      canUnstickByJumping: true,
      hullDown: true,
      prone: true,
      shutdown: true,
      isRetreating: true,
      pilotWounds: 2,
      narcedBy: [GameSide.Opponent],
      damageThisPhase: 9,
      lockState: LockState.Locked,
      pendingAction: { kind: 'declared' },
    });
    for (const presence of ['explicit', 'sparse'] as const) {
      expect(resetPerTurnUnitFields(persistent, { presence })).toMatchObject({
        isStuck: true,
        canUnstickByJumping: true,
        hullDown: true,
        prone: true,
        shutdown: true,
        isRetreating: true,
        pilotWounds: 2,
        narcedBy: [GameSide.Opponent],
        damageThisPhase: 9,
        lockState: LockState.Locked,
        pendingAction: { kind: 'declared' },
      });
    }
  });
});
