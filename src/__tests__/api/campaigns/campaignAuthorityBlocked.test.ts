/**
 * The cutover refusal at the API boundary (task 5.7, D10).
 *
 * A campaign whose durable marker says journal authority, on a server
 * whose journal has no stream for it, is the situation a restart can
 * produce. It must not take a write: accepting one would either begin a
 * fresh log — presenting an empty campaign as correct — or fall back to
 * the snapshot the marker has already superseded.
 *
 * Proven here through the real route against real SQLite rather than
 * only at the pure resolver, because a resolver nothing consults is a
 * decision that does not exist.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks, type Body, type RequestMethod } from 'node-mocks-http';

import { createJournalNativeMarker } from '@/lib/campaign/authority/campaignAuthorityMigration';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import campaignHandler from '@/pages/api/campaigns/[id]';
import { writeCampaignMigrationMarker } from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import { readCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

const CAMPAIGN_ID = 'campaign-blocked-authority';

function envelope(version = 0) {
  const campaign = buildPopulatedCampaign();
  const forces = Array.from(campaign.forces.values());
  return buildSerializedCampaign(
    {
      ...campaign,
      id: CAMPAIGN_ID,
      forces: new Map(
        forces.map((force, index) => [
          force.id,
          { ...force, unitIds: [`unit-${index}`] },
        ]),
      ),
    },
    'device-cutover',
    version,
  );
}

async function put(
  body: Body,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: 'PUT' as RequestMethod,
    query: { id: CAMPAIGN_ID },
    body,
  });
  await campaignHandler(req, res);
  return {
    status: res._getStatusCode(),
    json: res._getJSONData() as Record<string, unknown>,
  };
}

describe('campaign authority blocked at the route', () => {
  beforeEach(() => {
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();
  });

  afterEach(() => {
    resetSQLiteService();
  });

  it('accepts writes for a campaign that never began migrating', () => {
    // Control: without it, every row below would pass for a route that
    // simply rejects everything.
    return put({ envelope: envelope(0), baseVersion: 0 }).then((result) => {
      expect(result.status).toBe(200);
    });
  });

  it('refuses a write when the marker says journal and no stream exists', async () => {
    writeCampaignMigrationMarker(createJournalNativeMarker(CAMPAIGN_ID));

    const result = await put({ envelope: envelope(0), baseVersion: 0 });

    expect(result.status).toBe(409);
    expect(result.json).toMatchObject({
      kind: 'blocked',
      reason: 'journal-authority-without-stream',
    });
    // Nothing was written: no fresh record, and therefore no fresh log
    // for a later read to mistake for the campaign's real history.
    expect(readCampaign(CAMPAIGN_ID).kind).toBe('not_found');
  });

  it('still refuses when a snapshot record is sitting right there', async () => {
    // The tempting silent fallback: a perfectly good snapshot exists, so
    // why not use it? Because the marker says it has been superseded, and
    // writing to it would fork the campaign's history in two.
    await put({ envelope: envelope(0), baseVersion: 0 });
    const stored = readCampaign(CAMPAIGN_ID);
    expect(stored.kind).toBe('ok');
    writeCampaignMigrationMarker(createJournalNativeMarker(CAMPAIGN_ID));

    const result = await put({ envelope: envelope(1), baseVersion: 1 });

    expect(result.status).toBe(409);
    expect(result.json).toMatchObject({ kind: 'blocked' });
    // The stored record is untouched at its original version.
    const after = readCampaign(CAMPAIGN_ID);
    expect(after.kind).toBe('ok');
    if (after.kind !== 'ok' || stored.kind !== 'ok') return;
    expect(after.record.version).toBe(stored.record.version);
  });

  it('reports blocked distinctly from a stale-write conflict', async () => {
    // Both are 409, so the shape has to carry the difference: a client
    // retrying a blocked write with a fresher baseVersion would loop
    // forever, exactly the conflation task 1.5 removed elsewhere.
    await put({ envelope: envelope(0), baseVersion: 0 });
    const stale = await put({ envelope: envelope(0), baseVersion: 0 });
    expect(stale.status).toBe(409);
    expect(stale.json.kind).toBeUndefined();

    writeCampaignMigrationMarker(createJournalNativeMarker(CAMPAIGN_ID));
    const blocked = await put({ envelope: envelope(1), baseVersion: 1 });

    expect(blocked.json.kind).toBe('blocked');
  });
});
