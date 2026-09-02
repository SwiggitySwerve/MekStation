/**
 * One campaign host is a single writer, enforced rather than assumed
 * (umbrella task 8.4 follow-on; finding #40).
 *
 * `commitEventsAsBatch` claims the next sequence across an `await`, so
 * two doors in flight resolve the SAME base. The first append wins and
 * the second throws `CampaignEventSequenceCollisionError`, which escapes
 * `applyHostIntent` (its catch handles only the identity conflict) and
 * reaches the socket dispatch catch, closing the GM's connection with
 * `dispatch-failed`. Reproduced at 50 unwaited intents.
 *
 * The sequence collision is the visible half. The invisible half is that
 * validation reads `this.state` BEFORE that await, so two racing intents
 * are validated against the same pre-state and two spends can both be
 * approved against one balance. A lock around the commit alone fixes the
 * numbering and leaves the ledger race intact - which is why the
 * critical section has to span validate -> commit, and why the row below
 * that pins it is the one worth keeping.
 *
 * IN-PROCESS ONLY, stated plainly: the serializer is per host object. A
 * second host instance, or the HTTP command route, is still a separate
 * writer, and its race still ends in the collision throw. Answering
 * THAT with a typed refusal is a separate seam; this one removes the
 * races a host has with itself, which is the reproduced defect.
 */

import type { ICampaignEventStore } from '@/lib/campaign/sync/ICampaignEventStore';
import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
  ICampaignIntent,
} from '@/types/campaign/CampaignSync';

import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import { CampaignMatchHost } from '../CampaignMatchHost';

const CAMPAIGN_ID = 'campaign-serial';
const HOST_ID = 'host-player-1';

function stateWith(balance: number): ICampaignAuthoritativeState {
  return { ...createEmptyCampaignState(CAMPAIGN_ID), balance, salvagePool: 0 };
}

function makeHost(
  balance = 1_000_000,
  store: ICampaignEventStore = new InMemoryCampaignEventStore(),
): { host: CampaignMatchHost; store: ICampaignEventStore } {
  const host = new CampaignMatchHost({
    campaignId: CAMPAIGN_ID,
    hostPlayerId: HOST_ID,
    eventStore: store,
    initialState: stateWith(balance),
  });
  return { host, store };
}

function spend(amount: number, intentId: string): ICampaignIntent {
  return {
    campaignId: CAMPAIGN_ID,
    intentId,
    kind: 'SpendFunds',
    payload: { amount, reason: 'repairs' },
  } as unknown as ICampaignIntent;
}

/** Sequences of everything committed, in store order. */
async function sequences(store: ICampaignEventStore): Promise<number[]> {
  const events = await store.getEvents(CAMPAIGN_ID, 0);
  return events.map((event: ICampaignEvent) => event.sequence);
}

