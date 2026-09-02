/**
 * The field vocabulary a conflict decision is made in (umbrella 8.4).
 *
 * Disjointness is only as trustworthy as the paths it compares. Pins:
 *  - the classification names every key of the authoritative state, so a
 *    ninth ledger field cannot arrive unclassified and then be incapable
 *    of ever conflicting;
 *  - keyed collections diff by MEMBER, not wholesale - two players
 *    touching different roster units are disjoint, and a vocabulary that
 *    reported `rosterUnits` for both would refuse them for no reason;
 *  - member equality is key-order independent, so a re-serialized but
 *    unchanged member is not a phantom change;
 *  - comparing two different campaigns is a programming error, not a
 *    field difference to be reported.
 */

import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';

import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import {
  campaignFieldOverlap,
  CAMPAIGN_STATE_FIELD_KINDS,
  diffCampaignFields,
} from '../campaignCommandFieldSet';

const CAMPAIGN_ID = 'campaign-fields';

/** A populated baseline, so every classified key has something to move. */
function baseState(): ICampaignAuthoritativeState {
  return {
    ...createEmptyCampaignState(CAMPAIGN_ID),
    day: 3,
    balance: 100_000,
    salvagePool: 2_000,
    rosterUnits: {
      'unit-a': {
        unitId: 'unit-a',
        designation: 'Atlas AS7-D',
        status: 'operational',
      },
      'unit-b': {
        unitId: 'unit-b',
        designation: 'Locust LCT-1V',
        status: 'damaged',
      },
    },
    forceUnits: { 'force-a': ['unit-a'] },
    pilots: { 'pilot-a': { pilotId: 'pilot-a', name: 'Rook' } },
    contracts: {
      'contract-a': {
        contractId: 'contract-a',
        name: 'Periphery Raid',
        employerFactionId: 'lyran',
      },
    },
    factionStanding: { lyran: 1 },
  };
}

describe('CAMPAIGN_STATE_FIELD_KINDS', () => {
  it('classifies every key of the authoritative state', () => {
    // The compile-time `satisfies` pin is primary; this names a gap if a
    // partial table is ever constructed at runtime.
    expect(Object.keys(CAMPAIGN_STATE_FIELD_KINDS).sort()).toEqual(
      Object.keys(createEmptyCampaignState(CAMPAIGN_ID)).sort(),
    );
  });
});

describe('diffCampaignFields', () => {
  it('reports nothing for a state compared with itself', () => {
    expect(diffCampaignFields(baseState(), baseState())).toEqual([]);
  });

  it('names a moved scalar by its bare key', () => {
    expect(
      diffCampaignFields(baseState(), { ...baseState(), balance: 90_000 }),
    ).toEqual(['balance']);
  });

  it('names a changed collection member, not the whole collection', () => {
    const after = baseState();
    expect(
      diffCampaignFields(baseState(), {
        ...after,
        rosterUnits: {
          ...after.rosterUnits,
          'unit-b': { ...after.rosterUnits['unit-b'], status: 'operational' },
        },
      }),
    ).toEqual(['rosterUnits[unit-b]']);
  });

  it('names an added and a removed member', () => {
    const after = baseState();
    const withoutA = { ...after.rosterUnits };
    delete withoutA['unit-a'];
    expect(
      diffCampaignFields(baseState(), {
        ...after,
        rosterUnits: {
          ...withoutA,
          'unit-c': {
            unitId: 'unit-c',
            designation: 'Shadow Hawk',
            status: 'operational',
          },
        },
      }),
    ).toEqual(['rosterUnits[unit-a]', 'rosterUnits[unit-c]']);
  });

  it('does not report a member that was only re-serialized', () => {
    const after = baseState();
    // Same facts, different key order - a phantom change if equality went
    // through raw JSON.stringify.
    expect(
      diffCampaignFields(baseState(), {
        ...after,
        pilots: { 'pilot-a': { name: 'Rook', pilotId: 'pilot-a' } },
      }),
    ).toEqual([]);
  });

  it('returns paths sorted, so two callers cannot disagree on order', () => {
    const after = { ...baseState(), balance: 1, day: 9, salvagePool: 0 };
    expect(diffCampaignFields(baseState(), after)).toEqual([
      'balance',
      'day',
      'salvagePool',
    ]);
  });

  it('refuses to compare two different campaigns', () => {
    expect(() =>
      diffCampaignFields(baseState(), createEmptyCampaignState('other')),
    ).toThrow(/different campaigns/i);
  });
});

describe('campaignFieldOverlap', () => {
  it('is empty for disjoint sets', () => {
    expect(campaignFieldOverlap(['balance'], ['rosterUnits[unit-a]'])).toEqual(
      [],
    );
  });

  it('names the shared paths, sorted and deduplicated', () => {
    expect(
      campaignFieldOverlap(
        ['day', 'balance', 'balance'],
        ['balance', 'day', 'salvagePool'],
      ),
    ).toEqual(['balance', 'day']);
  });
});
