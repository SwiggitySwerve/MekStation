/**
 * A co-op GM funds correction reaches the campaign record's intervention
 * history (roadmap unit U97).
 *
 * Real SQLite on a temp file, a journal-native campaign created through the
 * live item route, a co-op host registered in the shared campaign host
 * registry, and the real socket binder with one host socket and one guest
 * socket (joined by room code). The record is re-read through the live GET
 * route, as the GM ledger page's refresh and a page reload read it.
 *
 * - (R1) the host's ApplyGmIntervention commits FundsChanged and the saved
 *   record's gmInterventionEvents gains one entry holding the public summary,
 *   the signed delta, the intervention id and the commit sequence, with no
 *   GM-private metadata; the control plane's persisted rows list it; a resend
 *   of the same intent and a refused debit add no entry.
 * - (R2) the guest's frames and the guest mirror's projected campaign carry
 *   no intervention history and no intervention id (control row).
 *
 * Every row records what it read before asserting (U35E_ROWS_DIR).
 */

import { EventEmitter } from 'node:events';

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { buildPersistedCampaignEventRows } from '@/components/campaign/gm/GmCampaignInterventionControlPlane.helpers';
import { authoritativeStateFromSerializedCampaign } from '@/lib/campaign/authority/campaignSourceGenesis';
import { applyAuthoritativeStateToGuestCampaign } from '@/lib/campaign/coop/campaignMirrorProjection';
import { _resetActiveCoopHosts } from '@/lib/campaign/coop/coopHostRegistry';
import { applyCampaignEvent } from '@/lib/campaign/sync/applyCampaignEvent';
import { bindCampaignSyncConnection } from '@/lib/multiplayer/server/bindCampaignSyncConnection';
import {
  _resetCampaignHostRegistry,
  getCampaignHostRegistry,
} from '@/lib/multiplayer/server/CampaignHostRegistry';
import { createCampaign } from '@/types/campaign/Campaign';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { nowIso } from '@/types/multiplayer/Protocol';

import {
  callId,
  createJournalNative,
  eventTypes,
  flushMeasurements,
  useTempCampaignDatabase,
} from './campaignJournalEffectsFixture';

const MATCH_ID = 'match-u97';
const HOST = 'pid_host';
const GUEST = 'pid_guest';
const SUMMARY = 'Merchant charge corrected by +2,500.00 C-bills.';
const PRIVATE_KEYS = [
  'privateMetadata',
  'reason',
  'hiddenNotes',
  'defaultOutcome',
  'manualTakeoverNotes',
];

const measurements: Record<string, unknown> = {};

/** A socket the binder writes JSON frames to; `sent` holds them parsed. */
class RowSocket extends EventEmitter {
  readonly sent: IServerMessage[] = [];
  readyState = 1;

  send(data: string): void {
    this.sent.push(JSON.parse(data) as IServerMessage);
  }

  close(): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.emit('close');
  }

  inbound(message: Record<string, unknown>): void {
    this.emit('message', JSON.stringify(message));
  }
}

