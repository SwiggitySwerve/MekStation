/**
 * The shared per-viewer campaign projection contract (umbrella 12.1).
 *
 * These rows pin the CONTRACT itself - the visibility set, the fold of
 * exactly that set, and the digests a surface uses to prove it agrees.
 * The surfaces that consume it keep their own shapes and their own
 * authority models; what they may not do is disagree about what a viewer
 * may see, and these are the rows that say so.
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import {
  campaignViewerFactsDigest,
  campaignViewerStateDigest,
  campaignViewerVisibleEvents,
  projectCampaignForViewer,
} from '@/lib/campaign/sync/campaignViewerProjection';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import { replayCampaignEvents } from '../applyCampaignEvent';

const CAMPAIGN_ID = 'campaign-viewer-projection';
const GM_ID = 'gm-player';
const P1_ID = 'player-one';

/** Admits every scope - the authority's view. */
const admitsAll = () => true;
/** Admits the shared ledger and this player's own facts, nothing else. */
const admitsPlayerOne = (scope: ICampaignEvent['scope']) =>
  scope === 'campaign' || scope === `player:${P1_ID}`;

/** A full-state baseline stamped `campaign`, as the host commits it. */
function snapshot(sequence: number, balance: number): ICampaignEvent {
  return {
    type: 'CampaignSnapshotPublished',
    sequence,
    campaignId: CAMPAIGN_ID,
    ts: '2026-01-01T00:00:00.000Z',
    authorPlayerId: GM_ID,
    scope: 'campaign',
    payload: {
      state: { ...createEmptyCampaignState(CAMPAIGN_ID), balance },
    },
  };
}

/** One scoped hire - the fact whose EFFECT must follow its scope. */
function hire(
  sequence: number,
  scope: ICampaignEvent['scope'],
  pilotId: string,
): ICampaignEvent {
  return {
    type: 'PilotHired',
    sequence,
    campaignId: CAMPAIGN_ID,
    ts: '2026-01-01T00:00:01.000Z',
    authorPlayerId: GM_ID,
    scope,
    payload: { pilot: { pilotId, name: 'Ghost' }, cost: 1 },
  };
}

describe('campaignViewerVisibleEvents - the visibility set', () => {
  it('omits a fact the viewer is not admitted to', () => {
    const events = [
      snapshot(0, 500_000),
      hire(1, 'gm', 'pilot-gm-only'),
      hire(2, 'campaign', 'pilot-shared'),
    ];
    const visible = campaignViewerVisibleEvents(events, admitsPlayerOne);
    expect(visible.map((event) => event.sequence)).toEqual([0, 2]);
  });

  it('keeps the genesis baseline, which precedes every withhold', () => {
    // Fail-closed must not mean "restricted viewers start from an empty
    // campaign": the seq-0 ledger is shared by construction.
    const events = [snapshot(0, 500_000), hire(1, 'gm', 'pilot-gm-only')];
    const visible = campaignViewerVisibleEvents(events, admitsPlayerOne);
    expect(visible).toHaveLength(1);
    expect(visible[0]?.type).toBe('CampaignSnapshotPublished');
  });

  it('drops a re-baseline minted after something was withheld', () => {
    // applyCampaignEvent REPLACES state on a snapshot, so a later
    // full-state frame carries the withheld hire's effect. Falsification:
    // delete the withheld latch and this row reds.
    const events = [
      snapshot(0, 500_000),
      hire(1, 'gm', 'pilot-gm-only'),
      snapshot(2, 400_000),
    ];
    const visible = campaignViewerVisibleEvents(events, admitsPlayerOne);
    expect(visible.map((event) => event.sequence)).toEqual([0]);
  });

  it('keeps a re-baseline minted while nothing had been withheld', () => {
    // The refinement over the grant projector's conservative form: a
    // snapshot whose content is a pure function of visible facts is safe.
    const events = [
      snapshot(0, 500_000),
      hire(1, 'campaign', 'pilot-shared'),
      snapshot(2, 400_000),
    ];
    const visible = campaignViewerVisibleEvents(events, admitsPlayerOne);
    expect(visible.map((event) => event.sequence)).toEqual([0, 1, 2]);
  });
});

