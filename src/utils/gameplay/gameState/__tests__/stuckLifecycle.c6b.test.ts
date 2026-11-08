import {
  Facing,
  GameEventType,
  GamePhase,
  MovementType,
  PSRTrigger,
  type IGameEvent,
  type IGameState,
  type IUnitGameState,
} from '@/types/gameplay';
import {
  createMovementDeclaredEvent,
  createPhaseChangedEvent,
  createPSRResolvedEvent,
  createPSRTriggeredEvent,
  createUnitStuckEvent,
} from '@/utils/gameplay/gameEvents';
import { resetPerTurnMovementState } from '@/utils/gameplay/movement/perTurnMovementState';

import { applyEvent } from '..';
import {
  runtimeMovementUnit,
  stateWithUnit,
} from './runtimeMovementState.helpers';

const UNIT_ID = 'mech-1';
const CONTEXT = {
  gameId: 'game-1',
  sequence: 1,
  turn: 2,
  phase: GamePhase.Movement,
  unitId: UNIT_ID,
} as const;

function stuckState(overrides: Partial<IUnitGameState> = {}): IGameState {
  return stateWithUnit(
    runtimeMovementUnit({ id: UNIT_ID, isStuck: true, ...overrides }),
  );
}

function unitAfter(state: IGameState, ...events: IGameEvent[]) {
  return events.reduce(applyEvent, state).units[UNIT_ID];
}

function recoveryEvents(passed: boolean): IGameEvent[] {
  return [
    createPSRTriggeredEvent(
      CONTEXT.gameId,
      1,
      CONTEXT.turn,
      GamePhase.Movement,
      UNIT_ID,
      'Break free of swamp',
      1,
      PSRTrigger.SwampUnstuck,
      5,
      PSRTrigger.SwampUnstuck,
    ),
    createPSRResolvedEvent(
      CONTEXT.gameId,
      2,
      CONTEXT.turn,
      GamePhase.Movement,
      UNIT_ID,
      6,
      passed ? 9 : 4,
      1,
      passed,
      'Break free of swamp',
      PSRTrigger.SwampUnstuck,
    ),
  ];
}

function movement(movementType: MovementType): IGameEvent {
  return createMovementDeclaredEvent({
    gameId: CONTEXT.gameId,
    sequence: 3,
    turn: CONTEXT.turn,
    unitId: UNIT_ID,
    from: { q: 0, r: 0 },
    to: { q: 2, r: 0 },
    facing: Facing.North,
    movementType,
    mpUsed: 2,
    heatGenerated: 0,
  });
}

describe('C6b reducer stuck lifecycle', () => {
  it('T-R1: a legacy UnitStuck sets stuck without writing an eligibility key', () => {
    const unit = unitAfter(
      stateWithUnit(runtimeMovementUnit({ id: UNIT_ID, isStuck: false })),
      createUnitStuckEvent({
        ...CONTEXT,
        reason: 'Avoid bogging down',
        reasonCode: PSRTrigger.SwampBogDown,
      }),
    );
    expect(unit.isStuck).toBe(true);
    expect(unit).not.toHaveProperty('canUnstickByJumping');
  });

  it('T-R1: a UnitStuck that grants jump eligibility records it', () => {
    const event = createUnitStuckEvent({
      ...CONTEXT,
      reasonCode: PSRTrigger.SwampBogDown,
    });
    const unit = unitAfter(
      stateWithUnit(runtimeMovementUnit({ id: UNIT_ID, isStuck: false })),
      { ...event, payload: { ...event.payload, canUnstickByJumping: true } },
    );
    expect(unit).toMatchObject({ isStuck: true, canUnstickByJumping: true });
  });

  it('T-R2: a failed recovery roll keeps the unit stuck and eligible', () => {
    const unit = unitAfter(
      stuckState({ canUnstickByJumping: true }),
      ...recoveryEvents(false),
    );
    expect(unit).toMatchObject({
      isStuck: true,
      canUnstickByJumping: true,
      pendingPSRs: [],
    });
  });

  it('T-R3: a passed recovery roll frees the unit and drops eligibility', () => {
    const unit = unitAfter(
      stuckState({ canUnstickByJumping: true }),
      ...recoveryEvents(true),
    );
    expect(unit.isStuck).toBe(false);
    expect(unit).not.toHaveProperty('canUnstickByJumping');
    expect(unit.pendingPSRs).toEqual([]);
  });

  it('T-R3: passing any other PSR does not free a stuck unit', () => {
    const unit = unitAfter(
      stuckState({ canUnstickByJumping: true }),
      createPSRResolvedEvent(
        CONTEXT.gameId,
        1,
        CONTEXT.turn,
        GamePhase.Movement,
        UNIT_ID,
        6,
        9,
        0,
        true,
        'Standing up',
        PSRTrigger.StandingUp,
      ),
    );
    expect(unit).toMatchObject({ isStuck: true, canUnstickByJumping: true });
  });

  it('T-R4: an eligible stuck unit that jumps is freed', () => {
    const unit = unitAfter(
      stuckState({ canUnstickByJumping: true }),
      movement(MovementType.Jump),
    );
    expect(unit.isStuck).toBe(false);
    expect(unit).not.toHaveProperty('canUnstickByJumping');
  });

  it('T-R4: an eligible stuck unit that walks stays stuck', () => {
    const unit = unitAfter(
      stuckState({ canUnstickByJumping: true }),
      movement(MovementType.Walk),
    );
    expect(unit).toMatchObject({ isStuck: true, canUnstickByJumping: true });
  });

  it('T-R5: a jump by a stuck unit without eligibility leaves it stuck', () => {
    const unit = unitAfter(stuckState(), movement(MovementType.Jump));
    expect(unit.isStuck).toBe(true);
    expect(unit).not.toHaveProperty('canUnstickByJumping');
  });

  it('T-R6: stuck state and eligibility survive the per-turn reset', () => {
    const state = stuckState({ canUnstickByJumping: true });
    expect(resetPerTurnMovementState(state.units[UNIT_ID])).toMatchObject({
      isStuck: true,
      canUnstickByJumping: true,
    });

    const boundary = {
      ...createPhaseChangedEvent(
        CONTEXT.gameId,
        9,
        CONTEXT.turn + 1,
        GamePhase.End,
        GamePhase.Initiative,
      ),
      type: GameEventType.TurnStarted,
      payload: {},
    };
    expect(unitAfter(state, boundary)).toMatchObject({
      isStuck: true,
      canUnstickByJumping: true,
    });
  });
});
