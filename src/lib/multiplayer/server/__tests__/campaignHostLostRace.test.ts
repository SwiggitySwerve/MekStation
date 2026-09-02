/**
 * A lost race is a refusal a client can act on, not a dead socket
 * (umbrella 8.4 follow-on; findings #40 and #77).
 *
 * The host's write lock removed the races a host has with ITSELF. It
 * cannot remove a second writer - another host instance, or the HTTP
 * command route - and when that writer moves the head first, the batch
 * append fails. That failure used to throw
 * `CampaignEventSequenceCollisionError`, which escaped `applyHostIntent`
 * (whose catch handles only the identity conflict) and reached the socket
 * dispatch catch, closing the GM's connection with `dispatch-failed`.
 *
 * Nothing about that is fatal and none of it is the client's fault, so
 * these rows pin the refusal instead: the same shape the HTTP command
 * boundary already returns - current branch, the head AFTER the failed
 * append, and what to do next.
 *
 * ROW 4 IS ASSERTED ON THE FRAME, deliberately. The widened result arm
 * still carries `reason`, so the error frame COMPILES unchanged while
 * silently dropping the head and the recovery action - a green build
 * hiding a client that learns nothing. Only the bytes on the socket prove
 * otherwise.
 */

import { EventEmitter } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignEventStore } from '@/lib/campaign/sync/ICampaignEventStore';
import type {
  ICampaignEvent,
  ICampaignIntent,
} from '@/types/campaign/CampaignSync';
import type {
  IClientMessage,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { JournalCampaignEventStore } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { nowIso } from '@/types/multiplayer/Protocol';

import type { IMatchSocket } from '../ServerMatchSocketTypes';

import { bindCampaignSyncConnection } from '../bindCampaignSyncConnection';
import { CampaignGmArbiter } from '../CampaignGmArbiter';
import { CampaignHostRegistry } from '../CampaignHostRegistry';
import { CampaignMatchHost } from '../CampaignMatchHost';

const CAMPAIGN_ID = 'campaign-lost-race';
const HOST_ID = 'host-player-1';
const MATCH_ID = 'campaign-sync-match-1';

function spend(amount: number, intentId: string): ICampaignIntent {
  return {
    campaignId: CAMPAIGN_ID,
    intentId,
    kind: 'SpendFunds',
    payload: { amount, reason: 'repairs' },
  } as unknown as ICampaignIntent;
}

describe('a host that loses a race answers, it does not throw', () => {
  /**
   * A store where somebody else commits between this host's replay and
   * its append - the writer the lock cannot reach.
   */
  function interlopingStore(): ICampaignEventStore {
    const inner = new InMemoryCampaignEventStore();
    let raced = false;
    return {
      ...inner,
      appendEvent: (campaignId, event) => inner.appendEvent(campaignId, event),
      getEvents: (campaignId, fromSeq) => inner.getEvents(campaignId, fromSeq),
      highestSequence: (campaignId) => inner.highestSequence(campaignId),
      appendCommandBatch: async (campaignId, input) => {
        if (!raced && input.events[0].sequence > 0) {
          raced = true;
          await inner.appendEvent(campaignId, {
            ...input.events[0],
            type: 'CampaignDayAdvanced',
            payload: { newDay: 99 },
          } as ICampaignEvent);
        }
        return inner.appendCommandBatch!(campaignId, input);
      },
    } as ICampaignEventStore;
  }

  it('returns the typed conflict rather than throwing', async () => {
    const host = new CampaignMatchHost({
      campaignId: CAMPAIGN_ID,
      hostPlayerId: HOST_ID,
      eventStore: interlopingStore(),
      initialState: {
        ...createEmptyCampaignState(CAMPAIGN_ID),
        balance: 1_000_000,
      },
    });
    await host.open();

    const settled = await Promise.allSettled([
      host.applyHostIntent(spend(10, 'intent-raced')),
    ]);

    // The throw is what closed the GM's socket.
    expect(settled[0].status).toBe('fulfilled');
    if (settled[0].status !== 'fulfilled') return;
    const result = settled[0].value;
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result).toMatchObject({
      code: 'CAMPAIGN_STALE_HEAD',
      reason: 'lost-race',
      // The EXACT post-race head, not just "a number". The baseline sits
      // at sequence 0 and the interloper took 1, so the stream is at
      // revision 2 - while the pre-race read this command started from
      // was 1. Asserting a shape here would let the stale number pass.
      head: { branchId: 'root', revision: 2 },
      recoveryAction: 'resync-to-active-head',
      conflictingFields: [],
    });
  });
});

class MockWireSocket extends EventEmitter implements IMatchSocket {
  readonly sent: IServerMessage[] = [];
  readyState = 1;

  send(data: string): void {
    this.sent.push(JSON.parse(data) as IServerMessage);
  }

  close(): void {
    this.readyState = 3;
    this.emit('close');
  }

  inbound(message: IClientMessage | Record<string, unknown>): void {
    this.emit('message', JSON.stringify(message));
  }
}

async function flushAsyncHandlers(): Promise<void> {
  for (let i = 0; i < 200; i += 1) {
    await Promise.resolve();
  }
}

const quietLogger = { error: jest.fn(), log: jest.fn(), warn: jest.fn() };

