/**
 * Operability predicates: characterization of every call site that reads
 * the destroyed / shutdown / pilotConscious / hasRetreated / hasEjected
 * cluster. Each site keeps its current meaning; the
 * unconscious-pilot disagreement between the runner (crew must be active)
 * and the engine/calculator (unit only needs to be on the field) is pinned
 * here on purpose and is a tracked follow-up, not a bug fix.
 */

import { GameEngine } from '@/engine/GameEngine';
import { canUnitAct, canUnitBeTargeted } from '@/engine/GameEngine.phaseGuards';
import { getAvailableActionsForState } from '@/engine/InteractiveSession.queries';
import { isGameEnded } from '@/services/game-resolution/GameOutcomeCalculator';
import {
  isGameOver as isRunnerGameOver,
  isUnitOperable,
} from '@/simulation/runner/SimulationRunnerState';
import { appendRunnerGameEndedEvent } from '@/simulation/runner/SimulationRunnerTerminalEvent';
import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  type IGameEndedPayload,
  type IGameEvent,
  type IGameState,
  type IUnitGameState,
} from '@/types/gameplay';
import {
  allUnitsLocked,
  getActiveUnits,
  getUnitsAwaitingAction,
} from '@/utils/gameplay/gameState';
import { createInitialUnitState } from '@/utils/gameplay/gameState/initialization';

import { getUnitOperability } from '../unitOperability';

type Kind =
  | 'active'
  | 'shutdown'
  | 'unconscious'
  | 'destroyed'
  | 'ejected'
  | 'retreated';

const KINDS: readonly Kind[] = [
  'active',
  'shutdown',
  'unconscious',
  'destroyed',
  'ejected',
  'retreated',
];

const PATCH: Record<Kind, Partial<IUnitGameState>> = {
  active: {},
  shutdown: { shutdown: true },
  unconscious: { pilotConscious: false },
  destroyed: { destroyed: true },
  ejected: { hasEjected: true },
  retreated: { hasRetreated: true },
};

function unitOf(kind: Kind, id: string, side: GameSide): IUnitGameState {
  const base = createInitialUnitState(
    {
      id,
      name: id,
      side,
      unitRef: 'test-mech',
      pilotRef: `pilot-${id}`,
      gunnery: 4,
      piloting: 5,
    },
    { q: 0, r: 0 },
    Facing.North,
  );
  return { ...base, lockState: LockState.Pending, ...PATCH[kind] };
}

function stateOf(units: readonly IUnitGameState[]): IGameState {
  return {
    gameId: 'g',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: Object.fromEntries(units.map((u) => [u.id, u])),
    turnEvents: [],
  };
}

/** Player fields one unit of `kind`; the opponent fields one active unit. */
function duel(kind: Kind): IGameState {
  return stateOf([
    unitOf(kind, 'p', GameSide.Player),
    unitOf('active', 'o', GameSide.Opponent),
  ]);
}

function kindsWhere(predicate: (kind: Kind) => boolean): Kind[] {
  return KINDS.filter(predicate);
}

describe('getUnitOperability', () => {
  it.each([
    ['active', null, true, true, true],
    ['shutdown', null, true, true, false],
    ['unconscious', null, true, false, false],
    ['destroyed', null, false, false, false],
    ['ejected', 'ejected', false, false, false],
    ['retreated', 'retreated', false, false, false],
  ] as const)(
    '%s -> exit %s, onField %s, crewActive %s, canAct %s',
    (kind, exitReason, onField, crewActive, canAct) => {
      expect(getUnitOperability(unitOf(kind, 'u', GameSide.Player))).toEqual({
        exitReason,
        onField,
        crewActive,
        canAct,
      });
    },
  );
});

