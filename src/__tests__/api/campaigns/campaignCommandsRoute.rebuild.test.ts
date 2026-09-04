/**
 * The commands route's PROJECTION_REBUILDING 409 carries the active head
 * (umbrella 16.3 clause A). A reason-only body left the client unable to
 * name the branch the rebuild is replacing.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-persistence/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks, type Body } from 'node-mocks-http';

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { ICampaignIntent } from '@/types/campaign/CampaignSync';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';
import type { IVaultIdentity } from '@/types/vault';

import { importCampaignBaseline } from '@/lib/campaign/authority/campaignAuthorityMigration';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { CAMPAIGN_STREAM_TYPE } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { issuePlayerToken } from '@/lib/multiplayer/client/issuePlayerToken';
import commandsHandler from '@/pages/api/campaigns/[id]/commands';
import { writeCampaignMigrationMarker } from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import { bindCampaignSessionParticipant } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { generateKeyPair } from '@/services/vault/IdentityService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { encodeTokenForWire } from '@/types/multiplayer/Player';

const CAMPAIGN_ID = 'campaign-command-rebuild';
const NOW = '3025-01-03T00:00:00.000Z';
const TTL_MS = 30_000;

interface IHolder {
  readonly playerId: string;
  readonly wire: string;
}

async function mintHolder(): Promise<IHolder> {
  const keys = await generateKeyPair();
  const identity: IVaultIdentity = {
    id: 'identity-command-rebuild',
    displayName: 'Command Rebuild',
    publicKey: Buffer.from(keys.publicKey).toString('base64'),
    privateKey: Buffer.from(keys.privateKey).toString('base64'),
    friendCode: 'AAAA-BBBB-CCCC-DDDD',
    createdAt: '2026-08-23T00:00:00.000Z',
  };
  const token = await issuePlayerToken(identity);
  return { playerId: token.playerId, wire: encodeTokenForWire(token) };
}

function spend(amount: number, intentId = 'intent-rebuild'): ICampaignIntent {
  return {
    campaignId: CAMPAIGN_ID,
    intentId,
    kind: 'SpendFunds',
    payload: { amount, reason: 'repairs' },
  } as unknown as ICampaignIntent;
}

async function post(
  body: Body,
  wire: string,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: 'POST',
    query: { id: CAMPAIGN_ID },
    body,
    headers: { authorization: `Bearer ${wire}` },
  });
  await commandsHandler(req, res);
  return {
    status: res._getStatusCode(),
    json: res._getJSONData() as Record<string, unknown>,
  };
}

describe('campaign commands route during a history rebuild', () => {
  let caller: IHolder;

  beforeEach(async () => {
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();
    const db = getSQLiteService().getDatabase();
    const journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
      db,
      () => NOW,
    );
    const imported = await importCampaignBaseline(journal, {
      campaignId: CAMPAIGN_ID,
      state: { ...createEmptyCampaignState(CAMPAIGN_ID), balance: 1_000_000 },
      sourceSnapshotRevision: 1,
      importedAt: NOW,
    });
    if (imported.kind !== 'imported') throw new Error(imported.kind);
    writeCampaignMigrationMarker({ ...imported.marker, state: 'journal' });
    new SQLiteEventHistoryBranchStore(db).backfillGenesisBranches();
    const record: SerializedCampaign = {
      ...buildSerializedCampaign(
        { ...buildPopulatedCampaign(), id: CAMPAIGN_ID },
        'device-test',
        1,
      ),
      instanceId: 'local-host',
      authority: { role: 'source' },
    };
    db.prepare(
      `INSERT OR REPLACE INTO campaigns
         (id, version, schema_version, name, faction_id, campaign_date,
          balance, origin_device_id, saved_at, payload)
       VALUES (?, 1, 2, ?, 'mercenary', '3025-01-01T00:00:00.000Z',
               0, 'device-test', '2026-08-23T00:00:00.000Z', ?)`,
    ).run(CAMPAIGN_ID, CAMPAIGN_ID, JSON.stringify(record));
    caller = await mintHolder();
    bindCampaignSessionParticipant({
      campaignId: CAMPAIGN_ID,
      sessionId: `session-${CAMPAIGN_ID}`,
      participantId: caller.playerId,
      seat: 'player',
      boundAt: '2026-08-23T00:00:00.000Z',
    });
  });

  afterEach(() => {
    resetSQLiteService();
  });

  it('answers PROJECTION_REBUILDING with the active head and appends nothing', async () => {
    const db = getSQLiteService().getDatabase();
    const head = db
      .prepare(
        `SELECT stream_revision AS revision, event_digest AS digest
           FROM event_journal_stream_heads
          WHERE stream_type = ? AND stream_id = ?`,
      )
      .get(CAMPAIGN_STREAM_TYPE, CAMPAIGN_ID) as {
      readonly revision: number;
      readonly digest: string;
    };
    new SQLiteEventHistoryCorrectionLeaseStore(
      db,
      new SQLiteEventHistoryBranchStore(db),
    ).acquireCorrectionLease({
      streamType: CAMPAIGN_STREAM_TYPE,
      streamId: CAMPAIGN_ID,
      owner: 'host-1',
      actor: 'gm-1',
      reason: 'authorized rewind to the prior contract',
      ttlMs: TTL_MS,
      expectedBranchId: 'root',
      expectedRevision: head.revision,
      expectedDigest: head.digest,
      expectedGeneration: 1,
    });

    const result = await post(
      { intent: spend(250_000), commandId: 'cmd-rebuild' },
      caller.wire,
    );

    expect(result.status).toBe(409);
    expect(result.json).toEqual({
      kind: 'blocked',
      reason: 'PROJECTION_REBUILDING',
      recoveryAction: 'retry-after-rebuild',
      activeHead: { branchId: 'root', revision: head.revision },
    });
    const after = db
      .prepare(
        `SELECT stream_revision AS revision FROM event_journal_stream_heads
          WHERE stream_type = ? AND stream_id = ?`,
      )
      .get(CAMPAIGN_STREAM_TYPE, CAMPAIGN_ID) as { readonly revision: number };
    expect(after.revision).toBe(head.revision);
  });
});