describe('row 4 - the frame the socket actually sends', () => {
  it('carries the head and the recovery action, and closes nothing', async () => {
    const registry = new CampaignHostRegistry();
    await registry.register(MATCH_ID, {
      campaignId: CAMPAIGN_ID,
      hostPlayerId: HOST_ID,
      roomCode: 'ABC234',
      state: {
        ...createEmptyCampaignState(CAMPAIGN_ID),
        balance: 1_000_000,
      },
    });
    const entry = registry.get(MATCH_ID);
    expect(entry).not.toBeNull();

    // The host's own answer is proven above; what is under test here is
    // whether the frame carries it or quietly drops it.
    jest.spyOn(entry!.host, 'applyHostIntent').mockResolvedValue({
      ok: false,
      code: 'CAMPAIGN_STALE_HEAD',
      reason: 'lost-race',
      head: { branchId: 'root', revision: 7 },
      recoveryAction: 'resync-to-active-head',
      conflictingFields: [],
    } as never);

    const socket = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: MATCH_ID,
      verifiedPlayerId: HOST_ID,
      logger: quietLogger,
      replicaStore: null,
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId: HOST_ID,
      role: 'host',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();
    socket.sent.length = 0;

    socket.inbound({
      kind: 'CampaignHostIntent',
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId: HOST_ID,
      intent: spend(10, 'intent-frame'),
    });
    await flushAsyncHandlers();

    const errors = socket.sent.filter((message) => message.kind === 'Error');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      code: 'CAMPAIGN_STALE_HEAD',
      recoveryAction: 'resync-to-active-head',
      conflictHead: { branchId: 'root', revision: 7 },
    });
    // The failure that started all of this: a Close frame over something
    // neither fatal nor the client's fault.
    expect(socket.sent.filter((m) => m.kind === 'Close')).toHaveLength(0);
    expect(socket.readyState).toBe(1);
  });
});

describe('#77 - the outcome inbox is a writer door too', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-inbox-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'inbox.db') }).initialize();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true });
  });

  /**
   * A REAL inbox-capable store. `JournalCampaignEventStore` is the only
   * implementation of `appendCombatOutcomeBatch` that exists, so a fake
   * would be inventing the thing under test - and the in-memory store
   * deliberately lacks the capability, which is exactly why no existing
   * row ever reached this door.
   */
  let store: JournalCampaignEventStore;

  function journalHost(): CampaignMatchHost {
    store = new JournalCampaignEventStore(
      new SQLiteEventJournal(getSQLiteService().getDatabase(), () => nowIso()),
    );
    return new CampaignMatchHost({
      campaignId: CAMPAIGN_ID,
      hostPlayerId: HOST_ID,
      eventStore: store,
      initialState: {
        ...createEmptyCampaignState(CAMPAIGN_ID),
        balance: 1_000_000,
      },
    });
  }

  it('serializes two outcomes committed at once', async () => {
    const host = journalHost();
    expect(host.hasCombatOutcomeInbox()).toBe(true);
    await host.open();

    // Two DIFFERENT outcomes, so neither is deduped by the inbox - the
    // only thing keeping them apart is the writer lock.
    const settled = await Promise.allSettled([
      host.commitCombatOutcomeConsequences({
        campaignId: CAMPAIGN_ID,
        matchId: 'combat-a',
        fundsDelta: -1_000,
        fundsReason: 'battle a',
        salvageValue: 500,
        rosterChanges: [],
      }),
      host.commitCombatOutcomeConsequences({
        campaignId: CAMPAIGN_ID,
        matchId: 'combat-b',
        fundsDelta: -2_000,
        fundsReason: 'battle b',
        salvageValue: 750,
        rosterChanges: [],
      }),
    ]);

    expect(settled.filter((s) => s.status === 'rejected')).toEqual([]);
    const events = await store.getEvents(CAMPAIGN_ID, 0);
    expect(events.map((event: ICampaignEvent) => event.sequence)).toEqual(
      Array.from({ length: events.length }, (_unused, index) => index),
    );
  });
});

describe('the GM arbiter does not call a lost race a bad proposal', () => {
  it('routes a stale head to its own arm', async () => {
    const host = new CampaignMatchHost({
      campaignId: CAMPAIGN_ID,
      hostPlayerId: HOST_ID,
      eventStore: new InMemoryCampaignEventStore(),
      initialState: {
        ...createEmptyCampaignState(CAMPAIGN_ID),
        balance: 1_000_000,
      },
    });
    await host.open();
    // The proposal is mechanically fine; only the head moved.
    jest.spyOn(host, 'applyHostIntent').mockResolvedValue({
      ok: false,
      code: 'CAMPAIGN_STALE_HEAD',
      reason: 'lost-race',
      head: { branchId: 'root', revision: 4 },
      recoveryAction: 'resync-to-active-head',
      conflictingFields: [],
    } as never);

    const arbiter = new CampaignGmArbiter(host, 'auto-approve');
    const result = await arbiter.submitProposal({
      proposalId: 'prop-1',
      campaignId: CAMPAIGN_ID,
      proposingPlayerId: 'guest-player-1',
      ts: nowIso(),
      intent: spend(10, 'intent-proposed'),
    });

    // NOT mechanically-rejected: nothing about the proposal was wrong,
    // and telling the guest otherwise sends them to fix a good proposal.
    expect(result.status).toBe('stale-head');
    expect(result).toMatchObject({
      refusal: { recoveryAction: 'resync-to-active-head' },
    });
  });
});
