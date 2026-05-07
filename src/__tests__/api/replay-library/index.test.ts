/**
 * Replay Library list API route — handler tests.
 *
 * Covers the four scenarios called out in the PR 6 phase A breakdown:
 *   1. Returns the parsed index when the file exists
 *   2. Falls back to scanReplayDirectory when index missing (ENOENT)
 *   3. Rejects non-GET methods with 405
 *   4. Returns 500 + logged error on read failure
 *
 * The reader is exercised via its real implementation against a tmpdir cwd
 * (mocked through `process.cwd`) so we get coverage of the handler ↔ reader
 * wiring instead of a shallow shim.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { IReplayManifestEntry } from '@/replay-library/types';

import handler from '@/pages/api/replay-library/index';
import { GameSide, ReplaySource } from '@/types/gameplay';
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
  return fs.mkdtemp(path.join(os.tmpdir(), 'replay-library-list-test-'));
}

function makeSwarmEntry(
  overrides: Partial<IReplayManifestEntry> = {},
): IReplayManifestEntry {
  return {
    id: 'sim-1',
    replaySource: ReplaySource.Swarm,
    path: 'swarm/sim-1.jsonl',
    createdAt: '2026-05-07T10:00:00.000Z',
    turns: 8,
    winner: GameSide.Player,
    bvTotal: 4500,
    configName: 'duel-3kbv',
    seed: 42,
    batchTimestamp: '2026-05-07T10-00-00-000Z',
    ...overrides,
  } as IReplayManifestEntry;
}

// =============================================================================
// Tests
// =============================================================================

describe('GET /api/replay-library/index', () => {
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

  it('returns the parsed index when the file exists', async () => {
    const reportsDir = path.join(tmpDir, 'simulation-reports');
    await fs.mkdir(reportsDir, { recursive: true });
    const entries: readonly IReplayManifestEntry[] = [
      makeSwarmEntry({ id: 'sim-1' }),
      makeSwarmEntry({ id: 'sim-2', path: 'swarm/sim-2.jsonl' }),
    ];
    await fs.writeFile(
      path.join(reportsDir, 'replay-index.json'),
      JSON.stringify(entries),
      'utf8',
    );

    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      entries,
      total: 2,
    });
  });

  it('falls back to scanReplayDirectory when index missing', async () => {
    // No replay-index.json; no simulation-reports tree at all. The reader
    // delegates to the backfill scan which returns an empty array (the
    // scan's own ENOENT short-circuit). We verify the handler returns 200
    // + empty `entries` rather than 500-ing on the missing file.
    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ entries: [], total: 0 });
  });

  it('rejects non-GET methods with 405', async () => {
    const req = createMockRequest({ method: 'POST' });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET']);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Method POST Not Allowed',
    });
  });

  it('returns 500 with logged error on read failure', async () => {
    // Force a non-ENOENT failure by making the reader's readFile throw.
    // The reader propagates non-ENOENT errors and the handler converts to 500.
    const readFileSpy = jest
      .spyOn(fs, 'readFile')
      .mockRejectedValueOnce(new Error('disk corrupt'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'failed to load replay index',
      code: 'READ_FAILED',
    });
    expect(errorSpy).toHaveBeenCalled();

    readFileSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
