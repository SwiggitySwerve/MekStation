/**
 * deriveState is exactly the reduce of applyEvent from createInitialGameState,
 * with no post-processing: every applyEvent call takes the previous call's
 * returned object, in event order, and deriveState returns the last result
 * itself. That is what lets the seeded corpus read deriveState's value at
 * event i from one running loop instead of rerunning deriveState per prefix.
 * (The fold-revision stamp lives in deriveFoldedState, not here.)
 */
import type { IGameEvent, IGameState } from '@/types/gameplay';

import { deriveState } from '@/utils/gameplay/gameState';

import { makeReconnectHostEvents } from '../gameSessionEvents.fixtures';

interface IApplyCall {
  readonly input: IGameState;
  readonly event: IGameEvent;
  readonly output: IGameState;
}

const mockApplyCalls: IApplyCall[] = [];
const mockInitialStates: IGameState[] = [];

jest.mock('@/utils/gameplay/gameState/eventDispatch', () => {
  const actual = jest.requireActual<
    typeof import('@/utils/gameplay/gameState/eventDispatch')
  >('@/utils/gameplay/gameState/eventDispatch');
  return {
    ...actual,
    applyEvent: (input: IGameState, event: IGameEvent): IGameState => {
      const output = actual.applyEvent(input, event);
      mockApplyCalls.push({ input, event, output });
      return output;
    },
  };
});
jest.mock('@/utils/gameplay/gameState/initialization', () => {
  const actual = jest.requireActual<
    typeof import('@/utils/gameplay/gameState/initialization')
  >('@/utils/gameplay/gameState/initialization');
  return {
    ...actual,
    createInitialGameState: (gameId: string): IGameState => {
      const state = actual.createInitialGameState(gameId);
      mockInitialStates.push(state);
      return state;
    },
  };
});

// Built before the counters reset: the fixture folds its own session.
const events = makeReconnectHostEvents();

beforeEach(() => {
  mockApplyCalls.length = 0;
  mockInitialStates.length = 0;
});

describe('deriveState structure', () => {
  it('is the applyEvent reduce from the initial state, returning its last result', () => {
    const result = deriveState('match-1', events);

    expect(mockInitialStates).toHaveLength(1);
    expect(mockApplyCalls).toHaveLength(events.length);
    mockApplyCalls.forEach((call, index) => {
      expect(call.event).toBe(events[index]);
      expect(call.input).toBe(
        index === 0 ? mockInitialStates[0] : mockApplyCalls[index - 1].output,
      );
    });
    expect(result).toBe(mockApplyCalls.at(-1)!.output);
  });

  it('returns the initial state itself for an empty log', () => {
    const result = deriveState('match-1', []);
    expect(mockApplyCalls).toHaveLength(0);
    expect(result).toBe(mockInitialStates[0]);
  });
});
