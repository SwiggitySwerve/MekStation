import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks } from 'node-mocks-http';

import { parseApiResponse } from '@/__tests__/helpers';
import forceByIdHandler from '@/pages/api/forces/[id]';
import assignmentHandler from '@/pages/api/forces/assignments/[id]';
import forcesHandler from '@/pages/api/forces/index';
import { resetForceRepository } from '@/services/forces/ForceRepository';
import { resetForceService } from '@/services/forces/ForceService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  getPilotRepository,
  resetPilotRepository,
} from '@/services/pilots/PilotRepository';
import { IForce, ForceType } from '@/types/force';
import { PilotType } from '@/types/pilot';

interface CreateForceResponse {
  readonly success: boolean;
  readonly id?: string;
  readonly force?: IForce;
  readonly error?: string;
}

interface GetForceResponse {
  readonly force: IForce;
}

interface AssignmentResponse {
  readonly success: boolean;
  readonly error?: string;
}

function resetDatabaseState(): void {
  resetForceService();
  resetForceRepository();
  resetPilotRepository();
  resetSQLiteService();
}

function initializeTestDatabase(): void {
  resetDatabaseState();
  getSQLiteService({ path: ':memory:' }).initialize();
}

function createPersistentPilot(name: string): string {
  const result = getPilotRepository().create({
    identity: { name },
    type: PilotType.Persistent,
    skills: { gunnery: 4, piloting: 5 },
  });

  expect(result.success).toBe(true);
  expect(result.id).toBeDefined();
  return result.id!;
}

async function createLanceForce(): Promise<IForce> {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: 'POST',
    body: {
      name: 'Wave 1 API Verification Lance',
      forceType: ForceType.Lance,
    },
  });

  await forcesHandler(req, res);

  expect(res._getStatusCode()).toBe(201);
  const data = parseApiResponse<CreateForceResponse>(res);
  expect(data.success).toBe(true);
  expect(data.force).toBeDefined();
  return data.force!;
}

async function assignPilotAndUnit(
  assignmentId: string,
  pilotId: string,
  unitId: string,
): Promise<void> {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: 'PUT',
    query: { id: assignmentId },
    body: { pilotId, unitId },
  });

  await assignmentHandler(req, res);

  expect(res._getStatusCode()).toBe(200);
  const data = parseApiResponse<AssignmentResponse>(res);
  expect(data.success).toBe(true);
  expect(data.error).toBeUndefined();
}

async function getForce(forceId: string): Promise<IForce> {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: 'GET',
    query: { id: forceId },
  });

  await forceByIdHandler(req, res);

  expect(res._getStatusCode()).toBe(200);
  return parseApiResponse<GetForceResponse>(res).force;
}

describe('forces API multi-assignment semantics with real services', () => {
  beforeEach(() => {
    initializeTestDatabase();
  });

  afterEach(() => {
    resetDatabaseState();
  });

  it('pre-creates four Lance slots and accepts combined pilot plus unit assignment updates', async () => {
    const createdForce = await createLanceForce();

    expect(createdForce.assignments).toHaveLength(4);
    expect(
      createdForce.assignments.map((assignment) => assignment.slot),
    ).toEqual([1, 2, 3, 4]);
    expect(
      createdForce.assignments.every(
        (assignment) =>
          assignment.pilotId === null && assignment.unitId === null,
      ),
    ).toBe(true);

    const firstPilotId = createPersistentPilot('Wave 1 Pilot One');
    const secondPilotId = createPersistentPilot('Wave 1 Pilot Two');

    await assignPilotAndUnit(
      createdForce.assignments[0].id,
      firstPilotId,
      'unit-wave-1-one',
    );
    await assignPilotAndUnit(
      createdForce.assignments[1].id,
      secondPilotId,
      'unit-wave-1-two',
    );

    const rereadForce = await getForce(createdForce.id);
    expect(rereadForce.assignments).toHaveLength(4);
    expect(rereadForce.assignments[0]).toMatchObject({
      pilotId: firstPilotId,
      unitId: 'unit-wave-1-one',
    });
    expect(rereadForce.assignments[1]).toMatchObject({
      pilotId: secondPilotId,
      unitId: 'unit-wave-1-two',
    });
  });
});
