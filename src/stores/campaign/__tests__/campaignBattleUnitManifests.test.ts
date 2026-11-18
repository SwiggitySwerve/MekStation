/**
 * T1: recording a launch manifest stamps the campaign date and launch key,
 * and drops the manifests of earlier launches of the same mission or
 * scenario that never produced an outcome.
 */
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { Money } from '@/types/campaign/Money';

import { recordCampaignBattleUnitManifest } from '../campaignBattleUnitManifests';
import { resetCampaignStore, useCampaignStore } from '../useCampaignStore';

const units = { 'player-1-atlas-as7-d': { rosterUnitId: 'roster-1' } };

function seed(extra: Record<string, unknown>) {
  resetCampaignStore();
  useCampaignStore().setState({
    campaign: {
      id: 'camp-m',
      name: 'Manifests',
      currentDate: new Date('3025-06-15T00:00:00.000Z'),
      factionId: 'mercenary',
      forces: new Map(),
      rootForceId: 'root',
      missions: new Map(),
      finances: { transactions: [], balance: new Money(0) },
      factionStandings: {},
      shoppingList: { items: [] },
      options: createDefaultCampaignOptions(),
      campaignType: CampaignType.MERCENARY,
      createdAt: '3025-01-01T00:00:00Z',
      updatedAt: '3025-01-01T00:00:00Z',
      unitCombatStates: {},
      ...extra,
    } as never,
  });
}

describe('recordCampaignBattleUnitManifest', () => {
  afterEach(() => resetCampaignStore());

  it('stamps the campaign date and keeps an earlier launch of the same scenario that may still be in progress', () => {
    const abandoned = {
      units,
      recordedOn: '3025-06-14T00:00:00.000Z',
      launchKey: 'scn-1',
    };
    const pendingLaunch = {
      ...abandoned,
      recordedOn: '3025-06-13T00:00:00.000Z',
    };
    seed({
      battleUnitManifests: { abandoned, pending: pendingLaunch },
      pendingBattleOutcomes: [{ matchId: 'pending' }],
    });

    expect(
      recordCampaignBattleUnitManifest('camp-m', 'relaunch', units, 'scn-1'),
    ).toBe(true);

    expect(useCampaignStore().getState().campaign?.battleUnitManifests).toEqual(
      {
        abandoned,
        pending: pendingLaunch,
        relaunch: {
          units,
          recordedOn: '3025-06-15T00:00:00.000Z',
          launchKey: 'scn-1',
        },
      },
    );
  });

  it('refuses (and records nothing) for another campaign', () => {
    seed({});
    expect(
      recordCampaignBattleUnitManifest('camp-other', 'm-1', units, null),
    ).toBe(false);
    expect(
      useCampaignStore().getState().campaign?.battleUnitManifests,
    ).toBeUndefined();
  });
});