describe('CampaignMatchHost single-writer serialization', () => {
  it('commits fifty unwaited intents on one connection without throwing', async () => {
    const { host, store } = makeHost();
    await host.open();

    // Deliberately UNWAITED - this is the shape a socket produces when a
    // client sends a burst, and the shape that reproduced the defect.
    // One of them overdraws on purpose: the lock chain has to survive a
    // refused door, or the first failure wedges every door behind it.
    const inFlight = Array.from({ length: 50 }, (_unused, index) =>
      host.applyHostIntent(
        index === 7
          ? spend(9_999_999_999, `intent-${index}`)
          : spend(1, `intent-${index}`),
      ),
    );

    // `allSettled`, not `all`: a throw is precisely the failure under
    // test, so it must be observed rather than propagated.
    const settled = await Promise.allSettled(inFlight);
    const thrown = settled.filter((entry) => entry.status === 'rejected');
    expect(thrown).toEqual([]);

    // Every one either committed or was refused in a typed way - never a
    // raw error escaping toward the dispatch catch.
    for (const entry of settled) {
      if (entry.status !== 'fulfilled') continue;
      expect(typeof entry.value.ok).toBe('boolean');
    }

    // The log is gapless: 0..50 (baseline snapshot plus 50 spends).
    const committed = await sequences(store);
    expect(committed).toEqual(
      Array.from({ length: committed.length }, (_u, index) => index),
    );
    // 49 spends commit; the overdraw is refused and appends nothing.
    expect(committed).toHaveLength(50);
    const refused = settled.filter(
      (entry) => entry.status === 'fulfilled' && !entry.value.ok,
    );
    expect(refused).toHaveLength(1);
  });

  it('refuses to commit without the single-writer lock held', () => {
    // White-box on purpose. The assert is a tripwire for a door added
    // later that forgets to acquire, so the only way to prove it fires is
    // to reach the commit the way such a door would.
    const { host } = makeHost();
    const unlocked = host as unknown as {
      commitEvents: (events: readonly unknown[]) => Promise<unknown>;
    };

    return expect(unlocked.commitEvents([])).rejects.toThrow(
      /single-writer lock/i,
    );
  });

  it('cannot approve two spends against one balance', async () => {
    // 100 in the bank, two claims of 60. Both were approved before,
    // because both validated against the same pre-state.
    const { host } = makeHost(100);
    await host.open();

    const [first, second] = await Promise.all([
      host.applyHostIntent(spend(60, 'intent-a')),
      host.applyHostIntent(spend(60, 'intent-b')),
    ]);

    const approved = [first, second].filter((result) => result.ok);
    expect(approved).toHaveLength(1);
    const refused = [first, second].find((result) => !result.ok);
    expect(refused?.ok).toBe(false);
  });

  it('serializes the arbiter and reconcile doors with the intent door', async () => {
    // The three doors reconciliation and the GM arbiter actually reach:
    // an intent, a salvage credit, and a roster change, all in flight at
    // once. A lock on only `applyHostIntent` leaves the other two racing.
    const { host, store } = makeHost();
    await host.open();

    await Promise.all([
      host.applyHostIntent(spend(10, 'intent-door')),
      host.creditSalvagePool(500, 'battle salvage'),
      host.applyRosterUnitChange(
        CAMPAIGN_ID,
        'added',
        {
          unitId: 'unit-a',
          designation: 'Atlas AS7-D',
          status: 'operational',
        },
        'roster-door',
      ),
    ]);

    const committed = await sequences(store);
    expect(committed).toEqual([0, 1, 2, 3]);
  });

  it('keeps serving doors after one of them throws', async () => {
    // The chain is the queue AND the failure path. If a rejected door is
    // left on it, every later door waits behind a promise that will never
    // settle successfully - one bad commit would wedge the whole host.
    const store = new InMemoryCampaignEventStore();
    let poisoned = true;
    const brittle = {
      ...store,
      appendEvent: (campaignId: string, event: ICampaignEvent) =>
        store.appendEvent(campaignId, event),
      getEvents: (campaignId: string, fromSeq?: number) =>
        store.getEvents(campaignId, fromSeq),
      highestSequence: (campaignId: string) =>
        store.highestSequence(campaignId),
      appendCommandBatch: async (
        campaignId: string,
        input: Parameters<
          NonNullable<ICampaignEventStore['appendCommandBatch']>
        >[1],
      ) => {
        if (poisoned) {
          poisoned = false;
          throw new Error('store unavailable');
        }
        return store.appendCommandBatch!(campaignId, input);
      },
    } as ICampaignEventStore;

    const { host } = makeHost(1_000_000, brittle);

    await expect(host.open()).rejects.toThrow(/store unavailable/);

    // The very next door must still be served.
    const after = await host.applyHostIntent(spend(5, 'intent-after-throw'));
    expect(after.ok).toBe(true);
  });

  it('opens exactly once when two opens race', async () => {
    // `open` reads `nextSequence()` and only then decides to append, so
    // the read-then-act is a race with itself as much as with anyone.
    const { host, store } = makeHost();

    await Promise.all([host.open(), host.open()]);

    const events = await store.getEvents(CAMPAIGN_ID, 0);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('CampaignSnapshotPublished');
  });
});
