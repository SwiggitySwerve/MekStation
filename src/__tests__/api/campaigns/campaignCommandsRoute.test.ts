/**
 * /api/campaigns/[id]/commands (task 1.2; caller authority for finding
 * #28).
 *
 * Two jobs, both pinned here:
 *
 * 1. The pipeline keeps its failure modes distinguishable; this pins
 *    that the route does not flatten them on the way out. A caller that
 *    saw one status for all of them would retry the ones that can never
 *    succeed and give up on the ones that would.
 * 2. The actor is the VERIFIED caller. This route used to read
 *    `authorPlayerId` straight from the request body and hand it to the
 *    pipeline as the command's author, so anyone who could reach it
 *    could append to a campaign's journal wearing another participant's
 *    identity - attribution in the event log was forgeable. The body
 *    field is now refused outright rather than ignored, so a client
 *    still sending it is told the contract moved instead of silently
 *    having its claim dropped.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks, type Body, type RequestMethod } from 'node-mocks-http';

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { ICampaignIntent } from '@/types/campaign/CampaignSync';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';
import type { IPlayerTokenScope } from '@/types/multiplayer/Player';
import type { IVaultIdentity } from '@/types/vault';

import { importCampaignBaseline } from '@/lib/campaign/authority/campaignAuthorityMigration';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
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

const CAMPAIGN_ID = 'campaign-command-route';
const NOW = '3025-01-03T00:00:00.000Z';

/** One self-issued bearer token plus the principal it names. */
interface IHolder {
  readonly playerId: string;
  readonly wire: string;
}

async function mintHolder(scope?: IPlayerTokenScope): Promise<IHolder> {
  const keys = await generateKeyPair();
  const identity: IVaultIdentity = {
    id: 'identity-command-route',
    displayName: 'Command Route',
    publicKey: Buffer.from(keys.publicKey).toString('base64'),
    privateKey: Buffer.from(keys.privateKey).toString('base64'),
    friendCode: 'AAAA-BBBB-CCCC-DDDD',
    createdAt: '2026-08-23T00:00:00.000Z',
  };
  const token = await issuePlayerToken(identity, scope ? { scope } : undefined);
  return { playerId: token.playerId, wire: encodeTokenForWire(token) };
}

/** Binds one durable seat on the campaign's co-op session. */
function seat(participantId: string, role: 'gm' | 'player'): void {
  bindCampaignSessionParticipant({
    campaignId: CAMPAIGN_ID,
    sessionId: `session-${CAMPAIGN_ID}`,
    participantId,
    seat: role,
    boundAt: '2026-08-23T00:00:00.000Z',
  });
}

const COOP_MATCH_ID = 'match-command-route';

/**
 * Stores the campaign's own record. The route reads the session scope a
 * token must carry off THIS row, so a suite with no row could not tell a
 * record-derived scope from a caller-supplied one.
 */
