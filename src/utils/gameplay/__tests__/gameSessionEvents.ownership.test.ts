import type { IGameSession } from '@/types/gameplay';

import { isAllowListedTestFile } from '@/__tests__/helpers/unownedAppendGuard';
import {
  appendEvent,
  createGameSession,
  isOwnedGameSession,
} from '@/utils/gameplay/gameSession';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSessionCore';
import { deriveState } from '@/utils/gameplay/gameState';

import { withStateOutsideEventLog } from './eventLogFault.test-helpers';
import { makeReconnectHostEvents } from './gameSessionEvents.fixtures';

const HOOK = '__MEKSTATION_UNOWNED_APPEND__';
const hooks = globalThis as Record<string, unknown>;

/** Run `body` with the test-mode reporter replaced, then put it back. */
function withReporter<T>(
  reporter:
    | ((session: IGameSession, refoldMatches: () => boolean) => void)
    | undefined,
  body: () => T,
): T {
  const installed = hooks[HOOK];
  if (reporter) hooks[HOOK] = reporter;
  else delete hooks[HOOK];
  try {
    return body();
  } finally {
    hooks[HOOK] = installed;
  }
}

describe('event-log ownership (isOwnedGameSession)', () => {
  const events = makeReconnectHostEvents();
  const hydrated = hydrateGameSessionFromEvents('match-1', events.slice(0, 12));

  it('owns every session that create, hydrate and append return', () => {
    const created = createGameSession(hydrated.config, hydrated.units);
    expect(isOwnedGameSession(created)).toBe(true);
    expect(isOwnedGameSession(hydrated)).toBe(true);
    const appended = appendEvent(hydrated, events[12]);
    expect(isOwnedGameSession(appended)).toBe(true);
    expect(isOwnedGameSession({ ...appended, updatedAt: 'later' })).toBe(true);
  });

  it.each<[string, (session: IGameSession) => IGameSession]>([
    [
      'a hand-built currentState',
      (session) => ({
        ...session,
        currentState: { ...session.currentState },
      }),
    ],
    [
      'a replaced events array',
      (session) => ({ ...session, events: [...session.events] }),
    ],
    [
      'a truncated log under a folded state',
      (session) => ({ ...session, events: session.events.slice(0, -1) }),
    ],
    [
      'a JSON round trip',
      (session) => JSON.parse(JSON.stringify(session)) as IGameSession,
    ],
    [
      'the test-only fault seam',
      (session) =>
        withStateOutsideEventLog(session, (state) => ({
          ...state,
          turn: state.turn + 1,
        })),
    ],
  ])('does not own a session with %s', (_label, build) => {
    expect(isOwnedGameSession(build(hydrated))).toBe(false);
  });

  it('reports an unowned append in tests and still returns the full fold', () => {
    const unowned = withStateOutsideEventLog(hydrated, (state) => ({
      ...state,
      turn: state.turn + 50,
    }));
    const reported: [string, boolean][] = [];
    const next = withReporter(
      (session, refoldMatches) => reported.push([session.id, refoldMatches()]),
      () => appendEvent(unowned, events[12]),
    );
    expect(reported).toEqual([['match-1', false]]);
    expect(next.currentState).toEqual(
      deriveState('match-1', events.slice(0, 13)),
    );
    expect(isOwnedGameSession(next)).toBe(true);
  });

  it('tells the collector when an unowned state still equals its fold', () => {
    const copied = { ...hydrated, currentState: { ...hydrated.currentState } };
    const reported: boolean[] = [];
    withReporter(
      (_session, refoldMatches) => reported.push(refoldMatches()),
      () => appendEvent(copied, events[12]),
    );
    expect(reported).toEqual([true]);
  });

  it('does not report an owned append, whose result equals the full fold', () => {
    const reported: string[] = [];
    const next = withReporter(
      (session) => reported.push(session.id),
      () => appendEvent(hydrated, events[12]),
    );
    expect(reported).toEqual([]);
    expect(next.currentState).toEqual(
      deriveState('match-1', events.slice(0, 13)),
    );
  });

  it('outside tests, warns once through the logger and refolds', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { logger } =
        require('@/utils/logger') as typeof import('@/utils/logger');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const owner =
        require('@/utils/gameplay/gameSessionEvents') as typeof import('@/utils/gameplay/gameSessionEvents');
      const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const unowned = {
        ...hydrated,
        currentState: { ...hydrated.currentState },
      };
      const [first, second] = withReporter(undefined, () => [
        owner.appendEvent(unowned, events[12]),
        owner.appendEvent(unowned, events[12]),
      ]);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0]?.[0])).toContain(
        'was not produced by the event-log owner',
      );
      for (const next of [first, second]) {
        expect(next.events).toEqual(events.slice(0, 13));
        expect(next.currentState).toEqual(
          deriveState('match-1', events.slice(0, 13)),
        );
      }
      warn.mockRestore();
    });
  });
});

describe('unowned-append allow-list matching', () => {
  const entry = 'src/engine/__tests__/Example.test.ts';

  it.each([`/repo/${entry}`, `C:\\repo\\${entry.split('/').join('\\')}`])(
    'matches %s by its repo-relative path',
    (testPath) => {
      expect(isAllowListedTestFile(testPath, [entry])).toBe(true);
    },
  );

  it('does not match a file whose name only ends the same way', () => {
    expect(
      isAllowListedTestFile('/repo/src/engine/__tests__/MyExample.test.ts', [
        'Example.test.ts',
      ]),
    ).toBe(false);
  });
});
