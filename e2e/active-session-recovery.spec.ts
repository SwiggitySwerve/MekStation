/**
 * Active Session Recovery E2E
 *
 * Seeds the browser's match-log IndexedDB with a generated non-demo match id,
 * then proves `/gameplay/games/:id` can recover and refresh that active
 * session from the event log without falling back to demo state.
 *
 * @tags @game @recovery
 */

import { test, expect, type Page } from '@playwright/test';

const MATCH_LOG_DB_NAME = 'mekstation-match-log';
const MATCH_LOG_DB_VERSION = 2;
const MATCH_EVENTS_STORE = 'matchEvents';
const MATCHES_STORE = 'matches';

interface SeededGameEvent {
  readonly id: string;
  readonly gameId: string;
  readonly sequence: number;
  readonly timestamp: string;
  readonly type: string;
  readonly turn: number;
  readonly phase: string;
  readonly visibility: string;
  readonly payload: Record<string, unknown>;
}

function makeSeededEvents(matchId: string): readonly SeededGameEvent[] {
  const timestamp = '3025-01-01T00:00:00.000Z';
  const config = {
    mapRadius: 7,
    turnLimit: 30,
    victoryConditions: ['elimination'],
    optionalRules: [],
  };
  const units = [
    {
      id: 'atlas-as7-d',
      name: 'Atlas AS7-D',
      side: 'player',
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-player',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'marauder-mad-3r',
      name: 'Marauder MAD-3R',
      side: 'opponent',
      unitRef: 'marauder-mad-3r',
      pilotRef: 'pilot-opponent',
      gunnery: 4,
      piloting: 5,
    },
  ];

  return [
    {
      id: `${matchId}-event-created`,
      gameId: matchId,
      sequence: 0,
      timestamp,
      type: 'game_created',
      turn: 0,
      phase: 'initiative',
      visibility: 'public',
      payload: { config, units },
    },
    {
      id: `${matchId}-event-started`,
      gameId: matchId,
      sequence: 1,
      timestamp,
      type: 'game_started',
      turn: 1,
      phase: 'initiative',
      visibility: 'public',
      payload: { firstSide: 'player' },
    },
  ];
}

async function seedMatchLog(page: Page, matchId: string): Promise<void> {
  const events = makeSeededEvents(matchId);
  const savedAt = '3025-01-01T00:01:00.000Z';

  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.evaluate(
    async ({
      dbName,
      dbVersion,
      eventStoreName,
      matchStoreName,
      matchId: id,
      events: seededEvents,
      savedAt: saved,
    }) => {
      function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }

      function transactionToPromise(
        transaction: IDBTransaction,
      ): Promise<void> {
        return new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
      }

      const openRequest = indexedDB.open(dbName, dbVersion);

      openRequest.onupgradeneeded = () => {
        const db = openRequest.result;
        const eventStore = db.objectStoreNames.contains(eventStoreName)
          ? openRequest.transaction!.objectStore(eventStoreName)
          : db.createObjectStore(eventStoreName, {
              keyPath: ['matchId', 'sequence'],
            });
        if (!eventStore.indexNames.contains('byMatchId')) {
          eventStore.createIndex('byMatchId', 'matchId');
        }
        if (!eventStore.indexNames.contains('bySavedAt')) {
          eventStore.createIndex('bySavedAt', 'savedAt');
        }

        const matchStore = db.objectStoreNames.contains(matchStoreName)
          ? openRequest.transaction!.objectStore(matchStoreName)
          : db.createObjectStore(matchStoreName, { keyPath: 'matchId' });
        if (!matchStore.indexNames.contains('byStatus')) {
          matchStore.createIndex('byStatus', 'status');
        }
        if (!matchStore.indexNames.contains('byLastActivity')) {
          matchStore.createIndex('byLastActivity', 'lastActivity');
        }
      };

      const db = await requestToPromise(openRequest);
      const tx = db.transaction([eventStoreName, matchStoreName], 'readwrite');
      const eventStore = tx.objectStore(eventStoreName);
      const matchStore = tx.objectStore(matchStoreName);

      for (const event of seededEvents) {
        eventStore.put({
          matchId: id,
          sequence: event.sequence,
          event,
          savedAt: saved,
        });
      }
      matchStore.put({
        matchId: id,
        hostPeerId: null,
        guestPeerId: null,
        status: 'active',
        lastActivity: saved,
      });

      await transactionToPromise(tx);
      db.close();
    },
    {
      dbName: MATCH_LOG_DB_NAME,
      dbVersion: MATCH_LOG_DB_VERSION,
      eventStoreName: MATCH_EVENTS_STORE,
      matchStoreName: MATCHES_STORE,
      matchId,
      events,
      savedAt,
    },
  );
}

async function expectRecoveredInteractiveSession(
  page: Page,
  matchId: string,
): Promise<void> {
  await expect(page.getByTestId('game-session')).toBeVisible({
    timeout: 20_000,
  });
  await page.waitForFunction(
    (expectedMatchId) => {
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: {
            gameplay?: {
              getState: () => {
                session?: { id?: string; currentState?: { status?: string } };
                interactiveSession?: unknown;
                error?: string | null;
                isLoading?: boolean;
              };
            };
          };
        }
      ).__ZUSTAND_STORES__;
      const state = stores?.gameplay?.getState();
      return (
        state?.isLoading === false &&
        state.error === null &&
        state.session?.id === expectedMatchId &&
        state.session.currentState?.status === 'active' &&
        state.interactiveSession !== null &&
        state.interactiveSession !== undefined
      );
    },
    matchId,
    { timeout: 20_000 },
  );

  await expect(page.getByTestId('game-error')).toHaveCount(0);
  await expect(page.getByTestId('tactical-turn-rail')).toBeVisible();
  await expect(page.getByTestId('event-log-count')).toContainText('2');
}

test.describe('active game session recovery @game @recovery', () => {
  test('deep-links and refreshes a generated match from local match-log storage', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const matchId = `e2e-recovery-${Date.now()}`;
    page.on('dialog', (dialog) => dialog.accept());

    await seedMatchLog(page, matchId);

    await page.goto(`/gameplay/games/${matchId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await expect(page).toHaveURL(new RegExp(`/gameplay/games/${matchId}$`));
    await expectRecoveredInteractiveSession(page, matchId);

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(new RegExp(`/gameplay/games/${matchId}$`));
    await expectRecoveredInteractiveSession(page, matchId);
  });
});
