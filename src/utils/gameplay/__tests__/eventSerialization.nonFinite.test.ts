import { loadReplayLibraryNdjson } from '@/lib/events/replay/ReplayLibraryLoadPipeline';
import { gateReplaySurfaceHistory } from '@/lib/events/replay/ReplaySurfaceGate';
import { GameEventType, GamePhase, type IGameEvent } from '@/types/gameplay';

import {
  UnreadableStoredEventError,
  prepareEventForSerialization,
  serializeEvent,
  serializeEvents,
} from '../gameEvents/serialization';
import { createShutdownCheckEvent } from '../gameEvents/statusChecksHeat';

const event: IGameEvent = {
  id: 'event',
  gameId: 'game',
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
    rolls: [2, 2],
  },
};

afterEach(() => jest.restoreAllMocks());

describe('game event stored-image reader guard', () => {
  it('keeps valid event bytes and identity unchanged', () => {
    expect(prepareEventForSerialization(event)).toBe(event);
    expect(serializeEvent(event)).toBe(JSON.stringify(event));
    expect(serializeEvents([event])).toBe(JSON.stringify([event]));
  });

  it('accepts the PR-18 automatic shutdown image without a numeric exception list', () => {
    const shutdown = createShutdownCheckEvent(
      'game',
      2,
      1,
      GamePhase.Heat,
      'mek',
      35,
      Infinity,
      0,
      true,
    );
    expect(() => serializeEvent(shutdown)).not.toThrow();
    const stored = JSON.parse(serializeEvent(shutdown)) as IGameEvent;
    expect(stored.payload).toMatchObject({
      targetNumber: null,
      shutdownOccurred: true,
    });
    expect(stored.replayIntegrity).toBeUndefined();
    expect(
      loadReplayLibraryNdjson(JSON.stringify(stored), 'quick/shutdown').kind,
    ).toBe('loaded');
  });

  it('rejects the old PSR Infinity image and a finite payload with an undeclared field', () => {
    expect(() =>
      serializeEvent({
        ...event,
        payload: { ...event.payload, targetNumber: Infinity },
      }),
    ).toThrow(UnreadableStoredEventError);
    const undeclaredPayload = { ...event.payload, undeclared: 1 };
    expect(() =>
      serializeEvent({
        ...event,
        payload: undeclaredPayload,
      }),
    ).toThrow(UnreadableStoredEventError);
  });

  it('uses the existing host-stamp split only for the reader format that declares it', () => {
    const stamped = {
      ...event,
      payload: { ...event.payload, intentId: 'intent-1' },
    };
    expect(() =>
      prepareEventForSerialization(stamped, 'match-broadcast'),
    ).not.toThrow();
    expect(() =>
      prepareEventForSerialization(stamped, 'simulation-report-jsonl'),
    ).toThrow(UnreadableStoredEventError);
  });

  it.each([Infinity, -Infinity, NaN])(
    'throws before serializing a nested non-finite number: %s',
    (value) => {
      const invalid = {
        ...event,
        payload: { ...event.payload, rolls: [2, value] },
      };
      expect(() => serializeEvent(invalid)).toThrow(UnreadableStoredEventError);
      expect(() => serializeEvents([event, invalid])).toThrow(
        UnreadableStoredEventError,
      );
      expect(invalid).not.toHaveProperty('replayIntegrity');
    },
  );

  it('refuses a writer mark even when all remaining payload numbers validate', () => {
    const marked: IGameEvent = {
      ...event,
      replayIntegrity: {
        status: 'unverifiable',
        reason: 'unreadable-stored-event',
        formatId: 'simulation-report-jsonl',
      },
    };
    expect(
      loadReplayLibraryNdjson(JSON.stringify(marked), 'quick/marked').kind,
    ).toBe('blocked');
    const options = {
      surfaceId: 'cold-recovery',
      streamId: 'marked',
      formatId: 'match-log-idb',
      formatVersion: 2,
    };
    expect(gateReplaySurfaceHistory([event], options).kind).toBe('accepted');
    const result = gateReplaySurfaceHistory([marked], options);
    expect(result.kind).toBe('blocked');
    if (result.kind === 'blocked')
      expect(result.blockedEvents[0].message).toBe(
        'The recording writer marked this event unverifiable.',
      );
  });

  it('marks the storage copy in production, preserves the live event, and blocks the recording', () => {
    jest.replaceProperty(process, 'env', {
      ...process.env,
      NODE_ENV: 'production',
    });
    const invalid = {
      ...event,
      payload: { ...event.payload, rolls: [Infinity, NaN, -Infinity] },
    };
    const raw = serializeEvent(invalid);
    const stored = JSON.parse(raw) as IGameEvent;
    expect(stored.replayIntegrity).toEqual({
      status: 'unverifiable',
      reason: 'unreadable-stored-event',
      formatId: 'simulation-report-jsonl',
    });
    expect(stored.payload).toMatchObject({ rolls: [null, null, null] });
    expect(invalid.payload.rolls[0]).toBe(Infinity);
    expect(invalid).not.toHaveProperty('replayIntegrity');
    const result = loadReplayLibraryNdjson(raw, 'quick/non-finite');
    expect(result.kind).toBe('blocked');
    if (result.kind === 'blocked')
      expect(result.blockedLines).toEqual([
        expect.objectContaining({ line: 1, reason: 'unverifiable-event' }),
      ]);
    expect(serializeEvent(stored)).toBe(raw);
  });
});
