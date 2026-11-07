import {
  GameEventType,
  GamePhase,
  GameSide,
  MovementType,
  RangeBracket,
  type IGameEvent,
  type IGameState,
} from '@/types/gameplay';
import { createPhaseChangedEvent } from '@/utils/gameplay/gameEvents';
import {
  appendEvent,
  createGameSession,
  hydrateGameSessionFromEvents,
  startGame,
} from '@/utils/gameplay/gameSession';
import { resolveHeatPhase } from '@/utils/gameplay/gameSessionHeat';
import {
  buildWeaponAttackAttackerToHitState,
  buildWeaponAttackTargetToHitState,
  calculateToHit,
} from '@/utils/gameplay/toHit';

import { applyEvent } from '..';
import {
  runtimeMovementUnit,
  stateWithUnit,
} from './runtimeMovementState.helpers';

const TURN_BOUNDARIES = [
  GameEventType.TurnStarted,
  GameEventType.PhaseChanged,
] as const;

function nextTurn(
  state: IGameState,
  type: GameEventType.TurnStarted | GameEventType.PhaseChanged,
  sequence = 10,
): IGameEvent {
  return {
    ...createPhaseChangedEvent(
      state.gameId,
      sequence,
      state.turn + 1,
      GamePhase.End,
      GamePhase.Initiative,
    ),
    type,
    payload:
      type === GameEventType.TurnStarted
        ? {}
        : { fromPhase: GamePhase.End, toPhase: GamePhase.Initiative },
  };
}

