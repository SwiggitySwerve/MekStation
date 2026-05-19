/**
 * Scenario objective lifecycle events + control pass.
 *
 * Covers the `scenario-objectives` delta-spec scenarios for Objective
 * Lifecycle Events (emit on capture, deterministic, event-log replay).
 *
 * @spec openspec/changes/add-scenario-objective-engine/specs/scenario-objectives/spec.md
 */

import type {
  IGameState,
  IObjectiveCapturedPayload,
  IObjectiveProgressPayload,
  IUnitGameState,
} from '@/types/gameplay';
import type { IObjectiveMarker } from '@/types/scenario/ScenarioInterfaces';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
} from '@/types/gameplay';
import { createGameCreatedEvent } from '@/utils/gameplay/gameEvents/lifecycle';
import { deriveState } from '@/utils/gameplay/gameState';

import { runObjectiveControlPass } from '../objectiveEvents';

// =============================================================================
// Fixtures
// =============================================================================

function unit(
  id: string,
  side: GameSide,
  q: number,
  r: number,
): IUnitGameState {
  return {
    id,
    side,
    position: { q, r },
    facing: Facing.North,
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

function marker(overrides: Partial<IObjectiveMarker> = {}): IObjectiveMarker {
  return {
    id: 'objective-1',
    hexKey: '0,0',
    objectiveType: 'capture',
    owningSide: 'neutral',
    controlSide: 'neutral',
    controlRule: 'sole-occupancy',
    holdTurnsRequired: 3,
    holdProgress: 0,
    ...overrides,
  };
}

function state(
  units: IUnitGameState[],
  objectives: Record<string, IObjectiveMarker>,
  turn = 1,
): IGameState {
  return {
    gameId: 'test-game',
    status: GameStatus.Active,
    turn,
    phase: GamePhase.End,
    activationIndex: 0,
    units: Object.fromEntries(units.map((u) => [u.id, u])),
    turnEvents: [],
    objectives,
  };
}

// =============================================================================
// Lifecycle event emission
// =============================================================================

describe('runObjectiveControlPass — capture emits ObjectiveCaptured', () => {
  it('appends an ObjectiveCaptured event with id, side, and turn', () => {
    const s = state([unit('player-1', GameSide.Player, 0, 0)], {
      '0,0': marker(),
    });
    const pass = runObjectiveControlPass('g', s, 10, 4, GamePhase.End);

    const captured = pass.events.find(
      (e) => e.type === GameEventType.ObjectiveCaptured,
    );
    expect(captured).toBeDefined();
    const payload = captured!.payload as IObjectiveCapturedPayload;
    expect(payload.objectiveId).toBe('objective-1');
    expect(payload.capturingSide).toBe('player');
    expect(payload.turn).toBe(4);
    expect(captured!.sequence).toBeGreaterThanOrEqual(10);

    // Marker was advanced in the returned objective map.
    expect(pass.objectives['0,0'].controlSide).toBe('player');
    expect(pass.objectives['0,0'].holdProgress).toBe(1);
  });

  it('emits an ObjectiveProgress event when hold progress changes', () => {
    const s = state([unit('player-1', GameSide.Player, 0, 0)], {
      '0,0': marker({ controlSide: 'player', holdProgress: 1 }),
    });
    const pass = runObjectiveControlPass('g', s, 0, 2, GamePhase.End);
    const progress = pass.events.find(
      (e) => e.type === GameEventType.ObjectiveProgress,
    );
    expect(progress).toBeDefined();
    const payload = progress!.payload as IObjectiveProgressPayload;
    expect(payload.holdProgress).toBe(2);
    expect(payload.holdTurnsRequired).toBe(3);
  });

  it('emits an ObjectiveLost event when a controlled hex is contested', () => {
    const s = state(
      [
        unit('player-1', GameSide.Player, 0, 0),
        unit('opponent-1', GameSide.Opponent, 0, 0),
      ],
      { '0,0': marker({ controlSide: 'player', holdProgress: 2 }) },
    );
    const pass = runObjectiveControlPass('g', s, 0, 5, GamePhase.End);
    expect(
      pass.events.some((e) => e.type === GameEventType.ObjectiveLost),
    ).toBe(true);
    expect(pass.objectives['0,0'].holdProgress).toBe(0);
  });

  it('is a no-op for a markerless state', () => {
    const s = state([unit('player-1', GameSide.Player, 0, 0)], {});
    const pass = runObjectiveControlPass('g', s, 0, 1, GamePhase.End);
    expect(pass.events).toHaveLength(0);
    expect(Object.keys(pass.objectives)).toHaveLength(0);
  });

  it('produces identical events for identical inputs (determinism)', () => {
    const build = () =>
      state([unit('player-1', GameSide.Player, 0, 0)], { '0,0': marker() });
    const a = runObjectiveControlPass('g', build(), 0, 1, GamePhase.End);
    const b = runObjectiveControlPass('g', build(), 0, 1, GamePhase.End);
    expect(a.events.map((e) => [e.type, e.sequence])).toEqual(
      b.events.map((e) => [e.type, e.sequence]),
    );
    expect(a.objectives).toEqual(b.objectives);
  });
});

// =============================================================================
// Event-log replay
// =============================================================================

describe('event log replays objective state', () => {
  it('reconstructs controlSide and holdProgress by replaying the log', () => {
    const objectives = { '0,0': marker({ holdTurnsRequired: 3 }) };
    // Seed event carries the placed markers.
    const created = createGameCreatedEvent(
      'g',
      { mapRadius: 5, turnLimit: 10, victoryConditions: [], optionalRules: [] },
      [],
      undefined,
      objectives,
    );

    // Run three turns of the control pass with a player unit holding
    // the hex, threading the objective map turn-to-turn.
    const events = [created];
    let liveObjectives: Record<string, IObjectiveMarker> = objectives;
    let sequence = 1;
    for (let turn = 1; turn <= 3; turn++) {
      const s = state(
        [unit('player-1', GameSide.Player, 0, 0)],
        liveObjectives,
        turn,
      );
      const pass = runObjectiveControlPass(
        'g',
        s,
        sequence,
        turn,
        GamePhase.End,
      );
      events.push(...pass.events);
      sequence += pass.events.length;
      liveObjectives = pass.objectives;
    }

    // Replaying the full log from scratch must reconstruct the same
    // objective state the live pass produced.
    const replayed = deriveState('g', events);
    expect(replayed.objectives).toBeDefined();
    expect(replayed.objectives!['0,0'].controlSide).toBe('player');
    expect(replayed.objectives!['0,0'].holdProgress).toBe(
      liveObjectives['0,0'].holdProgress,
    );
    expect(liveObjectives['0,0'].holdProgress).toBe(3);
  });

  it('seeds the objective map from the GameCreated event', () => {
    const objectives = { '0,0': marker() };
    const created = createGameCreatedEvent(
      'g',
      { mapRadius: 5, turnLimit: 10, victoryConditions: [], optionalRules: [] },
      [],
      undefined,
      objectives,
    );
    const replayed = deriveState('g', [created]);
    expect(replayed.objectives).toBeDefined();
    expect(replayed.objectives!['0,0'].id).toBe('objective-1');
  });

  it('leaves objectives undefined for a markerless GameCreated event', () => {
    const created = createGameCreatedEvent(
      'g',
      {
        mapRadius: 5,
        turnLimit: 10,
        victoryConditions: [],
        optionalRules: [],
      },
      [],
    );
    const replayed = deriveState('g', [created]);
    expect(replayed.objectives).toBeUndefined();
  });
});
