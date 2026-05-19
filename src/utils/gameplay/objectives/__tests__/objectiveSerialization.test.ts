/**
 * Objective marker type guard + session serialization round-trip.
 *
 * Covers `scenario-objectives` delta-spec scenario "Objective map
 * survives serialization" and task 1.4.
 *
 * @spec openspec/changes/add-scenario-objective-engine/specs/scenario-objectives/spec.md
 */

import type { IGameState } from '@/types/gameplay';
import type { IObjectiveMarker } from '@/types/scenario/ScenarioInterfaces';

import { GamePhase, GameStatus } from '@/types/gameplay';
import { isObjectiveMarker } from '@/types/scenario/ScenarioInterfaces';

function marker(overrides: Partial<IObjectiveMarker> = {}): IObjectiveMarker {
  return {
    id: 'objective-1',
    hexKey: '0,0',
    objectiveType: 'capture',
    owningSide: 'neutral',
    controlSide: 'player',
    controlRule: 'sole-occupancy',
    holdTurnsRequired: 3,
    holdProgress: 2,
    ...overrides,
  };
}

describe('isObjectiveMarker', () => {
  it('accepts a well-formed marker', () => {
    expect(isObjectiveMarker(marker())).toBe(true);
  });

  it('rejects non-objects and malformed markers', () => {
    expect(isObjectiveMarker(null)).toBe(false);
    expect(isObjectiveMarker(42)).toBe(false);
    expect(isObjectiveMarker({ id: 'x' })).toBe(false);
    expect(isObjectiveMarker({ ...marker(), objectiveType: 'escort' })).toBe(
      false,
    );
  });
});

describe('objective map survives serialization', () => {
  it('preserves three markers with identical control + hold values', () => {
    const objectives: Record<string, IObjectiveMarker> = {
      '0,0': marker({
        id: 'objective-1',
        hexKey: '0,0',
        controlSide: 'player',
        holdProgress: 2,
      }),
      '1,0': marker({
        id: 'objective-2',
        hexKey: '1,0',
        controlSide: 'opponent',
        holdProgress: 1,
      }),
      '0,1': marker({
        id: 'objective-3',
        hexKey: '0,1',
        objectiveType: 'breakthrough',
        controlSide: 'neutral',
        holdProgress: 0,
      }),
    };

    const state: IGameState = {
      gameId: 'serial-test',
      status: GameStatus.Active,
      turn: 4,
      phase: GamePhase.End,
      activationIndex: 0,
      units: {},
      turnEvents: [],
      objectives,
    };

    const roundTripped: IGameState = JSON.parse(JSON.stringify(state));

    expect(roundTripped.objectives).toBeDefined();
    expect(Object.keys(roundTripped.objectives!)).toHaveLength(3);

    for (const key of Object.keys(objectives)) {
      const original = objectives[key];
      const restored = roundTripped.objectives![key];
      expect(restored.id).toBe(original.id);
      expect(restored.controlSide).toBe(original.controlSide);
      expect(restored.holdProgress).toBe(original.holdProgress);
      expect(restored.holdTurnsRequired).toBe(original.holdTurnsRequired);
      expect(restored.objectiveType).toBe(original.objectiveType);
      expect(isObjectiveMarker(restored)).toBe(true);
    }
  });
});