describe('event-sourced per-turn movement reset', () => {
  it.each(TURN_BOUNDARIES)(
    '%s clears movement before turn-two heat and to-hit consumption',
    (type) => {
      for (const mode of [
        MovementType.Run,
        MovementType.Jump,
        MovementType.Sprint,
        MovementType.Evade,
      ]) {
        const unit = runtimeMovementUnit({
          id: 'player-1',
          movementThisTurn: mode,
          hexesMovedThisTurn: 5,
          movedBackwardThisTurn: true,
          usedMechanicalJumpBoosterThisTurn: true,
          sprintedThisTurn: mode === MovementType.Sprint,
          isEvading: mode === MovementType.Evade,
          evasionBonus: 2,
          pendingConversionStepCount: 2,
          pendingConversionMpCost: 3,
          pendingAltitudeControlStepCount: 1,
          pendingAltitudeControlMpCost: 2,
          heat: 5,
          prone: true,
        });
        const state = { ...stateWithUnit(unit), turn: 1, phase: GamePhase.End };
        const result = applyEvent(state, nextTurn(state, type));
        const reset = result.units[unit.id];
        expect(reset).toMatchObject({
          movementThisTurn: MovementType.Stationary,
          hexesMovedThisTurn: 0,
          movedBackwardThisTurn: false,
          usedMechanicalJumpBoosterThisTurn: false,
          sprintedThisTurn: false,
          isEvading: false,
          heat: 5,
          prone: true,
          position: unit.position,
        });
        expect(reset.evasionBonus).toBeUndefined();
        expect(reset).not.toHaveProperty('pendingConversionStepCount');
        expect(reset).not.toHaveProperty('pendingConversionMpCost');
        expect(reset).not.toHaveProperty('pendingAltitudeControlStepCount');
        expect(reset).not.toHaveProperty('pendingAltitudeControlMpCost');
        const attack = calculateToHit(
          buildWeaponAttackAttackerToHitState({ ...reset, prone: false }, 4),
          buildWeaponAttackTargetToHitState({ ...reset, prone: false }, false),
          RangeBracket.Short,
          3,
        );
        expect(attack.finalToHit).toBe(4);
      }
    },
  );

  it.each(TURN_BOUNDARIES)(
    '%s advances both boosters once, then decays on an idle turn',
    (type) => {
      const unit = runtimeMovementUnit({
        id: 'player-1',
        activeMASC: true,
        activeSupercharger: true,
        mascTurnsUsed: 2,
        superchargerTurnsUsed: 3,
      });
      const state = { ...stateWithUnit(unit), turn: 1 };
      const boundary = nextTurn(state, type);
      const second = applyEvent(state, boundary);
      expect(second.units[unit.id]).toMatchObject({
        activeMASC: false,
        activeSupercharger: false,
        mascTurnsUsed: 3,
        superchargerTurnsUsed: 4,
        mascFailureLevelIncreasedLastTurn: true,
        superchargerFailureLevelIncreasedLastTurn: true,
      });
      const repeated = applyEvent(
        applyEvent(second, boundary),
        nextTurn(
          state,
          type === GameEventType.TurnStarted
            ? GameEventType.PhaseChanged
            : GameEventType.TurnStarted,
        ),
      );
      const movement = applyEvent(
        repeated,
        createPhaseChangedEvent(
          state.gameId,
          11,
          2,
          GamePhase.Initiative,
          GamePhase.Movement,
        ),
      );
      expect(movement.units[unit.id]).toMatchObject({
        mascTurnsUsed: 3,
        superchargerTurnsUsed: 4,
        mascFailureLevelIncreasedLastTurn: true,
        superchargerFailureLevelIncreasedLastTurn: true,
      });
      const third = applyEvent(movement, nextTurn(movement, type));
      expect(third.units[unit.id]).toMatchObject({
        mascTurnsUsed: 1,
        superchargerTurnsUsed: 2,
        mascFailureLevelIncreasedLastTurn: false,
        superchargerFailureLevelIncreasedLastTurn: false,
      });
    },
  );

  it.each([
    { mode: MovementType.Run, heat: 2 },
    { mode: MovementType.Jump, heat: 5 },
    { mode: MovementType.Sprint, heat: 3 },
    { mode: MovementType.Evade, heat: 4 },
  ])(
    'retains $mode heat without charging skipped turn-two movement',
    ({ mode, heat }) => {
      let session = startGame(
        createGameSession(
          {
            mapRadius: 5,
            turnLimit: 0,
            victoryConditions: [],
            optionalRules: [],
          },
          [
            {
              id: 'player-1',
              name: 'Test',
              side: GameSide.Player,
              unitRef: 'test',
              pilotRef: 'pilot',
              gunnery: 4,
              piloting: 5,
              heatSinks: 0,
            },
          ],
        ),
        GameSide.Player,
      );
      const movement: IGameEvent = {
        ...createPhaseChangedEvent(
          session.id,
          2,
          1,
          GamePhase.Initiative,
          GamePhase.Movement,
        ),
        type: GameEventType.MovementDeclared,
        actorId: 'player-1',
        payload: {
          unitId: 'player-1',
          from: { q: 0, r: 0 },
          to: { q: 5, r: 0 },
          facing: 0,
          movementType: mode,
          mpUsed: 5,
          hexesMoved: 5,
          heatGenerated: heat,
        },
      };
      session = appendEvent(session, movement);
      session = appendEvent(
        session,
        createPhaseChangedEvent(
          session.id,
          3,
          1,
          GamePhase.Movement,
          GamePhase.Heat,
        ),
      );
      session = resolveHeatPhase(session);
      const heatAfterFirstTurn = session.currentState.units['player-1'].heat;
      expect(heatAfterFirstTurn).toBeGreaterThan(0);
      session = appendEvent(
        session,
        nextTurn(
          session.currentState,
          GameEventType.PhaseChanged,
          session.events.length,
        ),
      );
      session = appendEvent(
        session,
        createPhaseChangedEvent(
          session.id,
          session.events.length,
          2,
          GamePhase.Initiative,
          GamePhase.Heat,
        ),
      );
      session = resolveHeatPhase(session);
      expect(session.currentState.units['player-1'].heat).toBe(
        heatAfterFirstTurn,
      );
      expect(session.currentState.units['player-1'].movementThisTurn).toBe(
        MovementType.Stationary,
      );
      expect(
        hydrateGameSessionFromEvents(session.id, session.events).currentState,
      ).toEqual(session.currentState);
    },
  );
});
