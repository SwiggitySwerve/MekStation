import {
  Facing,
  GameEventType,
  GamePhase,
  MovementType,
  type IGameEvent,
  type IMovementDeclaredPayload,
} from '@/types/gameplay';
import { getMovementDeclaredPlaybackPayload } from '@/utils/gameplay/eventPayloads';
import { createMovementDeclaredEvent } from '@/utils/gameplay/gameEvents';

describe('movement event path payloads', () => {
  it('serializes the committed path and movement mode', () => {
    const path = [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: -1 },
    ];

    const event = createMovementDeclaredEvent(
      'game-1',
      1,
      1,
      'unit-a',
      path[0],
      path[2],
      Facing.Southeast,
      MovementType.Run,
      3,
      1,
      path,
    );
    const payload = event.payload as IMovementDeclaredPayload;
    const parsed = JSON.parse(JSON.stringify(event)) as {
      readonly payload: Pick<IMovementDeclaredPayload, 'mode' | 'path'>;
    };

    expect(payload.path).toEqual(path);
    expect(payload.mode).toBe(MovementType.Run);
    expect(parsed.payload.path).toEqual(path);
    expect(parsed.payload.mode).toBe(MovementType.Run);
  });

  it('backfills legacy destination-only movement events as instant playback', () => {
    const legacyEvent: IGameEvent = {
      id: 'event-1',
      gameId: 'game-1',
      sequence: 1,
      timestamp: '2026-04-30T00:00:00.000Z',
      type: GameEventType.MovementDeclared,
      turn: 1,
      phase: GamePhase.Movement,
      actorId: 'unit-a',
      payload: {
        unitId: 'unit-a',
        from: { q: 0, r: 0 },
        to: { q: 3, r: -1 },
        facing: Facing.Northeast,
        movementType: MovementType.Walk,
        mpUsed: 3,
        heatGenerated: 0,
      },
    };

    const playback = getMovementDeclaredPlaybackPayload(legacyEvent);

    expect(playback).not.toBeNull();
    expect(playback?.instantFallback).toBe(true);
    expect(playback?.mode).toBe(MovementType.Walk);
    expect(playback?.path).toEqual([
      { q: 0, r: 0 },
      { q: 3, r: -1 },
    ]);
  });
});
