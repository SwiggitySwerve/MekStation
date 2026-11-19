import { GameEventType, GamePhase, type IGameEvent } from '@/types/gameplay';
import { logger } from '@/utils/logger';

import { commitThenPublish } from '../ServerMatchHostPublication';

it('keeps event identity, format and validation causes in server logs only', async () => {
  const logged = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
  const invalidPayload = {
    unitId: 'secret-mek',
    targetNumber: Infinity,
    roll: 0,
    modifiers: 0,
    passed: false,
    reason: 'secret cause',
    PRIVATE_VALIDATOR_KEY: 'private value',
  };
  const event: IGameEvent = {
    id: 'FOG-HIDDEN-EVENT-ID',
    gameId: 'private-host',
    sequence: 1,
    timestamp: '2026-11-11T00:00:00.000Z',
    type: GameEventType.PSRResolved,
    turn: 1,
    phase: GamePhase.End,
    payload: invalidPayload,
  };
  const appendEvent = jest.fn(async () => undefined);
  const broadcastEvent = jest.fn(async () => undefined);
  const closeMatch = jest.fn(async () => undefined);
  const sendRefusal = jest.fn();
  try {
    const result = await commitThenPublish({
      matchId: event.gameId,
      events: [event],
      intentId: 'intent',
      appendEvent,
      broadcastEvent,
      closeMatch,
      sendRefusal,
    });
    expect(result.committed).toBe(false);
    expect(result.messages).toEqual([
      expect.objectContaining({
        kind: 'Error',
        code: 'INTERNAL_ERROR',
        reason: 'Unable to process the command.',
      }),
    ]);
    const wire = JSON.stringify(result.messages);
    for (const forbidden of [
      event.id,
      'match-broadcast',
      'PRIVATE_VALIDATOR_KEY',
      'invalid-payload',
      'Payload does not match',
      'unrecognized_keys',
      'ZodError',
      'issues',
    ])
      expect(wire).not.toContain(forbidden);
    expect(logged).toHaveBeenCalledWith(
      '[multiplayer] unreadable stored event',
      expect.objectContaining({
        eventId: event.id,
        formatId: 'match-broadcast',
        cause: expect.objectContaining({
          cause: expect.objectContaining({ issues: expect.any(Array) }),
        }),
      }),
    );
    expect(sendRefusal).toHaveBeenCalledWith(result.messages[0]);
    expect(appendEvent).not.toHaveBeenCalled();
    expect(broadcastEvent).not.toHaveBeenCalled();
    expect(closeMatch).not.toHaveBeenCalled();
  } finally {
    logged.mockRestore();
  }
});
