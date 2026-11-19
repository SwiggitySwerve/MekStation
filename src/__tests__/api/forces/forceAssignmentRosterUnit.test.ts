/**
 * T1: PUT /api/forces/assignments/[id] passes the campaign roster link
 * (`rosterUnitId`) to the assignment service only when the request carries
 * one; a request without it calls the service exactly as before (pinned in
 * forces.test-helpers.ts). Same mocking as that suite.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks } from 'node-mocks-http';

import { createMock } from '@/__tests__/helpers';
import assignmentHandler from '@/pages/api/forces/assignments/[id]';
import { getForceService, ForceService } from '@/services/forces/ForceService';
import {
  getSQLiteService,
  SQLiteService,
} from '@/services/persistence/SQLiteService';

jest.mock('@/services/persistence/SQLiteService');
jest.mock('@/services/forces/ForceService');

const mockSQLiteService = getSQLiteService as jest.MockedFunction<
  typeof getSQLiteService
>;
const mockGetForceService = getForceService as jest.MockedFunction<
  typeof getForceService
>;

describe('PUT /api/forces/assignments/[id] roster link (T1)', () => {
  const assignUnit = jest.fn();
  const assignPilotAndUnit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    assignUnit.mockReturnValue({ success: true });
    assignPilotAndUnit.mockReturnValue({ success: true });
    mockSQLiteService.mockReturnValue(
      createMock<SQLiteService>({
        initialize: jest.fn(),
        getDatabase: jest.fn(),
        close: jest.fn(),
        isInitialized: jest.fn().mockReturnValue(true),
      }),
    );
    mockGetForceService.mockReturnValue(
      createMock<ForceService>({ assignUnit, assignPilotAndUnit }),
    );
  });

  async function put(body: Record<string, unknown>): Promise<number> {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PUT',
      query: { id: 'assign-1' },
      body,
    });
    await assignmentHandler(req, res);
    return res._getStatusCode();
  }

  it('passes rosterUnitId through when assigning a unit', async () => {
    expect(await put({ unitId: 'unit-2', rosterUnitId: 'roster-7' })).toBe(200);
    expect(assignUnit).toHaveBeenCalledWith('assign-1', 'unit-2', 'roster-7');
  });

  it('passes rosterUnitId through when assigning a pilot and a unit', async () => {
    expect(
      await put({
        pilotId: 'pilot-2',
        unitId: 'unit-2',
        rosterUnitId: 'roster-7',
      }),
    ).toBe(200);
    expect(assignPilotAndUnit).toHaveBeenCalledWith(
      'assign-1',
      'pilot-2',
      'unit-2',
      'roster-7',
    );
  });

  it('adds no argument for a missing or empty rosterUnitId', async () => {
    await put({ unitId: 'unit-2' });
    await put({ unitId: 'unit-3', rosterUnitId: '' });
    expect(assignUnit.mock.calls).toEqual([
      ['assign-1', 'unit-2'],
      ['assign-1', 'unit-3'],
    ]);
  });
});
