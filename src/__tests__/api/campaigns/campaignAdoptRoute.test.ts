/**
 * /api/campaigns/[id]/adopt (task 1.4, design D8 + D10).
 *
 * The endpoint that takes a browser's legacy copy and makes this server
 * its source. What is being pinned here is mostly refusals and ordering:
 *
 * - an id the server already holds is a `409`, never an overwrite;
 * - the import is attempted BEFORE the record is created, so a failed
 *   import leaves nothing half-adopted behind;
 * - a mismatched envelope id is rejected rather than trusted.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D8, D10)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks, type Body, type RequestMethod } from 'node-mocks-http';

import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { CAMPAIGN_JOURNAL_AUTHORITY_ENABLED } from '@/lib/campaign/sync/JournalCampaignEventStore';
import adoptHandler from '@/pages/api/campaigns/[id]/adopt';
import { readCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

const CAMPAIGN_ID = 'campaign-legacy-copy';

/** A browser copy: disjoint forces so the projection accepts it. */
function browserEnvelope(campaignId = CAMPAIGN_ID, version = 6) {
  const campaign = buildPopulatedCampaign();
  const forces = Array.from(campaign.forces.values());
  return buildSerializedCampaign(
    {
      ...campaign,
      id: campaignId,
      forces: new Map(
        forces.map((force, index) => [
          force.id,
          { ...force, unitIds: [`unit-${index}`] },
        ]),
      ),
    },
    'device-legacy',
    version,
  );
}

function storeCampaign(record: SerializedCampaign): void {
  getSQLiteService()
    .getDatabase()
    .prepare(
      `INSERT OR REPLACE INTO campaigns
         (id, version, schema_version, name, faction_id, campaign_date,
          balance, origin_device_id, saved_at, payload)
       VALUES (?, 1, 2, ?, 'mercenary', '3025-01-01T00:00:00.000Z',
               0, 'device-legacy', '2026-08-23T00:00:00.000Z', ?)`,
    )
    .run(record.campaignId, record.campaignId, JSON.stringify(record));
}

async function call(
  method: RequestMethod,
  body?: Body,
  campaignId = CAMPAIGN_ID,
): Promise<{ status: number; json: unknown }> {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method,
    query: { id: campaignId },
    body,
  });
  await adoptHandler(req, res);
  return { status: res._getStatusCode(), json: res._getJSONData() };
}

describe('campaign adopt route', () => {
  beforeEach(() => {
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();
  });

  afterEach(() => {
    resetSQLiteService();
  });

  it('adopts a browser copy this server has never held', async () => {
    const envelope = browserEnvelope();

    const result = await call('POST', { envelope });

    expect(result.status).toBe(201);
    const stored = readCampaign(CAMPAIGN_ID);
    expect(stored.kind).toBe('ok');
    if (stored.kind !== 'ok') throw new Error('unreachable');
    // The server now sources the campaign the browser was holding.
    expect(stored.record.authority).toEqual({ role: 'source' });
  });

  it('refuses to import over a campaign the server already holds', async () => {
    const existing = browserEnvelope();
    storeCampaign(existing);

    const result = await call('POST', { envelope: browserEnvelope() });

    expect(result.status).toBe(409);
    expect(result.json).toMatchObject({
      kind: 'refused',
      reason: 'campaign-already-adopted',
    });
    // Whatever the server holds is untouched — an import is not a merge.
    const stored = readCampaign(CAMPAIGN_ID);
    expect(stored.kind).toBe('ok');
  });

  it('rejects an envelope whose id disagrees with the url', async () => {
    const result = await call('POST', {
      envelope: browserEnvelope('some-other-campaign'),
    });

    expect(result.status).toBe(400);
    expect(readCampaign(CAMPAIGN_ID).kind).toBe('not_found');
  });

  it('rejects a body with no envelope', async () => {
    const result = await call('POST', {});

    expect(result.status).toBe(400);
    expect(readCampaign(CAMPAIGN_ID).kind).toBe('not_found');
  });

  it('creates nothing when the campaign cannot be projected', async () => {
    const campaign = buildPopulatedCampaign();
    const forces = Array.from(campaign.forces.values());
    // Both forces claim the same unit: the projection refuses it. With the
    // import attempted first, the id must be left completely clean.
    const collided = buildSerializedCampaign(
      {
        ...campaign,
        id: CAMPAIGN_ID,
        forces: new Map(
          forces.map((force) => [force.id, { ...force, unitIds: ['unit-0'] }]),
        ),
      },
      'device-legacy',
      4,
    );

    const result = await call('POST', { envelope: collided });

    // The import is inert while the cutover flag is off, so the rejection
    // only reaches the route once journal authority is on. Stated as a
    // flag-derived expectation rather than an either/or, so this row still
    // says something true - and starts asserting the interesting half the
    // day 5.7 flips the flag.
    if (CAMPAIGN_JOURNAL_AUTHORITY_ENABLED) {
      expect(result.status).toBe(500);
      expect(readCampaign(CAMPAIGN_ID).kind).toBe('not_found');
    } else {
      expect(result.status).toBe(201);
    }
  });

  it('allows only POST', async () => {
    const result = await call('GET');

    expect(result.status).toBe(405);
  });
});
