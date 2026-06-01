/**
 * Scenario Objective Engine — control detection + victory evaluation.
 *
 * Covers the `scenario-objectives` delta-spec scenarios for:
 *   - Objective Marker Data Model (markerless → destroy)
 *   - Objective Control Detection (sole occupancy / contested / vacated)
 *   - Objective-Based Victory Evaluation (Capture / Defend / Breakthrough)
 *
 * @spec openspec/changes/add-scenario-objective-engine/specs/scenario-objectives/spec.md
 */

import type { IGameState, IUnitGameState } from '@/types/gameplay';
import type { IObjectiveMarker } from '@/types/scenario/ScenarioInterfaces';

import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
} from '@/types/gameplay';
import { ScenarioObjectiveType } from '@/types/scenario/ScenarioInterfaces';

import {
  advanceObjectiveControl,
  detectObjectiveControl,
  evaluateObjectiveOutcome,
} from '../objectiveEngine';

// =============================================================================
// Fixtures
// =============================================================================

function unit(
  id: string,
  side: GameSide,
  q: number,
  r: number,
  overrides: Partial<IUnitGameState> = {},
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
    ...overrides,
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
    holdTurnsRequired: 1,
    holdProgress: 0,
    ...overrides,
  };
}

function state(
  units: IUnitGameState[],
  objectives?: Record<string, IObjectiveMarker>,
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
    ...(objectives !== undefined ? { objectives } : {}),
  };
}

// =============================================================================
// Objective Marker Data Model — markerless → destroy
// =============================================================================

describe('evaluateObjectiveOutcome — markerless session', () => {
  it('treats an absent objective map as a destroy scenario', () => {
    const s = state([
      unit('player-1', GameSide.Player, 0, 0),
      unit('opponent-1', GameSide.Opponent, 0, 0, { destroyed: true }),
    ]);
    const outcome = evaluateObjectiveOutcome(s);
    expect(outcome).not.toBeNull();
    expect(outcome?.objectiveType).toBe(ScenarioObjectiveType.Destroy);
    expect(outcome?.winningSide).toBe(GameSide.Player);
  });

  it('treats an empty objective map identically to destruction', () => {
    const s = state(
      [
        unit('player-1', GameSide.Player, 0, 0),
        unit('opponent-1', GameSide.Opponent, 0, 0),
      ],
      {},
    );
    // Both sides alive → undecided.
    expect(evaluateObjectiveOutcome(s)).toBeNull();
  });
});

// =============================================================================
// Objective Control Detection
// =============================================================================

describe('detectObjectiveControl — sole occupancy', () => {
  it('takes control when one side occupies a neutral hex alone', () => {
    const s = state([unit('player-1', GameSide.Player, 0, 0)]);
    const result = detectObjectiveControl(marker(), s);
    expect(result.controlSide).toBe('player');
  });

  it('keeps the last controller when the hex is contested', () => {
    const s = state([
      unit('player-1', GameSide.Player, 0, 0),
      unit('opponent-1', GameSide.Opponent, 0, 0),
    ]);
    const held = marker({ controlSide: 'player' });
    expect(detectObjectiveControl(held, s).controlSide).toBe('player');
  });

  it('keeps the last controller when the hex is vacated', () => {
    const s = state([unit('player-1', GameSide.Player, 5, 5)]);
    const held = marker({ controlSide: 'opponent' });
    expect(detectObjectiveControl(held, s).controlSide).toBe('opponent');
  });

  it('ignores destroyed, retreated, and ejected units for control', () => {
    const s = state([
      unit('player-1', GameSide.Player, 0, 0, { destroyed: true }),
      unit('opponent-1', GameSide.Opponent, 0, 0, { hasRetreated: true }),
      unit('player-2', GameSide.Player, 0, 0, { hasEjected: true }),
    ]);
    // Neither projects control → hex stays neutral.
    expect(detectObjectiveControl(marker(), s).controlSide).toBe('neutral');
  });
});

