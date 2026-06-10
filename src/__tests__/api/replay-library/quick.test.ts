/**
 * Replay Library quick-game persist API route — handler tests.
 *
 * Covers the four contract scenarios for `POST /api/replay-library/quick`:
 *   1. Happy-path POST calls `persistQuickGame()` once with the parsed
 *      body and forwards its result to the response.
 *   2. Duplicate POST (gameId already present in manifest) short-circuits
 *      to `{persisted: false, alreadyPersisted: true}` WITHOUT calling
 *      `persistQuickGame` again — the dedup guard is the Momus blocking
 *      gap fix, so it's the most important assertion.
 *   3. 405 on non-POST methods.
 *   4. 400 on bad input (bad gameId / non-array events / bad winner /
 *      missing aiVariant / non-object body).
 *
 * The persist pipeline itself is covered by
 * `src/components/quickgame/__tests__/persistQuickGame.test.ts` which
 * exercises the actual filesystem write against a tmpdir cwd. This
 * suite mocks `persistQuickGame` so we test ONLY the route's
 * input-validation + dedup-guard + result-forwarding behavior.
 *
 * The dedup guard is exercised against the real `readReplayIndex()`
 * implementation, with `process.cwd()` mocked to a tmpdir so we get
 * full handler ↔ reader wiring coverage of the duplicate-detection
 * path (the part that actually saved us from the blind-append footgun).
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type {
  IQuickReplayManifestEntry,
  IReplayManifestEntry,
} from '@/replay-library/types';

import {
  GameEventType,
  GamePhase,
  GameSide,
  ReplaySource,
  type IGameEvent,
} from '@/types/gameplay';
import { enableTestMode } from '@/utils/logger';

// =============================================================================
// Module mock — must precede the handler import.
// =============================================================================

jest.mock('@/components/quickgame/persistQuickGame', () => {
  const actual = jest.requireActual<
    typeof import('@/components/quickgame/persistQuickGame')
  >('@/components/quickgame/persistQuickGame');
  return {
    __esModule: true,
    // Re-export `buildQuickManifestEntry` from the real module — the
    // route uses it to shape the response on the dedup branch.
    buildQuickManifestEntry: actual.buildQuickManifestEntry,
    // `persistQuickGame` is the only side-effecting export; replace it
    // with a jest mock so the handler test stays hermetic. The default
    // mock returns a write-success shape; individual tests override
    // with mockImplementationOnce when they need a different result.
    persistQuickGame: jest.fn(),
  };
});

// Import AFTER the mock is registered.
// eslint-disable-next-line import/first
import { persistQuickGame } from '@/components/quickgame/persistQuickGame';
// eslint-disable-next-line import/first
import handler, {
  config as routeConfig,
} from '@/pages/api/replay-library/quick';

const mockedPersistQuickGame = persistQuickGame as jest.MockedFunction<
  typeof persistQuickGame
>;

// =============================================================================
// Test Helpers
// =============================================================================

interface MockNextApiResponse extends NextApiResponse {
  status: jest.Mock;
  json: jest.Mock;
  setHeader: jest.Mock;
}

function createMockRequest(
  overrides: Partial<NextApiRequest> = {},
): NextApiRequest {
  return {
    method: 'POST',
    query: {},
    body: {},
    headers: {},
    ...overrides,
  } as NextApiRequest;
}

function createMockResponse(): MockNextApiResponse {
  const res: Partial<MockNextApiResponse> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res as MockNextApiResponse;
}

async function makeTmpReports(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'replay-library-quick-test-'));
}

// Build a minimal valid event log — one GameCreated + one TurnStarted.
function makeEvents(gameId: string): IGameEvent[] {
  return [
    {
      id: `${gameId}-evt-0`,
      gameId,
      sequence: 0,
      timestamp: '2026-05-08T00:00:00.000Z',
      type: GameEventType.GameCreated,
      turn: 0,
      phase: GamePhase.Initiative,
      payload: {
        config: {
          mapRadius: 10,
          turnLimit: 10,
          victoryConditions: ['destruction'],
          optionalRules: [],
        },
        units: [],
      },
    } as IGameEvent,
    {
      id: `${gameId}-evt-1`,
      gameId,
      sequence: 1,
      timestamp: '2026-05-08T00:00:01.000Z',
      type: GameEventType.TurnStarted,
      turn: 1,
      phase: GamePhase.Initiative,
      payload: {},
    } as IGameEvent,
  ];
}

function validBody(gameId = 'quick-route-1'): {
  gameId: string;
  events: IGameEvent[];
  winner: 'player' | 'opponent' | 'draw' | null;
  aiVariant: string;
} {
  return {
    gameId,
    events: makeEvents(gameId),
    winner: 'player',
    aiVariant: 'aggressive-v2',
  };
}

// Build a write-success result shape the route forwards to the client.
// `manifestEntry` is typed `IQuickReplayManifestEntry` (not the union)
// because the route's `persistQuickGame` always returns the Quick variant.
function makeWriteSuccess(gameId: string): {
  persisted: boolean;
  path: string;
  manifestEntry: IQuickReplayManifestEntry;
} {
  return {
    persisted: true,
    path: path.join('simulation-reports', 'quick', `${gameId}.jsonl`),
    manifestEntry: {
      id: gameId,
      replaySource: ReplaySource.Quick,
      path: `quick/${gameId}.jsonl`,
      createdAt: '2026-05-08T00:00:00.000Z',
      turns: 1,
      winner: GameSide.Player,
      bvTotal: 0,
      playerSide: GameSide.Player,
      aiVariant: 'aggressive-v2',
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('POST /api/replay-library/quick', () => {
  let tmpDir: string;
  let cwdSpy: jest.SpyInstance | null = null;

  beforeAll(() => {
    enableTestMode();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    tmpDir = await makeTmpReports();
    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tmpDir);
    mockedPersistQuickGame.mockResolvedValue(makeWriteSuccess('default'));
  });

  afterEach(async () => {
    cwdSpy?.mockRestore();
    cwdSpy = null;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('calls persistQuickGame once with parsed body and forwards the result', async () => {
    const result = makeWriteSuccess('quick-happy-1');
    mockedPersistQuickGame.mockResolvedValueOnce(result);

    const body = validBody('quick-happy-1');
    const req = createMockRequest({ body });
    const res = createMockResponse();

    await handler(req, res);

    expect(mockedPersistQuickGame).toHaveBeenCalledTimes(1);
    expect(mockedPersistQuickGame).toHaveBeenCalledWith({
      gameId: 'quick-happy-1',
      events: body.events,
      winner: 'player',
      aiVariant: 'aggressive-v2',
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      persisted: true,
      alreadyPersisted: false,
      manifestEntry: result.manifestEntry,
      path: result.path,
    });
  });

  it('short-circuits with alreadyPersisted=true when gameId is already in the manifest', async () => {
    // Pre-seed the manifest with the duplicate entry (Momus blocking-gap
    // scenario: hard refresh fires the persist effect again on a game
    // whose row already exists). Real `readReplayIndex()` reads this
    // and the route MUST return the dedup branch without calling
    // `persistQuickGame` again.
    const reportsDir = path.join(tmpDir, 'simulation-reports');
    await fs.mkdir(reportsDir, { recursive: true });
    const seed: IReplayManifestEntry[] = [
      {
        id: 'quick-dup-1',
        replaySource: ReplaySource.Quick,
        path: 'quick/quick-dup-1.jsonl',
        createdAt: '2026-05-08T00:00:00.000Z',
        turns: 5,
        winner: GameSide.Player,
        bvTotal: 3000,
        playerSide: GameSide.Player,
        aiVariant: 'aggressive-v2',
      } as IReplayManifestEntry,
    ];
    await fs.writeFile(
      path.join(reportsDir, 'replay-index.json'),
      JSON.stringify(seed),
      'utf8',
    );

    const req = createMockRequest({ body: validBody('quick-dup-1') });
    const res = createMockResponse();

    await handler(req, res);

    // Critical: persistQuickGame() MUST NOT be called on a duplicate.
    expect(mockedPersistQuickGame).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonArg = res.json.mock.calls[0][0] as {
      persisted: boolean;
      alreadyPersisted: boolean;
      path: string | null;
      manifestEntry: { id: string };
    };
    expect(jsonArg.persisted).toBe(false);
    expect(jsonArg.alreadyPersisted).toBe(true);
    expect(jsonArg.path).toBe('quick/quick-dup-1.jsonl');
    expect(jsonArg.manifestEntry.id).toBe('quick-dup-1');
  });

  it('continues to persist when the manifest read fails (does not 500)', async () => {
    // Write a malformed replay-index.json. `readReplayIndex` propagates
    // the JSON.parse error; the route catches and falls through to the
    // persist call instead of 500-ing on a soft index issue.
    const reportsDir = path.join(tmpDir, 'simulation-reports');
    await fs.mkdir(reportsDir, { recursive: true });
    await fs.writeFile(
      path.join(reportsDir, 'replay-index.json'),
      'not valid json',
      'utf8',
    );

    const result = makeWriteSuccess('quick-malformed-1');
    mockedPersistQuickGame.mockResolvedValueOnce(result);

    const req = createMockRequest({ body: validBody('quick-malformed-1') });
    const res = createMockResponse();

    await handler(req, res);

    expect(mockedPersistQuickGame).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    const jsonArg = res.json.mock.calls[0][0] as {
      persisted: boolean;
      alreadyPersisted: boolean;
    };
    expect(jsonArg.persisted).toBe(true);
    expect(jsonArg.alreadyPersisted).toBe(false);
  });

  it('returns 500 PERSIST_FAILED when persistQuickGame throws', async () => {
    mockedPersistQuickGame.mockRejectedValueOnce(new Error('disk full'));

    const req = createMockRequest({ body: validBody('quick-error-1') });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'failed to persist quick game',
      code: 'PERSIST_FAILED',
    });
  });

  it('rejects non-POST methods with 405', async () => {
    const req = createMockRequest({ method: 'GET', body: validBody() });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(mockedPersistQuickGame).not.toHaveBeenCalled();
  });

  it.each([
    ['contains dot-dot', '..'],
    ['contains forward-slash', 'foo/bar'],
    ['contains backslash', 'foo\\bar'],
    ['contains dot', 'sim.1'],
    ['empty string', ''],
  ])('returns 400 BAD_GAME_ID when gameId %s', async (_label, badId) => {
    const req = createMockRequest({
      body: { ...validBody(), gameId: badId },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'invalid gameId',
      code: 'BAD_GAME_ID',
    });
    expect(mockedPersistQuickGame).not.toHaveBeenCalled();
  });

  it('returns 400 BAD_EVENTS when events is not an array', async () => {
    const req = createMockRequest({
      body: { ...validBody(), events: 'not-an-array' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'events must be an array',
      code: 'BAD_EVENTS',
    });
  });

  // ===========================================================================
  // Audit W5.2 (H cluster): events element validation + body-size ceiling.
  // Mirrors the encounter route tests — same defects, sibling route.
  // ===========================================================================

  it('returns 400 BAD_EVENTS when an event is missing its payload (no persist call)', async () => {
    const [gameCreated, turnStarted] = makeEvents('quick-bad-evt-1');
    const payloadless = { ...gameCreated } as Record<string, unknown>;
    delete payloadless.payload;

    const req = createMockRequest({
      body: {
        ...validBody('quick-bad-evt-1'),
        events: [payloadless, turnStarted],
      },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'BAD_EVENTS' }),
    );
    expect(mockedPersistQuickGame).not.toHaveBeenCalled();
  });

  it('returns 400 BAD_EVENTS when an event is not an object (no persist call)', async () => {
    const req = createMockRequest({
      body: { ...validBody('quick-bad-evt-2'), events: ['not-an-event'] },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'BAD_EVENTS' }),
    );
    expect(mockedPersistQuickGame).not.toHaveBeenCalled();
  });

  it('exports a Next bodyParser sizeLimit of 16mb (real logs already exceed the 1mb default)', () => {
    expect(routeConfig?.api?.bodyParser?.sizeLimit).toBe('16mb');
  });

  it('returns 413 PAYLOAD_TOO_LARGE when Content-Length exceeds the ceiling', async () => {
    const req = createMockRequest({
      body: validBody('quick-huge-1'),
      headers: { 'content-length': String(17 * 1024 * 1024) },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PAYLOAD_TOO_LARGE' }),
    );
    expect(mockedPersistQuickGame).not.toHaveBeenCalled();
  });

  it('returns 400 BAD_WINNER when winner is an unknown string', async () => {
    const req = createMockRequest({
      body: { ...validBody(), winner: 'mystery' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'invalid winner',
      code: 'BAD_WINNER',
    });
  });

  it('accepts winner=null (timed-out / aborted game)', async () => {
    const result = makeWriteSuccess('quick-null-1');
    mockedPersistQuickGame.mockResolvedValueOnce(result);

    const req = createMockRequest({
      body: { ...validBody('quick-null-1'), winner: null },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockedPersistQuickGame).toHaveBeenCalledWith(
      expect.objectContaining({ winner: null }),
    );
  });

  it('returns 400 BAD_AI_VARIANT when aiVariant is missing', async () => {
    const body = validBody();
    delete (body as Partial<typeof body>).aiVariant;
    const req = createMockRequest({ body });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'aiVariant must be a string',
      code: 'BAD_AI_VARIANT',
    });
  });

  it('returns 400 BAD_BODY when the body is not an object', async () => {
    const req = createMockRequest({ body: 'plain-string' });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'request body must be an object',
      code: 'BAD_BODY',
    });
  });
});
