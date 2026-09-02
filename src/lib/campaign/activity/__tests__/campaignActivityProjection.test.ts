/**
 * Role-scoped campaign activity projection (umbrella task 8.3).
 *
 * Pins, in order of what could actually go wrong:
 *  - a gm-scoped fact never reaches a player's feed, and the player's
 *    ordinals stay gapless so the omission is not itself a signal;
 *  - the GM's audited rationale on an ADMITTED `ParticipantRemoved` is
 *    withheld from a player - admission alone cannot separate a public
 *    removal from a private reason, so the projection must;
 *  - one player's `player:` fact is absent from the other player's feed;
 *  - the day stamped on a row is folded from the VISIBLE set only, so a
 *    withheld day advance does not move a player's clock;
 *  - baseline and day-advance facts are context, not feed rows.
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { campaignScopeAdmits } from '@/lib/multiplayer/server/campaignWireScopeBoundary';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import type { ICampaignActivityViewer } from '../campaignActivityProjection';

import { projectCampaignActivityForViewer } from '../campaignActivityProjection';

const CAMPAIGN_ID = 'campaign-activity';

/** The GM: admitted to every scope, and shown GM-private detail. */
const GM_VIEWER: ICampaignActivityViewer = {
  admits: (scope) =>
    campaignScopeAdmits(scope, { participantId: 'gm-1', isGm: true }),
  seesGmPrivateDetail: true,
};

/** One tactical player. Admission is the shared boundary's answer. */
function playerViewer(participantId: string): ICampaignActivityViewer {
  return {
    admits: (scope) =>
      campaignScopeAdmits(scope, { participantId, isGm: false }),
    seesGmPrivateDetail: false,
  };
}

/** Terse event builder - only the fields a row is derived from vary. */
function event<T extends ICampaignEvent['type']>(
  sequence: number,
  type: T,
  payload: Extract<ICampaignEvent, { type: T }>['payload'],
  scope: ICampaignEvent['scope'] = 'campaign',
): ICampaignEvent {
  return {
    sequence,
    campaignId: CAMPAIGN_ID,
    ts: `3025-01-0${sequence + 1}T00:00:00.000Z`,
    authorPlayerId: 'gm-1',
    scope,
    type,
    payload,
  } as ICampaignEvent;
}

