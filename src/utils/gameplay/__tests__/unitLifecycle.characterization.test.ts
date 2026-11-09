/**
 * Wave 4 C1 PR1: the `UnitLifecycle` read model.
 *
 * The lifecycle is derived from the existing flags and must not change any
 * caller's answer. Everything here is checked against FROZEN verbatim copies
 * of the formulas as they stood before the model existed (the `before*`
 * helpers), over the whole declared flag domain, so a site that delegates to
 * the model can't drift without a red row. Odd and legacy combinations are
 * pinned as literals.
 *
 * Domain: every flag is `boolean | undefined` as declared; `pilotConscious`
 * also takes `undefined`, which old fixtures omit.
 */

import type { IObjectiveMarker } from '@/types/scenario/ScenarioInterfaces';

import {
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  type IGameConfig,
  type IGameEvent,
  type IGameSession,
  type IGameState,
  type IGameUnit,
  type IUnitGameState,
} from '@/types/gameplay';
import {
  createPilotHitEvent,
  createRetreatTriggeredEvent,
  createShutdownCheckEvent,
  createStartupAttemptEvent,
  createUnitDestroyedEvent,
  createUnitEjectedEvent,
  createUnitRetreatedEvent,
  createWithdrawalDeclaredEvent,
} from '@/utils/gameplay/gameEvents';
import { createEventBase } from '@/utils/gameplay/gameEvents/base';
import { createGameSession, startGame } from '@/utils/gameplay/gameSession';
import { appendEvent } from '@/utils/gameplay/gameSessionCore';
import {
  checkVictoryConditions,
  deriveState,
} from '@/utils/gameplay/gameState/gameStateReducer';
import { forcedWithdrawalReasonFor } from '@/utils/gameplay/morale/forcedWithdrawal';
import { declarePlayerWithdrawal } from '@/utils/gameplay/morale/withdrawalProcessing';
import {
  detectObjectiveControl,
  evaluateObjectiveOutcome,
} from '@/utils/gameplay/objectives/objectiveEngine';
import { canAttemptHeatStartup } from '@/utils/gameplay/shutdownStartup';

import {
  getUnitExitReason,
  getUnitLifecycle,
  getUnitOperability,
} from '../unitOperability';
import {
  FLAG_DOMAIN,
  FLAG_DOMAIN_SIZE,
  beforeLeftPlay,
  beforeSurvives,
  flagLabel,
  unitWith,
  type Flags,
} from './unitFlagDomain.test-helpers';

// ---------------------------------------------------------------------------
// Frozen pre-PR formulas (verbatim from origin/main 8524986d1)
// ---------------------------------------------------------------------------

function beforeExitReason(u: Flags): 'ejected' | 'retreated' | null {
  if (u.hasEjected === true) return 'ejected';
  if (u.hasRetreated === true) return 'retreated';
  return null;
}

