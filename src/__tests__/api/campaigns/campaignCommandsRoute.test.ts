/**
 * /api/campaigns/[id]/commands (task 1.2).
 *
 * The pipeline keeps its failure modes distinguishable; this pins that
 * the route does not flatten them on the way out. A caller that saw one
 * status for all of them would retry the ones that can never succeed
 * and give up on the ones that would.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks, type Body, type RequestMethod } from 'node-mocks-http';

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { ICampaignIntent } from '@/types/campaign/CampaignSync';

import { importCampaignBaseline } from '@/lib/campaign/authority/campaignAuthorityMigration';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import commandsHandler from '@/pages/api/campaigns/[id]/commands';
import { writeCampaignMigrationMarker } from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

const CAMPAIGN_ID = 'campaign-command-route';
const NOW = '3025-01-03T00:00:00.000Z';

function spend(amount: number, intentId = 'intent-route'): ICampaignIntent {
  return {
    campaignId: CAMPAIGN_ID,
    intentId,
    kind: 'SpendFunds',
    payload: { amount, reason: 'repairs' },
  } as unknown as ICampaignIntent;
}

async function post(
  body: Body,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: 'POST' as RequestMethod,
    query: { id: CAMPAIGN_ID },
    body,
  });
  await commandsHandler(req, res);
  return {
    status: res._getStatusCode(),
    json: res._getJSONData() as Record<string, unknown>,
  };
}

/** Seeds a journal-authority campaign with a real starting balance. */
async function seedJournalCampaign(): Promise<void> {
  const journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
    getSQLiteService().getDatabase(),
    () => NOW,
  );
  const imported = await importCampaignBaseline(journal, {
    campaignId: CAMPAIGN_ID,
    state: { ...createEmptyCampaignState(CAMPAIGN_ID), balance: 1_000_000 },
    sourceSnapshotRevision: 1,
    importedAt: NOW,
  });
  if (imported.kind !== 'imported') throw new Error(imported.kind);
  // Parity is not what this suite is about; put the campaign straight on
  // journal authority so the pipeline is reachable.
  writeCampaignMigrationMarker({ ...imported.marker, state: 'journal' });
}

describe('campaign commands route', () => {
  beforeEach(async () => {
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();
    await seedJournalCampaign();
  });

  afterEach(() => {
    resetSQLiteService();
  });

  it('commits a valid command and returns the projected state', async () => {
    const result = await post({
      intent: spend(250_000),
      commandId: 'cmd-1',
      authorPlayerId: 'pid-solo',
    });

    expect(result.status).toBe(200);
    expect(result.json.kind).toBe('committed');
    expect((result.json.state as { balance: number }).balance).toBe(750_000);
  });

  it('reports an unaffordable command as 422, not as a conflict', async () => {
    const result = await post({
      intent: spend(9_000_000),
      commandId: 'cmd-2',
      authorPlayerId: 'pid-solo',
    });

    // 422 says "the campaign cannot do this" — retrying it forever would
    // never help, which is exactly what a 409 would invite.
    expect(result.status).toBe(422);
    expect(result.json.kind).toBe('rejected');
  });

  it('answers a retried command with success, not a duplicate error', async () => {
    await post({
      intent: spend(100_000),
      commandId: 'cmd-retry',
      authorPlayerId: 'pid-solo',
    });

    const retry = await post({
      intent: spend(100_000),
      commandId: 'cmd-retry',
      authorPlayerId: 'pid-solo',
    });

    // The command committed once, which is what the caller wanted.
    expect(retry.status).toBe(200);
    expect(retry.json.kind).toBe('duplicate');
  });

  it('blocks a campaign that never migrated, distinctly from a rejection', async () => {
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();

    const result = await post({
      intent: spend(1),
      commandId: 'cmd-3',
      authorPlayerId: 'pid-solo',
    });

    expect(result.status).toBe(409);
    expect(result.json).toMatchObject({
      kind: 'blocked',
      reason: 'campaign-not-on-journal-authority',
    });
  });

  it('rejects an intent aimed at a different campaign', async () => {
    const result = await post({
      intent: { ...spend(1), campaignId: 'some-other-campaign' },
      commandId: 'cmd-4',
      authorPlayerId: 'pid-solo',
    });

    expect(result.status).toBe(400);
  });

  it('requires a command id so a retry can be recognised', async () => {
    const result = await post({
      intent: spend(1),
      authorPlayerId: 'pid-solo',
    });

    // Without one, every retry would be a fresh command - and a retried
    // spend would take the money twice.
    expect(result.status).toBe(400);
  });

  it('allows only POST', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET' as RequestMethod,
      query: { id: CAMPAIGN_ID },
    });
    await commandsHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });
});
