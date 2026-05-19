/**
 * Shared campaign state — end-to-end integration tests (CO1, task 7).
 *
 * These wire a real `CampaignMatchHost` + `CampaignSyncSession` to a
 * real guest `useCampaignMirrorStore` and assert host/guest convergence
 * across the four spec scenarios:
 *
 *   7.1 host opens, guest joins, host advances the day → mirror reflects
 *   7.2 guest SpendFunds within balance → host commits, both converge
 *   7.3 guest SpendFunds over balance → host rejects, both keep balance
 *   7.4 guest disconnect + reconnect → mirror resyncs with no gaps/dupes
 *
 * The guest mirror is advanced SOLELY by host-broadcast events — there
 * is no local mutation path — so convergence here is the real CO1
 * contract, not a stub.
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import { CampaignSyncSession } from '@/lib/multiplayer/server/CampaignSyncSession';
import { useCampaignMirrorStore } from '@/lib/p2p/campaignMirrorStore';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

const CAMPAIGN_ID = 'campaign-e2e';
const HOST_ID = 'host-player';
const HOST_PEER = 'host-peer';
const GUEST_PEER = 'guest-peer';

interface IHarness {
  host: CampaignMatchHost;
  session: CampaignSyncSession;
  /** Apply a delivered event to the guest mirror the way a client would. */
  deliverToGuest: (event: ICampaignEvent) => void;
}

/**
 * Build a host + session + a guest sink that feeds the real mirror
 * store. Mirrors what the WebSocket client wiring would do: a baseline
 * snapshot goes through `applySnapshot`, every other event through
 * `applyEvent`.
 */
function harness(balance: number): IHarness {
  const host = new CampaignMatchHost({
    campaignId: CAMPAIGN_ID,
    hostPlayerId: HOST_ID,
    eventStore: new InMemoryCampaignEventStore(),
    initialState: { ...createEmptyCampaignState(CAMPAIGN_ID), balance },
  });
  const session = new CampaignSyncSession(host);
  const deliverToGuest = (event: ICampaignEvent): void => {
    const store = useCampaignMirrorStore.getState();
    if (event.type === 'CampaignSnapshotPublished' && event.sequence < 0) {
      // A framing baseline (sequence -1) seeds the mirror.
      store.applySnapshot(event);
    } else {
      store.applyEvent(event);
    }
  };
  return { host, session, deliverToGuest };
}

beforeEach(() => {
  useCampaignMirrorStore.getState().reset();
  useCampaignMirrorStore
    .getState()
    .beginMirror(
      { hostPeerId: HOST_PEER, guestPeerId: GUEST_PEER },
      GUEST_PEER,
    );
});

describe('7.1 — host opens, guest joins, host advances the day', () => {
  it('the guest mirror reflects the host day counter', async () => {
    const { host, session, deliverToGuest } = harness(600_000);
    const code = await session.open();

    // Guest joins — every delivered event flows into the mirror.
    const joinResult = await session.joinGuest(code, deliverToGuest);
    expect(joinResult.ok).toBe(true);

    // Host advances the day.
    await host.applyHostIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'host-advance',
      payload: {},
    });

    // The guest mirror converged with the host's day counter.
    expect(useCampaignMirrorStore.getState().campaign?.day).toBe(
      host.getState().day,
    );
    expect(useCampaignMirrorStore.getState().campaign?.day).toBe(1);
    joinResult.disconnect();
  });
});

describe('7.2 — guest SpendFunds within balance', () => {
  it('the host commits FundsChanged and both converge to the new balance', async () => {
    const { host, session, deliverToGuest } = harness(600_000);
    const code = await session.open();
    const joinResult = await session.joinGuest(code, deliverToGuest);
    expect(joinResult.ok).toBe(true);

    // The guest sends a SpendFunds intent within balance.
    const result = await host.handleIntent({
      kind: 'SpendFunds',
      campaignId: CAMPAIGN_ID,
      intentId: 'guest-spend',
      payload: { amount: 150_000, reason: 'Ammo restock' },
    });
    expect(result.ok).toBe(true);

    // Host and guest mirror agree on the new balance.
    expect(host.getState().balance).toBe(450_000);
    expect(useCampaignMirrorStore.getState().campaign?.balance).toBe(450_000);
    joinResult.disconnect();
  });
});