function beforeOperability(u: Flags) {
  const exitReason = beforeExitReason(u);
  const onField = !u.destroyed && exitReason === null;
  const crewActive = onField && u.pilotConscious !== false;
  return { exitReason, onField, crewActive, canAct: crewActive && !u.shutdown };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COMBOS = FLAG_DOMAIN;
const label = flagLabel;

function stateOf(
  units: IUnitGameState[],
  extra: Partial<IGameState> = {},
): IGameState {
  return {
    gameId: 'g',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.End,
    activationIndex: 0,
    units: Object.fromEntries(units.map((u) => [u.id, u])),
    turnEvents: [],
    ...extra,
  };
}

function objectiveMarker(
  objectiveType: IObjectiveMarker['objectiveType'],
  hexKey: string,
): IObjectiveMarker {
  return {
    id: 'o',
    hexKey,
    objectiveType,
    owningSide: 'neutral',
    controlSide: 'neutral',
    controlRule: 'sole-occupancy',
    holdTurnsRequired: 1,
    holdProgress: 0,
  };
}

// ---------------------------------------------------------------------------
// 1. The model against the frozen formulas
// ---------------------------------------------------------------------------

describe('getUnitLifecycle: whole flag domain against the frozen formulas', () => {
  it('covers the domain it claims to', () => {
    expect(COMBOS).toHaveLength(FLAG_DOMAIN_SIZE);
  });

  it('getUnitExitReason and getUnitOperability answer exactly as before', () => {
    for (const flags of COMBOS) {
      const unit = unitWith('u', GameSide.Player, flags);
      expect({ at: label(flags), v: getUnitExitReason(unit) }).toEqual({
        at: label(flags),
        v: beforeExitReason(flags),
      });
      expect({ at: label(flags), v: getUnitOperability(unit) }).toEqual({
        at: label(flags),
        v: beforeOperability(flags),
      });
    }
  });

  it('the lifecycle projects to the same operability levels', () => {
    for (const flags of COMBOS) {
      const lifecycle = getUnitLifecycle(unitWith('u', GameSide.Player, flags));
      const before = beforeOperability(flags);
      const onField = lifecycle.standing.kind === 'onField';
      expect({ at: label(flags), onField }).toEqual({
        at: label(flags),
        onField: before.onField,
      });
      expect({
        at: label(flags),
        exit:
          lifecycle.standing.kind === 'exited'
            ? lifecycle.standing.reason
            : null,
      }).toEqual({ at: label(flags), exit: before.exitReason });
      expect({
        at: label(flags),
        crewActive: onField && lifecycle.crewConscious,
      }).toEqual({ at: label(flags), crewActive: before.crewActive });
      expect({
        at: label(flags),
        canAct: onField && lifecycle.crewConscious && !lifecycle.shutdown,
      }).toEqual({ at: label(flags), canAct: before.canAct });
    }
  });

  it('keeps the orthogonal facts as stored, with no precedence between them', () => {
    for (const flags of COMBOS) {
      const lifecycle = getUnitLifecycle(unitWith('u', GameSide.Player, flags));
      expect(lifecycle.shutdown).toBe(Boolean(flags.shutdown));
      expect(lifecycle.crewConscious).toBe(flags.pilotConscious !== false);
      expect(lifecycle.retreating).toBe(Boolean(flags.isRetreating));
      expect(lifecycle.withdrawing).toBe(Boolean(flags.isWithdrawing));
      if (lifecycle.standing.kind === 'exited') {
        expect(lifecycle.standing.destroyed).toBe(Boolean(flags.destroyed));
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Odd and legacy combinations, pinned as literals
// ---------------------------------------------------------------------------

describe('odd and legacy flag combinations (pinned as today)', () => {
  const lifecycleOf = (flags: Partial<IUnitGameState>) =>
    getUnitLifecycle(unitWith('u', GameSide.Player, flags));
  const operabilityOf = (flags: Partial<IUnitGameState>) =>
    getUnitOperability(unitWith('u', GameSide.Player, flags));

  it('destroyed + ejected: the exit is kept and so is the destruction', () => {
    expect(lifecycleOf({ destroyed: true, hasEjected: true }).standing).toEqual(
      { kind: 'exited', reason: 'ejected', destroyed: true },
    );
    expect(operabilityOf({ destroyed: true, hasEjected: true })).toEqual({
      exitReason: 'ejected',
      onField: false,
      crewActive: false,
      canAct: false,
    });
  });

  it('destroyed alone is not an exit', () => {
    expect(lifecycleOf({ destroyed: true }).standing).toEqual({
      kind: 'destroyed',
    });
    expect(operabilityOf({ destroyed: true }).exitReason).toBeNull();
  });

  it('ejected + retreated: ejected wins, as getUnitExitReason already ruled', () => {
    expect(
      lifecycleOf({ hasEjected: true, hasRetreated: true }).standing,
    ).toEqual({ kind: 'exited', reason: 'ejected', destroyed: false });
  });

  it('retreated + shutdown: off the field, shutdown kept', () => {
    const lifecycle = lifecycleOf({ hasRetreated: true, shutdown: true });
    expect(lifecycle.standing).toEqual({
      kind: 'exited',
      reason: 'retreated',
      destroyed: false,
    });
    expect(lifecycle.shutdown).toBe(true);
    expect(operabilityOf({ hasRetreated: true, shutdown: true }).canAct).toBe(
      false,
    );
  });

  it('unconscious + withdrawing: still on the field, declared withdrawal kept', () => {
    const flags = { pilotConscious: false, isWithdrawing: true };
    const lifecycle = lifecycleOf(flags);
    expect(lifecycle.standing).toEqual({ kind: 'onField' });
    expect(lifecycle.crewConscious).toBe(false);
    expect(lifecycle.withdrawing).toBe(true);
    expect(operabilityOf(flags)).toEqual({
      exitReason: null,
      onField: true,
      crewActive: false,
      canAct: false,
    });
  });

  it('undefined pilotConscious counts as conscious here (three inline sites read it as unconscious and stay untouched)', () => {
    const flags = { pilotConscious: undefined as unknown as boolean };
    expect(lifecycleOf(flags).crewConscious).toBe(true);
    expect(operabilityOf(flags).crewActive).toBe(true);
    // The inline `unit.pilotConscious` truthiness sites disagree on this input.
    expect(Boolean(flags.pilotConscious)).toBe(false);
  });

  it('retreating and withdrawing latches can both be set', () => {
    const lifecycle = lifecycleOf({ isRetreating: true, isWithdrawing: true });
    expect(lifecycle.retreating).toBe(true);
    expect(lifecycle.withdrawing).toBe(true);
  });

  it('stale empShutdownTurns never touches the lifecycle; startup eligibility is pinned', () => {
    // EMP duration stays out of the model. The startup gate is the live reader.
    expect(
      canAttemptHeatStartup({ shutdown: false, empShutdownTurns: 2 }, 0),
    ).toBe(false);
    expect(
      canAttemptHeatStartup({ shutdown: true, empShutdownTurns: 2 }, 0),
    ).toBe(false);
    expect(
      canAttemptHeatStartup({ shutdown: true, empShutdownTurns: 0 }, 0),
    ).toBe(true);
    expect(
      canAttemptHeatStartup({ shutdown: true, empShutdownTurns: undefined }, 0),
    ).toBe(true);
    expect(lifecycleOf({ shutdown: false, empShutdownTurns: 2 })).toEqual(
      lifecycleOf({ shutdown: false, empShutdownTurns: 0 }),
    );
    expect(
      lifecycleOf({ destroyed: true, empShutdownTurns: 2 }).standing,
    ).toEqual({ kind: 'destroyed' });
  });
});

// ---------------------------------------------------------------------------
// 3. Event orderings through the reducer
// ---------------------------------------------------------------------------

describe('reducer orderings produce the pinned flag combinations', () => {
  const UNIT = 'guest-0';
  const UNITS: readonly IGameUnit[] = [
    {
      id: 'host-0',
      name: 'Wasp',
      side: GameSide.Player,
      unitRef: 'wsp-1a',
      pilotRef: 'p-host',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: UNIT,
      name: 'Cicada',
      side: GameSide.Opponent,
      unitRef: 'cda-2a',
      pilotRef: 'p-guest',
      gunnery: 4,
      piloting: 5,
    },
  ];
  type Factory = (session: IGameSession) => IGameEvent;
  const at = (s: IGameSession) =>
    [s.id, s.events.length, s.currentState.turn, s.currentState.phase] as const;

  const destroyed: Factory = (s) =>
    createUnitDestroyedEvent(...at(s), UNIT, 'damage');
  const ejected: Factory = (s) =>
    createUnitEjectedEvent(...at(s), UNIT, 'player_declared');
  const retreated: Factory = (s) =>
    createUnitRetreatedEvent(...at(s), UNIT, 'north');
  const retreatTriggered: Factory = (s) =>
    createRetreatTriggeredEvent(
      ...at(s),
      UNIT,
      'north',
      'structural_threshold',
    );
  const withdrawal: Factory = (s) =>
    createWithdrawalDeclaredEvent(...at(s), UNIT, 'south', 'forced');
  const shutdownCheck: Factory = (s) =>
    createShutdownCheckEvent(...at(s), UNIT, 20, 8, 0, true);
  const startupSuccess: Factory = (s) =>
    createStartupAttemptEvent(...at(s), UNIT, 8, 12, true);
  const pilotKnockedOut: Factory = (s) =>
    createPilotHitEvent(...at(s), UNIT, 1, 1, 'head_hit', true, false);
  const empShutdown: Factory = (s): IGameEvent => ({
    ...createEventBase(
      s.id,
      s.events.length,
      GameEventType.EmpMinefieldEffectApplied,
      s.currentState.turn,
      s.currentState.phase,
      UNIT,
    ),
    payload: {
      unitId: UNIT,
      hex: { q: 0, r: 0 },
      roll: 9,
      modifier: 0,
      modifiedRoll: 9,
      effect: 'shutdown',
      durationTurns: 2,
      source: 'minefield',
    },
  });

  function play(...factories: Factory[]): IUnitGameState {
    let session = startGame(
      createGameSession(
        {
          mapRadius: 8,
          turnLimit: 30,
          victoryConditions: ['destroy_all'],
          optionalRules: [],
        } as IGameConfig,
        UNITS,
      ),
      GameSide.Player,
    );
    for (const factory of factories) {
      session = appendEvent(session, factory(session));
    }
    const folded = deriveState(session.id, session.events).units[UNIT];
    expect(folded).toEqual(session.currentState.units[UNIT]);
    return session.currentState.units[UNIT];
  }

  it('eject then destroyed leaves both flags (nothing gates a damage event on an exited unit)', () => {
    const unit = play(ejected, destroyed);
    expect(unit.hasEjected).toBe(true);
    expect(unit.destroyed).toBe(true);
    expect(getUnitLifecycle(unit).standing).toEqual({
      kind: 'exited',
      reason: 'ejected',
      destroyed: true,
    });
  });

  it('destroyed then eject: the once-only latch drops the exit', () => {
    const unit = play(destroyed, ejected);
    expect(unit.destroyed).toBe(true);
    expect(unit.hasEjected).toBeFalsy();
    expect(getUnitLifecycle(unit).standing).toEqual({ kind: 'destroyed' });
  });

  it('retreated then a shutdown check keeps both', () => {
    const unit = play(retreatTriggered, retreated, shutdownCheck);
    expect(getUnitLifecycle(unit)).toMatchObject({
      standing: { kind: 'exited', reason: 'retreated', destroyed: false },
      shutdown: true,
      retreating: true,
    });
  });

  it('a knocked-out pilot who then declares withdrawal is unconscious and withdrawing', () => {
    const unit = play(pilotKnockedOut, withdrawal);
    expect(getUnitLifecycle(unit)).toMatchObject({
      standing: { kind: 'onField' },
      crewConscious: false,
      withdrawing: true,
    });
  });

  it('an EMP shutdown followed by a successful startup leaves empShutdownTurns above 0 with shutdown false', () => {
    const unit = play(empShutdown, startupSuccess);
    expect(unit.shutdown).toBe(false);
    expect(unit.empShutdownTurns).toBe(2);
    expect(getUnitLifecycle(unit).shutdown).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. The four delegated sites, each against its own frozen formula
// ---------------------------------------------------------------------------

describe('delegated site: gameStateReducer getSurvivingUnitsForSide', () => {
  it('checkVictoryConditions: side elimination follows the frozen formula', () => {
    const config: IGameConfig = {
      mapRadius: 5,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    };
    // A neutral capture marker keeps the objective engine undecided so the
    // survivor count is what decides.
    const objectives = { o: objectiveMarker('capture', '9,9') };
    for (const flags of COMBOS) {
      const state = stateOf(
        [
          unitWith('p', GameSide.Player, flags),
          unitWith('o', GameSide.Opponent),
        ],
        { objectives },
      );
      expect({
        at: label(flags),
        v: checkVictoryConditions(state, config),
      }).toEqual({
        at: label(flags),
        v: beforeSurvives(flags) ? null : GameSide.Opponent,
      });
    }
  });

  it('checkVictoryConditions: the turn-limit force count follows the frozen formula', () => {
    const config: IGameConfig = {
      mapRadius: 5,
      turnLimit: 1,
      victoryConditions: ['elimination'],
      optionalRules: [],
    };
    const objectives = { o: objectiveMarker('capture', '9,9') };
    for (const flags of COMBOS) {
      const state = stateOf(
        [
          unitWith('p1', GameSide.Player, flags),
          unitWith('p2', GameSide.Player),
          unitWith('o1', GameSide.Opponent),
          unitWith('o2', GameSide.Opponent),
        ],
        { objectives, turn: 2 },
      );
      expect({
        at: label(flags),
        v: checkVictoryConditions(state, config),
      }).toEqual({
        at: label(flags),
        v: beforeSurvives(flags) ? 'draw' : GameSide.Opponent,
      });
    }
  });
});

describe('delegated site: objectiveEngine unitOccupiesHexes', () => {
  const marker = objectiveMarker('capture', '0,0');

  it('detectObjectiveControl: only a unit that occupies takes the hex', () => {
    for (const flags of COMBOS) {
      const state = stateOf([unitWith('p', GameSide.Player, flags)]);
      expect({
        at: label(flags),
        v: detectObjectiveControl(marker, state).controlSide,
      }).toEqual({
        at: label(flags),
        v: beforeSurvives(flags) ? 'player' : 'neutral',
      });
    }
  });

  it('evaluateObjectiveOutcome (markerless destroy): participation follows the frozen formula', () => {
    for (const flags of COMBOS) {
      const state = stateOf([
        unitWith('p', GameSide.Player, flags),
        unitWith('o', GameSide.Opponent),
      ]);
      expect({
        at: label(flags),
        v: evaluateObjectiveOutcome(state)?.winningSide ?? null,
      }).toEqual({
        at: label(flags),
        v: beforeSurvives(flags) ? null : GameSide.Opponent,
      });
    }
  });

  it('evaluateObjectiveOutcome (breakthrough): only an occupying attacker reaches the exit', () => {
    const exit = objectiveMarker('breakthrough', '0,0');
    for (const flags of COMBOS) {
      const state = stateOf(
        [
          unitWith('p', GameSide.Player, flags),
          unitWith('o', GameSide.Opponent, {}, { q: 5, r: 5 }),
        ],
        { objectives: { o: exit } },
      );
      expect({
        at: label(flags),
        v: evaluateObjectiveOutcome(state)?.winningSide ?? null,
      }).toEqual({
        at: label(flags),
        v: beforeSurvives(flags) ? GameSide.Player : null,
      });
    }
  });
});

describe('delegated site: forcedWithdrawal.ts:84', () => {
  it('forcedWithdrawalReasonFor: a unit that left play, or already declared, is never eligible', () => {
    for (const flags of COMBOS) {
      const unit = unitWith('p', GameSide.Player, flags);
      const expected =
        beforeLeftPlay(flags) || flags.isWithdrawing || flags.isRetreating
          ? null
          : 'morale-broken';
      expect({
        at: label(flags),
        v: forcedWithdrawalReasonFor(unit, {
          [GameSide.Player]: 'BROKEN',
          [GameSide.Opponent]: 'STEADY',
        }),
      }).toEqual({ at: label(flags), v: expected });
    }
  });
});

describe('delegated site: withdrawalProcessing.ts:194', () => {
  it('declarePlayerWithdrawal: no event for a unit that left play, or already declared', () => {
    const config: IGameConfig = {
      mapRadius: 5,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    };
    const base = startGame(
      createGameSession(config, [
        {
          id: 'player-1',
          name: 'p',
          side: GameSide.Player,
          unitRef: 'atlas-as7-d',
          pilotRef: 'pilot-p',
          gunnery: 4,
          piloting: 5,
        },
      ]),
      GameSide.Player,
    );
    for (const flags of COMBOS) {
      const session: IGameSession = {
        ...base,
        currentState: {
          ...base.currentState,
          units: {
            ...base.currentState.units,
            'player-1': { ...base.currentState.units['player-1'], ...flags },
          },
        },
      };
      const result = declarePlayerWithdrawal(session, 'player-1', 'north');
      const blocked =
        beforeLeftPlay(flags) || flags.isWithdrawing || flags.isRetreating;
      expect({
        at: label(flags),
        appended: result.events.length - session.events.length,
      }).toEqual({
        at: label(flags),
        appended: blocked ? 0 : 1,
      });
    }
  });
});
