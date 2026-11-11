import { GameSide } from '@/types/gameplay';
import { createGameCreatedEvent } from '@/utils/gameplay/gameEvents/lifecycle';
import {
  prepareEventForSerialization,
  UnreadableStoredEventError,
} from '@/utils/gameplay/gameEvents/serialization';

import { loadReplayLibraryNdjson } from '../ReplayLibraryLoadPipeline';
import { gateReplaySurfaceHistory } from '../ReplaySurfaceGate';

function created(name: string) {
  return createGameCreatedEvent({
    gameId: 'unicode-reader-contract',
    config: {
      mapRadius: 4,
      turnLimit: 3,
      victoryConditions: [],
      optionalRules: [],
    },
    units: [
      {
        id: 'unit',
        name,
        side: GameSide.Player,
        unitRef: 'atlas-as7-d',
        pilotRef: 'Regular',
        gunnery: 4,
        piloting: 5,
      },
    ],
  });
}

afterEach(() => jest.restoreAllMocks());

describe('writer calls the same acceptance owner as both readers', () => {
  it.each(['truncated emoji \ud83d', 'truncated low surrogate \ude00'])(
    'refuses a GameCreated name the readers cannot represent: %s',
    (name) => {
      const event = created(name);
      expect(
        loadReplayLibraryNdjson(JSON.stringify(event), event.gameId).kind,
      ).toBe('blocked');
      expect(
        gateReplaySurfaceHistory([event], {
          surfaceId: 'unicode',
          streamId: event.gameId,
          formatId: 'match-log-idb',
          formatVersion: 2,
        }).kind,
      ).toBe('blocked');
      for (const format of [
        'simulation-report-jsonl',
        'match-log-idb',
        'match-broadcast',
      ] as const) {
        expect(() => prepareEventForSerialization(event, format)).toThrow(
          UnreadableStoredEventError,
        );
      }
    },
  );

  it('marks unreadable Unicode in the production single-player recording only', () => {
    jest.replaceProperty(process, 'env', {
      ...process.env,
      NODE_ENV: 'production',
    });
    const event = created('pilot \ud83d');
    const stored = prepareEventForSerialization(event, 'match-log-idb');
    expect(stored.replayIntegrity?.status).toBe('unverifiable');
    expect(event).not.toHaveProperty('replayIntegrity');
    expect(() =>
      prepareEventForSerialization(event, 'match-broadcast'),
    ).toThrow(UnreadableStoredEventError);
  });

  it('refuses invalid Unicode in the envelope, outside payload validation', () => {
    const event = { ...created('valid name'), id: 'truncated-event-\ud83d' };
    expect(
      gateReplaySurfaceHistory([event], {
        surfaceId: 'unicode',
        streamId: event.gameId,
        formatId: 'match-log-idb',
        formatVersion: 2,
      }).kind,
    ).toBe('blocked');
    expect(() => prepareEventForSerialization(event)).toThrow(
      UnreadableStoredEventError,
    );
  });

  it.each([{ schemaVersion: 1 }, { eventVersion: 1 }])(
    'refuses ambiguous legacy attribution: %j',
    (identity) => {
      const event = { ...created('valid name'), ...identity };
      expect(
        loadReplayLibraryNdjson(JSON.stringify(event), event.gameId).kind,
      ).toBe('blocked');
      expect(() => prepareEventForSerialization(event)).toThrow(
        UnreadableStoredEventError,
      );
    },
  );

  it('refuses a previously marked envelope at the same acceptance boundary', () => {
    const event = {
      ...created('valid name'),
      replayIntegrity: {
        status: 'unverifiable' as const,
        reason: 'unreadable-stored-event' as const,
        formatId: 'match-log-idb',
      },
    };
    expect(() => prepareEventForSerialization(event)).toThrow(
      UnreadableStoredEventError,
    );
  });
});
