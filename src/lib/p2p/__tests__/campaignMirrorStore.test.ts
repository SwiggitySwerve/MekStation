/**
 * Tests for the guest campaign mirror store (CO1, task 4.5).
 *
 * Covers: a host-broadcast event advances the mirror; a guest-side
 * local campaign mutation is rejected by the append guard; a solo
 * campaign is never treated as a mirror.
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import {
  assertCampaignMirrorWritable,
  CampaignMirrorForbiddenError,
  describeCampaignMirrorRejection,
  isCampaignMirror,
  useCampaignMirrorStore,
} from '@/lib/p2p/campaignMirrorStore';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

const CAMPAIGN_ID = 'campaign-mirror';
const HOST_PEER = 'host-peer';
const GUEST_PEER = 'guest-peer';

function snapshotEvent(sequence: number, balance: number): ICampaignEvent {
  return {
    type: 'CampaignSnapshotPublished',
    sequence,
    campaignId: CAMPAIGN_ID,
    ts: '3025-01-01T00:00:00.000Z',
    authorPlayerId: 'host',
    payload: {
      state: { ...createEmptyCampaignState(CAMPAIGN_ID), balance },
    },
  };
}

function dayEvent(sequence: number, newDay: number): ICampaignEvent {
  return {
    type: 'CampaignDayAdvanced',
    sequence,
    campaignId: CAMPAIGN_ID,
    ts: '3025-01-01T00:00:00.000Z',
    authorPlayerId: 'host',
    payload: { newDay },
  };
}

beforeEach(() => {
  useCampaignMirrorStore.getState().reset();
});

describe('isCampaignMirror', () => {
  it('is true when the local peer is the guest and a host exists', () => {
    expect(
      isCampaignMirror(
        { hostPeerId: HOST_PEER, guestPeerId: GUEST_PEER },
        GUEST_PEER,
      ),
    ).toBe(true);
  });

  it('is false for the host peer', () => {
    expect(
      isCampaignMirror(
        { hostPeerId: HOST_PEER, guestPeerId: GUEST_PEER },
        HOST_PEER,
      ),
    ).toBe(false);
  });

  it('is false for a solo campaign (no peers recorded)', () => {
    expect(isCampaignMirror(null, GUEST_PEER)).toBe(false);
    expect(isCampaignMirror(undefined, null)).toBe(false);
  });
});

describe('campaign mirror append guard', () => {
  it('rejects a local mutation on a guest mirror', () => {
    const input = {
      campaign: createEmptyCampaignState(CAMPAIGN_ID),
      peers: { hostPeerId: HOST_PEER, guestPeerId: GUEST_PEER },
      localPeerId: GUEST_PEER,
    };
    expect(describeCampaignMirrorRejection(input)).toBe('mirror-readonly');
    expect(() => assertCampaignMirrorWritable(input)).toThrow(
      CampaignMirrorForbiddenError,
    );
    try {
      assertCampaignMirrorWritable(input);
    } catch (error) {
      expect(error).toBeInstanceOf(CampaignMirrorForbiddenError);
      expect((error as CampaignMirrorForbiddenError).reason).toBe(
        'mirror-readonly',
      );
    }
  });

  it('allows a local mutation on a solo campaign (not a mirror)', () => {
    const input = {
      campaign: createEmptyCampaignState(CAMPAIGN_ID),
      peers: null,
      localPeerId: 'solo-player',
    };
    expect(describeCampaignMirrorRejection(input)).toBeNull();
    expect(() => assertCampaignMirrorWritable(input)).not.toThrow();
  });

  it('reports no-campaign when there is no campaign loaded', () => {
    expect(
      describeCampaignMirrorRejection({
        campaign: null,
        peers: { hostPeerId: HOST_PEER, guestPeerId: GUEST_PEER },
        localPeerId: GUEST_PEER,
      }),
    ).toBe('no-campaign');
  });
});

describe('useCampaignMirrorStore — host broadcast advances the mirror', () => {
  it('applySnapshot seeds the mirror from a baseline', () => {
    const store = useCampaignMirrorStore.getState();
    store.beginMirror(
      { hostPeerId: HOST_PEER, guestPeerId: GUEST_PEER },
      GUEST_PEER,
    );
    store.applySnapshot(snapshotEvent(-1, 800_000));
    expect(useCampaignMirrorStore.getState().campaign?.balance).toBe(800_000);
  });

  it('a host-broadcast CampaignDayAdvanced event advances the mirror', () => {
    const store = useCampaignMirrorStore.getState();
    store.beginMirror(
      { hostPeerId: HOST_PEER, guestPeerId: GUEST_PEER },
      GUEST_PEER,
    );
    store.applySnapshot(snapshotEvent(-1, 0));
    store.applyEvent(dayEvent(0, 1));
    store.applyEvent(dayEvent(1, 2));
    expect(useCampaignMirrorStore.getState().campaign?.day).toBe(2);
    expect(useCampaignMirrorStore.getState().lastSequence).toBe(1);
  });

  it('ignores an out-of-order / duplicate event', () => {
    const store = useCampaignMirrorStore.getState();
    store.beginMirror(
      { hostPeerId: HOST_PEER, guestPeerId: GUEST_PEER },
      GUEST_PEER,
    );
    store.applySnapshot(snapshotEvent(-1, 0));
    store.applyEvent(dayEvent(0, 1));
    // Re-applying sequence 0 (a reconnect-race duplicate) is dropped.
    store.applyEvent(dayEvent(0, 99));
    expect(useCampaignMirrorStore.getState().campaign?.day).toBe(1);
  });

  it('applyEvents converges from an interleaved batch', () => {
    const store = useCampaignMirrorStore.getState();
    store.beginMirror(
      { hostPeerId: HOST_PEER, guestPeerId: GUEST_PEER },
      GUEST_PEER,
    );
    store.applySnapshot(snapshotEvent(-1, 0));
    // Deliberately out of order — applyEvents sorts ascending.
    store.applyEvents([dayEvent(2, 3), dayEvent(0, 1), dayEvent(1, 2)]);
    expect(useCampaignMirrorStore.getState().campaign?.day).toBe(3);
  });

  it('pause freezes the session (host disconnect)', () => {
    const store = useCampaignMirrorStore.getState();
    store.beginMirror(
      { hostPeerId: HOST_PEER, guestPeerId: GUEST_PEER },
      GUEST_PEER,
    );
    store.applySnapshot(snapshotEvent(-1, 0));
    store.pause();
    expect(useCampaignMirrorStore.getState().paused).toBe(true);
  });
});
