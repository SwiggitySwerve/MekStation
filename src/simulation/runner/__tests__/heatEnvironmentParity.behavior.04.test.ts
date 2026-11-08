/**
 * Behavior-class coverage for heat environment parity boundaries.
 *
 * The event-session heat resolver accepts water/fire providers, and the
 * quick-sim runner heat phase consumes occupied grid terrain for water/fire
 * effects. These tests keep the remaining generic environment boundary explicit
 * so the validation catalog does not overstate runner parity.
 */

import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';
import type { DiceRoller } from '@/utils/gameplay/diceTypes';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  IGameConfig,
  IGameEvent,
  IGameSession,
  IGameState,
  IGameUnit,
  IHexGrid,
  IHeatEffectAppliedPayload,
  IHeatPayload,
  IPilotHitPayload,
  IShutdownCheckPayload,
  IUnitGameState,
  IWeaponAttack,
  LockState,
  MovementType,
  RangeBracket,
  WeaponCategory,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { createEnvironmentalConditions } from '@/utils/gameplay/environmentalModifiers';
import { createEventBase } from '@/utils/gameplay/gameEvents/base';
import {
  advancePhase,
  createGameSession,
  declareAttack,
  lockAttack,
  resolveHeatPhase,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSession';
import { appendEvent } from '@/utils/gameplay/gameSessionCore';
import { getTerrainHeatEffect } from '@/utils/gameplay/heat';

import type { IWeapon } from '../../ai/types';

import { SeededRandom } from '../../core/SeededRandom';
import { PILOT_DAMAGE_COMBAT_SUPPORT } from '../CombatDamageSupport';
import {
  QUIRK_COMBAT_SUPPORT,
  SPA_COMBAT_SUPPORT,
} from '../CombatFeatureSupport';
import { RUNNER_INTERACTIVE_PARITY_SUPPORT } from '../CombatParitySupport';
import { PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT } from '../CombatPilotModifierApplicationSupport';
import {
  HEAT_RULE_COMBAT_SUPPORT,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
} from '../CombatRuleSupport';
import { runHeatPhase } from '../phases/postCombat';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import { resetTurnState } from '../SimulationRunnerState';
import { createMinimalGrid } from '../SimulationRunnerSupport';
import {
  fixedD6,
  fixedRoller,
  rollSeven,
  createScriptedDiceRoller,
  createConfig,
  createGameUnit,
  createPpc,
  createRunnerPpc,
  createInteractiveHeatSession,
  createRunnerUnit,
  createRunnerHeatState,
  createRunnerTerrainGrid,
  withInteractiveUnit,
  heatPayloads,
} from './heatEnvironmentParity.behavior.test-helpers';

describe('heat environment runner/interactive parity boundaries', () => {
  it('applies heat pilot wounds in the interactive resolver and quick-sim runHeatPhase', () => {
    const heatDamagedComponentState = {
      ...DEFAULT_COMPONENT_DAMAGE,
      lifeSupport: 1,
    };
    const interactive = resolveHeatPhase(
      withInteractiveUnit(createInteractiveHeatSession(), 'player-1', {
        heat: 35,
        componentDamage: heatDamagedComponentState,
      }),
      fixedRoller,
    );
    const interactivePilotHits = interactive.events.filter(
      (event) =>
        event.type === GameEventType.PilotHit &&
        event.actorId === 'player-1' &&
        event.phase === GamePhase.Heat,
    );

    const runnerEvents: IGameEvent[] = [];
    const runnerState = runHeatPhase({
      state: createRunnerHeatState(
        createRunnerUnit({
          heat: 35,
          componentDamage: heatDamagedComponentState,
        }),
      ),
      events: runnerEvents,
      gameId: 'heat-environment-parity-test',
      random: new SeededRandom(789),
    });
    const runnerHeatPilotEffects = runnerEvents
      .filter((event) => event.type === GameEventType.HeatEffectApplied)
      .map((event) => event.payload as IHeatEffectAppliedPayload)
      .filter((payload) => payload.effect === 'pilot_damage');
    const runnerPilotHits = runnerEvents.filter(
      (event) =>
        event.type === GameEventType.PilotHit &&
        event.actorId === 'player-1' &&
        event.phase === GamePhase.Heat,
    );

    expect(interactivePilotHits).toHaveLength(1);
    expect(interactivePilotHits[0].payload as IPilotHitPayload).toMatchObject({
      unitId: 'player-1',
      wounds: 2,
      totalWounds: 2,
      source: 'heat',
    });
    expect(interactive.currentState.units['player-1'].pilotWounds).toBe(2);

    expect(runnerHeatPilotEffects.map((payload) => payload.threshold)).toEqual([
      15, 25,
    ]);
    expect(runnerPilotHits).toHaveLength(1);
    expect(runnerPilotHits[0].payload as IPilotHitPayload).toMatchObject({
      unitId: 'player-1',
      wounds: 2,
      totalWounds: 2,
      source: 'heat',
    });
    expect(runnerState.units['player-1'].pilotWounds).toBe(2);
    expect(
      RUNNER_INTERACTIVE_PARITY_SUPPORT['heat-pilot-damage'],
    ).toMatchObject({
      level: 'integrated',
    });
    expect(HEAT_RULE_COMBAT_SUPPORT['pilot-heat-damage']).toMatchObject({
      level: 'integrated',
    });
    expect(PILOT_DAMAGE_COMBAT_SUPPORT['heat-pilot-damage']).toMatchObject({
      level: 'integrated',
    });
  });
});

/** Real journal events keep shutdown and pilot state through every re-derivation. */
function c10HeatSession(heat: number, empShutdownTurns: number): IGameSession {
  let session = startGame(
    createGameSession(createConfig(), [
      { ...createGameUnit('player-1', GameSide.Player), heatSinks: 0 },
      createGameUnit('opponent-1', GameSide.Opponent),
    ]),
    GameSide.Player,
  );
  const append = (type: GameEventType, payload: IGameEvent['payload']) => {
    session = appendEvent(session, {
      ...createEventBase(
        session.id,
        session.events.length,
        type,
        session.currentState.turn,
        GamePhase.Heat,
        'player-1',
      ),
      payload,
    });
  };
  append(GameEventType.PhaseChanged, {
    fromPhase: session.currentState.phase,
    toPhase: GamePhase.Heat,
  });
  append(GameEventType.HeatGenerated, {
    unitId: 'player-1',
    amount: heat,
    source: 'environment',
    newTotal: heat,
  });
  if (empShutdownTurns > 0) {
    append(GameEventType.EmpMinefieldEffectApplied, {
      unitId: 'player-1',
      hex: { q: 0, r: 0 },
      roll: 9,
      modifier: 0,
      modifiedRoll: 9,
      effect: 'shutdown',
      durationTurns: empShutdownTurns,
      source: 'minefield',
    });
  } else {
    append(GameEventType.ShutdownCheck, {
      unitId: 'player-1',
      heatLevel: heat,
      targetNumber: 4,
      roll: 2,
      shutdownOccurred: true,
    });
  }
  return session;
}

describe('C10 heat startup lifecycle parity', () => {
  it('expires session EMP shutdown after exactly two new-turn boundaries', () => {
    let session = c10HeatSession(0, 2);
    session = resolveHeatPhase(session, fixedRoller);
    expect(session.currentState.units['player-1'].shutdown).toBe(true);
    for (const remaining of [1, 0]) {
      const turn = session.currentState.turn + 1;
      session = appendEvent(session, {
        ...createEventBase(
          session.id,
          session.events.length,
          GameEventType.TurnStarted,
          turn,
          GamePhase.Initiative,
        ),
        payload: { _type: 'turn_started' },
      });
      session = appendEvent(session, {
        ...createEventBase(
          session.id,
          session.events.length,
          GameEventType.PhaseChanged,
          turn,
          GamePhase.Heat,
        ),
        payload: { fromPhase: GamePhase.Initiative, toPhase: GamePhase.Heat },
      });
      expect(session.currentState.units['player-1'].empShutdownTurns).toBe(
        remaining,
      );
      session = resolveHeatPhase(session, fixedRoller);
      expect(session.currentState.units['player-1'].shutdown).toBe(
        remaining > 0,
      );
    }
  });

  it.each([13, 14, 29])(
    'handles KO session startup at heat %s without startup dice',
    (heat) => {
      let session = c10HeatSession(heat, 0);
      session = appendEvent(session, {
        ...createEventBase(
          session.id,
          session.events.length,
          GameEventType.PilotHit,
          session.currentState.turn,
          GamePhase.Heat,
          'player-1',
        ),
        payload: {
          unitId: 'player-1',
          wounds: 1,
          totalWounds: 1,
          source: 'heat',
          consciousnessCheckRequired: true,
          consciousnessCheckPassed: false,
        },
      });
      const dice = jest.fn(fixedRoller);
      const resolved = resolveHeatPhase(session, dice);
      expect(resolved.currentState.units['player-1'].shutdown).toBe(heat >= 14);
      const startup = resolved.events
        .slice(session.events.length)
        .find((e) => e.type === GameEventType.StartupAttempt);
      expect(startup?.payload).toMatchObject({ success: heat < 14, roll: 0 });
      expect(dice).not.toHaveBeenCalled();
    },
  );

  it.each([1, 6])(
    'keeps EMP shutdown through heat with %s rounds left',
    (duration) => {
      const session = c10HeatSession(0, duration);
      const dice = jest.fn(fixedRoller);
      const resolved = resolveHeatPhase(session, dice);
      const added = resolved.events.slice(session.events.length);
      expect(resolved.currentState.units['player-1'].shutdown).toBe(true);
      expect(
        added.filter(
          (e) =>
            e.type === GameEventType.StartupAttempt ||
            e.type === GameEventType.ShutdownCheck,
        ),
      ).toEqual([]);
      expect(dice).not.toHaveBeenCalled();

      const events: IGameEvent[] = [];
      const random = new SeededRandom(42);
      const next = jest.spyOn(random, 'next');
      const runner = runHeatPhase({
        state: createRunnerHeatState(
          createRunnerUnit({
            shutdown: true,
            empShutdownTurns: duration,
            heatSinks: 0,
          }),
        ),
        events,
        gameId: 'c10',
        random,
      });
      expect(runner.units['player-1'].shutdown).toBe(true);
      expect(
        events.filter(
          (e) =>
            e.type === GameEventType.StartupAttempt ||
            e.type === GameEventType.ShutdownCheck,
        ),
      ).toEqual([]);
      expect(next).not.toHaveBeenCalled();
    },
  );

  it('expires runner EMP shutdown after exactly two new-turn boundaries', () => {
    let state = createRunnerHeatState(
      createRunnerUnit({
        shutdown: true,
        empShutdownTurns: 2,
        heatSinks: 0,
      }),
    );
    const resolve = () =>
      runHeatPhase({
        state,
        events: [],
        gameId: 'c10',
        random: new SeededRandom(42),
      });
    state = resolve();
    expect(state.units['player-1'].shutdown).toBe(true);
    state = resetTurnState({ ...state, turn: state.turn + 1 });
    expect(state.units['player-1'].empShutdownTurns).toBe(1);
    state = resolve();
    expect(state.units['player-1'].shutdown).toBe(true);
    state = resetTurnState({ ...state, turn: state.turn + 1 });
    expect(state.units['player-1'].empShutdownTurns).toBe(0);
    state = resolve();
    expect(state.units['player-1'].shutdown).toBe(false);
  });

  it.each([true, false])(
    'does not check shutdown after rolled startup success=%s',
    (success) => {
      const session = c10HeatSession(14, 0);
      const dice = jest.fn(() => ({
        dice: success
          ? ([6, 6] as [number, number])
          : ([1, 1] as [number, number]),
        total: success ? 12 : 2,
        isSnakeEyes: !success,
        isBoxcars: success,
      }));
      const resolved = resolveHeatPhase(session, dice);
      const added = resolved.events.slice(session.events.length);
      expect(
        added.filter((e) => e.type === GameEventType.ShutdownCheck),
      ).toEqual([]);
      expect(
        added.filter((e) => e.type === GameEventType.StartupAttempt),
      ).toHaveLength(1);
      expect(resolved.currentState.units['player-1'].shutdown).toBe(!success);
      expect(dice).toHaveBeenCalledTimes(1);

      const events: IGameEvent[] = [];
      const random = new SeededRandom(42);
      const next = jest
        .spyOn(random, 'next')
        .mockReturnValue(success ? 0.99 : 0);
      const runner = runHeatPhase({
        state: createRunnerHeatState(
          createRunnerUnit({
            shutdown: true,
            heat: 14,
            heatSinks: 0,
          }),
        ),
        events,
        gameId: 'c10',
        random,
      });
      expect(
        events.filter((e) => e.type === GameEventType.ShutdownCheck),
      ).toEqual([]);
      expect(
        events.filter((e) => e.type === GameEventType.StartupAttempt),
      ).toHaveLength(1);
      expect(runner.units['player-1'].shutdown).toBe(!success);
      expect(next).toHaveBeenCalledTimes(2);
    },
  );

  it('does not repeat automatic shutdown or its PSR on an already-shut-down unit', () => {
    const session = c10HeatSession(30, 0);
    const resolved = resolveHeatPhase(session, fixedRoller);
    expect(
      resolved.events
        .slice(session.events.length)
        .filter(
          (e) =>
            e.type === GameEventType.ShutdownCheck ||
            e.type === GameEventType.PSRTriggered,
        ),
    ).toEqual([]);
    const events: IGameEvent[] = [];
    runHeatPhase({
      state: createRunnerHeatState(
        createRunnerUnit({
          shutdown: true,
          heat: 30,
          heatSinks: 0,
        }),
      ),
      events,
      gameId: 'c10',
      random: new SeededRandom(42),
    });
    expect(
      events.filter(
        (e) =>
          e.type === GameEventType.ShutdownCheck ||
          e.type === GameEventType.PSRTriggered,
      ),
    ).toEqual([]);
  });
});