describe('operability call sites (characterization)', () => {
  const unit = (kind: Kind) => unitOf(kind, 'u', GameSide.Player);

  it('canUnitAct: only an active unit can act', () => {
    expect(kindsWhere((k) => canUnitAct(unit(k)))).toEqual(['active']);
  });

  it('canUnitBeTargeted: shut-down and unconscious units stay targetable', () => {
    expect(kindsWhere((k) => canUnitBeTargeted(unit(k)))).toEqual([
      'active',
      'shutdown',
      'unconscious',
    ]);
  });

  it('runner isUnitOperable: shut-down counts, unconscious does not', () => {
    expect(kindsWhere((k) => isUnitOperable(unit(k)))).toEqual([
      'active',
      'shutdown',
    ]);
  });

  it('runner isGameOver: a side with only an unconscious pilot is out', () => {
    expect(kindsWhere((k) => isRunnerGameOver(duel(k)))).toEqual([
      'unconscious',
      'destroyed',
      'ejected',
      'retreated',
    ]);
  });

  it('runner GameEnded reason: destruction when a side has no active crew', () => {
    const reasonFor = (kind: Kind): IGameEndedPayload['reason'] => {
      const events: IGameEvent[] = [];
      appendRunnerGameEndedEvent({
        events,
        gameId: 'g',
        state: duel(kind),
        turnLimit: 0,
        winner: null,
        haltedByCriticalAnomaly: false,
      });
      return (events[0].payload as IGameEndedPayload).reason;
    };
    expect(kindsWhere((k) => reasonFor(k) === 'destruction')).toEqual([
      'unconscious',
      'destroyed',
      'ejected',
      'retreated',
    ]);
  });

  it('GameEngine winner: unconscious and shut-down units remain in force', () => {
    const engine = new GameEngine({ seed: 42, turnLimit: 20, mapRadius: 5 });
    const winnerFor = (kind: Kind) =>
      (
        engine as unknown as {
          determineWinnerFromState(state: IGameState): GameSide | 'draw';
        }
      ).determineWinnerFromState(duel(kind));
    expect(Object.fromEntries(KINDS.map((k) => [k, winnerFor(k)]))).toEqual({
      active: 'draw',
      shutdown: 'draw',
      unconscious: 'draw',
      destroyed: GameSide.Opponent,
      ejected: GameSide.Opponent,
      retreated: GameSide.Opponent,
    });
  });

  it('GameOutcomeCalculator: unconscious and shut-down units are survivors', () => {
    const config = {
      mapRadius: 10,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    };
    expect(kindsWhere((k) => isGameEnded(duel(k), config))).toEqual([
      'destroyed',
      'ejected',
      'retreated',
    ]);
  });

  it('reducer queues: only an active unit is active, awaiting, or blocks locking', () => {
    expect(
      kindsWhere((k) => getActiveUnits(duel(k), GameSide.Player).length > 0),
    ).toEqual(['active']);
    expect(
      kindsWhere((k) =>
        getUnitsAwaitingAction(duel(k)).some((u) => u.id === 'p'),
      ),
    ).toEqual(['active']);
    expect(
      kindsWhere((k) =>
        allUnitsLocked(
          stateOf([
            unitOf(k, 'p', GameSide.Player),
            {
              ...unitOf('active', 'o', GameSide.Opponent),
              lockState: LockState.Locked,
            },
          ]),
        ),
      ),
    ).toEqual(['shutdown', 'unconscious', 'destroyed', 'ejected', 'retreated']);
  });

  it('available actions: only an active unit acts; on-field enemies are targets', () => {
    const actorKinds = kindsWhere(
      (k) =>
        getAvailableActionsForState(duel(k), 'p', new Map()).validTargets
          .length > 0,
    );
    expect(actorKinds).toEqual(['active']);

    const targetKinds = kindsWhere(
      (k) =>
        getAvailableActionsForState(
          stateOf([
            unitOf('active', 'p', GameSide.Player),
            unitOf(k, 'o', GameSide.Opponent),
          ]),
          'p',
          new Map(),
        ).validTargets.length > 0,
    );
    expect(targetKinds).toEqual(['active', 'shutdown', 'unconscious']);
  });
});
