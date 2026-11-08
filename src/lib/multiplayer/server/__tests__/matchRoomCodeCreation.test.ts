import { RoomCodeCollisionError, type IMatchMeta } from '../IMatchStore';
import { createMatchWithRoomCodeRetry } from '../matchRoomCodes';

const meta: IMatchMeta = {
  matchId: 'new-match',
  hostPlayerId: 'host',
  playerIds: ['host'],
  sideAssignments: [{ playerId: 'host', side: 'player' }],
  status: 'lobby',
  roomCode: 'ABC234',
  createdAt: '2026-11-08T00:00:00.000Z',
  updatedAt: '2026-11-08T00:00:00.000Z',
  config: { mapRadius: 4, turnLimit: 5 },
};

it('retries a room-code collision with a fresh code and preserves match identity', async () => {
  const createMatch = jest
    .fn()
    .mockRejectedValueOnce(new RoomCodeCollisionError('ABC234'))
    .mockResolvedValue(meta.matchId);
  const nextCode = jest.fn(() => 'DEF567');
  const result = await createMatchWithRoomCodeRetry(
    { createMatch },
    meta,
    nextCode,
  );
  expect(createMatch).toHaveBeenCalledTimes(2);
  expect(createMatch.mock.calls[0][0]).toEqual(meta);
  expect(createMatch.mock.calls[1][0]).toEqual({ ...meta, roomCode: 'DEF567' });
  expect(result).toEqual({ ...meta, roomCode: 'DEF567' });
  expect(meta.roomCode).toBe('ABC234');
  expect(nextCode).toHaveBeenCalledTimes(1);
});

it('stops after five attempts and exposes the collision', async () => {
  const collision = new RoomCodeCollisionError('ABC234');
  const createMatch = jest.fn().mockRejectedValue(collision);
  const nextCode = jest.fn(() => 'ABC234');
  await expect(
    createMatchWithRoomCodeRetry({ createMatch }, meta, nextCode),
  ).rejects.toBe(collision);
  expect(createMatch).toHaveBeenCalledTimes(5);
  expect(nextCode).toHaveBeenCalledTimes(4);
});

it('does not retry unrelated errors or code-less creation', async () => {
  const failure = new Error('disk full');
  const createMatch = jest.fn().mockRejectedValue(failure);
  const nextCode = jest.fn(() => 'DEF567');
  await expect(
    createMatchWithRoomCodeRetry({ createMatch }, meta, nextCode),
  ).rejects.toBe(failure);
  expect(createMatch).toHaveBeenCalledTimes(1);
  expect(nextCode).not.toHaveBeenCalled();
  createMatch.mockRejectedValue(new RoomCodeCollisionError('ABC234'));
  await expect(
    createMatchWithRoomCodeRetry(
      { createMatch },
      { ...meta, roomCode: undefined },
      nextCode,
    ),
  ).rejects.toBeInstanceOf(RoomCodeCollisionError);
  expect(createMatch).toHaveBeenCalledTimes(2);
  expect(nextCode).not.toHaveBeenCalled();
});
