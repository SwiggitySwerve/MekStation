/**
 * EncounterService persist hook tests.
 *
 * Per `link-encounters-to-replays` PR 3 task 3.3: integration tests for
 * the browser-side persist trigger that fires when an encounter
 * session reaches a terminal state. The persist firing point lives on
 * the gameplay games page (`src/pages/gameplay/games/[id].tsx`); the
 * body-derivation logic is extracted to
 * `src/components/encounter/persistEncounterFromSession.ts` so this
 * suite can pin the contract without mounting the full page.
 *
 * Coverage:
 *   1. POST fires with the right URL + method + Content-Type
 *   2. Body shape matches the route handler's contract
 *      (`gameId`, `events`, `winner`, `encounterId`, `encounterName`,
 *      `templateType`, `playerForceSummary`, `opponentSummary`)
 *   3. encounterMeta on GameCreated payload is recovered correctly
 *   4. winner derivation: player / opponent / draw / null
 *   5. Missing encounterMeta falls back to empty strings + null template
 *   6. Network errors surface as `{ ok: false, error }` (helper never throws)
 *
 * @spec openspec/changes/link-encounters-to-replays/specs/game-session-management/spec.md
 */

import {
  buildEncounterPersistBody,
  persistEncounterFromSession,
} from '@/components/encounter/persistEncounterFromSession';
import {
  GamePhase,
  GameSide,
  GameStatus,
  type IGameSession,
} from '@/types/gameplay';

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Build a minimal IGameSession that covers the fields
 * `persistEncounterFromSession` reads. Missing fields are stubbed with
 * non-null shapes so the helper's optional-chaining never short-circuits
 * incidentally.
 */
function makeEncounterSession(
  overrides: {
    readonly gameId?: string;
    readonly encounterId?: string | null;
    readonly winner?: GameSide | 'draw' | null;
    readonly meta?: {
      readonly encounterId?: string;
      readonly encounterName?: string;
      readonly templateType?: string | null;
      readonly playerForceSummary?: string;
      readonly opponentSummary?: string;
    };
    readonly omitMeta?: boolean;
    readonly extraEvents?: ReadonlyArray<unknown>;
  } = {},
): IGameSession {
  const gameId = overrides.gameId ?? 'enc-session-42';
  const encounterId = overrides.encounterId ?? 'enc-1';
  const meta = overrides.omitMeta
    ? undefined
    : {
        encounterId: overrides.meta?.encounterId ?? 'enc-1',
        encounterName: overrides.meta?.encounterName ?? 'Test Encounter',
        templateType:
          overrides.meta?.templateType === undefined
            ? 'duel'
            : overrides.meta.templateType,
        playerForceSummary:
          overrides.meta?.playerForceSummary ??
          'Lance Alpha (4500 BV, 4 units)',
        opponentSummary:
          overrides.meta?.opponentSummary ?? 'Generated OpFor (~3000 BV)',
      };

  const gameCreatedEvent = {
    id: 'evt-1',
    gameId,
    sequence: 0,
    timestamp: '2026-05-08T10:00:00.000Z',
    type: 'game_created',
    turn: 0,
    phase: GamePhase.Initiative,
    payload: {
      config: {
        mapRadius: 6,
        turnLimit: 10,
        victoryConditions: ['destroy_all'],
        optionalRules: [],
        encounterId,
      },
      units: [],
      encounterMeta: meta,
    },
  };

  return {
    id: gameId,
    matchId: gameId,
    createdAt: '2026-05-08T10:00:00.000Z',
    updatedAt: '2026-05-08T10:30:00.000Z',
    config: {
      mapRadius: 6,
      turnLimit: 10,
      victoryConditions: ['destroy_all'],
      optionalRules: [],
      encounterId,
    },
    units: [],
    events: [gameCreatedEvent, ...(overrides.extraEvents ?? [])],
    currentState: {
      gameId,
      turn: 5,
      phase: GamePhase.End,
      status: GameStatus.Completed,
      firstMover: GameSide.Player,
      units: {},
      result:
        overrides.winner === undefined
          ? undefined
          : overrides.winner === null
            ? undefined
            : { winner: overrides.winner, reason: 'destruction' },
    },
  } as unknown as IGameSession;
}

// =============================================================================
// Tests — buildEncounterPersistBody (pure derivation)
// =============================================================================