describe('advanceObjectiveControl — hold progress', () => {
  it('takes control and starts hold progress at 1', () => {
    const s = state([unit('player-1', GameSide.Player, 0, 0)]);
    const change = advanceObjectiveControl(marker(), s);
    expect(change.captured).toBe(true);
    expect(change.marker.controlSide).toBe('player');
    expect(change.marker.holdProgress).toBe(1);
    expect(change.progressChanged).toBe(true);
  });

  it('increments hold progress while a side keeps sole occupancy', () => {
    const s = state([unit('player-1', GameSide.Player, 0, 0)]);
    const held = marker({ controlSide: 'player', holdProgress: 1 });
    const change = advanceObjectiveControl(held, s);
    expect(change.captured).toBe(false);
    expect(change.marker.holdProgress).toBe(2);
  });

  it('resets hold progress to 0 when the hex becomes contested', () => {
    const s = state([
      unit('player-1', GameSide.Player, 0, 0),
      unit('opponent-1', GameSide.Opponent, 0, 0),
    ]);
    const held = marker({ controlSide: 'player', holdProgress: 3 });
    const change = advanceObjectiveControl(held, s);
    expect(change.marker.controlSide).toBe('player');
    expect(change.marker.holdProgress).toBe(0);
    expect(change.lost).toBe(true);
  });

  it('resets hold progress when control is lost to the other side', () => {
    const s = state([unit('opponent-1', GameSide.Opponent, 0, 0)]);
    const held = marker({ controlSide: 'player', holdProgress: 2 });
    const change = advanceObjectiveControl(held, s);
    expect(change.marker.controlSide).toBe('opponent');
    expect(change.marker.holdProgress).toBe(1);
    expect(change.lost).toBe(true);
    expect(change.captured).toBe(true);
  });

  it('keeps the controller but stops accruing hold when the hex is vacated', () => {
    const s = state([unit('player-1', GameSide.Player, 9, 9)]);
    const held = marker({ controlSide: 'player', holdProgress: 2 });
    const change = advanceObjectiveControl(held, s);
    expect(change.marker.controlSide).toBe('player');
    expect(change.marker.holdProgress).toBe(0);
  });
});

// =============================================================================
// Victory Evaluation — Capture
// =============================================================================

describe('evaluateObjectiveOutcome — Capture', () => {
  it('decides for the attacker once it holds for the required turns', () => {
    const objectives = {
      '0,0': marker({ holdTurnsRequired: 2, controlSide: 'player' }),
    };
    // holdProgress below threshold → undecided.
    objectives['0,0'] = { ...objectives['0,0'], holdProgress: 1 };
    const s1 = state([], objectives);
    expect(evaluateObjectiveOutcome(s1)).toBeNull();

    // holdProgress meets threshold → attacker wins.
    const s2 = state([], {
      '0,0': marker({
        holdTurnsRequired: 2,
        controlSide: 'player',
        holdProgress: 2,
      }),
    });
    const outcome = evaluateObjectiveOutcome(s2);
    expect(outcome?.winningSide).toBe(GameSide.Player);
    expect(outcome?.reason).toBe('objective');
    expect(outcome?.objectiveType).toBe(ScenarioObjectiveType.Capture);
  });

  it('requires ALL objective hexes held', () => {
    const s = state([], {
      '0,0': marker({
        id: 'objective-1',
        hexKey: '0,0',
        controlSide: 'player',
        holdProgress: 1,
      }),
      '1,0': marker({
        id: 'objective-2',
        hexKey: '1,0',
        controlSide: 'neutral',
        holdProgress: 0,
      }),
    });
    expect(evaluateObjectiveOutcome(s)).toBeNull();
  });

  it('returns null after control is lost mid-hold (progress reset)', () => {
    // Attacker held 1 turn, then lost control → holdProgress 0.
    const s = state([], {
      '0,0': marker({
        objectiveType: 'capture',
        holdTurnsRequired: 2,
        controlSide: 'player',
        holdProgress: 0,
      }),
    });
    expect(evaluateObjectiveOutcome(s)).toBeNull();
  });
});

