/**
 * P1 proof, seeded half of the D-8 corpus: the state appendEvent folds one
 * event at a time equals deriveState's full fold from event 0, at every event
 * of every game.
 *
 * The games are regenerated here (C4's 16-seed method). Each game's stream is
 * pinned first, by event count and the sha256 of its event JSON, so an engine
 * change cannot regenerate a different corpus that both folds then agree on.
 *
 * The full fold is deriveState's own loop (createInitialGameState, then
 * applyEvent per event) run fresh beside the game and read after every event,
 * so its value at event i is deriveState(events[0..i]) without the quadratic
 * rerun; incrementalFold.deriveStateStructure.test.ts proves deriveState is
 * exactly that reduce. Seeds 5 and 8, and every 64th event of the others, also
 * call deriveState itself on the prefix. P1_CORPUS_FULL=1 calls deriveState on
 * every prefix of all 16 seeds (about a minute).
 */
import { isDeepStrictEqual } from 'node:util';
import { v4 } from 'uuid';

import type { IGameSession, IGameState } from '@/types/gameplay';

import {
  applyEvent,
  createInitialGameState,
  deriveState,
} from '@/utils/gameplay/gameState';

import {
  eventStreamDigest,
  losslessStateImage,
  playSeededGame,
  SEEDED_GAME_CLOCK,
  seededGameUuid,
} from './incrementalFold.seededGames';

let mockOnAppend:
  | ((before: IGameSession, after: IGameSession) => void)
  | undefined;
jest.mock('uuid', () => ({ ...jest.requireActual('uuid'), v4: jest.fn() }));
jest.mock('@/utils/gameplay/gameSessionEvents', () => {
  const actual = jest.requireActual<
    typeof import('@/utils/gameplay/gameSessionEvents')
  >('@/utils/gameplay/gameSessionEvents');
  return {
    ...actual,
    appendEvent: (
      ...args: Parameters<typeof actual.appendEvent>
    ): ReturnType<typeof actual.appendEvent> => {
      const after = actual.appendEvent(...args);
      mockOnAppend?.(args[0], after);
      return after;
    },
  };
});

/**
 * C4's captures (REPLAY-PSR-FIX-D8-MERGED-00cbe6479/before.summary.json,
 * `rawDigest`): 16 games, 16,351 events, main's writer. Seed 8 carries five
 * automatic-fail PSRResolved events whose Infinity target is null in JSON.
 */
const PINNED_STREAMS: Readonly<
  Record<number, { readonly events: number; readonly sha256: string }>
> = {
  1: {
    events: 1228,
    sha256: 'abeccc5febbdc9ebb468ec638face989037502275501a96cd258ed8790bc7d63',
  },
  2: {
    events: 754,
    sha256: '340898820446f43d47d1fc69422f010614452dd96b878d1eeb4b0210d3fc2fc3',
  },
  3: {
    events: 1565,
    sha256: '915817c95d4bd0cc0c42d94b0f334137b68c6b2858933d2e0e3a77248ddd34ff',
  },
  4: {
    events: 812,
    sha256: 'c8f232be6d921b74dcc5875fc8c7ece4794114d953c4e2f8f5d154e5b1561e52',
  },
  5: {
    events: 340,
    sha256: '9da3a173ca86cf7ef49414d225792fad031a0964f6219a571071c49ea020c770',
  },
  6: {
    events: 544,
    sha256: 'c17952fea2915a5647662331a82f703e008b484b3b44a1b90156af8f0c08b374',
  },
  7: {
    events: 1380,
    sha256: '0d27d733c629e851037315ea87703fcdb546295527bd47c2529d950c991c90d2',
  },
  8: {
    events: 471,
    sha256: '1e193b2b628871b154adf15c624af21eae8d999e8f1727900a8c47151f108e40',
  },
  9: {
    events: 1113,
    sha256: 'fc13a2b80f301b60c748db8471197aa4de8a0f4d8fa3709ac644902625033a1a',
  },
  10: {
    events: 1370,
    sha256: '8c828307ea1448eddb5ef23d89dcd9eb546aa1881bbf658b09732408a72a607e',
  },
  11: {
    events: 1534,
    sha256: '58d594bf63e76188820a1c07b7b2c502a384f8608a15b60e0ce178bc6f564c05',
  },
  12: {
    events: 539,
    sha256: 'b19b319b0c226d9c35fd104262fd1df50c743c3acc2d72d5aaf83a71bc4d4354',
  },
  13: {
    events: 1005,
    sha256: 'facf481feeae2d748d5f3e8f0f3dc592fb16cca04af26e07504b9bc41a7c3b94',
  },
  14: {
    events: 1467,
    sha256: '3877d8572ef254d88bf7c5cca8972c693346973733cd21e6d6d440a20571ec25',
  },
  15: {
    events: 912,
    sha256: '73f318501f1c98972d88f4d50b6640166190353af9b9233aed474ceb835e9b7a',
  },
  16: {
    events: 1317,
    sha256: '894c9ebd4f1ca49e5e04da9b7397f07f2e3da50f909ec660d7270a0a8b42d627',
  },
};

