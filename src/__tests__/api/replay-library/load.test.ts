/**
 * Replay Library load-events API route — handler tests.
 *
 * Covers the five scenarios called out in the PR 6 phase A breakdown:
 *   1. Returns parsed events array for valid source+gameId
 *   2. 400 BAD_SOURCE on unrecognized source string
 *   3. 400 BAD_GAME_ID on gameId with `..`, `/`, or other special chars
 *   4. 404 NOT_FOUND when file doesn't exist
 *   5. 200 with empty events array on empty file
 *
 * The handler reads from a tmpdir cwd via `process.cwd()` mock so we
 * exercise the real `fs.readFile` path without polluting the worktree.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import handler from '@/pages/api/replay-library/[source]/[gameId]';
import { enableTestMode } from '@/utils/logger';

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
    method: 'GET',
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
  return fs.mkdtemp(path.join(os.tmpdir(), 'replay-library-load-test-'));
}

// =============================================================================
// Tests
// =============================================================================

describe('GET /api/replay-library/[source]/[gameId]', () => {
  let tmpDir: string;
  let cwdSpy: jest.SpyInstance | null = null;

  beforeAll(() => {
    enableTestMode();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    tmpDir = await makeTmpReports();
    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(async () => {
    cwdSpy?.mockRestore();
    cwdSpy = null;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // Replay-safety PR 18: the route now loads through the full replay
  // pipeline, so fixtures must be genuine IGameEvent envelopes with
  // schema-valid payloads.
  const validEvents = [
    {
      id: 'evt-0',
      gameId: 'sim-1',
      sequence: 0,
      timestamp: '2026-05-07T10:00:00.000Z',
      type: 'turn_started',
      turn: 1,
      phase: 'initiative',
      payload: {},
    },
    {
      id: 'evt-1',
      gameId: 'sim-1',
      sequence: 1,
      timestamp: '2026-05-07T10:00:01.000Z',
      type: 'trooper_killed',
      turn: 1,
      phase: 'weapon_attack',
      payload: {
        unitId: 'elemental-squad',
        trooperIndex: 2,
        survivingTroopers: 4,
      },
    },
  ];

  it('returns parsed events array for valid source+gameId', async () => {
    const swarmDir = path.join(tmpDir, 'simulation-reports', 'swarm');
    await fs.mkdir(swarmDir, { recursive: true });
    const ndjson =
      validEvents.map((e) => JSON.stringify(e)).join('\n') + '\n\n';
    await fs.writeFile(path.join(swarmDir, 'sim-1.jsonl'), ndjson, 'utf8');

    const req = createMockRequest({
      method: 'GET',
      query: { source: 'swarm', gameId: 'sim-1' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      events: validEvents,
      gameId: 'sim-1',
      sourceDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it('returns 422 REPLAY_HISTORY_BLOCKED with typed per-line evidence', async () => {
    const swarmDir = path.join(tmpDir, 'simulation-reports', 'swarm');
    await fs.mkdir(swarmDir, { recursive: true });
    const ndjson = [
      JSON.stringify(validEvents[0]),
      '{this line is broken}',
      JSON.stringify({ ...validEvents[1], type: 'warp_drive_engaged' }),
    ].join('\n');
    await fs.writeFile(path.join(swarmDir, 'sim-bad.jsonl'), ndjson, 'utf8');

    const req = createMockRequest({
      method: 'GET',
      query: { source: 'swarm', gameId: 'sim-bad' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
    const body = (res.json as jest.Mock).mock.calls[0]?.[0];
    expect(body.code).toBe('REPLAY_HISTORY_BLOCKED');
    expect(body.blocked.sourceId).toBe('swarm/sim-bad');
    expect(body.blocked.formatId).toBe('simulation-report-jsonl');
    expect(body.blocked.blockedLineCount).toBe(2);
    expect(body.blocked.blockedLines).toEqual([
      expect.objectContaining({ line: 2, reason: 'invalid-source-event' }),
      expect.objectContaining({
        line: 3,
        reason: 'unsupported-event-type',
        eventType: 'warp_drive_engaged',
      }),
    ]);
    // No partial event list ships on a blocked history.
    expect(body.events).toBeUndefined();
  });

  it('returns 400 BAD_SOURCE on unrecognized source string', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { source: 'lan-coop', gameId: 'sim-1' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'unknown replay source',
      code: 'BAD_SOURCE',
    });
  });

  it.each([
    ['contains dot-dot', '..'],
    ['contains forward-slash', 'foo/bar'],
    ['contains backslash', 'foo\\bar'],
    ['contains dot', 'sim.1'],
    ['empty string', ''],
  ])('returns 400 BAD_GAME_ID when gameId %s', async (_label, badId) => {
    const req = createMockRequest({
      method: 'GET',
      query: { source: 'swarm', gameId: badId },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'invalid gameId',
      code: 'BAD_GAME_ID',
    });
  });

  it('returns 404 NOT_FOUND when file does not exist', async () => {
    // tmpDir has no `simulation-reports/swarm/missing.jsonl`. Source is
    // valid; gameId passes the regex. The handler must return 404, not 500.
    const req = createMockRequest({
      method: 'GET',
      query: { source: 'swarm', gameId: 'missing' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'replay not found',
      code: 'NOT_FOUND',
    });
  });

  it('returns 200 with empty events array on empty file', async () => {
    const quickDir = path.join(tmpDir, 'simulation-reports', 'quick');
    await fs.mkdir(quickDir, { recursive: true });
    await fs.writeFile(path.join(quickDir, 'quick-7.jsonl'), '', 'utf8');

    const req = createMockRequest({
      method: 'GET',
      query: { source: 'quick', gameId: 'quick-7' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      events: [],
      gameId: 'quick-7',
      sourceDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it('rejects non-GET methods with 405', async () => {
    const req = createMockRequest({
      method: 'POST',
      query: { source: 'swarm', gameId: 'sim-1' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET']);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('accepts source=encounter (5th ReplaySource auto-extends RECOGNIZED_REPLAY_SOURCES)', async () => {
    // Per `link-encounters-to-replays` PR 1 task 1.4: the route's
    // `RECOGNIZED_REPLAY_SOURCES = new Set(Object.values(ReplaySource))`
    // SHALL pick up the new variant automatically. This test pins the
    // behavior so a future regression that hardcodes the source list
    // (e.g. `new Set(['swarm', 'quick', 'pvp', 'campaign'])`) trips here.
    const encounterDir = path.join(tmpDir, 'simulation-reports', 'encounter');
    await fs.mkdir(encounterDir, { recursive: true });
    const events = [{ ...validEvents[0], gameId: 'enc-1' }];
    const ndjson = events.map((e) => JSON.stringify(e)).join('\n');
    await fs.writeFile(path.join(encounterDir, 'enc-1.jsonl'), ndjson, 'utf8');

    const req = createMockRequest({
      method: 'GET',
      query: { source: 'encounter', gameId: 'enc-1' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      events,
      gameId: 'enc-1',
      sourceDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });
});
