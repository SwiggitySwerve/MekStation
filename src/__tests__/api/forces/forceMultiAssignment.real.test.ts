import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks } from 'node-mocks-http';

import { parseApiResponse } from '@/__tests__/helpers';
import forceByIdHandler from '@/pages/api/forces/[id]';
import assignmentHandler from '@/pages/api/forces/assignments/[id]';
import forcesHandler from '@/pages/api/forces/index';
import pilotHandler from '@/pages/api/pilots/[id]';
import { getForceRepository } from '@/services/forces/ForceRepository';
import { resetForceRepository } from '@/services/forces/ForceRepository';
import {
  getForceService,
  resetForceService,
} from '@/services/forces/ForceService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  getPilotRepository,
  resetPilotRepository,
} from '@/services/pilots/PilotRepository';
import { resetPilotService } from '@/services/pilots/PilotService';
import { IForce, ForceType, ForceStatus } from '@/types/force';
import { PilotType, PilotStatus } from '@/types/pilot';

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
  resetPilotService();
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

  async function update(
    kind: 'pilot' | 'force',
    id: string,
    body: Record<string, unknown>,
  ) {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: kind === 'pilot' ? 'PUT' : 'PATCH',
      query: { id },
      body,
    });
    await (kind === 'pilot' ? pilotHandler : forceByIdHandler)(req, res);
    return res;
  }

  it.each(['pilot', 'force'] as const)(
    'keeps the entire %s row unchanged on invalid status',
    async (kind) => {
      const force = await createLanceForce();
      const pilotId = createPersistentPilot('Status atomicity');
      const id = kind === 'pilot' ? pilotId : force.id;
      const db = getSQLiteService().getDatabase();
      const table = kind === 'pilot' ? 'pilots' : 'forces';
      const before: unknown = db
        .prepare(`SELECT * FROM ${table} WHERE id = ?`)
        .get(id);

      const res = await update(kind, id, {
        name: 'Must not change',
        status: 'invalid',
      });

      expect(res._getStatusCode()).toBe(400);
      expect(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id)).toEqual(
        before,
      );
    },
  );

  it.each(
    Object.values(PilotStatus).filter((status) => status !== PilotStatus.KIA),
  )(
    'refuses normal PUT revival from KIA to %s without mutation',
    async (status) => {
      const repo = getPilotRepository();
      const id = createPersistentPilot('KIA terminal');
      expect(
        repo.update(id, { status: PilotStatus.KIA, wounds: 6 }).success,
      ).toBe(true);
      const before = repo.getById(id);

      const res = await update('pilot', id, {
        name: 'Revived',
        wounds: 0,
        status,
      });

      expect(res._getStatusCode()).toBe(400);
      expect(parseApiResponse<{ error: string }>(res).error).toBe(
        'Cannot revive a KIA pilot.',
      );
      expect(repo.getById(id)).toEqual(before);
    },
  );

  it('allows KIA self-updates and status-omitting edits', async () => {
    const id = createPersistentPilot('KIA edits');
    getPilotRepository().update(id, { status: PilotStatus.KIA });
    expect(
      (
        await update('pilot', id, {
          status: PilotStatus.KIA,
          callsign: 'Memorial',
        })
      )._getStatusCode(),
    ).toBe(200);
    expect(
      (await update('pilot', id, { name: 'Remembered' }))._getStatusCode(),
    ).toBe(200);
    expect(getPilotRepository().getById(id)).toMatchObject({
      name: 'Remembered',
      callsign: 'Memorial',
      status: PilotStatus.KIA,
    });
  });

  it.each(Object.values(PilotStatus))(
    'persists exact pilot status %s through PUT',
    async (status) => {
      const id = createPersistentPilot('Valid status');
      expect((await update('pilot', id, { status }))._getStatusCode()).toBe(
        200,
      );
      expect(getPilotRepository().getById(id)?.status).toBe(status);
    },
  );

  it('allows every force status transition and preserves an omitted status', async () => {
    const force = await createLanceForce();
    for (const from of Object.values(ForceStatus)) {
      for (const to of Object.values(ForceStatus)) {
        getForceRepository().updateForce(force.id, { status: from });
        expect(
          (await update('force', force.id, { status: to }))._getStatusCode(),
        ).toBe(200);
        expect(getForceRepository().getForceById(force.id)?.status).toBe(to);
      }
    }
    expect(
      (await update('force', force.id, { name: 'Renamed' }))._getStatusCode(),
    ).toBe(200);
    expect(getForceRepository().getForceById(force.id)?.status).toBe(
      ForceStatus.Disbanded,
    );
  });

  it.each(
    Object.values(PilotStatus).filter((status) => status !== PilotStatus.KIA),
  )('preserves all normal transitions from %s', async (from) => {
    for (const to of Object.values(PilotStatus)) {
      const id = createPersistentPilot('Nonterminal transition');
      getPilotRepository().update(id, { status: from });
      expect((await update('pilot', id, { status: to }))._getStatusCode()).toBe(
        200,
      );
      expect(getPilotRepository().getById(id)?.status).toBe(to);
    }
  });

  it('keeps creation and force clone defaults Active', async () => {
    const id = createPersistentPilot('Creation default');
    expect(getPilotRepository().getById(id)?.status).toBe(PilotStatus.Active);
    const force = await createLanceForce();
    expect(force.status).toBe(ForceStatus.Active);
    getForceRepository().updateForce(force.id, {
      status: ForceStatus.Disbanded,
    });
    const clone = getForceService().cloneForce(force.id, 'New active force');
    expect(clone.success).toBe(true);
    expect(getForceRepository().getForceById(clone.id ?? '')?.status).toBe(
      ForceStatus.Active,
    );
  });

  it.each(['pilot', 'force'] as const)(
    'rejects a direct %s repository bypass atomically',
    async (kind) => {
      const force = await createLanceForce();
      const id =
        kind === 'pilot'
          ? createPersistentPilot('Repository bypass')
          : force.id;
      const db = getSQLiteService().getDatabase();
      const table = kind === 'pilot' ? 'pilots' : 'forces';
      const before: unknown = db
        .prepare(`SELECT * FROM ${table} WHERE id = ?`)
        .get(id);
      // Deliberately malformed runtime input bypasses the TypeScript enum.
      const result =
        kind === 'pilot'
          ? getPilotRepository().update(id, {
              name: 'Must not change',
              status: 'invalid' as PilotStatus,
            })
          : getForceRepository().updateForce(id, {
              name: 'Must not change',
              status: 'invalid' as ForceStatus,
            });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id)).toEqual(
        before,
      );
    },
  );

  it('rejects a direct repository revival without changing wounds or identity', () => {
    const id = createPersistentPilot('Repository KIA');
    const repo = getPilotRepository();
    repo.update(id, { status: PilotStatus.KIA, wounds: 6 });
    const before = repo.getById(id);
    expect(
      repo.update(id, {
        status: PilotStatus.Active,
        wounds: 0,
        name: 'Revived',
      }).success,
    ).toBe(false);
    expect(repo.getById(id)).toEqual(before);
  });

  it('refuses unknown persisted pilot status for both assignment forms and force validation', async () => {
    const force = await createLanceForce();
    const id = createPersistentPilot('Legacy invalid pilot');
    const db = getSQLiteService().getDatabase();
    // Test fixture only: this database is isolated in memory, never user data.
    db.prepare('UPDATE pilots SET status = ? WHERE id = ?').run(
      'legacy-invalid',
      id,
    );
    const service = getForceService();
    const slot = force.assignments[0];
    const before = getForceRepository().getForceById(force.id);

    expect(service.assignPilot(slot.id, id).success).toBe(false);
    expect(service.assignPilotAndUnit(slot.id, id, 'unit-status').success).toBe(
      false,
    );
    expect(getForceRepository().getForceById(force.id)).toEqual(before);

    // Represent an already-assigned legacy row so validation exercises the same rule.
    db.prepare('UPDATE force_assignments SET pilot_id = ? WHERE id = ?').run(
      id,
      slot.id,
    );
    expect(service.validateForce(force.id).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'UNAVAILABLE_PILOT',
          message: expect.stringContaining('unknown status'),
        }),
      ]),
    );
  });

  it.each(['pilot', 'force'] as const)(
    'preserves an unknown legacy %s status until an explicit valid repair',
    async (kind) => {
      const force = await createLanceForce();
      const id =
        kind === 'pilot' ? createPersistentPilot('Legacy repair') : force.id;
      const db = getSQLiteService().getDatabase();
      const table = kind === 'pilot' ? 'pilots' : 'forces';
      db.prepare(`UPDATE ${table} SET status = ? WHERE id = ?`).run(
        'legacy-invalid',
        id,
      );
      expect(
        (await update(kind, id, { name: 'Preserved' }))._getStatusCode(),
      ).toBe(200);
      expect(
        db.prepare(`SELECT status FROM ${table} WHERE id = ?`).get(id),
      ).toEqual({ status: 'legacy-invalid' });
      expect(
        (await update(kind, id, { status: 'active' }))._getStatusCode(),
      ).toBe(200);
      expect(
        db.prepare(`SELECT status FROM ${table} WHERE id = ?`).get(id),
      ).toEqual({ status: 'active' });
    },
  );

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
