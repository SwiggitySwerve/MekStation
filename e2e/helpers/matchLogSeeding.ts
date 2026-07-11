/**
 * Match-log IndexedDB seeding for the recovery-rehydration seam trust
 * anchor (`e2e/active-session-recovery.spec.ts`).
 *
 * Pure move (`add-seam-trust-anchor-journeys`, W2 group 2 task 2.1) of
 * the inline `seedMatchLog` machinery that spec file previously owned,
 * parameterized over the match id, the event stream, and the
 * `matches` row fields so both the legacy two-unit fixture and the
 * mirrored-canonical-ref roster (task 2.2, the #1019-class trust
 * anchor) can share one seeder without duplicating the raw
 * `indexedDB.open` transaction machinery.
 */

import type { Page } from '@playwright/test';

const MATCH_LOG_DB_NAME = 'mekstation-match-log';
const MATCH_LOG_DB_VERSION = 2;
const MATCH_EVENTS_STORE = 'matchEvents';
const MATCHES_STORE = 'matches';

/** Which side a seeded unit fields — mirrors `GameSide`'s string values. */
export type SeededGameSide = 'player' | 'opponent';

/**
 * Minimal `IGameUnit`-shaped fixture. Kept as a standalone local type
 * (rather than importing `IGameUnit` from `src/`) because `e2e/` specs
 * never import `@/` app modules — the payload only needs to satisfy the
 * event log's on-disk JSON shape, not the app's compiled types.
 */
export interface SeededGameUnit {
  readonly id: string;
  readonly name: string;
  readonly side: SeededGameSide;
  readonly unitRef: string;
  readonly pilotRef: string;
  readonly gunnery: number;
  readonly piloting: number;
}

export interface SeededGameEvent {
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

export interface BuildSeededEventsOptions {
  /** Defaults to a fixed 3025 timestamp so seeded fixtures stay deterministic. */
  readonly timestamp?: string;
  readonly firstSide?: SeededGameSide;
  readonly mapRadius?: number;
  readonly turnLimit?: number;
  readonly victoryConditions?: readonly string[];
  readonly optionalRules?: readonly string[];
  /**
   * Persisted `IGameConfig.seed` (`src/types/gameplay/GameSessionUnitTypes.ts`)
   * for the route-level recovered-continuation determinism scenario
   * (task 4.2, `add-seam-trust-anchor-journeys` W2 group 4): when set,
   * `fromSessionAsync` re-seeds both the AI random stream and the dice
   * stream from this value at recovery (design D4). Omitted by every
   * other fixture — those sessions persist no seed, matching pre-W1
   * behavior exactly.
   */
  readonly seed?: number;
}

/**
 * Builds the minimal `GameCreated`-first (sequence 0) + `GameStarted`
 * (sequence 1) event pair that `hydrateRecoverableSessionFromMatchLog`
 * requires (`src/engine/InteractiveSession.persistence.ts:57-81`
 * throws `InteractiveSessionRecoveryCorruptError` when sequence 0 is
 * not `game_created`). Callers vary only the unit roster — the legacy
 * two-distinct-unitRef fixture and the mirrored-canonical-ref roster
 * both flow through this one builder.
 */
export function buildGameCreatedAndStartedEvents(
  matchId: string,
  units: readonly SeededGameUnit[],
  options: BuildSeededEventsOptions = {},
): readonly SeededGameEvent[] {
  const timestamp = options.timestamp ?? '3025-01-01T00:00:00.000Z';
  const config = {
    mapRadius: options.mapRadius ?? 7,
    turnLimit: options.turnLimit ?? 30,
    victoryConditions: options.victoryConditions ?? ['elimination'],
    optionalRules: options.optionalRules ?? [],
    // Only stamped when the caller supplies one — a fixture with no
    // `seed` option persists no `config.seed` key at all, so every
    // pre-existing fixture (task 2.1/2.2) round-trips byte-identical
    // through this builder.
    ...(options.seed !== undefined ? { seed: options.seed } : {}),
  };

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
      payload: { firstSide: options.firstSide ?? 'player' },
    },
  ];
}

