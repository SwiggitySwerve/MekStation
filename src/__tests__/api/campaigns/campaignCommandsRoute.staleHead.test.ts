/**
 * The stale-head lever at the HTTP boundary (finding
 * FN-u1d-stale-head-class-has-no-in-paths-lever).
 *
 * The pipeline has answered a stale head since umbrella task 8.4:
 * `ICampaignCommandRequest.expectedRevision` is the revision the client
 * believes it is writing against, and a command that names a superseded
 * one is refused BEFORE anything is derived or appended. The route never
 * forwarded the field, so the whole refusal was unreachable over HTTP -
 * a stale client's claim was silently dropped and its command committed
 * against a head it had never seen.
 *
 * What is pinned here is the OBSERVABLE contract, read off
 * `decideCampaignConflict` rather than assumed:
 *
 *   - absent               -> no claim; the command behaves as before
 *   - equal to the head    -> `at-head`; the command commits
 *   - above the head       -> `base-revision-unknown`, resync
 *   - below the head       -> `undeclared-field-set`, rebase
 *   - malformed            -> 400 at this route, journal untouched
 *
 * THE BELOW-HEAD ROW IS ONE ROW, NOT TWO, AND THAT IS DELIBERATE. The
 * decision checks the client's declared field set first, and this route
 * declares none, so a stale command whose fields collide with the
 * intervening ones and a stale command that is genuinely disjoint from
 * them get the SAME refusal. The field-level verdicts `same-field-stale`
 * and `revalidate` are not reachable from this boundary; both cases are
 * pinned below so that stays a measured fact rather than a belief.
 *
 * The refusal carries no `code`: `decideCampaignConflict` freezes
 * `code: 'STALE_REVISION'` onto every refusal, but the pipeline's
 * conflict result does not carry it forward, so it never reaches the
 * wire. What a client can actually read - the reason, the active branch
 * and revision, and what to do next - is what these tests assert.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/coop-campaign-sync/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks, type Body, type RequestMethod } from 'node-mocks-http';

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { ICampaignIntent } from '@/types/campaign/CampaignSync';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';
import type { IVaultIdentity } from '@/types/vault';

import { importCampaignBaseline } from '@/lib/campaign/authority/campaignAuthorityMigration';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { JournalCampaignEventStore } from '@/lib/campaign/sync/JournalCampaignEventStore';
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

const CAMPAIGN_ID = 'campaign-command-stale-head';
const NOW = '3025-01-03T00:00:00.000Z';
const STARTING_BALANCE = 1_000_000;

/** One self-issued bearer token plus the principal it names. */
interface IHolder {
  readonly playerId: string;
  readonly wire: string;
}

async function mintHolder(): Promise<IHolder> {
  const keys = await generateKeyPair();
  const identity: IVaultIdentity = {
    id: 'identity-stale-head',
    displayName: 'Stale Head',
    publicKey: Buffer.from(keys.publicKey).toString('base64'),
    privateKey: Buffer.from(keys.privateKey).toString('base64'),
    friendCode: 'AAAA-BBBB-CCCC-DDDD',
    createdAt: '2026-08-23T00:00:00.000Z',
  };
  const token = await issuePlayerToken(identity);
  return { playerId: token.playerId, wire: encodeTokenForWire(token) };
}

/** Binds one durable seat on the campaign's co-op session. */
function seat(participantId: string): void {
  bindCampaignSessionParticipant({
    campaignId: CAMPAIGN_ID,
    sessionId: `session-${CAMPAIGN_ID}`,
    participantId,
    seat: 'player',
    boundAt: '2026-08-23T00:00:00.000Z',
  });
}

