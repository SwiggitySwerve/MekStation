/**
 * Campaign persistence API + service integration tests (tasks 3.7, 6.1, 6.2)
 *
 * Exercises the real `CampaignPersistenceService` against a real
 * in-memory SQLite database through the actual Next.js route handlers —
 * no mocked store. Covers every success and error path including the
 * stale-write `409`.
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 *   - Requirement: Server-Side Campaign Persistence Contract
 *   - Requirement: Stale-Write Conflict Detection
 *   - Requirement: Campaign List Summaries
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks, type RequestMethod, type Body } from 'node-mocks-http';

import type {
  ICampaignSummary,
  SerializedCampaign,
} from '@/types/campaign/SerializedCampaign';

import { UNKNOWN_AUTHORITY_ROLE_REASON } from '@/lib/campaign/authority/campaignAuthority';
import {
  CAMPAIGN_LIST_OMISSIONS_HEADER,
  decodeCampaignListOmissions,
  type ICampaignListOmission,
} from '@/lib/campaign/persistence';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import idHandler from '@/pages/api/campaigns/[id]';
import indexHandler from '@/pages/api/campaigns/index';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

// =============================================================================
// Helpers
// =============================================================================

type Mocks = ReturnType<typeof createMocks<NextApiRequest, NextApiResponse>>;

function callId(
  method: RequestMethod,
  id: string,
  body?: Body,
): Promise<Mocks> {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method,
    query: { id },
    body,
  });
  return idHandler(req, res).then(() => ({ req, res }));
}

function callIndex(): Promise<Mocks> {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: 'GET',
  });
  return indexHandler(req, res).then(() => ({ req, res }));
}

function envelopeFor(campaignId: string): SerializedCampaign {
  const campaign = { ...buildPopulatedCampaign(), id: campaignId };
  return buildSerializedCampaign(campaign, 'device-test', 1);
}

/** Overwrite a stored payload without going through saveCampaign. */
function writeStoredPayload(id: string, payload: string): void {
  getSQLiteService()
    .getDatabase()
    .prepare('UPDATE campaigns SET payload = ? WHERE id = ?')
    .run(payload, id);
}

/** Read the raw stored payload JSON for a campaign row. */
function readStoredPayload(id: string): string {
  const row = getSQLiteService()
    .getDatabase()
    .prepare('SELECT payload FROM campaigns WHERE id = ?')
    .get(id) as { payload: string };
  return row.payload;
}

/**
 * Decode the list-omissions header from a mock response. Missing
 * headers become an empty list so healthy-list tests stay simple.
 */
function listOmissionsFrom(
  res: Mocks['res'],
): readonly ICampaignListOmission[] {
  return decodeCampaignListOmissions(
    res.getHeader(CAMPAIGN_LIST_OMISSIONS_HEADER),
  );
}

/**
 * Concatenate body JSON and the omissions header so leak assertions
 * cover both channels the client can see.
 */
function listResponseWire(res: Mocks['res']): string {
  return `${JSON.stringify(res._getJSONData())}\n${String(
    res.getHeader(CAMPAIGN_LIST_OMISSIONS_HEADER) ?? '',
  )}`;
}

// =============================================================================
// Setup — real in-memory SQLite
// =============================================================================

