import { GameEventType, GamePhase, type IGameEvent } from '@/types/gameplay';
import { UnreadableStoredEventError } from '@/utils/gameplay/gameEvents/serialization';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { persistInitialEvents } from '../ServerMatchHostEvents';
import { commitThenPublish } from '../ServerMatchHostPublication';

const finite: IGameEvent = {
  id: 'event',
  gameId: 'match',
  sequence: 1,
  timestamp: '2026-01-01T00:00:00Z',
  type: GameEventType.PSRResolved,
  turn: 1,
  phase: GamePhase.End,
  payload: {
    unitId: 'mek',
    targetNumber: 5,
    roll: 4,
    modifiers: 0,
    passed: false,
    reason: 'Damage',
  },
};
function deps(events: readonly IGameEvent[]) {
  return {
    matchId: 'match',
    events,
    appendEvent: jest.fn(async (_event: IGameEvent) => undefined),
    sendRefusal: jest.fn(),
    broadcastEvent: jest.fn(async () => undefined),
    closeMatch: jest.fn(async () => undefined),
  };
}
afterEach(() => jest.restoreAllMocks());

describe('host commit/publication stored-image reader guard', () => {
  it('checks initial history before any store append', async () => {
    const store = new InMemoryMatchStore({ quiet: true });
    const append = jest.spyOn(store, 'appendEvent');
    await expect(
      persistInitialEvents({
        matchId: 'match',
        store,
        events: [
          finite,
          {
            ...finite,
            id: 'invalid',
            payload: { ...finite.payload, targetNumber: Infinity },
          },
        ],
        setLastBroadcastSeq: jest.fn(),
      }),
    ).rejects.toThrow(UnreadableStoredEventError);
    expect(append).not.toHaveBeenCalled();
  });

  it.each([Infinity, -Infinity, NaN])(
    'checks the entire offered batch before committing or publishing: %s',
    async (value) => {
      const invalid = {
        ...finite,
        id: 'invalid',
        sequence: 2,
        payload: { ...finite.payload, targetNumber: value },
      };
      const context = deps([finite, invalid]);
      const result = await commitThenPublish(context);
      expect(result).toMatchObject({
        committed: false,
        messages: [{ kind: 'Error', code: 'INTERNAL_ERROR' }],
      });
      expect(context.sendRefusal).toHaveBeenCalledWith(result.messages[0]);
      expect(context.appendEvent).not.toHaveBeenCalled();
      expect(context.broadcastEvent).not.toHaveBeenCalled();
      expect(context.closeMatch).not.toHaveBeenCalled();
    },
  );

  it('refuses unreadable production output without appending, publishing or closing', async () => {
    jest.replaceProperty(process, 'env', {
      ...process.env,
      NODE_ENV: 'production',
    });
    const invalid = {
      ...finite,
      payload: { ...finite.payload, targetNumber: Infinity },
    };
    const context = deps([invalid]);
    await expect(commitThenPublish(context)).resolves.toMatchObject({
      committed: false,
    });
    expect(context.appendEvent).not.toHaveBeenCalled();
    expect(context.broadcastEvent).not.toHaveBeenCalled();
    expect(context.sendRefusal).toHaveBeenCalledTimes(1);
    expect(context.sendRefusal).toHaveBeenCalledWith({
      kind: 'Error',
      matchId: 'match',
      ts: expect.any(String),
      code: 'INTERNAL_ERROR',
      reason: 'Unable to process the command.',
    });
    expect(invalid).not.toHaveProperty('replayIntegrity');
    expect(invalid.payload.targetNumber).toBe(Infinity);
    expect(context.closeMatch).not.toHaveBeenCalled();
  });
});
