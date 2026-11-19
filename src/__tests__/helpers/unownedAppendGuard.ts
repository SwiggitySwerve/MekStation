/**
 * Test-mode half of the event-log ownership guard
 * (isOwnedGameSession in src/utils/gameplay/gameSessionEvents.ts).
 *
 * jest.setup.js installs the reporter that appendEvent calls when it folds
 * onto a session the owner did not produce. Installing it is how tests are
 * detected: production and dev builds never set it, and appendEvent then logs
 * one warning and folds the full log as before.
 *
 * After each test that reported one, the test fails unless its file is on
 * UNOWNED_APPEND_ALLOWED_TEST_FILES. With MEKSTATION_UNOWNED_APPEND_LOG set to
 * a file path, it appends one JSON line per such test to that file instead
 * and never fails (the collector used to measure the allow-list): the session
 * ids, whether each state still equalled the fold of its log, and the first
 * caller of appendEvent outside the gameplay owner.
 */
import { appendFileSync } from 'node:fs';

import { UNOWNED_APPEND_ALLOWED_TEST_FILES } from '../architecture/unownedAppendAllowList';

const UNOWNED_APPEND_HOOK = '__MEKSTATION_UNOWNED_APPEND__';
const OWNER_FRAME = /gameSessionEvents|gameSessionCore|unownedAppendGuard/;

interface IUnownedAppend {
  readonly sessionId: string;
  readonly refoldMatches: () => boolean;
  readonly stack: string;
}

/** Jest's testPath ends with the repo-relative entry, on any OS. */
export function isAllowListedTestFile(
  testPath: string,
  allowList: readonly string[],
): boolean {
  const posix = testPath.split('\\').join('/');
  return allowList.some((entry) => posix.endsWith(`/${entry}`));
}

function appender(stack: string): string {
  const frame = stack
    .split('\n')
    .slice(1)
    .find((line) => !OWNER_FRAME.test(line) && !/node_modules/.test(line));
  return (frame ?? '').trim().split('\\').join('/');
}

export function installUnownedAppendGuard(): void {
  const reported: IUnownedAppend[] = [];
  (globalThis as Record<string, unknown>)[UNOWNED_APPEND_HOOK] = (
    session: { readonly id: string },
    refoldMatches: () => boolean,
  ) => {
    reported.push({
      sessionId: session.id,
      refoldMatches,
      stack: new Error().stack ?? '',
    });
  };

  afterEach(() => {
    if (reported.length === 0) return;
    const appends = reported.splice(0);
    const { testPath = '', currentTestName = '' } = expect.getState();
    const log = process.env.MEKSTATION_UNOWNED_APPEND_LOG;
    if (log) {
      const records = appends.map((append) => ({
        sessionId: append.sessionId,
        refoldMatches: append.refoldMatches(),
        appender: appender(append.stack),
      }));
      appendFileSync(
        log,
        `${JSON.stringify({ testPath, test: currentTestName, appends: records })}\n`,
      );
      return;
    }
    if (
      isAllowListedTestFile(
        testPath,
        Object.keys(UNOWNED_APPEND_ALLOWED_TEST_FILES),
      )
    ) {
      return;
    }
    const sessions = [...new Set(appends.map((append) => append.sessionId))];
    throw new Error(
      `[unowned-append] appendEvent folded onto session(s) ${sessions.join(', ')} ` +
        'that the event-log owner did not produce (a hand-built currentState, ' +
        'events or session). Build the session through createGameSession / ' +
        'hydrateGameSessionFromEvents / appendEvent, or add this file to ' +
        'src/__tests__/architecture/unownedAppendAllowList.ts with its reason.',
    );
  });
}