describe('Campaign persistence API', () => {
  beforeEach(() => {
    resetSQLiteService();
    // Force an in-memory database so the route handlers (which call
    // getSQLiteService() with no args) reuse this ephemeral instance.
    getSQLiteService({ path: ':memory:' }).initialize();
  });

  afterEach(() => {
    resetSQLiteService();
  });

  // ---------------------------------------------------------------------------
  // GET /api/campaigns/[id]
  // ---------------------------------------------------------------------------

  it('returns 404 for a missing campaign', async () => {
    const { res } = await callId('GET', 'no-such-campaign');
    expect(res._getStatusCode()).toBe(404);
  });

  // ---------------------------------------------------------------------------
  // PUT /api/campaigns/[id]
  // ---------------------------------------------------------------------------

  it('saves a campaign and increments its version', async () => {
    const { res } = await callId('PUT', 'camp-1', {
      envelope: envelopeFor('camp-1'),
      baseVersion: 0,
    });
    expect(res._getStatusCode()).toBe(200);
    const stored = res._getJSONData() as SerializedCampaign;
    expect(stored.version).toBe(1);
    expect(stored.campaignId).toBe('camp-1');
  });

  it('round-trips a saved campaign through GET', async () => {
    await callId('PUT', 'camp-2', {
      envelope: envelopeFor('camp-2'),
      baseVersion: 0,
    });
    const { res } = await callId('GET', 'camp-2');
    expect(res._getStatusCode()).toBe(200);
    const record = res._getJSONData() as SerializedCampaign;
    expect(record.campaignId).toBe('camp-2');
    expect(record.body.name).toBe("Wolf's Dragoons");
    expect(record.version).toBe(1);
  });

  it('rejects a PUT whose envelope id disagrees with the url id', async () => {
    const { res } = await callId('PUT', 'url-id', {
      envelope: envelopeFor('different-id'),
      baseVersion: 0,
    });
    expect(res._getStatusCode()).toBe(400);
  });

  it('rejects a PUT with a malformed body', async () => {
    const { res } = await callId('PUT', 'camp-3', { not: 'valid' });
    expect(res._getStatusCode()).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // Stale-write conflict detection
  // ---------------------------------------------------------------------------

  it('increments the version on a clean sequential write', async () => {
    await callId('PUT', 'camp-4', {
      envelope: envelopeFor('camp-4'),
      baseVersion: 0,
    });
    const { res } = await callId('PUT', 'camp-4', {
      envelope: envelopeFor('camp-4'),
      baseVersion: 1,
    });
    expect(res._getStatusCode()).toBe(200);
    expect((res._getJSONData() as SerializedCampaign).version).toBe(2);
  });

  it('rejects a stale write with a typed 409 naming the one safe recovery', async () => {
    // Two clean writes take the stored version to 2.
    await callId('PUT', 'camp-5', {
      envelope: envelopeFor('camp-5'),
      baseVersion: 0,
    });
    await callId('PUT', 'camp-5', {
      envelope: envelopeFor('camp-5'),
      baseVersion: 1,
    });
    // A second client still believes the version is 1 — stale.
    const { res } = await callId('PUT', 'camp-5', {
      envelope: envelopeFor('camp-5'),
      baseVersion: 1,
    });
    expect(res._getStatusCode()).toBe(409);
    // The body used to be the bare record, which told a client THAT it
    // lost but nothing about what to do - and what clients did was resend
    // the same envelope at the version they had just been handed.
    expect(res._getJSONData()).toMatchObject({
      kind: 'conflict',
      reason: 'base-state-unavailable',
      recoveryAction: 'resync-to-active-head',
      conflictingFields: [],
      currentVersion: 2,
    });
    const body = res._getJSONData() as { current: SerializedCampaign };
    expect(body.current.version).toBe(2);
  });

  it('two clients editing the same campaign - the server would accept an overwrite, so the client must not offer one', async () => {
    // Client A and B both load at version 1.
    await callId('PUT', 'camp-6', {
      envelope: envelopeFor('camp-6'),
      baseVersion: 0,
    });
    // Client A writes — version is now 2.
    await callId('PUT', 'camp-6', {
      envelope: envelopeFor('camp-6'),
      baseVersion: 1,
    });
    // Client B writes stale — gets 409 with the current record.
    const conflict = await callId('PUT', 'camp-6', {
      envelope: envelopeFor('camp-6'),
      baseVersion: 1,
    });
    expect(conflict.res._getStatusCode()).toBe(409);
    const refusal = conflict.res._getJSONData() as {
      recoveryAction: string;
      current: SerializedCampaign;
    };
    expect(refusal.recoveryAction).toBe('resync-to-active-head');

    // THE DANGER, kept as an executable statement rather than a comment:
    // resending B's stale envelope at the version it was just handed
    // SUCCEEDS. The compare-and-swap cannot see that the body predates
    // A's change, so nothing on this boundary refuses it. That is why the
    // retry had to be removed on the CLIENT (umbrella 8.3) - this row
    // exists so a future reader does not reintroduce it believing the
    // server guards against it.
    const overwrite = await callId('PUT', 'camp-6', {
      envelope: envelopeFor('camp-6'),
      baseVersion: refusal.current.version,
    });
    expect(overwrite.res._getStatusCode()).toBe(200);
    expect((overwrite.res._getJSONData() as SerializedCampaign).version).toBe(
      3,
    );
  });

  // ---------------------------------------------------------------------------
  // DELETE /api/campaigns/[id]
  // ---------------------------------------------------------------------------

  it('deletes a server record', async () => {
    await callId('PUT', 'camp-7', {
      envelope: envelopeFor('camp-7'),
      baseVersion: 0,
    });
    const del = await callId('DELETE', 'camp-7');
    expect(del.res._getStatusCode()).toBe(204);
    const after = await callId('GET', 'camp-7');
    expect(after.res._getStatusCode()).toBe(404);
  });

  it('treats deleting a missing record as idempotent', async () => {
    const { res } = await callId('DELETE', 'never-existed');
    expect(res._getStatusCode()).toBe(204);
  });

  it('rejects an unsupported method on the item route', async () => {
    const { res } = await callId('POST', 'camp-8');
    expect(res._getStatusCode()).toBe(405);
  });

  // ---------------------------------------------------------------------------
  // GET /api/campaigns (list)
  // ---------------------------------------------------------------------------

  it('lists campaign summaries without bodies', async () => {
    for (const id of ['list-a', 'list-b', 'list-c']) {
      await callId('PUT', id, { envelope: envelopeFor(id), baseVersion: 0 });
    }
    const { res } = await callIndex();
    expect(res._getStatusCode()).toBe(200);
    const summaries = res._getJSONData() as ICampaignSummary[];
    expect(summaries).toHaveLength(3);
    for (const summary of summaries) {
      expect(summary).toHaveProperty('id');
      expect(summary).toHaveProperty('name');
      expect(summary).toHaveProperty('factionId');
      expect(summary).toHaveProperty('currentDate');
      expect(summary).toHaveProperty('balance');
      expect(summary).toHaveProperty('updatedAt');
      // No full body leaks into the summary.
      expect(summary).not.toHaveProperty('body');
      expect(summary).not.toHaveProperty('forces');
    }
  });

  it('returns an empty list when no campaigns are stored', async () => {
    const { res } = await callIndex();
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Task 6.1 — save, "clear local", reload, identical
  // ---------------------------------------------------------------------------

  it('a saved campaign reloads identically after the local copy is gone', async () => {
    const envelope = envelopeFor('survivor');
    await callId('PUT', 'survivor', { envelope, baseVersion: 0 });
    // "Clearing local storage" is simulated by simply discarding the
    // local envelope reference — the server record is the only source.
    const { res } = await callId('GET', 'survivor');
    const reloaded = res._getJSONData() as SerializedCampaign;
    expect(reloaded.body).toEqual(envelope.body);
  });

  // ---------------------------------------------------------------------------
  // Audit W5.2 (H cluster) — corrupt-row resilience + CURRENT_DATE shadowing
  // ---------------------------------------------------------------------------

  /** Corrupt a stored campaign's payload directly in SQLite. */
  function corruptPayload(id: string): void {
    getSQLiteService()
      .getDatabase()
      .prepare('UPDATE campaigns SET payload = ? WHERE id = ?')
      .run('not-json{', id);
  }

  it('GET of a corrupt row returns an explicit error instead of an unhandled throw', async () => {
    await callId('PUT', 'camp-corrupt', {
      envelope: envelopeFor('camp-corrupt'),
      baseVersion: 0,
    });
    corruptPayload('camp-corrupt');

    const { res } = await callId('GET', 'camp-corrupt');
    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({
      error: 'stored campaign record is corrupt',
    });
  });

  it('one corrupt row does not kill the list endpoint — healthy rows still return', async () => {
    for (const id of ['healthy-a', 'camp-rot', 'healthy-b']) {
      await callId('PUT', id, { envelope: envelopeFor(id), baseVersion: 0 });
    }
    corruptPayload('camp-rot');

    const { res } = await callIndex();
    expect(res._getStatusCode()).toBe(200);
    const summaries = res._getJSONData() as ICampaignSummary[];
    expect(summaries.map((s) => s.id).sort()).toEqual([
      'healthy-a',
      'healthy-b',
    ]);
  });

  it('a corrupt row stays repairable: PUT with the correct baseVersion overwrites it', async () => {
    await callId('PUT', 'camp-repair', {
      envelope: envelopeFor('camp-repair'),
      baseVersion: 0,
    });
    corruptPayload('camp-repair');

    // The version COLUMN (not the corrupt payload) is the CAS authority,
    // so a client that knows the last version can heal the record.
    const { res } = await callId('PUT', 'camp-repair', {
      envelope: envelopeFor('camp-repair'),
      baseVersion: 1,
    });
    expect(res._getStatusCode()).toBe(200);

    const after = await callId('GET', 'camp-repair');
    expect(after.res._getStatusCode()).toBe(200);
    expect((after.res._getJSONData() as SerializedCampaign).version).toBe(2);
  });

  it('stores body.currentDate in campaign_date — a column NOT shadowed by the CURRENT_DATE builtin', async () => {
    const envelope = envelopeFor('camp-date');
    await callId('PUT', 'camp-date', { envelope, baseVersion: 0 });

    const db = getSQLiteService().getDatabase();
    const cols = db.pragma('table_info(campaigns)') as Array<{ name: string }>;
    const names = cols.map((c) => c.name);
    expect(names).toContain('campaign_date');
    // A bare `current_date` identifier parses as the SQLite builtin and
    // returns TODAY — the column must not carry that name.
    expect(names).not.toContain('current_date');

    const row = db
      .prepare('SELECT campaign_date AS v FROM campaigns WHERE id = ?')
      .get('camp-date') as { v: string };
    expect(row.v).toBe(envelope.body.currentDate);
  });

  // ---------------------------------------------------------------------------
  // Task 1.5 — list omissions visible; GET not-found vs unreadable vs replica
  // ---------------------------------------------------------------------------

  it('lists two healthy summaries and surfaces one corrupt row without leaking payload', async () => {
    const leakToken = 'not-json{LEAK-CORRUPT-TOKEN';
    for (const id of ['ok-alpha', 'rot-payload', 'ok-bravo']) {
      await callId('PUT', id, { envelope: envelopeFor(id), baseVersion: 0 });
    }
    writeStoredPayload('rot-payload', leakToken);

    const { res } = await callIndex();
    expect(res._getStatusCode()).toBe(200);
    const summaries = res._getJSONData() as ICampaignSummary[];
    expect(Array.isArray(summaries)).toBe(true);
    expect(summaries.map((row) => row.id).sort()).toEqual([
      'ok-alpha',
      'ok-bravo',
    ]);
    expect(listOmissionsFrom(res)).toEqual([
      { id: 'rot-payload', reason: 'corrupt' },
    ]);
    expect(listResponseWire(res)).not.toContain(leakToken);
  });

  it('lists healthy rows and surfaces an unknown-authority row without leaking payload', async () => {
    const leakToken = 'LEAK-AUTH-TOKEN';
    for (const id of ['ok-delta', 'typo-role', 'ok-echo']) {
      await callId('PUT', id, { envelope: envelopeFor(id), baseVersion: 0 });
    }
    const stored = JSON.parse(
      readStoredPayload('typo-role'),
    ) as SerializedCampaign;
    writeStoredPayload(
      'typo-role',
      JSON.stringify({
        ...stored,
        schemaVersion: 2,
        authority: { role: 'typo' },
        leak: leakToken,
      }),
    );

    const { res } = await callIndex();
    expect(res._getStatusCode()).toBe(200);
    const summaries = res._getJSONData() as ICampaignSummary[];
    expect(summaries.map((row) => row.id).sort()).toEqual([
      'ok-delta',
      'ok-echo',
    ]);
    expect(listOmissionsFrom(res)).toEqual([
      { id: 'typo-role', reason: 'invalid_authority' },
    ]);
    expect(listResponseWire(res)).not.toContain(leakToken);
    expect(listResponseWire(res)).not.toContain('"role":"typo"');
  });

  it('distinguishes missing, corrupt, and unknown-authority GET outcomes', async () => {
    await callId('PUT', 'camp-rot-get', {
      envelope: envelopeFor('camp-rot-get'),
      baseVersion: 0,
    });
    writeStoredPayload('camp-rot-get', 'not-json{LEAK-GET-CORRUPT');

    await callId('PUT', 'camp-typo-get', {
      envelope: envelopeFor('camp-typo-get'),
      baseVersion: 0,
    });
    const stored = JSON.parse(
      readStoredPayload('camp-typo-get'),
    ) as SerializedCampaign;
    writeStoredPayload(
      'camp-typo-get',
      JSON.stringify({
        ...stored,
        schemaVersion: 2,
        authority: { role: 'typo' },
      }),
    );

    const missing = await callId('GET', 'no-such-campaign-id');
    const corrupt = await callId('GET', 'camp-rot-get');
    const invalid = await callId('GET', 'camp-typo-get');

    expect(missing.res._getStatusCode()).toBe(404);
    expect(missing.res._getJSONData()).toEqual({ error: 'not found' });

    expect(corrupt.res._getStatusCode()).toBe(500);
    expect(corrupt.res._getStatusCode()).not.toBe(404);
    expect(corrupt.res._getJSONData()).toEqual({
      error: 'stored campaign record is corrupt',
    });
    expect(JSON.stringify(corrupt.res._getJSONData())).not.toContain(
      'LEAK-GET-CORRUPT',
    );

    expect(invalid.res._getStatusCode()).toBe(422);
    expect(invalid.res._getStatusCode()).not.toBe(404);
    expect(invalid.res._getJSONData()).toEqual({
      error: 'stored campaign authority is invalid',
      kind: 'failed',
      reason: UNKNOWN_AUTHORITY_ROLE_REASON,
    });

    const statuses = new Set([
      missing.res._getStatusCode(),
      corrupt.res._getStatusCode(),
      invalid.res._getStatusCode(),
    ]);
    expect(statuses.size).toBe(3);
  });

  it('GET of a replica row is 200 with replica authority, not not-found', async () => {
    await callId('PUT', 'camp-replica-get', {
      envelope: envelopeFor('camp-replica-get'),
      baseVersion: 0,
    });
    const stored = JSON.parse(
      readStoredPayload('camp-replica-get'),
    ) as SerializedCampaign;
    const replicaAuthority = {
      role: 'replica' as const,
      sourceInstanceId: 'source-host-zzz',
      grantId: 'grant-zzz',
      scopes: ['campaign'] as const,
    };
    writeStoredPayload(
      'camp-replica-get',
      JSON.stringify({
        ...stored,
        schemaVersion: 2,
        authority: replicaAuthority,
      }),
    );

    const { res } = await callId('GET', 'camp-replica-get');
    expect(res._getStatusCode()).toBe(200);
    expect(res._getStatusCode()).not.toBe(404);
    const record = res._getJSONData() as SerializedCampaign;
    expect(record.authority).toEqual(replicaAuthority);

    const list = await callIndex();
    const summaries = list.res._getJSONData() as ICampaignSummary[];
    expect(summaries.map((row) => row.id)).toContain('camp-replica-get');
    const replicaSummary = summaries.find(
      (row) => row.id === 'camp-replica-get',
    );
    expect(replicaSummary?.authority).toEqual(replicaAuthority);
    expect(listOmissionsFrom(list.res)).toEqual([]);
  });
});
