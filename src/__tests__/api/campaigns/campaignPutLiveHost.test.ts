/**
 * A whole-campaign PUT while a live co-op host holds the campaign (roadmap
 * unit U96, finding FN-u92-coop-checkpoint-erased-by-next-host-command).
 *
 * Real SQLite on a temp file, the live item route through node-mocks-http,
 * and a co-op host registered in the shared campaign host registry the way
 * the match create route registers it, with a guest attached through the
 * session's live delivery.
 *
 * - (R1) the host's own save (its co-op session names the live match in the
 *   host role) is checkpointed AND adopted by the live host, so SpendFunds
 *   1000 builds on it: the journal, the record and the guest's frames read
 *   381500, and the guest received the checkpoint as a CampaignSnapshot.
 * - (R3) a PUT from any other instance (a guest mirror's envelope) while the
 *   host is live is refused 409 in the conflict shape, reason
 *   live-coop-session, naming the session's matchId; nothing is written.
 * - (day) AdvanceDay committed first, then the host's save of that day:
 *   the adoption keeps the host, the journal and the record one day on.
 * - (pin none / pin closed) with no live host (none registered, or a closed
 *   one plus a live host of another campaign) the PUT answers as before: 200
 *   with the stored record, one checkpoint.
 *
 * Every row records what it read before asserting (U35E_ROWS_DIR).
 */

import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';
import type { ICoopSession } from '@/types/campaign/CoopSession';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { authoritativeStateFromSerializedCampaign } from '@/lib/campaign/authority/campaignSourceGenesis';
import { _resetActiveCoopHosts } from '@/lib/campaign/coop/coopHostRegistry';
import { campaignEventWireFrame } from '@/lib/multiplayer/server/campaignEventWireFrame';
import {
  _resetCampaignHostRegistry,
  getCampaignHostRegistry,
  type ICampaignHostRegistryEntry,
} from '@/lib/multiplayer/server/CampaignHostRegistry';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import {
  callId,
  createJournalNative,
  eventTypes,
  flushMeasurements,
  intentOf,
  ledgerOf,
  replayed,
  storedRow,
  useTempCampaignDatabase,
} from './campaignJournalEffectsFixture';

const measurements: Record<string, unknown> = {};

/** Registers a co-op host for `campaignId` in the shared registry. */
function registerHost(
  matchId: string,
  campaignId: string,
  state: ICampaignAuthoritativeState,
): Promise<ICampaignHostRegistryEntry> {
  return getCampaignHostRegistry().register(matchId, {
    campaignId,
    hostPlayerId: 'host',
    roomCode: 'ABC234',
    state,
  });
}

/**
 * Attaches a guest through the session's live delivery and returns the
 * wire frames it is sent (kind, event type, sequence, balance).
 */
function attachGuest(entry: ICampaignHostRegistryEntry): {
  kind: string;
  type: string;
  sequence: number;
  balance: number | null;
}[] {
  const frames: {
    kind: string;
    type: string;
    sequence: number;
    balance: number | null;
  }[] = [];
  entry.syncSession.attachLiveParticipant((event: ICampaignEvent) => {
    const frame = campaignEventWireFrame(entry.matchId, event);
    frames.push({
      kind: frame.kind,
      type: event.type,
      sequence: event.sequence,
      balance:
        event.type === 'CampaignSnapshotPublished'
          ? event.payload.state.balance
          : event.type === 'FundsChanged'
            ? event.payload.balance
            : null,
    });
  }, 'guest-u96');
  return frames;
}

/** `record` with balance `balance` and co-op session `coopSession`, PUT at its own version. */
function putBalance(
  record: SerializedCampaign,
  balance: number,
  coopSession?: ICoopSession,
): ReturnType<typeof callId> {
  return callId('PUT', record.campaignId, {
    envelope: {
      ...record,
      version: record.version + 1,
      body: {
        ...record.body,
        finances: { ...record.body.finances, balance },
        ...(coopSession === undefined ? {} : { coopSession }),
      },
    },
    baseVersion: record.version,
  });
}

