/**
 * The per-recipient campaign wire gate (U94) on its own: the ordering
 * and fail-closed branches the session rows cannot time deterministically.
 * A snapshot offered before the latch's seed arrives waits, with every
 * event after it, and a log that could not be read counts as withheld.
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import { createCampaignViewerWireGate } from '../campaignViewerWireGate';

const CAMPAIGN_ID = 'campaign-wire-gate';
const PLAYER = { participantId: 'player-one', isGm: false };
const GM = { participantId: 'gm-player', isGm: true };

function event(
  sequence: number,
  type: 'PilotHired' | 'FundsChanged' | 'CampaignSnapshotPublished',
  scope: ICampaignEvent['scope'],
): ICampaignEvent {
  const base = {
    sequence,
    campaignId: CAMPAIGN_ID,
    ts: '3025-01-01T00:00:00.000Z',
    authorPlayerId: type === 'CampaignSnapshotPublished' ? 'system' : 'gm',
    scope,
  };
  if (type === 'CampaignSnapshotPublished') {
    return {
      ...base,
      type,
      payload: { state: createEmptyCampaignState(CAMPAIGN_ID), revision: 0 },
    } as ICampaignEvent;
  }
  if (type === 'PilotHired') {
    return {
      ...base,
      type,
      payload: { pilot: { pilotId: 'p', name: 'P' }, cost: 1 },
    } as ICampaignEvent;
  }
  return {
    ...base,
    type,
    payload: { delta: 1, reason: 'r', balance: 1 },
  } as ICampaignEvent;
}

const genesis = event(0, 'CampaignSnapshotPublished', 'campaign');
const gmHire = event(1, 'PilotHired', 'gm');
const checkpoint = event(2, 'CampaignSnapshotPublished', 'campaign');
const funds = event(3, 'FundsChanged', 'campaign');

function gateFor(viewer: typeof PLAYER) {
  const sent: number[] = [];
  const settled: number[] = [];
  const gate = createCampaignViewerWireGate(
    viewer,
    (frame) => sent.push(frame.sequence),
    (frame) => settled.push(frame.sequence),
  );
  return { gate, sent, settled };
}

describe('campaign viewer wire gate', () => {
  it('holds a snapshot offered before the seed, and every event after it, then judges them in order', () => {
    const { gate, sent, settled } = gateFor(PLAYER);
    gate.offer(checkpoint);
    gate.offer(funds);
    expect(sent).toEqual([]);
    expect(settled).toEqual([]);

    gate.seed([genesis, gmHire, checkpoint, funds]);

    // The hire before the checkpoint latches: the checkpoint is withheld,
    // the in-scope event after it is sent, both are settled.
    expect(sent).toEqual([3]);
    expect(settled).toEqual([2, 3]);
  });

  it('does not hold an event that is not a snapshot', () => {
    const { gate, sent } = gateFor(PLAYER);
    gate.offer(funds);
    expect(sent).toEqual([3]);
  });

  it('seeds the latch from events before the snapshot only', () => {
    const { gate, sent } = gateFor(PLAYER);
    // This gm hire comes AFTER the snapshot, so it cannot latch it.
    const lateHire = event(3, 'PilotHired', 'gm');
    gate.seed([genesis, checkpoint, lateHire]);
    gate.offer(checkpoint);
    gate.offer(lateHire);
    expect(sent).toEqual([2]);
  });

  it('counts an unreadable log as withheld', () => {
    const { gate, sent, settled } = gateFor(PLAYER);
    gate.offer(checkpoint);
    gate.offer(funds);
    gate.seed(null);
    expect(sent).toEqual([3]);
    expect(settled).toEqual([2, 3]);
  });

  it('sends the GM every snapshot, withheld history or not', () => {
    const { gate, sent } = gateFor(GM);
    gate.seed(null);
    gate.offer(gmHire);
    gate.offer(checkpoint);
    expect(sent).toEqual([1, 2]);
  });
});
