/**
 * Replay Library encounter-game persist API route — handler tests.
 *
 * Mirror of `src/__tests__/api/replay-library/quick.test.ts` adapted for
 * the encounter route. Covers the contract scenarios for
 * `POST /api/replay-library/encounter`:
 *   1. Happy-path POST calls `persistEncounterGame()` once with the
 *      parsed body and forwards its result to the response.
 *   2. Duplicate POST (gameId already present in manifest)
 *      short-circuits to `{persisted: false, alreadyPersisted: true}`
 *      WITHOUT calling `persistEncounterGame` again.
 *   3. 405 on non-POST methods.
 *   4. 400 on bad input (bad gameId / non-array events / bad winner /
 *      missing encounterId / bad templateType / non-object body).
 *   5. 500 on `persistEncounterGame` throw.
 *
 * The persist pipeline itself is covered by
 * `src/components/encounter/__tests__/persistEncounterGame.test.ts`
 * which exercises the actual filesystem write against a tmpdir cwd.
 * This suite mocks `persistEncounterGame` so we test ONLY the route's
 * input-validation + dedup-guard + result-forwarding behavior.
 *
 * The dedup guard is exercised against the real `readReplayIndex()`
 * implementation, with `process.cwd()` mocked to a tmpdir so we get
 * full handler ↔ reader wiring coverage.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type {
  IEncounterReplayManifestEntry,
  IReplayManifestEntry,
} from '@/replay-library/types';

import { ScenarioTemplateType } from '@/types/encounter/EncounterInterfaces';
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

jest.mock('@/components/encounter/persistEncounterGame', () => {
  const actual = jest.requireActual<
    typeof import('@/components/encounter/persistEncounterGame')
  >('@/components/encounter/persistEncounterGame');
  return {
    __esModule: true,
    // Re-export `buildEncounterManifestEntry` from the real module — the
    // route uses it to shape the response on the dedup branch.
    buildEncounterManifestEntry: actual.buildEncounterManifestEntry,
    stampEncounterReplaySource: actual.stampEncounterReplaySource,
    // `persistEncounterGame` is the side-effecting export; replace it
    // with a jest mock so the handler test stays hermetic.
    persistEncounterGame: jest.fn(),
  };
});

// Import AFTER the mock is registered.
// eslint-disable-next-line import/first
import { persistEncounterGame } from '@/components/encounter/persistEncounterGame';
// eslint-disable-next-line import/first
import handler, {
  config as routeConfig,
} from '@/pages/api/replay-library/encounter';

const mockedPersistEncounterGame = persistEncounterGame as jest.MockedFunction<
  typeof persistEncounterGame
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
  return fs.mkdtemp(path.join(os.tmpdir(), 'replay-library-encounter-test-'));
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

interface IValidBody {
  gameId: string;
  events: IGameEvent[];
  winner: 'player' | 'opponent' | 'draw' | null;
  encounterId: string;
  encounterName: string;
  templateType: ScenarioTemplateType | null;
  playerForceSummary: string;
  opponentSummary: string;
}

function validBody(gameId = 'encounter-route-1'): IValidBody {
  return {
    gameId,
    events: makeEvents(gameId),
    winner: 'player',
    encounterId: 'enc-row-1',
    encounterName: 'Storming the Citadel',
    templateType: ScenarioTemplateType.Skirmish,
    playerForceSummary: "Wolf's Dragoons (4500 BV, 4 units)",
    opponentSummary: 'Clan Jade Falcon (5200 BV, 5 units)',
  };
}

// Build a write-success result shape the route forwards to the client.
function makeWriteSuccess(gameId: string): {
  persisted: boolean;
  path: string;
  manifestEntry: IEncounterReplayManifestEntry;
} {
  return {
    persisted: true,
    path: path.join('simulation-reports', 'encounter', `${gameId}.jsonl`),
    manifestEntry: {
      id: gameId,
      replaySource: ReplaySource.Encounter,
      path: `encounter/${gameId}.jsonl`,
      createdAt: '2026-05-08T00:00:00.000Z',
      turns: 1,
      winner: GameSide.Player,
      bvTotal: 0,
      encounterId: 'enc-row-1',
      encounterName: 'Storming the Citadel',
      templateType: ScenarioTemplateType.Skirmish,
      playerForceSummary: "Wolf's Dragoons (4500 BV, 4 units)",
      opponentSummary: 'Clan Jade Falcon (5200 BV, 5 units)',
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('POST /api/replay-library/encounter', () => {
  let tmpDir: string;
  let cwdSpy: jest.SpyInstance | null = null;

  beforeAll(() => {
    enableTestMode();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    tmpDir = await makeTmpReports();
    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tmpDir);
    mockedPersistEncounterGame.mockResolvedValue(makeWriteSuccess('default'));
  });

  afterEach(async () => {
    cwdSpy?.mockRestore();
    cwdSpy = null;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('calls persistEncounterGame once with parsed body and forwards the result', async () => {
    const result = makeWriteSuccess('encounter-happy-1');
    mockedPersistEncounterGame.mockResolvedValueOnce(result);

    const body = validBody('encounter-happy-1');
    const req = createMockRequest({ body });
    const res = createMockResponse();

    await handler(req, res);

    expect(mockedPersistEncounterGame).toHaveBeenCalledTimes(1);
    expect(mockedPersistEncounterGame).toHaveBeenCalledWith({
      gameId: 'encounter-happy-1',
      events: body.events,
      winner: 'player',
      encounterId: 'enc-row-1',
      encounterName: 'Storming the Citadel',
      templateType: ScenarioTemplateType.Skirmish,
      playerForceSummary: "Wolf's Dragoons (4500 BV, 4 units)",
      opponentSummary: 'Clan Jade Falcon (5200 BV, 5 units)',
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
    // Pre-seed the manifest with a duplicate entry. Real
    // `readReplayIndex()` reads this and the route MUST return the
    // dedup branch without calling `persistEncounterGame` again.
    const reportsDir = path.join(tmpDir, 'simulation-reports');
    await fs.mkdir(reportsDir, { recursive: true });
    const seed: IReplayManifestEntry[] = [
      {
        id: 'encounter-dup-1',
        replaySource: ReplaySource.Encounter,
        path: 'encounter/encounter-dup-1.jsonl',
        createdAt: '2026-05-08T00:00:00.000Z',
        turns: 5,
        winner: GameSide.Player,
        bvTotal: 3000,
        encounterId: 'enc-row-1',
        encounterName: 'Storming the Citadel',
        templateType: ScenarioTemplateType.Skirmish,
        playerForceSummary: "Wolf's Dragoons (4500 BV, 4 units)",
        opponentSummary: 'Clan Jade Falcon (5200 BV, 5 units)',
      } as IReplayManifestEntry,
    ];
    await fs.writeFile(
      path.join(reportsDir, 'replay-index.json'),
      JSON.stringify(seed),
      'utf8',
    );

    const req = createMockRequest({ body: validBody('encounter-dup-1') });
    const res = createMockResponse();

    await handler(req, res);

    // Critical: persistEncounterGame() MUST NOT be called on a duplicate.
    expect(mockedPersistEncounterGame).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonArg = res.json.mock.calls[0][0] as {
      persisted: boolean;
      alreadyPersisted: boolean;
      path: string | null;
      manifestEntry: { id: string; replaySource: ReplaySource };
    };
    expect(jsonArg.persisted).toBe(false);
    expect(jsonArg.alreadyPersisted).toBe(true);
    expect(jsonArg.path).toBe('encounter/encounter-dup-1.jsonl');
    expect(jsonArg.manifestEntry.id).toBe('encounter-dup-1');
    expect(jsonArg.manifestEntry.replaySource).toBe(ReplaySource.Encounter);
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

    const result = makeWriteSuccess('encounter-malformed-1');
    mockedPersistEncounterGame.mockResolvedValueOnce(result);

    const req = createMockRequest({ body: validBody('encounter-malformed-1') });
    const res = createMockResponse();

    await handler(req, res);

    expect(mockedPersistEncounterGame).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    const jsonArg = res.json.mock.calls[0][0] as {
      persisted: boolean;
      alreadyPersisted: boolean;
    };
    expect(jsonArg.persisted).toBe(true);
    expect(jsonArg.alreadyPersisted).toBe(false);
  });

  it('returns 500 PERSIST_FAILED when persistEncounterGame throws', async () => {
    mockedPersistEncounterGame.mockRejectedValueOnce(new Error('disk full'));

    const req = createMockRequest({ body: validBody('encounter-error-1') });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'failed to persist encounter game',
      code: 'PERSIST_FAILED',
    });
  });

  it('rejects non-POST methods with 405', async () => {
    const req = createMockRequest({ method: 'GET', body: validBody() });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(mockedPersistEncounterGame).not.toHaveBeenCalled();
  });

  it.each([
    ['contains dot-dot', 'foo/../bar'],
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
    expect(mockedPersistEncounterGame).not.toHaveBeenCalled();
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
  // Audit W5.2 (H cluster): events element validation BEFORE any FS write.
  // A payload-less game_created used to pass the array-only check, write
  // the JSONL, then throw in the manifest builder — orphan file on disk.
  // ===========================================================================

  it('returns 400 BAD_EVENTS when an event is missing its payload (no persist call)', async () => {
    const [gameCreated, turnStarted] = makeEvents('encounter-bad-evt-1');
    const payloadless = { ...gameCreated } as Record<string, unknown>;
    delete payloadless.payload;

    const req = createMockRequest({
      body: {
        ...validBody('encounter-bad-evt-1'),
        events: [payloadless, turnStarted],
      },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'BAD_EVENTS' }),
    );
    expect(mockedPersistEncounterGame).not.toHaveBeenCalled();
  });

  it('returns 400 BAD_EVENTS when an event is not an object (no persist call)', async () => {
    const req = createMockRequest({
      body: {
        ...validBody('encounter-bad-evt-2'),
        events: ['not-an-event'],
      },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'BAD_EVENTS' }),
    );
    expect(mockedPersistEncounterGame).not.toHaveBeenCalled();
  });

  // ===========================================================================
  // Audit W5.2 (H cluster): body-size ceiling. Real event logs already
  // brush Next's 1MB default (largest on-disk replay measured 1,105,638
  // bytes) — the route must raise the bodyParser limit and reject
  // over-ceiling payloads with an explicit 413.
  // ===========================================================================

  it('exports a Next bodyParser sizeLimit of 16mb (real logs already exceed the 1mb default)', () => {
    expect(routeConfig?.api?.bodyParser?.sizeLimit).toBe('16mb');
  });

  it('returns 413 PAYLOAD_TOO_LARGE when Content-Length exceeds the ceiling', async () => {
    const req = createMockRequest({
      body: validBody('encounter-huge-1'),
      headers: { 'content-length': String(17 * 1024 * 1024) },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PAYLOAD_TOO_LARGE' }),
    );
    expect(mockedPersistEncounterGame).not.toHaveBeenCalled();
  });

  it('persists a >1MB event log (the old silent-failure size) when under the ceiling', async () => {
    const result = makeWriteSuccess('encounter-large-1');
    mockedPersistEncounterGame.mockResolvedValueOnce(result);

    // ~1.5MB of serialized events — over Next's old 1MB default, well
    // under the 16mb ceiling. Direct handler calls bypass Next's body
    // parser, so this pins the route logic itself imposing no cap.
    const [gameCreated] = makeEvents('encounter-large-1');
    const bigEvents = Array.from({ length: 1500 }, (_, i) => ({
      ...gameCreated,
      id: `encounter-large-1-evt-${i}`,
      sequence: i,
      payload: { filler: 'x'.repeat(1000) },
    }));
    const body = { ...validBody('encounter-large-1'), events: bigEvents };
    const serializedBytes = JSON.stringify(body).length;
    expect(serializedBytes).toBeGreaterThan(1024 * 1024);

    const req = createMockRequest({
      body,
      headers: { 'content-length': String(serializedBytes) },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockedPersistEncounterGame).toHaveBeenCalledTimes(1);
  });

  it('returns 400 BAD_WINNER when winner is an unknown string', async () => {
    const req = createMockRequest({
      body: { ...validBody(), winner: 'banana' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'invalid winner',
      code: 'BAD_WINNER',
    });
  });

  it('accepts winner=null (timed-out / aborted encounter)', async () => {
    const result = makeWriteSuccess('encounter-null-1');
    mockedPersistEncounterGame.mockResolvedValueOnce(result);

    const req = createMockRequest({
      body: { ...validBody('encounter-null-1'), winner: null },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockedPersistEncounterGame).toHaveBeenCalledWith(
      expect.objectContaining({ winner: null }),
    );
  });

  it('returns 400 BAD_ENCOUNTER_ID when encounterId is missing', async () => {
    const body = validBody();
    delete (body as Partial<typeof body>).encounterId;
    const req = createMockRequest({ body });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'encounterId must be a non-empty string',
      code: 'BAD_ENCOUNTER_ID',
    });
  });

  it('returns 400 BAD_ENCOUNTER_ID when encounterId is an empty string', async () => {
    const req = createMockRequest({
      body: { ...validBody(), encounterId: '' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'encounterId must be a non-empty string',
      code: 'BAD_ENCOUNTER_ID',
    });
  });

  it('returns 400 BAD_ENCOUNTER_NAME when encounterName is missing', async () => {
    const body = validBody();
    delete (body as Partial<typeof body>).encounterName;
    const req = createMockRequest({ body });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'encounterName must be a string',
      code: 'BAD_ENCOUNTER_NAME',
    });
  });

  it('returns 400 BAD_TEMPLATE_TYPE when templateType is an unknown string', async () => {
    const req = createMockRequest({
      body: { ...validBody(), templateType: 'mystery-template' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'invalid templateType',
      code: 'BAD_TEMPLATE_TYPE',
    });
  });

  it('accepts templateType=null (free-form / custom encounter)', async () => {
    const result = makeWriteSuccess('encounter-custom-1');
    mockedPersistEncounterGame.mockResolvedValueOnce(result);

    const req = createMockRequest({
      body: { ...validBody('encounter-custom-1'), templateType: null },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockedPersistEncounterGame).toHaveBeenCalledWith(
      expect.objectContaining({ templateType: null }),
    );
  });

  it('returns 400 BAD_PLAYER_FORCE_SUMMARY when playerForceSummary is missing', async () => {
    const body = validBody();
    delete (body as Partial<typeof body>).playerForceSummary;
    const req = createMockRequest({ body });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'playerForceSummary must be a string',
      code: 'BAD_PLAYER_FORCE_SUMMARY',
    });
  });

  it('returns 400 BAD_OPPONENT_SUMMARY when opponentSummary is missing', async () => {
    const body = validBody();
    delete (body as Partial<typeof body>).opponentSummary;
    const req = createMockRequest({ body });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'opponentSummary must be a string',
      code: 'BAD_OPPONENT_SUMMARY',
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