describe('projectCampaignForViewer - the fold of exactly that set', () => {
  it('a viewer admitted to every scope reproduces the whole-log replay', () => {
    // The parity anchor. If the projected fold could drift from the ONE
    // reducer, the authority's own view would stop being the truth.
    const events = [
      snapshot(0, 500_000),
      hire(1, 'gm', 'pilot-gm-only'),
      hire(2, `player:${P1_ID}`, 'pilot-p1-only'),
    ];
    const projection = projectCampaignForViewer(CAMPAIGN_ID, events, admitsAll);
    expect(projection.state).toEqual(replayCampaignEvents(CAMPAIGN_ID, events));
  });

  it('a withheld effect is absent from the restricted fold', () => {
    const events = [
      snapshot(0, 500_000),
      hire(1, 'gm', 'pilot-gm-only'),
      hire(2, `player:${P1_ID}`, 'pilot-p1-only'),
    ];
    const projection = projectCampaignForViewer(
      CAMPAIGN_ID,
      events,
      admitsPlayerOne,
    );
    expect(Object.keys(projection.state.pilots)).toEqual(['pilot-p1-only']);
    // Absent because it never entered the fold, not because a second
    // filter redacted it afterwards.
    expect(projection.state.balance).toBe(500_000);
  });
});

describe('per-viewer projection digest', () => {
  const events = [
    snapshot(0, 500_000),
    hire(1, 'gm', 'pilot-gm-only'),
    hire(2, `player:${P1_ID}`, 'pilot-p1-only'),
  ];

  it('two viewers with different visibility get different digests', () => {
    const gm = projectCampaignForViewer(CAMPAIGN_ID, events, admitsAll);
    const p1 = projectCampaignForViewer(CAMPAIGN_ID, events, admitsPlayerOne);
    expect(gm.digest).not.toBe(p1.digest);
    expect(gm.factsDigest).not.toBe(p1.factsDigest);
    expect(gm.stateDigest).not.toBe(p1.stateDigest);
  });

  it('the same facts renumbered for another surface digest the same', () => {
    // THE cross-surface property. The legacy surface carries journal
    // sequences; the scoped surface deliberately withholds them and
    // numbers per grant. Were `sequence` in the digest material, no two
    // surfaces could ever agree - and the digest would itself carry the
    // journal positions the scoped snapshot policy withholds.
    const asJournal = [snapshot(0, 500_000), hire(7, 'campaign', 'pilot-x')];
    const asDelivery = [snapshot(0, 500_000), hire(1, 'campaign', 'pilot-x')];
    expect(campaignViewerFactsDigest(asJournal)).toBe(
      campaignViewerFactsDigest(asDelivery),
    );
  });

  it('a changed scope changes the facts digest', () => {
    // Falsification: strip `scope` from the digest material and this
    // reds - a digest blind to the visibility field proves nothing about
    // visibility.
    expect(
      campaignViewerFactsDigest([hire(1, 'campaign', 'pilot-x')]),
    ).not.toBe(campaignViewerFactsDigest([hire(1, 'gm', 'pilot-x')]));
  });

  it('a changed payload changes the facts digest', () => {
    expect(
      campaignViewerFactsDigest([hire(1, 'campaign', 'pilot-x')]),
    ).not.toBe(campaignViewerFactsDigest([hire(1, 'campaign', 'pilot-y')]));
  });

  it('two folds that differ by one withheld effect digest differently', () => {
    const shared = createEmptyCampaignState(CAMPAIGN_ID);
    expect(campaignViewerStateDigest(shared)).not.toBe(
      campaignViewerStateDigest({ ...shared, balance: 1 }),
    );
  });

  it('the same projection digests identically on repeat', () => {
    const first = projectCampaignForViewer(
      CAMPAIGN_ID,
      events,
      admitsPlayerOne,
    );
    const second = projectCampaignForViewer(
      CAMPAIGN_ID,
      events,
      admitsPlayerOne,
    );
    expect(first.digest).toBe(second.digest);
  });
});