describe('buildEncounterPersistBody', () => {
  it('builds the body shape the route handler expects', () => {
    const session = makeEncounterSession({ winner: GameSide.Player });
    const body = buildEncounterPersistBody(session);

    expect(body).toEqual({
      gameId: 'enc-session-42',
      events: session.events,
      winner: 'player',
      encounterId: 'enc-1',
      encounterName: 'Test Encounter',
      templateType: 'duel',
      playerForceSummary: 'Lance Alpha (4500 BV, 4 units)',
      opponentSummary: 'Generated OpFor (~3000 BV)',
    });
  });

  it('derives winner=opponent when result.winner is GameSide.Opponent', () => {
    const session = makeEncounterSession({ winner: GameSide.Opponent });
    const body = buildEncounterPersistBody(session);
    expect(body.winner).toBe('opponent');
  });

  it('derives winner=draw when result.winner is "draw"', () => {
    const session = makeEncounterSession({ winner: 'draw' });
    const body = buildEncounterPersistBody(session);
    expect(body.winner).toBe('draw');
  });

  it('derives winner=null when no result is set', () => {
    const session = makeEncounterSession({ winner: null });
    const body = buildEncounterPersistBody(session);
    expect(body.winner).toBeNull();
  });

  it('falls back to empty strings + null template when encounterMeta is missing', () => {
    const session = makeEncounterSession({
      omitMeta: true,
      winner: GameSide.Player,
    });
    const body = buildEncounterPersistBody(session);

    expect(body.encounterId).toBe('enc-1');
    expect(body.encounterName).toBe('');
    expect(body.templateType).toBeNull();
    expect(body.playerForceSummary).toBe('');
    expect(body.opponentSummary).toBe('');
  });

  it('preserves null templateType for free-form encounters', () => {
    const session = makeEncounterSession({
      winner: GameSide.Player,
      meta: { templateType: null },
    });
    const body = buildEncounterPersistBody(session);
    expect(body.templateType).toBeNull();
  });

  it('passes through arbitrary string templateType (e.g. "skirmish")', () => {
    const session = makeEncounterSession({
      winner: GameSide.Player,
      meta: { templateType: 'skirmish' },
    });
    const body = buildEncounterPersistBody(session);
    expect(body.templateType).toBe('skirmish');
  });
});

// =============================================================================
// Tests — persistEncounterFromSession (POST integration)
// =============================================================================

describe('persistEncounterFromSession', () => {
  it('POSTs to /api/replay-library/encounter with the correct body shape', async () => {
    const session = makeEncounterSession({ winner: GameSide.Player });
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const result = await persistEncounterFromSession(session, {
      fetchImpl: fetchSpy as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/replay-library/encounter');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });

    const parsedBody = JSON.parse(init.body as string);
    expect(parsedBody).toMatchObject({
      gameId: 'enc-session-42',
      winner: 'player',
      encounterId: 'enc-1',
      encounterName: 'Test Encounter',
      templateType: 'duel',
      playerForceSummary: 'Lance Alpha (4500 BV, 4 units)',
      opponentSummary: 'Generated OpFor (~3000 BV)',
    });
    expect(Array.isArray(parsedBody.events)).toBe(true);
    expect(parsedBody.events.length).toBeGreaterThanOrEqual(1);
  });

  it('returns ok=false with the response status when the route returns non-2xx', async () => {
    const session = makeEncounterSession({ winner: GameSide.Player });
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const result = await persistEncounterFromSession(session, {
      fetchImpl: fetchSpy as unknown as typeof fetch,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
  });

  it('returns ok=false with the thrown error when fetch rejects', async () => {
    const session = makeEncounterSession({ winner: GameSide.Player });
    const networkError = new Error('network unreachable');
    const fetchSpy = jest.fn().mockRejectedValue(networkError);

    const result = await persistEncounterFromSession(session, {
      fetchImpl: fetchSpy as unknown as typeof fetch,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe(networkError);
    // status is undefined — helper never throws.
  });

  it('honors a custom URL override (test contract pinning)', async () => {
    const session = makeEncounterSession({ winner: GameSide.Player });
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    await persistEncounterFromSession(session, {
      fetchImpl: fetchSpy as unknown as typeof fetch,
      url: '/api/test-route',
    });

    expect(fetchSpy.mock.calls[0][0]).toBe('/api/test-route');
  });
});
