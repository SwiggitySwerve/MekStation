/**
 * Campaign PUT genesis marker through the live item route.
 *
 * Predicted red before the producers called the resolver: arming both
 * fixture keys still left the marker absent because the route passed
 * the hardcoded CAMPAIGN_JOURNAL_AUTHORITY_ENABLED constant.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks, type Body, type RequestMethod } from 'node-mocks-http';

import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { CAMPAIGN_JOURNAL_AUTHORITY_E2E_ENV } from '@/lib/campaign/sync/campaignJournalAuthorityEnabled';
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

describe('campaign PUT genesis marker', () => {
  const savedMode = process.env.NEXT_PUBLIC_E2E_MODE;
  const savedArm = process.env[CAMPAIGN_JOURNAL_AUTHORITY_E2E_ENV];

  beforeEach(() => {
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();
    delete process.env.NEXT_PUBLIC_E2E_MODE;
    delete process.env[CAMPAIGN_JOURNAL_AUTHORITY_E2E_ENV];
  });

  afterEach(() => {
    restoreEnv('NEXT_PUBLIC_E2E_MODE', savedMode);
    restoreEnv(CAMPAIGN_JOURNAL_AUTHORITY_E2E_ENV, savedArm);
    resetSQLiteService();
  });

  it('writes the genesis marker only when the resolver is true', async () => {
    const offId = 'camp-genesis-off';
    const off = await callId('PUT', offId, {
      envelope: disjointEnvelope(offId),
      baseVersion: 0,
    });
    expect(off.res._getStatusCode()).toBe(200);
    expect(readCampaignMigrationMarker(offId).kind).toBe('not_found');

    process.env.NEXT_PUBLIC_E2E_MODE = 'true';
    process.env[CAMPAIGN_JOURNAL_AUTHORITY_E2E_ENV] = '1';
    const onId = 'camp-genesis-on';
    const on = await callId('PUT', onId, {
      envelope: disjointEnvelope(onId),
      baseVersion: 0,
    });
    expect(on.res._getStatusCode()).toBe(200);
    const stored = readCampaignMigrationMarker(onId);
    expect(stored.kind).toBe('ok');
    if (stored.kind !== 'ok') return;
    expect(stored.marker.state).toBe('journal');
    expect(stored.marker.importedBaseline).toBeNull();
  });
});

/** Restores a process env key so later suites cannot inherit this arm. */
function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