describe('U96 whole-campaign PUT while a live co-op host holds the campaign', () => {
  useTempCampaignDatabase('u96-put-live-');

  afterEach(() => {
    _resetCampaignHostRegistry();
    _resetActiveCoopHosts();
  });

  afterAll(async () => {
    await flushMeasurements('u96-put-live-host', measurements);
  });

  it("(R1) the host's own save is adopted: after SpendFunds 1000 the journal, the record and the guest read 381500", async () => {
    const id = 'u96-live';
    const { record } = await createJournalNative(id);
    const entry = await registerHost(
      'match-u96-live',
      id,
      authoritativeStateFromSerializedCampaign(record),
    );
    const guestFrames = attachGuest(entry);
    const typesBefore = eventTypes(id);

    const put = await putBalance(record, 382_500, {
      mode: 'host',
      roomCode: 'ABC234',
      matchId: 'match-u96-live',
    });
    const afterPut = {
      putStatus: put.status,
      typesAfterPut: eventTypes(id),
      guestFramesAfterPut: [...guestFrames],
      hostLiveBalance: entry.host.getState().balance,
      journalReplayBalance: (await replayed(id)).balance,
      storedRow: storedRow(id),
    };

    const spend = await entry.host.applyHostIntent(
      intentOf(id, 'intent-u96-next', 'SpendFunds', {
        amount: 1000,
        reason: 'next',
      }),
    );
    const afterNext = {
      spendOk: spend.ok,
      typesAfterNext: eventTypes(id),
      guestFrames: [...guestFrames],
      hostLiveBalance: entry.host.getState().balance,
      journal: ledgerOf(await replayed(id)),
      storedRow: storedRow(id),
    };
    measurements.R1 = { typesBefore, afterPut, afterNext };

    expect(afterPut.putStatus).toBe(200);
    expect(afterPut.typesAfterPut).toEqual([
      ...typesBefore,
      'CampaignSnapshotPublished',
    ]);
    expect(afterPut.hostLiveBalance).toBe(382_500);
    expect(afterPut.guestFramesAfterPut).toEqual([
      {
        kind: 'CampaignSnapshot',
        type: 'CampaignSnapshotPublished',
        sequence: typesBefore.length,
        balance: 382_500,
      },
    ]);
    expect(afterNext.spendOk).toBe(true);
    expect(afterNext.hostLiveBalance).toBe(381_500);
    expect(afterNext.journal.balance).toBe(381_500);
    expect(afterNext.storedRow.balance).toBe(381_500);
    expect(afterNext.guestFrames.at(-1)).toEqual({
      kind: 'CampaignEvent',
      type: 'FundsChanged',
      sequence: typesBefore.length + 1,
      balance: 381_500,
    });
  });

  it("(R3) a guest mirror's PUT while the host is live is refused 409 naming the session; nothing is written", async () => {
    const id = 'u96-foreign';
    const { record } = await createJournalNative(id);
    const entry = await registerHost(
      'match-u96-foreign',
      id,
      authoritativeStateFromSerializedCampaign(record),
    );
    const guestFrames = attachGuest(entry);
    const rowBefore = storedRow(id);
    const typesBefore = eventTypes(id);
    const hostBefore = entry.host.getState();

    const put = await putBalance(record, 382_500, {
      mode: 'guest',
      roomCode: 'ABC234',
      hostMatchId: 'match-u96-foreign',
    });
    const current = put.json.current as SerializedCampaign | undefined;
    measurements.R3 = {
      putStatus: put.status,
      kind: put.json.kind ?? null,
      reason: put.json.reason ?? null,
      matchId: put.json.matchId ?? null,
      currentVersion: put.json.currentVersion ?? null,
      currentBalance: current?.body.finances.balance ?? null,
      rowBefore,
      rowAfter: storedRow(id),
      typesBefore,
      typesAfter: eventTypes(id),
      hostBalanceAfter: entry.host.getState().balance,
      guestFrames: [...guestFrames],
    };

    expect(put.status).toBe(409);
    expect(put.json.kind).toBe('conflict');
    expect(put.json.reason).toBe('live-coop-session');
    expect(put.json.matchId).toBe('match-u96-foreign');
    expect(put.json.currentVersion).toBe(rowBefore.version);
    expect(current?.body.finances.balance).toBe(rowBefore.balance);
    expect(storedRow(id)).toEqual(rowBefore);
    expect(eventTypes(id)).toEqual(typesBefore);
    expect(entry.host.getState()).toBe(hostBefore);
    expect(guestFrames).toEqual([]);
  });

  it("(day) AdvanceDay first, then the host's save of that day: the host, the journal and the record stay one day on", async () => {
    const id = 'u96-day';
    const { record } = await createJournalNative(id);
    const entry = await registerHost(
      'match-u96-day',
      id,
      authoritativeStateFromSerializedCampaign(record),
    );
    const dayBefore = entry.host.getState().day;

    const advance = await entry.host.applyHostIntent(
      intentOf(id, 'intent-u96-day', 'AdvanceDay', { days: 1 }),
    );
    const rewritten = (await callId('GET', id))
      .json as unknown as SerializedCampaign;
    const put = await putBalance(rewritten, 378_500, {
      mode: 'host',
      roomCode: 'ABC234',
      matchId: 'match-u96-day',
    });
    measurements.day = {
      dayBefore,
      advanceOk: advance.ok,
      rewrittenVersion: rewritten.version,
      rewrittenDate: rewritten.body.currentDate,
      putStatus: put.status,
      hostDay: entry.host.getState().day,
      hostBalance: entry.host.getState().balance,
      journal: ledgerOf(await replayed(id)),
      storedRow: storedRow(id),
    };

    expect(advance.ok).toBe(true);
    expect(put.status).toBe(200);
    expect(entry.host.getState().day).toBe(dayBefore + 1);
    expect(entry.host.getState().balance).toBe(378_500);
    expect((await replayed(id)).day).toBe(dayBefore + 1);
    expect(storedRow(id).currentDate).toBe(rewritten.body.currentDate);
  });

  it('(pin none) with no host entry the PUT saves as before: 200 with the stored record and one checkpoint', async () => {
    const id = 'u96-none';
    const { record } = await createJournalNative(id);
    const typesBefore = eventTypes(id);

    const put = await putBalance(record, 382_500);
    const stored = await callId('GET', id);
    measurements.none = {
      putStatus: put.status,
      putBodyEqualsGetBody:
        JSON.stringify(put.json) === JSON.stringify(stored.json),
      types: eventTypes(id),
    };

    expect(put.status).toBe(200);
    expect(JSON.stringify(put.json)).toBe(JSON.stringify(stored.json));
    expect(storedRow(id)).toEqual({
      version: record.version + 1,
      balance: 382_500,
      currentDate: record.body.currentDate,
    });
    expect(eventTypes(id)).toEqual([
      ...typesBefore,
      'CampaignSnapshotPublished',
    ]);
    expect((await replayed(id)).balance).toBe(382_500);
  });

  it('(pin closed) a closed host is not live and another campaign host does not hold this one: the PUT saves as before', async () => {
    const id = 'u96-closed';
    const { record } = await createJournalNative(id);
    const closed = await registerHost(
      'match-u96-closed',
      id,
      authoritativeStateFromSerializedCampaign(record),
    );
    closed.host.close();
    await registerHost(
      'match-u96-other',
      'u96-other',
      createEmptyCampaignState('u96-other'),
    );
    const typesBefore = eventTypes(id);

    const put = await putBalance(record, 382_500);
    const stored = await callId('GET', id);
    measurements.closed = {
      hostClosed: closed.host.isClosed(),
      putStatus: put.status,
      putBodyEqualsGetBody:
        JSON.stringify(put.json) === JSON.stringify(stored.json),
      types: eventTypes(id),
      storedRow: storedRow(id),
    };

    expect(put.status).toBe(200);
    expect(JSON.stringify(put.json)).toBe(JSON.stringify(stored.json));
    expect(storedRow(id).balance).toBe(382_500);
    expect(eventTypes(id)).toEqual([
      ...typesBefore,
      'CampaignSnapshotPublished',
    ]);
  });
});
