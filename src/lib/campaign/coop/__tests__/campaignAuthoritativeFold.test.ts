/**
 * The fold owner's hydration bundle and mission-launch adjunct (P2CF1,
 * plan Task 13): a bundle is validated synchronously before adoption, an
 * authorized replacement starts from EMPTY, and launch facts ride with
 * the fold without being refolded. Folds that never received a bundle
 * keep their legacy shape.
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import {
  EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD,
  foldCampaignEvent,
  foldCampaignFrame,
  foldCampaignHydration,
  foldCampaignSnapshot,
  type ICampaignAuthoritativeFold,
} from '../campaignAuthoritativeFold';

const CAMPAIGN_ID = 'c1';
const ts = '2026-10-16T00:00:00.000Z';

function baseline(balance: number, sequence = -1): ICampaignEvent {
  return {
    type: 'CampaignSnapshotPublished',
    sequence,
    campaignId: CAMPAIGN_ID,
    ts,
    authorPlayerId: 'host',
    scope: 'campaign',
    payload: {
      matchId: 'm1',
      state: { ...createEmptyCampaignState(CAMPAIGN_ID), balance },
    },
  };
}

function launch(sequence: number): ICampaignEvent {
  return {
    type: 'CampaignMissionLaunched',
    sequence,
    campaignId: CAMPAIGN_ID,
    ts,
    authorPlayerId: 'host',
    scope: 'campaign',
    payload: {
      missionId: `mission-${sequence}`,
      missionMatchId: `tactical-${sequence}`,
      acceptedHead: {
        branchId: 'main',
        revision: sequence,
        effectiveGeneration: 1,
      },
      deployingPlayerIds: ['guest'],
    },
  };
}

function day(sequence: number, newDay: number): ICampaignEvent {
  return {
    type: 'CampaignDayAdvanced',
    sequence,
    campaignId: CAMPAIGN_ID,
    ts,
    authorPlayerId: 'host',
    scope: 'campaign',
    payload: { newDay },
  };
}

const malformed = (event: ICampaignEvent, payload: unknown): ICampaignEvent =>
  ({ ...event, payload }) as unknown as ICampaignEvent;

function hydrated(
  balance: number,
  facts: readonly ICampaignEvent[],
): ICampaignAuthoritativeFold {
  const fold = foldCampaignHydration(
    EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD,
    baseline(balance),
    facts,
  );
  if (!fold) throw new Error('fixture hydration refused');
  return fold;
}

describe('foldCampaignHydration: the hydration bundle', () => {
  it('accepts an explicit empty bundle as a complete fact set', () => {
    expect(
      foldCampaignHydration(
        EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD,
        baseline(20),
        [],
      ),
    ).toEqual({
      ...foldCampaignSnapshot(EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD, baseline(20)),
      launchFacts: [],
    });
  });

  it('retains historic facts as given without refolding or moving the cursor', () => {
    const facts = [launch(3), launch(7)];
    const fold = hydrated(20, facts);
    expect(fold.state).toEqual(
      foldCampaignSnapshot(EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD, baseline(20))
        ?.state,
    );
    expect(fold.lastSequence).toBe(-1);
    expect(fold.launchFacts).toEqual(facts);
    // The facts are older than later live events but never sit on the
    // live ordering guard.
    expect(foldCampaignEvent(fold, day(0, 1))?.launchFacts).toEqual(facts);
  });

  it('refuses an omitted bundle', () => {
    expect(
      foldCampaignHydration(
        EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD,
        baseline(20),
        undefined,
      ),
    ).toBeNull();
  });

  const held = (): ICampaignAuthoritativeFold => hydrated(5, [launch(1)]);
  it.each<[string, readonly ICampaignEvent[]]>([
    ['a non-launch fact', [launch(1), day(2, 1)]],
    [
      'a foreign-campaign fact',
      [launch(1), { ...launch(2), campaignId: 'c2' }],
    ],
    [
      'a strict payload violation',
      [launch(1), malformed(launch(2), { ...launch(2).payload, extra: true })],
    ],
    [
      'a payload missing its head',
      [launch(1), malformed(launch(2), { missionId: 'x' })],
    ],
    ['a negative sequence', [{ ...launch(2), sequence: -1 }, launch(1)]],
    ['a repeated sequence', [launch(1), launch(1)]],
    ['a descending sequence', [launch(4), launch(1)]],
    ['an altered held fact', [malformed(launch(1), { ...launch(2).payload })]],
    ['a dropped held fact', [launch(2)]],
  ])(
    'refuses a bundle with %s and leaves the held fold intact',
    (_, bundle) => {
      const fold = held();
      const before = JSON.stringify(fold);
      expect(
        foldCampaignHydration(fold, baseline(5), [launch(1), launch(2)]),
      ).not.toBeNull();
      expect(foldCampaignHydration(fold, baseline(5), bundle)).toBeNull();
      expect(JSON.stringify(fold)).toBe(before);
    },
  );

  it('starts an authorized replacement from EMPTY, never from the held lineage', () => {
    const stale = foldCampaignEvent(hydrated(5, [launch(3)]), day(50, 2));
    if (!stale) throw new Error('fixture event refused');
    // Reconnect at zero cannot adopt against the stale held proof...
    expect(
      foldCampaignHydration(stale, baseline(9), [launch(3)], false, 0),
    ).toBeNull();
    // ...and an invalid replacement bundle still refuses...
    expect(
      foldCampaignHydration(
        stale,
        baseline(9),
        [{ ...launch(4), campaignId: 'c2' }],
        true,
        0,
      ),
    ).toBeNull();
    // ...while an authorized replacement installs only its own baseline
    // and bundle: the held day, cursor and facts are not carried.
    expect(foldCampaignHydration(stale, baseline(9), [], true, 0)).toEqual({
      state: foldCampaignSnapshot(
        EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD,
        baseline(9),
      )?.state,
      lastSequence: 0,
      launchFacts: [],
    });
  });
});

describe('mission-launch adjunct across later frames', () => {
  it('appends a validated live launch and keeps the facts across events and linked snapshots', () => {
    const fold = hydrated(5, [launch(3)]);
    const launched = foldCampaignEvent(fold, launch(4));
    expect(launched).toEqual({
      state: fold.state,
      lastSequence: 4,
      launchFacts: [launch(3), launch(4)],
    });
    if (!launched) return;
    const advanced = foldCampaignFrame(launched, day(5, 2));
    expect(advanced.state?.day).toBe(2);
    expect(advanced.launchFacts).toEqual([launch(3), launch(4)]);
    const linked = foldCampaignSnapshot(advanced, baseline(7, 9), 9);
    expect(linked?.state?.balance).toBe(7);
    expect(linked?.launchFacts).toEqual([launch(3), launch(4)]);
  });

  it('refuses a duplicate, malformed or foreign live launch on a fact-holding fold', () => {
    const fold = hydrated(5, [launch(3)]);
    expect(foldCampaignEvent(fold, launch(3))).toBeNull();
    expect(
      foldCampaignEvent(fold, malformed(launch(4), { missionId: 'x' })),
    ).toBeNull();
    expect(
      foldCampaignEvent(fold, { ...launch(4), campaignId: 'c2' }),
    ).toBeNull();
    expect(foldCampaignFrame(fold, launch(3))).toBe(fold);
  });

  it('keeps the legacy fold shape and launch handling when no bundle was adopted', () => {
    const legacy = foldCampaignFrame(
      EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD,
      baseline(5),
    );
    expect(Object.keys(legacy)).toEqual(['state', 'lastSequence']);
    const launched = foldCampaignEvent(
      legacy,
      malformed(launch(4), { missionId: 'x' }),
    );
    expect(launched).toEqual({ state: legacy.state, lastSequence: 4 });
    expect(launched && Object.keys(launched)).toEqual([
      'state',
      'lastSequence',
    ]);
  });
});