const SEEDS = Object.keys(PINNED_STREAMS).map(Number);
/** Seed 8 holds the automatic-fail PSRs; seed 5 is the shortest game. */
const LITERAL_DERIVE_STATE_SEEDS = new Set([5, 8]);
const FULL_MODE = process.env.P1_CORPUS_FULL === '1';

interface ICapturedState {
  readonly length: number;
  readonly state: IGameState;
}

function playAndCapture(seed: number): {
  readonly session: IGameSession;
  readonly byLastEventId: ReadonlyMap<string, ICapturedState>;
} {
  let uuid = 0;
  (v4 as unknown as jest.Mock<string, []>).mockImplementation(() =>
    seededGameUuid(++uuid),
  );
  const byLastEventId = new Map<string, ICapturedState>();
  const capture = (session: IGameSession) => {
    const last = session.events.at(-1);
    if (last) {
      byLastEventId.set(last.id, {
        length: session.events.length,
        state: session.currentState,
      });
    }
  };
  mockOnAppend = (before, after) => {
    // GameCreated is folded by createGameSession, before the first append.
    if (before.events.length === 1) capture(before);
    if (after !== before) capture(after);
  };
  try {
    return { session: playSeededGame(seed), byLastEventId };
  } finally {
    mockOnAppend = undefined;
  }
}

describe('incremental fold == full fold, seeded D-8 games', () => {
  beforeEach(() => {
    jest.useFakeTimers({
      now: new Date(SEEDED_GAME_CLOCK),
      doNotFake: ['performance'],
    });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it.each(SEEDS)(
    'seed %i: pinned stream, then equality at every event',
    (seed) => {
      const { session, byLastEventId } = playAndCapture(seed);
      const { events } = session;

      const pinned = PINNED_STREAMS[seed];
      const observed = {
        events: events.length,
        sha256: eventStreamDigest(events),
      };
      if (!isDeepStrictEqual(observed, pinned)) {
        throw new Error(
          `Seed ${seed} regenerated a different event stream: pinned ` +
            `${JSON.stringify(pinned)}, got ${JSON.stringify(observed)}. ` +
            'A digest change is an invariant-7/8 decision, never a rebaseline: ' +
            'find the engine change that moved the stream before touching these pins.',
        );
      }

      const literalEveryEvent =
        FULL_MODE || LITERAL_DERIVE_STATE_SEEDS.has(seed);
      let full = createInitialGameState(session.id);
      for (let index = 0; index < events.length; index += 1) {
        full = applyEvent(full, events[index]);
        const captured = byLastEventId.get(events[index].id);
        if (captured?.length !== index + 1) {
          throw new Error(
            `Seed ${seed}: event ${index} (${events[index].type}) was not produced by appendEvent at that position`,
          );
        }
        if (
          literalEveryEvent ||
          index % 64 === 0 ||
          index === events.length - 1
        ) {
          const derived = deriveState(session.id, events.slice(0, index + 1));
          if (!isDeepStrictEqual(derived, full)) {
            throw new Error(
              `Seed ${seed}: deriveState differs from its own loop at event ${index}`,
            );
          }
        }
        if (!isDeepStrictEqual(captured.state, full)) {
          expect({
            seed,
            index,
            sequence: events[index].sequence,
            type: events[index].type,
            incremental: losslessStateImage(captured.state),
          }).toEqual({
            seed,
            index,
            sequence: events[index].sequence,
            type: events[index].type,
            incremental: losslessStateImage(full),
          });
          throw new Error(
            `Seed ${seed}: incremental state differs from the full fold at event ${index} in a way the lossless image does not show`,
          );
        }
      }
      expect(
        isDeepStrictEqual(
          session.currentState,
          deriveState(session.id, events),
        ),
      ).toBe(true);
    },
    300_000,
  );
});