/** The campaign's own record; the route reads its session scope off this row. */
function storeCampaignRow(): void {
  const base = buildSerializedCampaign(
    { ...buildPopulatedCampaign(), id: CAMPAIGN_ID },
    'device-test',
    1,
  );
  const record: SerializedCampaign = {
    ...base,
    instanceId: 'local-host',
    authority: { role: 'source' },
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

function spend(amount: number, intentId: string): ICampaignIntent {
  return {
    campaignId: CAMPAIGN_ID,
    intentId,
    kind: 'SpendFunds',
    payload: { amount, reason: 'repairs' },
  } as unknown as ICampaignIntent;
}

/** Touches `day`, so it is disjoint from anything a spend touches. */
function advanceDay(intentId: string): ICampaignIntent {
  return {
    campaignId: CAMPAIGN_ID,
    intentId,
    kind: 'AdvanceDay',
    payload: {},
  } as unknown as ICampaignIntent;
}

async function post(
  body: Body,
  wire: string,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: 'POST' as RequestMethod,
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

/**
 * The revision the pipeline itself compares `expectedRevision` against.
 *
 * Measured the same way the pipeline measures it - the length of the
 * campaign's journal event list - so a test that says "the head is at N"
 * is saying it in the units the refusal is decided in, not in a
 * neighbouring table's column that merely tends to agree.
 */
async function journalRevision(): Promise<number> {
  const journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
    getSQLiteService().getDatabase(),
    () => NOW,
  );
  const events = await new JournalCampaignEventStore(journal).getEvents(
    CAMPAIGN_ID,
    0,
  );
  return events.length;
}

/** Seeds a journal-authority campaign with a real starting balance. */
async function seedJournalCampaign(): Promise<void> {
  const journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
    getSQLiteService().getDatabase(),
    () => NOW,
  );
  const imported = await importCampaignBaseline(journal, {
    campaignId: CAMPAIGN_ID,
    state: {
      ...createEmptyCampaignState(CAMPAIGN_ID),
      balance: STARTING_BALANCE,
    },
    sourceSnapshotRevision: 1,
    importedAt: NOW,
  });
  if (imported.kind !== 'imported') throw new Error(imported.kind);
  writeCampaignMigrationMarker({ ...imported.marker, state: 'journal' });
}

/** Every value a client could send that is not a revision, plus an id slug. */
const MALFORMED_REVISIONS: ReadonlyArray<readonly [string, string, unknown]> = [
  ['a negative revision', 'negative', -1],
  ['a fractional revision', 'fractional', 1.5],
  ['a numeric string', 'numeric-string', '3'],
  ['an explicit null', 'null', null],
];

describe('campaign commands route: the expectedRevision stale-head lever', () => {
  let caller: IHolder;

  beforeEach(async () => {
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();
    await seedJournalCampaign();
    storeCampaignRow();
    caller = await mintHolder();
    seat(caller.playerId);
  });

  afterEach(() => {
    resetSQLiteService();
  });

  it('commits a command whose expectedRevision names the current head', async () => {
    const head = await journalRevision();

    const result = await post(
      {
        intent: spend(250_000, 'intent-at-head'),
        commandId: 'cmd-at-head',
        expectedRevision: head,
      },
      caller.wire,
    );

    // Naming the head you are actually on is not a conflict. A lever that
    // refused this would make the field unusable by an up-to-date client.
    expect(result.status).toBe(200);
    expect(result.json.kind).toBe('committed');
    expect((result.json.state as { balance: number }).balance).toBe(
      STARTING_BALANCE - 250_000,
    );
  });

  it('leaves a body with no expectedRevision exactly as it was', async () => {
    const result = await post(
      { intent: spend(250_000, 'intent-no-claim'), commandId: 'cmd-no-claim' },
      caller.wire,
    );

    // Absent means "I make no claim about the head". A client that never
    // learned the revision has to keep working.
    expect(result.status).toBe(200);
    expect(result.json.kind).toBe('committed');
    expect((result.json.state as { balance: number }).balance).toBe(
      STARTING_BALANCE - 250_000,
    );
  });

  it('refuses a stale expectedRevision whose command touches a field the newer events also touched', async () => {
    const base = await journalRevision();
    const intervening = await post(
      {
        intent: spend(100_000, 'intent-intervening'),
        commandId: 'cmd-intervening',
      },
      caller.wire,
    );
    expect(intervening.status).toBe(200);

    const head = await journalRevision();
    expect(head).toBeGreaterThan(base);

    const stale = await post(
      {
        intent: spend(50_000, 'intent-stale-same-field'),
        commandId: 'cmd-stale-same-field',
        expectedRevision: base,
      },
      caller.wire,
    );

    // 409 with the WHOLE conflict: where the head actually is, and what
    // to do about it. Before this lever the claim was dropped and this
    // spend committed against a balance the client had never seen.
    expect(stale.status).toBe(409);
    expect(stale.json).toMatchObject({
      kind: 'conflict',
      reason: 'undeclared-field-set',
      recoveryAction: 'rebase-onto-active-head',
      head: { branchId: 'root', revision: head },
      conflictingFields: [],
    });
    // Refused BEFORE anything was derived: the head did not move.
    expect(await journalRevision()).toBe(head);
  });

  it('refuses a stale expectedRevision even when the command is disjoint from the newer events', async () => {
    const base = await journalRevision();
    const intervening = await post(
      {
        intent: spend(100_000, 'intent-intervening-disjoint'),
        commandId: 'cmd-intervening-disjoint',
      },
      caller.wire,
    );
    expect(intervening.status).toBe(200);

    const head = await journalRevision();

    // `AdvanceDay` touches `day`; the intervening command touched
    // `balance`. The decision module would SERIALIZE this pair - but only
    // for a caller that declared its field set, and this route declares
    // none. The refusal below is the real contract at this boundary, not
    // a weaker stand-in for the field-level verdict.
    const stale = await post(
      {
        intent: advanceDay('intent-stale-disjoint'),
        commandId: 'cmd-stale-disjoint',
        expectedRevision: base,
      },
      caller.wire,
    );

    expect(stale.status).toBe(409);
    expect(stale.json).toMatchObject({
      kind: 'conflict',
      reason: 'undeclared-field-set',
      recoveryAction: 'rebase-onto-active-head',
      head: { branchId: 'root', revision: head },
      conflictingFields: [],
    });
    expect(await journalRevision()).toBe(head);
  });

  it('refuses an expectedRevision above the head and names the active head', async () => {
    const head = await journalRevision();

    const result = await post(
      {
        intent: spend(1_000, 'intent-ahead'),
        commandId: 'cmd-ahead',
        expectedRevision: head + 5,
      },
      caller.wire,
    );

    // A revision this stream never had is not a field-level question:
    // there is no base to reconstruct, so the client is told to resync
    // rather than to rebase.
    expect(result.status).toBe(409);
    expect(result.json).toMatchObject({
      kind: 'conflict',
      reason: 'base-revision-unknown',
      recoveryAction: 'resync-to-active-head',
      head: { branchId: 'root', revision: head },
      conflictingFields: [],
    });
    expect(await journalRevision()).toBe(head);
  });

  it.each(MALFORMED_REVISIONS)(
    'refuses %s at the route and appends nothing',
    async (_label, slug, value) => {
      const head = await journalRevision();

      const result = await post(
        {
          intent: spend(1_000, `intent-${slug}`),
          commandId: `cmd-${slug}`,
          expectedRevision: value,
        } as Body,
        caller.wire,
      );

      // REFUSED, never dropped. A client that sent "3" believing it had
      // pinned the head would otherwise have its claim ignored and its
      // overwrite serialized - which is the exact failure this lever
      // exists to end, wearing a more respectable shape.
      expect(result.status).toBe(400);
      expect(String(result.json.error)).toContain('expectedRevision');
      expect(await journalRevision()).toBe(head);
    },
  );
});