describe('7.3 — guest SpendFunds over balance', () => {
  it('the host rejects, no event commits, both keep the prior balance', async () => {
    const { host, session, deliverToGuest } = harness(600_000);
    const code = await session.open();
    const joinResult = await session.joinGuest(code, deliverToGuest);
    expect(joinResult.ok).toBe(true);
    const balanceBefore = host.getState().balance;

    const result = await host.handleIntent({
      kind: 'SpendFunds',
      campaignId: CAMPAIGN_ID,
      intentId: 'guest-overspend',
      payload: { amount: 700_000, reason: 'Too much' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('insufficient-funds');
    }
    // No event committed — host AND guest keep the prior balance.
    expect(host.getState().balance).toBe(balanceBefore);
    expect(useCampaignMirrorStore.getState().campaign?.balance).toBe(
      balanceBefore,
    );
    joinResult.disconnect();
  });
});

describe('7.4 — guest disconnect and reconnect', () => {
  it('the mirror resyncs from the event log with no missing or duplicated events', async () => {
    const { host, session, deliverToGuest } = harness(600_000);
    const code = await session.open();
    const joinResult = await session.joinGuest(code, deliverToGuest);
    expect(joinResult.ok).toBe(true);

    // Two events arrive live, then the guest disconnects.
    await host.handleIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'pre-1',
      payload: {},
    });
    await host.handleIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'pre-2',
      payload: {},
    });
    const seqBeforeDisconnect = useCampaignMirrorStore.getState().lastSequence;
    joinResult.disconnect();

    // While the guest is offline the host commits two more events.
    await host.handleIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'offline-1',
      payload: {},
    });
    await host.handleIntent({
      kind: 'SpendFunds',
      campaignId: CAMPAIGN_ID,
      intentId: 'offline-2',
      payload: { amount: 50_000, reason: 'Offline spend' },
    });

    // The guest reconnects and resyncs from its last sequence.
    const seenSequences: number[] = [];
    const resync = await session.resyncGuest(seqBeforeDisconnect, (event) => {
      seenSequences.push(event.sequence);
      deliverToGuest(event);
    });
    expect(resync.ok).toBe(true);
    expect(resync.snapshotted).toBe(false);

    // No duplicates in the resync stream.
    expect(new Set(seenSequences).size).toBe(seenSequences.length);
    // No event at or below the last-seen sequence (no overlap).
    for (const seq of seenSequences) {
      expect(seq).toBeGreaterThan(seqBeforeDisconnect);
    }

    // The mirror converged exactly with the host's authoritative state.
    expect(useCampaignMirrorStore.getState().campaign).toEqual(host.getState());
    resync.disconnect();
  });

  it('a guest mirror equals the host state byte-for-byte after a full session', async () => {
    const { host, session, deliverToGuest } = harness(2_000_000);
    const code = await session.open();
    const joinResult = await session.joinGuest(code, deliverToGuest);
    expect(joinResult.ok).toBe(true);

    // A representative mix of every committing intent kind.
    await host.handleIntent({
      kind: 'HirePilot',
      campaignId: CAMPAIGN_ID,
      intentId: 'mix-hire',
      payload: {
        pilot: { pilotId: 'p1', name: 'Natasha Kerensky' },
        cost: 100_000,
      },
    });
    await host.handleIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'mix-day',
      payload: { days: 3 },
    });
    await host.handleIntent({
      kind: 'SpendFunds',
      campaignId: CAMPAIGN_ID,
      intentId: 'mix-spend',
      payload: { amount: 250_000, reason: 'Refit' },
    });

    expect(useCampaignMirrorStore.getState().campaign).toEqual(host.getState());
    joinResult.disconnect();
  });
});