export type SeededMatchStatus = 'active' | 'completed' | 'abandoned';

export interface SeededMatchesRowFields {
  readonly hostPeerId?: string | null;
  readonly guestPeerId?: string | null;
  readonly status?: SeededMatchStatus;
  readonly lastActivity?: string;
}

/**
 * Narrows a JSON object before reading its event fields at the pack-loading
 * boundary, where schema-passthrough payloads are intentionally unknown.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates the minimal on-disk game-event shape consumed by the match-log
 * seeder, returning a concrete event array only after every entry conforms.
 */
export function asSeededGameEvents(
  events: unknown,
): readonly SeededGameEvent[] {
  if (
    Array.isArray(events) &&
    events.every(
      (event) =>
        isRecord(event) &&
        typeof event.id === 'string' &&
        typeof event.gameId === 'string' &&
        typeof event.sequence === 'number' &&
        typeof event.timestamp === 'string' &&
        typeof event.type === 'string' &&
        typeof event.turn === 'number' &&
        typeof event.phase === 'string' &&
        typeof event.visibility === 'string' &&
        isRecord(event.payload),
    )
  ) {
    return events;
  }

  throw new Error(
    'Encounter pack events must be an array of complete match-log event objects',
  );
}

/**
 * Validates optional `matches` row fields before IndexedDB receives them.
 */
export function asSeededMatchesRowFields(
  matchesRow: unknown,
): SeededMatchesRowFields {
  if (!isRecord(matchesRow)) {
    throw new Error(
      'Encounter pack matchesRow must be an object when provided',
    );
  }

  const { hostPeerId, guestPeerId, status, lastActivity } = matchesRow;
  const isNullableString = (
    value: unknown,
  ): value is string | null | undefined =>
    value === undefined || value === null || typeof value === 'string';
  const isSeededMatchStatus = (
    value: unknown,
  ): value is SeededMatchStatus | undefined =>
    value === undefined ||
    value === 'active' ||
    value === 'completed' ||
    value === 'abandoned';

  if (
    !isNullableString(hostPeerId) ||
    !isNullableString(guestPeerId) ||
    !isSeededMatchStatus(status) ||
    (lastActivity !== undefined && typeof lastActivity !== 'string')
  ) {
    throw new Error('Encounter pack matchesRow has invalid match-log fields');
  }

  return { hostPeerId, guestPeerId, status, lastActivity };
}

/**
 * Seeds the browser's `mekstation-match-log` IndexedDB directly via the
 * raw `indexedDB.open` transaction the production match-log storage
 * layer reads from (schema: `src/lib/p2p/matchLogStorageSchema.ts:3-38`;
 * store/keyPath/index definitions: `src/lib/p2p/matchLogStorage.helpers.ts`
 * `migrateMatchLogDatabase` — `matchEvents` keyPath `['matchId',
 * 'sequence']` + `byMatchId`/`bySavedAt` indexes, `matches` keyPath
 * `'matchId'` + `byStatus`/`byLastActivity` indexes). This is the exact
 * mechanism `/gameplay/games/:id`'s cold route mount recovers from —
 * front-door state seeding, not seam injection (design.md "Technical
 * Approach").
 *
 * The `page.evaluate` callback below is stringified and executed in the
 * browser realm: it MUST NOT close over any outer TypeScript function or
 * variable other than the serialized `arg` — `requestToPromise` /
 * `transactionToPromise` are declared inside the callback for that
 * reason, mirroring the original inline implementation this function
 * was extracted from.
 */
export async function seedMatchLog(
  page: Page,
  matchId: string,
  events: readonly SeededGameEvent[],
  matchesRow: SeededMatchesRowFields = {},
): Promise<void> {
  const savedAt = matchesRow.lastActivity ?? '3025-01-01T00:01:00.000Z';

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
      hostPeerId,
      guestPeerId,
      status,
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
        hostPeerId,
        guestPeerId,
        status,
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
      hostPeerId: matchesRow.hostPeerId ?? null,
      guestPeerId: matchesRow.guestPeerId ?? null,
      status: matchesRow.status ?? 'active',
    },
  );
}
