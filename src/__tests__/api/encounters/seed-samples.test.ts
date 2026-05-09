/**
 * Seed Sample Encounters API Tests
 *
 * Pin the contract for `POST /api/encounters/seed-samples`:
 *  - Method allow-list: GET / PUT / DELETE / PATCH all 405.
 *  - Successful seed: createEncounter called once per
 *    ScenarioTemplateType (4 calls in Duel/Skirmish/Battle/Custom
 *    order), names follow `Sample <Type> - <YYYY-MM-DD>` shape,
 *    response is 200 + `{ success: true, ids: [4 strings] }`.
 *  - Unique-name collision rolls back: a fake `createEncounter` mock
 *    that fails on the third call causes the inner txn to throw,
 *    handler responds 500 with the error message.
 *  - DB init failure cleanly returns 500 instead of crashing the
 *    Next.js worker.
 *
 * @spec openspec/changes/repair-broken-encounter-drafts/specs/game-session-management/spec.md
 *       (Requirement: Empty-State Seed Samples)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import seedSamplesHandler from '@/pages/api/encounters/seed-samples';
import { ScenarioTemplateType } from '@/types/encounter';

// =============================================================================
// Mocks
// =============================================================================

// `db.transaction(fn)` in production wraps `fn` in BEGIN/COMMIT and
// returns a callable. For test purposes we synchronously invoke `fn`
// and surface throws as ordinary exceptions — mirrors the SQLite
// rollback path closely enough for the contract assertions.
const mockDbTransaction = jest.fn(<T>(fn: (...args: unknown[]) => T) => {
  return (...args: unknown[]) => fn(...args);
});

jest.mock('@/services/persistence/SQLiteService', () => ({
  getSQLiteService: jest.fn(() => ({
    initialize: jest.fn(),
    getDatabase: jest.fn(() => ({ transaction: mockDbTransaction })),
  })),
}));

const mockCreateEncounter = jest.fn();
jest.mock('@/services/encounter/EncounterRepository', () => {
  // Re-use the actual error code enum so this mock plays nicely with
  // anything else in the same suite that might import it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const actual = jest.requireActual<
    typeof import('@/services/encounter/EncounterRepository')
  >('@/services/encounter/EncounterRepository');
  return {
    ...actual,
    getEncounterRepository: () => ({
      createEncounter: mockCreateEncounter,
    }),
  };
});

// =============================================================================
// Test Helpers
// =============================================================================

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

interface MockNextApiResponse extends NextApiResponse {
  status: jest.Mock;
  json: jest.Mock;
  setHeader: jest.Mock;
}

function createMockResponse(): MockNextApiResponse {
  const res: Partial<MockNextApiResponse> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res as MockNextApiResponse;
}

// =============================================================================
// Tests
// =============================================================================

describe('POST /api/encounters/seed-samples', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects non-POST methods with 405', async () => {
    for (const method of ['GET', 'PUT', 'DELETE', 'PATCH'] as const) {
      const req = createMockRequest({ method });
      const res = createMockResponse();
      await seedSamplesHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    }
  });

  it('seeds 4 encounters in order and returns their ids', async () => {
    // Each of the 4 createEncounter calls returns a distinct id.
    mockCreateEncounter
      .mockReturnValueOnce({ success: true, id: 'enc-1' })
      .mockReturnValueOnce({ success: true, id: 'enc-2' })
      .mockReturnValueOnce({ success: true, id: 'enc-3' })
      .mockReturnValueOnce({ success: true, id: 'enc-4' });

    const req = createMockRequest({ method: 'POST' });
    const res = createMockResponse();

    await seedSamplesHandler(req, res);

    expect(mockCreateEncounter).toHaveBeenCalledTimes(4);
    // Templates iterated in fixed order (Duel/Skirmish/Battle/Custom).
    const calls = mockCreateEncounter.mock.calls.map((call) => call[0]);
    expect(calls[0].template).toBe(ScenarioTemplateType.Duel);
    expect(calls[1].template).toBe(ScenarioTemplateType.Skirmish);
    expect(calls[2].template).toBe(ScenarioTemplateType.Battle);
    expect(calls[3].template).toBe(ScenarioTemplateType.Custom);

    // Names follow the date-suffix pattern.
    for (const call of calls) {
      expect(call.name).toMatch(
        /^Sample (Duel|Skirmish|Battle|Custom) - \d{4}-\d{2}-\d{2}$/,
      );
    }

    // All 4 names must be distinct so the unique-name constraint
    // doesn't fire on a successful seed.
    const names = new Set(calls.map((c) => c.name as string));
    expect(names.size).toBe(4);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      ids: ['enc-1', 'enc-2', 'enc-3', 'enc-4'],
    });
  });

  it('rolls back and returns 500 when a createEncounter call fails', async () => {
    // First two succeed, third reports a unique-name collision.
    mockCreateEncounter
      .mockReturnValueOnce({ success: true, id: 'enc-1' })
      .mockReturnValueOnce({ success: true, id: 'enc-2' })
      .mockReturnValueOnce({
        success: false,
        error: 'UNIQUE constraint failed: encounters.name',
      });

    const req = createMockRequest({ method: 'POST' });
    const res = createMockResponse();

    await seedSamplesHandler(req, res);

    // The handler does not retry on failure — it bubbles the error
    // out of the txn so SQLite rolls back the previous successful
    // inserts. The mock txn doesn't actually roll back (it's just a
    // pass-through), so we assert on the response shape only.
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'UNIQUE constraint failed: encounters.name',
    });
    // Confirms the loop short-circuited at the failure — only 3 calls,
    // the 4th template was never attempted.
    expect(mockCreateEncounter).toHaveBeenCalledTimes(3);
  });

  it('returns 500 when DB initialization throws', async () => {
    const sqliteModule = jest.requireMock<{
      getSQLiteService: jest.Mock;
    }>('@/services/persistence/SQLiteService');
    sqliteModule.getSQLiteService.mockImplementationOnce(() => ({
      initialize: jest.fn(() => {
        throw new Error('Database init failed');
      }),
      getDatabase: jest.fn(),
    }));

    const req = createMockRequest({ method: 'POST' });
    const res = createMockResponse();

    await seedSamplesHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Database init failed',
    });
  });

  it('handles repeated calls within the same day cleanly (collision is documented)', async () => {
    // First seed succeeds.
    mockCreateEncounter
      .mockReturnValueOnce({ success: true, id: 'enc-1' })
      .mockReturnValueOnce({ success: true, id: 'enc-2' })
      .mockReturnValueOnce({ success: true, id: 'enc-3' })
      .mockReturnValueOnce({ success: true, id: 'enc-4' });

    let req = createMockRequest({ method: 'POST' });
    let res = createMockResponse();
    await seedSamplesHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);

    // Second seed (same in-memory date) — first createEncounter call
    // collides on the unique-name constraint.
    mockCreateEncounter.mockReset();
    mockCreateEncounter.mockReturnValueOnce({
      success: false,
      error: 'UNIQUE constraint failed: encounters.name',
    });

    req = createMockRequest({ method: 'POST' });
    res = createMockResponse();
    await seedSamplesHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'UNIQUE constraint failed: encounters.name',
    });
  });
});