describe('projectCampaignActivityForViewer', () => {
  it('derives one ordered row per ledger-mutating fact for the GM', () => {
    const entries = projectCampaignActivityForViewer(
      CAMPAIGN_ID,
      [
        event(0, 'CampaignDayAdvanced', { newDay: 3 }),
        event(1, 'FundsChanged', {
          delta: -50_000,
          reason: 'Refit',
          balance: 450_000,
        }),
        event(2, 'PilotHired', {
          pilot: { pilotId: 'p-1', name: 'Rook' },
          cost: 12_000,
        }),
      ],
      GM_VIEWER,
    );

    expect(entries.map((entry) => entry.category)).toEqual([
      'finances',
      'personnel',
    ]);
    expect(entries.map((entry) => entry.ordinal)).toEqual([0, 1]);
    expect(entries[0].message).toContain('Refit');
    expect(entries[1].message).toContain('Rook');
  });

  it('omits a gm-scoped fact from a player feed and leaves no ordinal gap', () => {
    const events = [
      event(0, 'FundsChanged', {
        delta: 1_000,
        reason: 'Contract advance',
        balance: 1_000,
      }),
      event(
        1,
        'FundsChanged',
        { delta: -900, reason: 'Bribe', balance: 100 },
        'gm',
      ),
      event(2, 'SalvageAllocated', { value: 50, poolRemaining: 0 }),
    ];

    const gmEntries = projectCampaignActivityForViewer(
      CAMPAIGN_ID,
      events,
      GM_VIEWER,
    );
    const playerEntries = projectCampaignActivityForViewer(
      CAMPAIGN_ID,
      events,
      playerViewer('player-1'),
    );

    expect(gmEntries).toHaveLength(3);
    expect(playerEntries).toHaveLength(2);
    expect(playerEntries.some((entry) => entry.message.includes('Bribe'))).toBe(
      false,
    );
    // Gapless: arithmetic on the ordinals a player was handed must not
    // reveal how many facts were withheld or where they fell.
    expect(playerEntries.map((entry) => entry.ordinal)).toEqual([0, 1]);
  });

  it('withholds the GM rationale on an admitted removal from a player', () => {
    const removal = event(0, 'ParticipantRemoved', {
      participantId: 'player-2',
      reason: 'Repeatedly stalled the turn timer',
    });

    const gmEntries = projectCampaignActivityForViewer(
      CAMPAIGN_ID,
      [removal],
      GM_VIEWER,
    );
    const playerEntries = projectCampaignActivityForViewer(
      CAMPAIGN_ID,
      [removal],
      playerViewer('player-1'),
    );

    // The removal itself is campaign-scoped and stays visible to both.
    expect(gmEntries).toHaveLength(1);
    expect(playerEntries).toHaveLength(1);
    expect(playerEntries[0].message).toContain('player-2');
    expect(gmEntries[0].message).toContain('stalled the turn timer');
    expect(playerEntries[0].message).not.toContain('stalled the turn timer');
  });

  it('keeps one player-scoped fact out of the other player feed', () => {
    const events = [
      event(
        0,
        'RosterUnitChanged',
        {
          change: 'repaired',
          unit: {
            unitId: 'unit-a',
            designation: 'Atlas AS7-D',
            status: 'operational',
          },
        },
        'player:player-1',
      ),
    ];

    expect(
      projectCampaignActivityForViewer(
        CAMPAIGN_ID,
        events,
        playerViewer('player-1'),
      ),
    ).toHaveLength(1);
    expect(
      projectCampaignActivityForViewer(
        CAMPAIGN_ID,
        events,
        playerViewer('player-2'),
      ),
    ).toHaveLength(0);
  });

  it('does not advance a player clock through a withheld day advance', () => {
    const events = [
      event(0, 'CampaignDayAdvanced', { newDay: 9 }, 'gm'),
      event(1, 'SalvageAllocated', { value: 10, poolRemaining: 0 }),
    ];

    expect(
      projectCampaignActivityForViewer(CAMPAIGN_ID, events, GM_VIEWER)[0]
        .campaignDay,
    ).toBe(9);
    expect(
      projectCampaignActivityForViewer(
        CAMPAIGN_ID,
        events,
        playerViewer('player-1'),
      )[0].campaignDay,
    ).toBe(0);
  });

  it('treats a published baseline as context rather than a feed row', () => {
    const entries = projectCampaignActivityForViewer(
      CAMPAIGN_ID,
      [
        event(0, 'CampaignSnapshotPublished', {
          state: { ...createEmptyCampaignState(CAMPAIGN_ID), day: 4 },
        }),
        event(1, 'ContractAccepted', {
          contract: {
            contractId: 'c-1',
            name: 'Periphery Raid',
            employerFactionId: 'lyran',
          },
        }),
      ],
      GM_VIEWER,
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].category).toBe('finances');
    expect(entries[0].campaignDay).toBe(4);
    expect(entries[0].message).toContain('Periphery Raid');
  });

  it('splits roster changes between acquisition and technical work', () => {
    const unit = {
      unitId: 'unit-a',
      designation: 'Atlas AS7-D',
      status: 'operational',
    } as const;
    const entries = projectCampaignActivityForViewer(
      CAMPAIGN_ID,
      [
        event(0, 'RosterUnitChanged', { change: 'added', unit }),
        event(1, 'RosterUnitChanged', { change: 'repaired', unit }),
        event(2, 'RosterUnitChanged', { change: 'removed', unit }),
      ],
      GM_VIEWER,
    );

    expect(entries.map((entry) => entry.category)).toEqual([
      'acquisitions',
      'technical',
      'acquisitions',
    ]);
  });
});
