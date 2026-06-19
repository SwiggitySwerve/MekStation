import { EventStoreService } from '@/services/events';
import { EventCategory, IBaseEvent } from '@/types/events';
import { ReducerMap } from '@/utils/events/stateDerivation';

interface TestState {
  turn: number;
  score: number;
}

export const initialState: TestState = { turn: 0, score: 0 };

export function createMockEvent(
  sequence: number,
  type: string,
  payload: unknown = {},
): IBaseEvent {
  return {
    id: `event-${sequence}`,
    sequence,
    timestamp: new Date().toISOString(),
    category: EventCategory.Game,
    type,
    payload,
    context: { gameId: 'game-1' },
  };
}

export const testReducers: ReducerMap<TestState> = {
  [EventCategory.Game]: {
    'turn-advance': (state) => ({
      ...state,
      turn: state.turn + 1,
    }),
    'score-change': (state, event) => ({
      ...state,
      score: state.score + (event.payload as { delta: number }).delta,
    }),
  },
};

export function createMockEventStore(
  events: IBaseEvent[] = [],
): EventStoreService {
  const store = new EventStoreService();
  for (const event of events) {
    store.append(event);
  }
  return store;
}
