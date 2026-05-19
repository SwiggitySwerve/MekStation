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

  it('rejects a stale write with 409 and returns the current record', async () => {
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
    const current = res._getJSONData() as SerializedCampaign;
    expect(current.version).toBe(2);
  });

  it('two clients editing the same campaign — second PUT conflicts, recovers via keep-local', async () => {
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
    const serverRecord = conflict.res._getJSONData() as SerializedCampaign;
    // keep-local recovery — re-PUT using the server's version as base.
    const recovered = await callId('PUT', 'camp-6', {
      envelope: envelopeFor('camp-6'),
      baseVersion: serverRecord.version,
    });
    expect(recovered.res._getStatusCode()).toBe(200);
    expect((recovered.res._getJSONData() as SerializedCampaign).version).toBe(
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
});
