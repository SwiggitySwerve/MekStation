/**
 * POST /api/campaigns/[id]/rewind-preview (seam 16.1-a).
 * Combat-preview harness: real SQLite, real tokens, shipped handler.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-persistence/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks } from 'node-mocks-http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { ICampaignIntent } from '@/types/campaign/CampaignSync';
import type { IVaultIdentity } from '@/types/vault';

import { importCampaignBaseline } from '@/lib/campaign/authority/campaignAuthorityMigration';
import { executeCampaignCommand } from '@/lib/campaign/authority/campaignCommandPipeline';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { issuePlayerToken } from '@/lib/multiplayer/client/issuePlayerToken';
import previewHandler, {
  _setCampaignRewindPreviewNowIsoForTests,
} from '@/pages/api/campaigns/[id]/rewind-preview';
import { bindCampaignSessionParticipant } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { generateKeyPair } from '@/services/vault/IdentityService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { encodeTokenForWire } from '@/types/multiplayer/Player';

const CAMPAIGN_ID = 'campaign-rewind-preview-route';
const NOW = '3025-01-03T00:00:00.000Z';
const AT = '2026-09-02T00:00:00.000Z';

interface IHolder {
  readonly playerId: string;
  readonly wire: string;
}

async function mintHolder(name: string): Promise<IHolder> {
  const keys = await generateKeyPair();
  const identity: IVaultIdentity = {
    id: `identity-${name}`,
    displayName: name,
    publicKey: Buffer.from(keys.publicKey).toString('base64'),
    privateKey: Buffer.from(keys.privateKey).toString('base64'),
    friendCode: 'AAAA-BBBB-CCCC-DDDD',
    createdAt: '2026-08-23T00:00:00.000Z',
  };
  const token = await issuePlayerToken(identity);
  return { playerId: token.playerId, wire: encodeTokenForWire(token) };
}

function privateRecordCount(): number {
  return (
    getSQLiteService()
      .getDatabase()
      .prepare('SELECT COUNT(*) AS c FROM private_record')
      .get() as { readonly c: number }
  ).c;
}

describe('POST /api/campaigns/[id]/rewind-preview', () => {
  let dir: string;
  let host: IHolder;
  let guest: IHolder;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-rewind-route-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'route.db') }).initialize();
    host = await mintHolder('host');
    guest = await mintHolder('guest');
    _setCampaignRewindPreviewNowIsoForTests(() => AT);

    const record = {
      ...buildSerializedCampaign(
        { ...buildPopulatedCampaign(), id: CAMPAIGN_ID },
        'device-test',
        1,
      ),
      instanceId: 'local-host',
      authority: { role: 'source' as const },
    };
    getSQLiteService()
      .getDatabase()
      .prepare(
        `INSERT OR REPLACE INTO campaigns
           (id, version, schema_version, name, faction_id, campaign_date,
            balance, origin_device_id, saved_at, payload)
         VALUES (?, 1, 2, ?, 'mercenary', '3025-01-01T00:00:00.000Z',
                 0, 'device-test', ?, ?)`,
      )
      .run(CAMPAIGN_ID, CAMPAIGN_ID, AT, JSON.stringify(record));
    for (const [participantId, seat] of [
      [host.playerId, 'gm'],
      [guest.playerId, 'player'],
    ] as const) {
      bindCampaignSessionParticipant({
        campaignId: CAMPAIGN_ID,
        sessionId: `session-${CAMPAIGN_ID}`,
        participantId,
        seat,
        boundAt: AT,
      });
    }

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
    const spendIntent: ICampaignIntent<'SpendFunds'> = {
      campaignId: CAMPAIGN_ID,
      intentId: 'intent-spend',
      kind: 'SpendFunds',
      payload: { amount: 250_000, reason: 'repairs' },
    };
    const spent = await executeCampaignCommand(
      { journal, authority: { kind: 'journal' } },
      {
        campaignId: CAMPAIGN_ID,
        intent: spendIntent,
        authorPlayerId: host.playerId,
        commandId: 'cmd-spend',
        ts: NOW,
      },
    );
    if (spent.kind !== 'committed') throw new Error(spent.kind);
  });

  afterEach(async () => {
    _setCampaignRewindPreviewNowIsoForTests(undefined);
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  async function call(bearer: string, cutoff: number) {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: CAMPAIGN_ID },
      body: { cutoff },
      headers: { authorization: `Bearer ${bearer}` },
    });
    await previewHandler(req, res);
    return {
      status: res._getStatusCode(),
      json: res._getJSONData() as Record<string, unknown>,
    };
  }

  it('the GM gets the preview and one private record', async () => {
    expect(privateRecordCount()).toBe(0);
    const { status, json } = await call(host.wire, 1);
    expect(status).toBe(200);
    expect(json).toMatchObject({ kind: 'preview', families: ['finances'] });
    expect((json.underivable as string[]).length).toBe(10);
    expect(privateRecordCount()).toBe(1);
    expect(
      (
        getSQLiteService()
          .getDatabase()
          .prepare('SELECT created_at AS createdAt FROM private_record')
          .get() as { readonly createdAt: string }
      ).createdAt,
    ).toBe(AT);
  });

  it('a non-GM is refused 403 with no record', async () => {
    const { status, json } = await call(guest.wire, 1);
    expect(status).toBe(403);
    expect(json).toMatchObject({ kind: 'refused', reason: 'not-gm' });
    expect(json.families).toBeUndefined();
    expect(privateRecordCount()).toBe(0);
  });

  it('a refused preview stores nothing', async () => {
    const { status, json } = await call(host.wire, 2);
    expect(status).toBe(409);
    expect(json).toMatchObject({
      kind: 'refused',
      reason: 'cutoff-is-current',
    });
    expect(privateRecordCount()).toBe(0);
  });
});