function storeCampaignRow(matchId?: string): void {
  const base = buildSerializedCampaign(
    { ...buildPopulatedCampaign(), id: CAMPAIGN_ID },
    'device-test',
    1,
  );
  const record: SerializedCampaign = {
    ...base,
    instanceId: 'local-host',
    authority: { role: 'source' },
    body: matchId
      ? {
          ...base.body,
          coopSession: { mode: 'host', roomCode: 'ROOM01', matchId },
        }
      : base.body,
  };
  getSQLiteService()
    .getDatabase()
    .prepare(
      `INSERT OR REPLACE INTO campaigns
         (id, version, schema_version, name, faction_id, campaign_date,
          balance, origin_device_id, saved_at, payload)
       VALUES (?, 1, 2, ?, 'mercenary', '3025-01-01T00:00:00.000Z',
               0, 'device-test', '2026-08-23T00:00:00.000Z', ?)`,
    )
    .run(CAMPAIGN_ID, CAMPAIGN_ID, JSON.stringify(record));
}

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
  wire?: string,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: 'POST' as RequestMethod,
    query: { id: CAMPAIGN_ID },
    body,
    ...(wire ? { headers: { authorization: `Bearer ${wire}` } } : {}),
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
  let caller: IHolder;

  beforeEach(async () => {
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();
    await seedJournalCampaign();
    storeCampaignRow();
    caller = await mintHolder();
    seat(caller.playerId, 'player');
  });

  afterEach(() => {
    resetSQLiteService();
  });

  it('commits a valid command and returns the projected state', async () => {
    const result = await post(
      { intent: spend(250_000), commandId: 'cmd-1' },
      caller.wire,
    );

    expect(result.status).toBe(200);
    expect(result.json.kind).toBe('committed');
    expect((result.json.state as { balance: number }).balance).toBe(750_000);
  });

  it('attributes the commit to the TOKEN, never to anything the caller said', async () => {
    const result = await post(
      { intent: spend(1_000), commandId: 'cmd-actor' },
      caller.wire,
    );

    expect(result.status).toBe(200);
    // The journal's own record of who did this. It has to be the
    // verified principal: a forgeable author makes every later audit of
    // the campaign log worthless.
    const events = result.json.events as Array<{ authorPlayerId?: string }>;
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.authorPlayerId).toBe(caller.playerId);
    }
  });

  it('refuses an unauthenticated command - the journal must not take an unnamed actor', async () => {
    const result = await post({
      intent: spend(1_000),
      commandId: 'cmd-anon',
    });

    expect(result.status).toBe(401);
    // Nothing committed: the balance is untouched for the next caller.
    const after = await post(
      { intent: spend(1), commandId: 'cmd-probe' },
      caller.wire,
    );
    expect((after.json.state as { balance: number }).balance).toBe(999_999);
  });

  it('refuses a verified caller who holds no seat on this campaign', async () => {
    const outsider = await mintHolder();
    const result = await post(
      { intent: spend(1_000), commandId: 'cmd-outsider' },
      outsider.wire,
    );

    expect(result.status).toBe(403);
    expect(result.json).toMatchObject({ reason: 'not-campaign-participant' });
  });

  it('accepts a seated GM as readily as a seated player', async () => {
    const gm = await mintHolder();
    seat(gm.playerId, 'gm');
    const result = await post(
      { intent: spend(1_000), commandId: 'cmd-gm' },
      gm.wire,
    );

    // Commanding is a participant action, not a GM-only one: both seats
    // command, and only a stranger is refused.
    expect(result.status).toBe(200);
    expect(result.json.kind).toBe('committed');
  });

  it('REFUSES a body that names its own actor, rather than ignoring it', async () => {
    const result = await post(
      {
        intent: spend(1_000),
        commandId: 'cmd-forged',
        authorPlayerId: 'pid-somebody-else',
      },
      caller.wire,
    );

    // Silently dropping the field would leave a client believing it had
    // attributed the command, and would leave the old forged-actor call
    // shape working. The refusal is how a stale client learns.
    expect(result.status).toBe(400);
    expect(result.json).toMatchObject({ reason: 'author-not-accepted' });
  });

  it('binds a scoped token to the campaign OWN session, not one the caller names', async () => {
    // The campaign advertises its session; a token minted for a
    // different one must not satisfy the check by naming that one.
    storeCampaignRow(COOP_MATCH_ID);
    const right = await mintHolder({
      kind: 'campaign-session',
      id: COOP_MATCH_ID,
    });
    const wrong = await mintHolder({
      kind: 'campaign-session',
      id: 'match-somewhere-else',
    });
    seat(right.playerId, 'player');
    seat(wrong.playerId, 'player');

    const accepted = await post(
      { intent: spend(1_000), commandId: 'cmd-scope-ok' },
      right.wire,
    );
    expect(accepted.status).toBe(200);

    const refused = await post(
      { intent: spend(1_000), commandId: 'cmd-scope-bad' },
      wrong.wire,
    );
    expect(refused.status).toBe(401);
  });

  it('reports an unaffordable command as 422, not as a conflict', async () => {
    const result = await post(
      { intent: spend(9_000_000), commandId: 'cmd-2' },
      caller.wire,
    );

    // 422 says "the campaign cannot do this" — retrying it forever would
    // never help, which is exactly what a 409 would invite.
    expect(result.status).toBe(422);
    expect(result.json.kind).toBe('rejected');
  });

  it('answers a retried command with success, not a duplicate error', async () => {
    await post({ intent: spend(100_000), commandId: 'cmd-retry' }, caller.wire);

    const retry = await post(
      { intent: spend(100_000), commandId: 'cmd-retry' },
      caller.wire,
    );

    // The command committed once, which is what the caller wanted.
    expect(retry.status).toBe(200);
    expect(retry.json.kind).toBe('duplicate');
  });

  it('blocks a campaign that never migrated, distinctly from a rejection', async () => {
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();
    seat(caller.playerId, 'player');

    const result = await post(
      { intent: spend(1), commandId: 'cmd-3' },
      caller.wire,
    );

    expect(result.status).toBe(409);
    expect(result.json).toMatchObject({
      kind: 'blocked',
      reason: 'campaign-not-on-journal-authority',
    });
  });

  it('rejects an intent aimed at a different campaign', async () => {
    const result = await post(
      {
        intent: { ...spend(1), campaignId: 'some-other-campaign' },
        commandId: 'cmd-4',
      },
      caller.wire,
    );

    expect(result.status).toBe(400);
  });

  it('requires a command id so a retry can be recognised', async () => {
    const result = await post({ intent: spend(1) }, caller.wire);

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
