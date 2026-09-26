/**
 * A GM funds intervention committed through the live co-op host (roadmap
 * unit U92): the host-only ApplyGmIntervention campaign intent.
 *
 * Real SQLite on a temp file, a journal-native campaign created through the
 * live item route, a co-op host registered in the shared campaign host
 * registry the way the match create route registers it, and the real socket
 * binder with one host socket and one guest socket (joined by room code).
 *
 * - (R1) the host's ApplyGmIntervention commits FundsChanged with the
 *   signed delta and the public summary; the guest's frame, the live host,
 *   the journal and the saved record carry the new balance; a second
 *   approval (a fresh intervention id) commits a second FundsChanged; a
 *   resend of one approval commits nothing more.
 * - (R1 debit) a negative delta lowers the balance by its size; a debit past
 *   zero is refused insufficient-funds and commits nothing.
 * - (R2) the same intent sent by the guest is refused host-only and commits
 *   nothing, and a guest proposal carrying it commits nothing either.
 *
 * Every row records what it read before asserting (U35E_ROWS_DIR).
 */

import { EventEmitter } from 'node:events';

import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { authoritativeStateFromSerializedCampaign } from '@/lib/campaign/authority/campaignSourceGenesis';
import { _resetActiveCoopHosts } from '@/lib/campaign/coop/coopHostRegistry';
import { bindCampaignSyncConnection } from '@/lib/multiplayer/server/bindCampaignSyncConnection';
import {
  _resetCampaignHostRegistry,
  getCampaignHostRegistry,
  type ICampaignHostRegistryEntry,
} from '@/lib/multiplayer/server/CampaignHostRegistry';
import { nowIso } from '@/types/multiplayer/Protocol';

import {
  createJournalNative,
  eventTypes,
  flushMeasurements,
  replayed,
  storedRow,
  useTempCampaignDatabase,
} from './campaignJournalEffectsFixture';

const MATCH_ID = 'match-u92';
const HOST = 'pid_host';
const GUEST = 'pid_guest';
const SUMMARY = 'Merchant charge corrected by +2,500.00 C-bills.';

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

/** The ApplyGmIntervention host frame `playerId` sends for one approval. */
function gmIntervention(
  campaignId: string,
  playerId: string,
  interventionId: string,
  deltaCBills: number,
  summary: string = SUMMARY,
): Record<string, unknown> {
  return {
    kind: 'CampaignHostIntent',
    matchId: MATCH_ID,
    ts: nowIso(),
    playerId,
    intent: {
      kind: 'ApplyGmIntervention',
      campaignId,
      intentId: `gm-intervention-${interventionId}`,
      payload: { interventionId, summary, deltaCBills },
    },
  };
}

/** The frames of `socket` from index `from` on, reduced to what rows read. */
function framesFrom(socket: RowSocket, from: number): unknown[] {
  return socket.sent.slice(from).map((frame) => {
    const f = frame as unknown as Record<string, unknown> & {
      event?: { type?: string; sequence?: number; payload?: unknown };
    };
    return f.kind === 'Error'
      ? { kind: 'Error', code: f.code, reason: f.reason, intentId: f.intentId }
      : {
          kind: f.kind,
          type: f.event?.type ?? null,
          sequence: f.event?.sequence ?? null,
          payload: f.event?.type === 'FundsChanged' ? f.event.payload : null,
        };
  });
}

/** A journal-native campaign with a live host, a host socket and a guest socket. */
async function liveSession(id: string): Promise<{
  entry: ICampaignHostRegistryEntry;
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
  return { entry, host, guest, before: entry.host.getState().balance };
}

/** Counts FundsChanged frames `socket` received from index `from` on. */
function fundsFrames(socket: RowSocket, from: number): number {
  return socket.sent
    .slice(from)
    .filter(
      (f) =>
        f.kind === 'CampaignEvent' &&
        (f as unknown as { event: { type: string } }).event.type ===
          'FundsChanged',
    ).length;
}

