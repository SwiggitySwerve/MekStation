/**
 * Campaign PUT genesis through the live item route (U35's admission row
 * (a), pinned by U35d). Journal authority is on in production with no
 * override, so with no MEKSTATION_E2E_* key in the environment a create at
 * baseVersion 0 appends the genesis snapshot, writes a journal-native
 * marker with no imported baseline and leaves exactly one effective
 * campaign branch row.
 *
 * Red on the baseline before U35d: the constant was false and only the
 * deleted e2e fixture arm could open the create's genesis, so the marker
 * read not_found with no event and no branch row.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks, type Body, type RequestMethod } from 'node-mocks-http';

import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import idHandler from '@/pages/api/campaigns/[id]';
import { readCampaignMigrationMarker } from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

type Mocks = ReturnType<typeof createMocks<NextApiRequest, NextApiResponse>>;

/** Invoke the item route with the same contract as the persistence suite. */
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

/**
 * Disjoint force membership so the genesis projection accepts the
 * envelope (the shared fixture double-claims the same unit ids).
 */
function disjointEnvelope(campaignId: string): SerializedCampaign {
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
    'device-genesis-route',
    1,
  );
}

/** The campaign stream's committed journal event types in revision order. */
function campaignEventTypes(campaignId: string): string[] {
  return (
    getSQLiteService()
      .getDatabase()
      .prepare(
        `SELECT event_type AS type FROM event_journal_events
          WHERE stream_type = 'campaign' AND stream_id = ?
          ORDER BY stream_revision`,
      )
      .all(campaignId) as { readonly type: string }[]
  ).map((row) => row.type);
}

/** Counts the campaign stream's effective event_history_branches rows. */
function effectiveCampaignBranchRows(campaignId: string): number {
  const row = getSQLiteService()
    .getDatabase()
    .prepare(
      `SELECT COUNT(*) AS count FROM event_history_branches b
         JOIN event_history_effective_heads h
           ON h.stream_type = b.stream_type AND h.stream_id = b.stream_id
          AND h.branch_id = b.branch_id
        WHERE b.stream_type = 'campaign' AND b.stream_id = ?
          AND b.status = 'effective'`,
    )
    .get(campaignId) as { readonly count: number };
  return row.count;
}

describe('campaign PUT genesis', () => {
  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('MEKSTATION_E2E_')) delete process.env[key];
    }
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();
  });

  afterEach(() => {
    resetSQLiteService();
  });

  it('a create at baseVersion 0 appends the genesis, a journal-native marker and one effective campaign branch row', async () => {
    const id = 'camp-genesis';
    const put = await callId('PUT', id, {
      envelope: disjointEnvelope(id),
      baseVersion: 0,
    });

    expect(put.res._getStatusCode()).toBe(200);
    const stored = readCampaignMigrationMarker(id);
    expect(stored.kind).toBe('ok');
    if (stored.kind !== 'ok') return;
    expect(stored.marker.state).toBe('journal');
    expect(stored.marker.importedBaseline).toBeNull();
    expect(campaignEventTypes(id)).toEqual(['CampaignSnapshotPublished']);
    expect(effectiveCampaignBranchRows(id)).toBe(1);
  });
});