// =============================================================================
// Victory Evaluation — Defend
// =============================================================================

describe('evaluateObjectiveOutcome — Defend', () => {
  it('decides for the defender at the turn limit when still in control', () => {
    const s = state(
      [],
      {
        '0,0': marker({ objectiveType: 'defend', controlSide: 'opponent' }),
      },
      6,
    );
    const outcome = evaluateObjectiveOutcome(s, 6);
    expect(outcome?.winningSide).toBe(GameSide.Opponent);
    expect(outcome?.objectiveType).toBe(ScenarioObjectiveType.Defend);
  });

  it('stays undecided before the turn limit', () => {
    const s = state(
      [],
      {
        '0,0': marker({ objectiveType: 'defend', controlSide: 'opponent' }),
      },
      3,
    );
    expect(evaluateObjectiveOutcome(s, 6)).toBeNull();
  });

  it('decides for the attacker immediately on capturing the objective', () => {
    const s = state(
      [],
      {
        '0,0': marker({ objectiveType: 'defend', controlSide: 'player' }),
      },
      2,
    );
    const outcome = evaluateObjectiveOutcome(s, 6);
    expect(outcome?.winningSide).toBe(GameSide.Player);
    expect(outcome?.objectiveType).toBe(ScenarioObjectiveType.Defend);
  });
});

// =============================================================================
// Victory Evaluation — Breakthrough
// =============================================================================

describe('evaluateObjectiveOutcome — Breakthrough', () => {
  it('decides for the attacker when enough units reach an exit hex', () => {
    const objectives = {
      '0,4': marker({
        id: 'objective-1',
        hexKey: '0,4',
        objectiveType: 'breakthrough',
        // holdTurnsRequired carries the required-units count.
        holdTurnsRequired: 2,
      }),
    };
    // Only one attacker on the exit hex → undecided.
    const s1 = state([unit('player-1', GameSide.Player, 0, 4)], objectives);
    expect(evaluateObjectiveOutcome(s1)).toBeNull();

    // Two attacker units on the exit hex → attacker wins.
    const s2 = state(
      [
        unit('player-1', GameSide.Player, 0, 4),
        unit('player-2', GameSide.Player, 0, 4),
      ],
      objectives,
    );
    const outcome = evaluateObjectiveOutcome(s2);
    expect(outcome?.winningSide).toBe(GameSide.Player);
    expect(outcome?.objectiveType).toBe(ScenarioObjectiveType.Breakthrough);
  });

  it('does not count ejected units toward breakthrough exits', () => {
    const objectives = {
      '0,4': marker({
        id: 'objective-1',
        hexKey: '0,4',
        objectiveType: 'breakthrough',
        holdTurnsRequired: 2,
      }),
    };
    const s = state(
      [
        unit('player-1', GameSide.Player, 0, 4),
        unit('player-2', GameSide.Player, 0, 4, { hasEjected: true }),
      ],
      objectives,
    );

    expect(evaluateObjectiveOutcome(s)).toBeNull();
  });

  it('overrides surviving units — objective win even with both sides alive', () => {
    const objectives = {
      '0,4': marker({
        id: 'objective-1',
        hexKey: '0,4',
        objectiveType: 'breakthrough',
        holdTurnsRequired: 1,
      }),
    };
    const s = state(
      [
        unit('player-1', GameSide.Player, 0, 4),
        unit('player-2', GameSide.Player, 0, 0),
        unit('opponent-1', GameSide.Opponent, 0, -4),
      ],
      objectives,
    );
    const outcome = evaluateObjectiveOutcome(s);
    expect(outcome).not.toBeNull();
    expect(outcome?.winningSide).toBe(GameSide.Player);
  });
});