/** Resolves once `ready()` holds, or after about 5 s of 5 ms timer turns. */
async function until(ready: () => boolean): Promise<void> {
  const deadline = Date.now() + 5000;
  while (!ready() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

/** Binds a socket for `playerId` and sends its CampaignJoin. */
async function joined(
  playerId: string,
  role: 'host' | 'guest',
): Promise<RowSocket> {
  const socket = new RowSocket();
  await bindCampaignSyncConnection({
    socket,
    matchId: MATCH_ID,
    verifiedPlayerId: playerId,
    logger: { error: jest.fn(), log: jest.fn(), warn: jest.fn() },
    replicaStore: null,
  });
  socket.inbound({
    kind: 'CampaignJoin',
    matchId: MATCH_ID,
    ts: nowIso(),
    playerId,
    role,
    ...(role === 'guest' ? { roomCode: 'ABC234' } : {}),
  });
  await until(() => socket.sent.some((f) => f.kind === 'CampaignSnapshot'));
  return socket;
}

/** The ApplyGmIntervention host frame the GM sends for one approval. */
function gmIntervention(
  campaignId: string,
  interventionId: string,
  deltaCBills: number,
  summary: string = SUMMARY,
): Record<string, unknown> {
  return {
    kind: 'CampaignHostIntent',
    matchId: MATCH_ID,
    ts: nowIso(),
    playerId: HOST,
    intent: {
      kind: 'ApplyGmIntervention',
      campaignId,
      intentId: `gm-intervention-${interventionId}`,
      payload: { interventionId, summary, deltaCBills },
    },
  };
}

/** The committed campaign events among `socket`'s frames from `from` on. */
function eventsFrom(socket: RowSocket, from: number): ICampaignEvent[] {
  return socket.sent
    .slice(from)
    .filter((f) => f.kind === 'CampaignEvent')
    .map((f) => (f as unknown as { event: ICampaignEvent }).event);
}

/** The saved record's intervention history, read through the live GET route. */
async function recordHistory(id: string): Promise<{
  readonly version: unknown;
  readonly balance: unknown;
  readonly gmInterventionEvents: unknown;
}> {
  const read = await callId('GET', id);
  const body = (read.json as { body?: Record<string, unknown> }).body ?? {};
  return {
    version: read.json.version,
    balance: (body.finances as { balance?: unknown } | undefined)?.balance,
    gmInterventionEvents: body.gmInterventionEvents ?? null,
  };
}

/** A journal-native campaign with a live host, a host socket and a guest socket. */
async function liveSession(id: string): Promise<{
  host: RowSocket;
  guest: RowSocket;
  before: number;
}> {
  const { record } = await createJournalNative(id);
  const entry = await getCampaignHostRegistry().register(MATCH_ID, {
    campaignId: id,
    hostPlayerId: HOST,
    roomCode: 'ABC234',
    state: authoritativeStateFromSerializedCampaign(record),
  });
  const host = await joined(HOST, 'host');
  const guest = await joined(GUEST, 'guest');
  return { host, guest, before: entry.host.getState().balance };
}

describe('U97 a co-op GM funds correction reaches the record intervention history', () => {
  useTempCampaignDatabase('u97-gm-history-');

  afterEach(() => {
    _resetCampaignHostRegistry();
    _resetActiveCoopHosts();
  });

  afterAll(async () => {
    await flushMeasurements('u97-coop-gm-history', measurements);
  });

  it('(R1) the committed ApplyGmIntervention writes one history entry with the four fields; a resend and a refusal add none', async () => {
    const id = 'u97-history';
    const { host, guest, before } = await liveSession(id);
    const recordBefore = await recordHistory(id);

    const g0 = guest.sent.length;
    host.inbound(gmIntervention(id, 'gm-ledger-merchant-reversal-u97a', 2500));
    await until(() => eventsFrom(guest, g0).length >= 1);
    const committed = eventsFrom(guest, g0)[0];
    const afterCommit = await recordHistory(id);

    const h1 = host.sent.length;
    host.inbound(gmIntervention(id, 'gm-ledger-merchant-reversal-u97a', 2500));
    // A deduped resend answers nothing, so there is no frame to wait for.
    await new Promise((resolve) => setTimeout(resolve, 300));
    const afterResend = await recordHistory(id);

    const h2 = host.sent.length;
    host.inbound(
      gmIntervention(
        id,
        'gm-debit-u97-over',
        -(before + 2500 + 1),
        'Overdraw.',
      ),
    );
    await until(() => host.sent.length > h2);
    const afterRefusal = await recordHistory(id);

    const history = (afterRefusal.gmInterventionEvents ?? []) as readonly {
      interventionId?: string;
      type: string;
    }[];
    const reloadRows = buildPersistedCampaignEventRows(
      afterCommit.gmInterventionEvents as never,
      undefined,
      '3025-01-01T00:00:00.000Z',
    ).playerRows.map((row) => ({
      id: row.id,
      summary: row.publicEffect.summary,
      interventionRecordId: row.interventionRecordId,
    }));
    measurements.R1 = {
      before,
      recordBefore,
      committed,
      afterCommit,
      resendHostFrames: host.sent.slice(h1, h2),
      afterResend,
      refusalHostFrames: host.sent.slice(h2),
      afterRefusal,
      reloadRows,
      types: eventTypes(id),
    };

    expect(committed?.type).toBe('FundsChanged');
    expect(afterCommit.gmInterventionEvents).toEqual([
      {
        type: 'gm.campaign.funds_transaction_corrected',
        domain: 'economy',
        family: 'funds-transaction',
        interventionId: 'gm-ledger-merchant-reversal-u97a',
        transactionId: `campaign-event:${id}:${committed?.sequence}`,
        changedStateRefs: [`campaign:${id}:finances`],
        publicSummary: SUMMARY,
        before: { balanceCents: before * 100, transactionIds: [] },
        after: {
          balanceCents: (before + 2500) * 100,
          transaction: {
            id: `campaign-event:${id}:${committed?.sequence}`,
            type: 'miscellaneous',
            amountCents: 250_000,
            date: expect.any(String),
            description: SUMMARY,
          },
        },
      },
    ]);
    const entry = (
      afterCommit.gmInterventionEvents as Record<string, unknown>[]
    )[0];
    expect(
      PRIVATE_KEYS.filter((key) => entry !== undefined && key in entry),
    ).toEqual([]);
    expect(afterCommit.balance).toBe(before + 2500);
    expect(reloadRows).toEqual([
      {
        id: 'persisted:gm-ledger-merchant-reversal-u97a:0',
        summary: SUMMARY,
        interventionRecordId: 'gm-ledger-merchant-reversal-u97a',
      },
    ]);
    expect(afterResend.gmInterventionEvents).toEqual(
      afterCommit.gmInterventionEvents,
    );
    expect(history.map((e) => e.interventionId)).toEqual([
      'gm-ledger-merchant-reversal-u97a',
    ]);
    expect(eventTypes(id).filter((t) => t === 'FundsChanged')).toHaveLength(1);
  }, 30000);

  it('(R2) the guest frames and the guest mirror carry no intervention history or id', async () => {
    const id = 'u97-guest';
    const { host, guest, before } = await liveSession(id);

    const g0 = guest.sent.length;
    host.inbound(gmIntervention(id, 'gm-ledger-merchant-reversal-u97g', 2500));
    await until(() => eventsFrom(guest, g0).length >= 1);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const guestFrames = guest.sent.slice(g0);
    const allGuestFrames = JSON.stringify(guest.sent);

    // The guest mirror: every snapshot and event frame the guest got, folded
    // in order from an empty state, projected onto a guest campaign the way
    // the mirror store projects it.
    const guestEvents = guest.sent
      .filter(
        (f) => f.kind === 'CampaignSnapshot' || f.kind === 'CampaignEvent',
      )
      .map((f) => (f as unknown as { event: ICampaignEvent }).event);
    const folded = guestEvents.reduce(
      (state, event) => applyCampaignEvent(state, event),
      createEmptyCampaignState(id),
    );
    const mirror = applyAuthoritativeStateToGuestCampaign(
      { ...createCampaign('U97 Guest Mirror', 'mercenary'), id },
      folded,
    );

    measurements.R2 = {
      before,
      guestFrames,
      guestEventTypes: guestEvents.map((e) => e.type),
      foldedBalance: folded.balance,
      mirrorHasHistory: 'gmInterventionEvents' in mirror,
      mirrorBalance: mirror.finances.balance.amount,
    };

    expect(guestFrames).toHaveLength(1);
    const funds = eventsFrom(guest, g0)[0];
    expect(funds?.type).toBe('FundsChanged');
    expect(Object.keys(funds?.payload ?? {}).sort()).toEqual([
      'balance',
      'delta',
      'reason',
    ]);
    expect(allGuestFrames).not.toContain('gm-ledger-merchant-reversal-u97g');
    expect(allGuestFrames).not.toContain('gmInterventionEvents');
    expect(folded.balance).toBe(before + 2500);
    expect(mirror.gmInterventionEvents).toBeUndefined();
    expect(mirror.finances.balance.amount).toBe(before + 2500);
    expect(host.sent.length).toBeGreaterThan(0);
  }, 30000);
});