describe('U92 ApplyGmIntervention through the live co-op host', () => {
  useTempCampaignDatabase('u92-gm-intervention-');

  afterEach(() => {
    _resetCampaignHostRegistry();
    _resetActiveCoopHosts();
  });

  afterAll(async () => {
    await flushMeasurements('u92-coop-gm-intervention', measurements);
  });

  it('(R1) the host commits FundsChanged with the delta; guest, host, journal and record carry it; a second approval commits again; a resend does not', async () => {
    const id = 'u92-credit';
    const { entry, host, guest, before } = await liveSession(id);

    const g0 = guest.sent.length;
    const h0 = host.sent.length;
    host.inbound(
      gmIntervention(id, HOST, 'gm-ledger-merchant-reversal-a1', 2500),
    );
    await until(() => fundsFrames(guest, g0) >= 1 || host.sent.length > h0 + 1);
    const first = {
      hostFrames: framesFrom(host, h0),
      guestFrames: framesFrom(guest, g0),
      hostLiveBalance: entry.host.getState().balance,
      journalBalance: (await replayed(id)).balance,
      record: storedRow(id),
      types: eventTypes(id),
    };

    const g1 = guest.sent.length;
    host.inbound(
      gmIntervention(id, HOST, 'gm-ledger-merchant-reversal-a2', 2500),
    );
    await until(() => fundsFrames(guest, g1) >= 1);
    const second = {
      guestFrames: framesFrom(guest, g1),
      hostLiveBalance: entry.host.getState().balance,
      journalBalance: (await replayed(id)).balance,
      record: storedRow(id),
    };

    const g2 = guest.sent.length;
    const h2 = host.sent.length;
    host.inbound(
      gmIntervention(id, HOST, 'gm-ledger-merchant-reversal-a2', 2500),
    );
    // A deduped resend answers nothing, so there is no frame to wait for.
    await new Promise((resolve) => setTimeout(resolve, 300));
    const resend = {
      guestFrames: framesFrom(guest, g2),
      hostFrames: framesFrom(host, h2),
      hostLiveBalance: entry.host.getState().balance,
      types: eventTypes(id),
    };
    measurements.R1 = { before, first, second, resend };

    expect(
      first.hostFrames.filter((f) => (f as { kind: string }).kind === 'Error'),
    ).toEqual([]);
    expect(first.guestFrames).toEqual([
      {
        kind: 'CampaignEvent',
        type: 'FundsChanged',
        sequence: expect.any(Number),
        payload: { delta: 2500, reason: SUMMARY, balance: before + 2500 },
      },
    ]);
    expect(first.hostLiveBalance).toBe(before + 2500);
    expect(first.journalBalance).toBe(before + 2500);
    expect(first.record.balance).toBe(before + 2500);
    expect(first.types[first.types.length - 1]).toBe('FundsChanged');

    expect(second.guestFrames).toEqual([
      {
        kind: 'CampaignEvent',
        type: 'FundsChanged',
        sequence: expect.any(Number),
        payload: { delta: 2500, reason: SUMMARY, balance: before + 5000 },
      },
    ]);
    expect(second.hostLiveBalance).toBe(before + 5000);
    expect(second.journalBalance).toBe(before + 5000);
    expect(second.record.balance).toBe(before + 5000);

    expect(resend.guestFrames).toEqual([]);
    expect(resend.hostFrames).toEqual([]);
    expect(resend.hostLiveBalance).toBe(before + 5000);
    expect(resend.types.filter((t) => t === 'FundsChanged')).toHaveLength(2);
  }, 30000);

  it('(R1 debit) a negative delta lowers the balance by its size; a debit past zero is refused insufficient-funds', async () => {
    const id = 'u92-debit';
    const { entry, host, guest, before } = await liveSession(id);

    const g0 = guest.sent.length;
    host.inbound(
      gmIntervention(
        id,
        HOST,
        'gm-debit-1',
        -1500,
        'Duplicate refund reversed by -1,500.00 C-bills.',
      ),
    );
    await until(() => fundsFrames(guest, g0) >= 1);
    const debit = {
      guestFrames: framesFrom(guest, g0),
      hostLiveBalance: entry.host.getState().balance,
      record: storedRow(id),
    };

    const g1 = guest.sent.length;
    const h1 = host.sent.length;
    const overdraw = -(before - 1500 + 1);
    host.inbound(gmIntervention(id, HOST, 'gm-debit-2', overdraw, 'Overdraw.'));
    await until(() => host.sent.length > h1);
    const refused = {
      overdraw,
      hostFrames: framesFrom(host, h1),
      guestFrames: framesFrom(guest, g1),
      hostLiveBalance: entry.host.getState().balance,
      record: storedRow(id),
    };
    measurements.R1debit = { before, debit, refused };

    expect(debit.guestFrames).toEqual([
      {
        kind: 'CampaignEvent',
        type: 'FundsChanged',
        sequence: expect.any(Number),
        payload: {
          delta: -1500,
          reason: 'Duplicate refund reversed by -1,500.00 C-bills.',
          balance: before - 1500,
        },
      },
    ]);
    expect(debit.hostLiveBalance).toBe(before - 1500);
    expect(debit.record.balance).toBe(before - 1500);
    expect(refused.hostFrames).toEqual([
      {
        kind: 'Error',
        code: 'INVALID_INTENT',
        reason: 'insufficient-funds',
        intentId: 'gm-intervention-gm-debit-2',
      },
    ]);
    expect(refused.guestFrames).toEqual([]);
    expect(refused.hostLiveBalance).toBe(before - 1500);
  }, 30000);

  it('(R2) the same intent from the guest is refused host-only and commits nothing; a guest proposal carrying it commits nothing', async () => {
    const id = 'u92-guest';
    const { entry, host, guest, before } = await liveSession(id);
    const typesBefore = eventTypes(id);

    const g0 = guest.sent.length;
    const h0 = host.sent.length;
    guest.inbound(gmIntervention(id, GUEST, 'guest-forged-1', 2500));
    await until(() => guest.sent.length > g0);
    const hostIntent = {
      guestFrames: framesFrom(guest, g0),
      hostFrames: framesFrom(host, h0),
      guestSocketOpen: guest.readyState === 1,
      hostLiveBalance: entry.host.getState().balance,
      types: eventTypes(id),
    };

    const g1 = guest.sent.length;
    const h1 = host.sent.length;
    guest.inbound({
      kind: 'CampaignProposal',
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId: GUEST,
      proposal: {
        proposalId: 'proposal-guest-forged-2',
        campaignId: id,
        proposingPlayerId: GUEST,
        ts: nowIso(),
        intent: (
          gmIntervention(id, GUEST, 'guest-forged-2', 2500) as {
            intent: unknown;
          }
        ).intent,
      },
    });
    await until(() => guest.sent.length > g1);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const proposal = {
      guestFrames: framesFrom(guest, g1),
      hostFrames: framesFrom(host, h1),
      hostLiveBalance: entry.host.getState().balance,
      types: eventTypes(id),
    };
    measurements.R2 = { before, typesBefore, hostIntent, proposal };

    expect(hostIntent.guestFrames).toEqual([
      {
        kind: 'Error',
        code: 'AUTH_REJECTED',
        reason: 'campaign-host-intent-requires-host',
        intentId: 'gm-intervention-guest-forged-1',
      },
    ]);
    expect(hostIntent.guestSocketOpen).toBe(true);
    expect(hostIntent.hostLiveBalance).toBe(before);
    expect(hostIntent.types).toEqual(typesBefore);
    expect(fundsFrames(host, h0)).toBe(0);

    expect(proposal.hostLiveBalance).toBe(before);
    expect(proposal.types).toEqual(typesBefore);
    expect(fundsFrames(guest, g1)).toBe(0);
    expect(fundsFrames(host, h1)).toBe(0);
  }, 30000);
});
